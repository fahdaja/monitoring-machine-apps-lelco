<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Enums\FormType;
use App\Models\Form;
use App\Models\Machine;
use App\Models\FormSection;
use App\Models\FormQuestion;
use App\Models\FormOption;
use App\Models\ScheduleCondition;
use App\Models\Task;

class FormController extends Controller
{
    public function index(Request $request)
{
    $type = FormType::normalize($request->query('type'));

    $forms = Form::query()
        ->when($type, fn ($q) => $q->ofType($type))
        ->with([
            'machine',
            'sections.questions.options',
        ])
        ->latest('created_at') 
        ->paginate(10);

    // toBase() agar key array berupa string, bukan objek enum
    $typeCounts = Form::query()
        ->toBase()
        ->select('form_type')
        ->selectRaw('count(*) as total')
        ->groupBy('form_type')
        ->pluck('total', 'form_type');

    return Inertia::render('forms/index', [
        'forms' => $forms,
        'filters' => ['type' => $type],
        'typeCounts' => $typeCounts,
        // daftar semua mesin terdaftar, tidak bergantung pada mesin yang sudah punya form
        'machines' => Machine::orderBy('machine_code')
            ->get(['id', 'machine_code', 'machine_name', 'machine_type', 'location']),
    ]);
}

    public function create(Request $request)
    {
        return Inertia::render('forms/create', [
            'defaultType' => FormType::normalize($request->query('category')) ?? FormType::INSPECTION->value,
        ]);
    }

    /**
     * Form murni sebagai template pertanyaan (tidak terikat mesin).
     */
    private function resolveMachineId(FormType $type, mixed $machineId): ?int
    {
        return !empty($machineId) ? (int) $machineId : null;
    }

    public function store(Request $request)
{
    return DB::transaction(function () use ($request) {

        $validate = $request->validate([
            'metadata.form_type'                 => 'required|string|in:'.implode(',', FormType::values()),
            'metadata.machine_id'              => 'nullable|string|exists:machines,id',
            'metadata.form_title'                => 'required|string|max:255',
            'metadata.form_description'          => 'nullable|string',

            'sections'                           => 'required|array|min:1',
            'sections.*.section_title'           => 'required|string|max:255',
            'sections.*.section_description'     => 'nullable|string',
            'sections.*.questions'               => 'required|array|min:1',
            'sections.*.questions.*.question_text' => 'required|string',
            'sections.*.questions.*.question_image' => 'nullable',
            'sections.*.questions.*.question_images' => 'nullable|array',
            'sections.*.questions.*.question_images.*' => 'nullable',
            'sections.*.questions.*.question_file' => 'nullable|string',
            'sections.*.questions.*.question_date' => 'nullable|string',
            'sections.*.questions.*.question_time' => 'nullable|string',
            'sections.*.questions.*.help_text'     => 'nullable|string',
            'sections.*.questions.*.standard_text' => 'nullable|string',
            'sections.*.questions.*.input_type'    => 'required|string|in:TEXT,TEXTAREA,SELECT,CHECKBOX,DROPDOWN,FILE,DATE,TIME',
            'sections.*.questions.*.options'       => 'nullable|array',
            'sections.*.questions.*.options.*.id'  => 'nullable|exists:form_options,id',
            'sections.*.questions.*.options.*.option_text' => 'required|string',
            'sections.*.questions.*.options.*.is_normal' => 'required|boolean',
            'sections.*.questions.*.options.*.goto_form_section_id' => 'nullable|integer',
            'sections.*.questions.*.is_required'   => 'required|boolean',
            'sections.*.questions.*.validation_rules' => 'nullable',
        ]);

        $meta = $validate['metadata'];
        $type = FormType::from($meta['form_type']);
        $machineId = $this->resolveMachineId($type, $meta['machine_id'] ?? null);
        $machine = $machineId ? Machine::find($machineId) : null;

        do {
            $prefix = $type->isTicketTransition() ? 'TRN' : 'FRM' . ($machine ? substr(strtoupper((string) $machine->machine_type), 0, 3) : '');
            $formCode = $prefix . strtoupper(uniqid());
        } while (Form::where('form_code', $formCode)->exists());

        // 1. Simpan Form Utama
        $form = new Form();
        $form->form_type        = $type->value;
        $form->machine_id       = $machineId;
        $form->form_code        = $formCode;
        $form->form_title       = $meta['form_title'];
        $form->form_description = $meta['form_description'] ?? '-';
        $form->save();
        
        // Array penampung untuk memetakan index section ke ID database asli (untuk goto_form_section_id)
        $createdSectionIds = [];

        // 2. Simpan Sections Terlebih Dahulu agar Mendapatkan ID Database
        foreach ($validate['sections'] as $sIndex => $sectionData) {
            $section = FormSection::create([
                'form_id'             => $form->id,
                'section_code'        => "SEC-" . strtoupper(uniqid()),
                'section_title'       => $sectionData['section_title'],
                'section_description' => $sectionData['section_description'] ?? '-',
                'section_order'       => $sIndex + 1,
            ]);

            // Simpan ID asli berdasarkan index urutannya
            $createdSectionIds[$sIndex] = $section->id;
        }

        // 3. Simpan Questions & Options
        foreach ($validate['sections'] as $sIndex => $sectionData) {
            // Ambil section yang bersangkutan berdasarkan form_id dan urutannya
            $section = FormSection::where('form_id', $form->id)
                ->where('section_order', $sIndex + 1)
                ->first();

            foreach ($sectionData['questions'] as $qIndex => $questionData) {
                $storedImages = [];
                $incomingImages = $questionData['question_images'] ?? [];
                if (is_array($incomingImages)) {
                    foreach ($incomingImages as $img) {
                        if ($img instanceof \Illuminate\Http\UploadedFile) {
                            $storedImages[] = $this->storeQuestionImage($img);
                        } elseif (is_string($img) && trim($img) !== '' && trim($img) !== 'null') {
                            $storedImages[] = trim($img);
                        }
                    }
                }
                if (empty($storedImages) && isset($questionData['question_image'])) {
                    if ($questionData['question_image'] instanceof \Illuminate\Http\UploadedFile) {
                        $storedImages[] = $this->storeQuestionImage($questionData['question_image']);
                    } elseif (is_string($questionData['question_image']) && trim($questionData['question_image']) !== '') {
                        $storedImages[] = trim($questionData['question_image']);
                    }
                }
                $imagePath = ! empty($storedImages) ? json_encode(array_values($storedImages)) : null;

                $question = FormQuestion::create([
                    'form_id'          => $form->id,
                    'form_section_id'  => $section->id,
                    'question_code'    => "QST-" . strtoupper(uniqid()),
                    'question_text'    => $questionData['question_text'],
                    'question_image'   => $imagePath,
                    'question_file'    => $questionData['question_file'] ?? null,
                    'question_date'    => $questionData['question_date'] ?? null,
                    'question_time'    => $questionData['question_time'] ?? null,
                    'validation_rules' => $questionData['validation_rules'] ?? null,
                    'help_text'        => $questionData['help_text'] ?? null,
                    'standard_text'    => $questionData['standard_text'] ?? null,
                    'input_type'       => $questionData['input_type'],
                    'question_order'   => $qIndex + 1,
                    'is_required'      => $questionData['is_required'] ?? false,
                ]);

                if (isset($questionData['options']) && is_array($questionData['options'])) {
                        foreach ($questionData['options'] as $oIndex => $optionData) {
                            
                            // 🛠️ Perbaikan Logika Konversi `goto_form_section_id` yang Konsisten
                            $targetSectionValue = $optionData['goto_form_section_id'] ?? null;
                            $realSectionId = null;

                            if ($targetSectionValue !== '' && $targetSectionValue !== null) {
                                $numericVal = (int) $targetSectionValue;
                                
                                if (isset($createdSectionIds[$numericVal])) {
                                    // Jika dikirim berupa index array dari frontend (0, 1, 2)
                                    $realSectionId = $createdSectionIds[$numericVal];
                                } else {
                                    // Jika sudah berupa ID database mentah
                                    $realSectionId = $numericVal;
                                }
                            }

                        FormOption::create([
                            'form_question_id'     => $question->id,
                            'option_code'          => "OPT-" . strtoupper(uniqid()),
                            'option_text'          => $optionData['option_text'],
                            'option_order'         => $oIndex + 1,
                            'is_normal'            => $optionData['is_normal'] ?? false,
                            'goto_form_section_id' => $realSectionId,
                        ]);
                    }
                }
            }
        }
           return redirect()->route('forms.index')->with('success', 'Template form baru berhasil dibuat!');
        });
    }

   public function edit($id)
{
    $form = Form::with('sections.questions.options')->findOrFail($id);

     $machines = Machine::select(
        'id as machine_id', 
        'machine_code', 
        'machine_name', 
        'location'
    )->get();


    // Rujukan kondisi trigger yang masih memakai pertanyaan/opsi form ini.
    // Dipakai builder untuk menolak penghapusan sejak klik ikon trash (bukan saat submit).
    $conditionRefs = ScheduleCondition::with('targetForm')
        ->where('trigger_form_id', $form->id)
        ->get()
        ->map(fn ($condition) => [
            'question_id'       => $condition->trigger_question_id,
            'option_id'         => $condition->trigger_option_id,
            'condition_code'    => $condition->condition_code,
            'target_form_title' => $condition->targetForm?->form_title,
        ])
        ->values();

    return Inertia::render('forms/edit', [ // Ganti 'forms/{id}/edit' menjadi 'forms/edit' (atau 'forms/Edit')
        'form' => $form,
        'machines' => $machines,
        'conditionRefs' => $conditionRefs,
    ]); 
}

   public function update(Request $request, $id)
    {


        return DB::transaction(function () use ($request, $id) {
            $form = Form::findOrFail($id);

            $validate = $request->validate([
                'metadata.form_type'                 => 'required|string|in:'.implode(',', FormType::values()),
                'metadata.machine_id'              => 'nullable|string|exists:machines,id',
                'metadata.form_title'                => 'required|string|max:255',
                'metadata.form_description'          => 'nullable|string',

                'sections'                           => 'required|array|min:1',
                'sections.*.id'                      => 'nullable|exists:form_sections,id',
                'sections.*.section_title'           => 'required|string|max:255',
                'sections.*.section_description'     => 'nullable|string',
                'sections.*.questions'               => 'required|array|min:1',
                'sections.*.questions.*.id'          => 'nullable|exists:form_questions,id',
                'sections.*.questions.*.question_text' => 'required|string',
                'sections.*.questions.*.question_image' => 'nullable',
                'sections.*.questions.*.sync_question_images' => 'nullable|boolean',
                'sections.*.questions.*.existing_question_images' => 'nullable|array',
                'sections.*.questions.*.existing_question_images.*' => 'nullable|string',
                'sections.*.questions.*.new_question_images' => 'nullable|array',
                'sections.*.questions.*.new_question_images.*' => 'nullable',
            'sections.*.questions.*.question_images' => 'nullable|array',
            'sections.*.questions.*.question_images.*' => 'nullable',
                'sections.*.questions.*.question_file' => 'nullable|string',
                'sections.*.questions.*.question_date' => 'nullable|string',
                'sections.*.questions.*.question_time' => 'nullable|string',
                'sections.*.questions.*.help_text'     => 'nullable|string',
                'sections.*.questions.*.standard_text' => 'nullable|string',
                'sections.*.questions.*.input_type'    => 'required|string|in:TEXT,TEXTAREA,SELECT,CHECKBOX,DROPDOWN,FILE,DATE,TIME',
                'sections.*.questions.*.options'       => 'nullable|array',
                'sections.*.questions.*.options.*.id'  => 'nullable|exists:form_options,id',
                'sections.*.questions.*.options.*.option_text' => 'required|string',
                'sections.*.questions.*.options.*.is_normal' => 'required|boolean',
                'sections.*.questions.*.options.*.goto_form_section_id' => 'nullable|integer|exists:form_sections,id', // Tambahan validasi untuk goto section
                'sections.*.questions.*.is_required'   => 'required|boolean',
                'sections.*.questions.*.validation_rules' => 'nullable',
            ], [
                // Pesan ramah untuk kasus "hapus semua pertanyaan di satu bagian"
                // (sebelumnya error generik 'sections.0.questions' yang membingungkan).
                'sections.*.questions.required' => 'Setiap bagian harus memiliki minimal 1 pertanyaan.',
                'sections.*.questions.min' => 'Setiap bagian harus memiliki minimal 1 pertanyaan.',
            ]);

            // ===== Guard kondisi trigger =====
            // Pertanyaan/opsi yang dibuang user di builder terhapus permanen, dan FK cascade
            // ikut menghapus kondisi trigger yang masih merujuk ke situ secara diam-diam.
            // Rename teks aman (ID dipertahankan updateOrCreate) — hanya penghapusan yang diblok.
            $keptSectionIds = collect($validate['sections'])->pluck('id')->filter()->values();
            $keptQuestionIds = collect($validate['sections'])
                ->flatMap(fn ($section) => collect($section['questions'])->pluck('id'))
                ->filter()->values();
            $keptOptionIds = collect($validate['sections'])
                ->flatMap(fn ($section) => collect($section['questions']))
                ->flatMap(fn ($question) => collect($question['options'] ?? [])->pluck('id'))
                ->filter()->values();

            $doomedQuestionIds = FormQuestion::where('form_id', $form->id)
                ->whereNotIn('id', $keptQuestionIds->isEmpty() ? [0] : $keptQuestionIds->all())
                ->pluck('id');

            $doomedOptionIds = FormOption::whereIn('form_question_id', $doomedQuestionIds->isEmpty() ? [0] : $doomedQuestionIds->all())
                ->pluck('id')
                ->merge(
                    FormOption::whereIn('form_question_id', $keptQuestionIds->isEmpty() ? [0] : $keptQuestionIds->all())
                        ->whereNotIn('id', $keptOptionIds->isEmpty() ? [0] : $keptOptionIds->all())
                        ->pluck('id')
                )
                ->unique()->values();

            if ($doomedQuestionIds->isNotEmpty() || $doomedOptionIds->isNotEmpty()) {
                $brokenConditions = ScheduleCondition::where(function ($query) use ($doomedQuestionIds, $doomedOptionIds) {
                    if ($doomedQuestionIds->isNotEmpty()) {
                        $query->whereIn('trigger_question_id', $doomedQuestionIds->all());
                    }
                    if ($doomedOptionIds->isNotEmpty()) {
                        $query->orWhereIn('trigger_option_id', $doomedOptionIds->all());
                    }
                })->get();

                if ($brokenConditions->isNotEmpty()) {
                    $targets = $brokenConditions->load('targetForm')
                        ->map(fn ($condition) => $condition->targetForm?->form_title ?? $condition->condition_code)
                        ->unique()
                        ->implode(', ');

                    // ValidationException agar edit.tsx menerima errors.condition di onError
                    // (redirect dianggap success oleh Inertia dan memunculkan toast sukses palsu).
                    throw ValidationException::withMessages([
                        'condition' => "Perubahan tidak disimpan: pertanyaan/opsi yang dihapus masih dipakai kondisi trigger jadwal untuk form ({$targets}). Hapus atau ubah kondisi itu di halaman Pengaturan Pola Jadwal dulu.",
                    ]);
                }
            }

            $meta = $validate['metadata'];
            $type = FormType::from($meta['form_type']);
            $machineId = $this->resolveMachineId($type, $meta['machine_id'] ?? null);

            // Update info utama form
            $form->update([
                'form_type'        => $type->value,
                'machine_id'       => $machineId,
                'form_title'       => $meta['form_title'],
                'form_description' => $meta['form_description'] ?? '-',
            ]);

            $form->touch();

            $existingSectionIds = [];
            // Array untuk memetakan index section di frontend ke ID database asli
            $createdSectionIds = [];

            // 1. Simpan / Update Sections Terlebih Dahulu
            foreach ($validate['sections'] as $sIndex => $sectionData) {
                $existingSection = ! empty($sectionData['id']) ? FormSection::find($sectionData['id']) : null;
                $section = FormSection::updateOrCreate(
                    ['id' => $sectionData['id'] ?? null, 'form_id' => $form->id],
                    [
                        'section_code'        => $existingSection?->section_code ?? ($sectionData['section_code'] ?? 'SEC-' . Str::upper(Str::random(13))),
                        'section_title'       => $sectionData['section_title'],
                        'section_description' => $sectionData['section_description'] ?? '-',
                        'section_order'       => $sIndex + 1,
                    ]
                );
                
                $existingSectionIds[] = $section->id;
                // Simpan mapping ID berdasarkan index urutan section di frontend
                $createdSectionIds[$sIndex] = $section->id;
            }

            // 2. Simpan / Update Questions & Options
            foreach ($validate['sections'] as $sIndex => $sectionData) {
                // Ambil section berdasarkan form_id dan urutannya yang valid
                $section = FormSection::where('form_id', $form->id)
                    ->where('section_order', $sIndex + 1)
                    ->first();

                $existingQuestionIds = [];

                foreach ($sectionData['questions'] as $qIndex => $questionData) {
                    $questionId = $questionData['id'] ?? null;
                    $oldQuestion = $questionId ? FormQuestion::find($questionId) : null;
                    
                    $oldImages = $oldQuestion ? $oldQuestion->question_images : [];
                    $hasMultiPayload = ! empty($questionData['sync_question_images'])
                        || array_key_exists('existing_question_images', $questionData)
                        || array_key_exists('new_question_images', $questionData);

                    if ($hasMultiPayload) {
                        $keptImages = array_values(array_filter(
                            is_array($questionData['existing_question_images'] ?? null) ? $questionData['existing_question_images'] : [],
                            fn ($p) => is_string($p) && trim($p) !== '' && trim($p) !== 'null'
                        ));

                        foreach ($oldImages as $oldImg) {
                            if (! in_array($oldImg, $keptImages, true)) {
                                Storage::disk('public')->delete($oldImg);
                            }
                        }

                        $newFiles = is_array($questionData['new_question_images'] ?? null) ? $questionData['new_question_images'] : [];
                        foreach ($newFiles as $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile) {
                                $keptImages[] = $this->storeQuestionImage($file);
                            }
                        }

                        $imagePath = ! empty($keptImages) ? json_encode(array_values($keptImages)) : null;
                    } else {
                        $imagePath = null;
                        $incomingImage = $questionData['question_image'] ?? null;

                        if ($incomingImage instanceof \Illuminate\Http\UploadedFile) {
                            foreach ($oldImages as $oldImg) {
                                Storage::disk('public')->delete($oldImg);
                            }
                            $imagePath = json_encode([$this->storeQuestionImage($incomingImage)]);
                        } elseif (is_null($incomingImage) || $incomingImage === '' || $incomingImage === 'null') {
                            foreach ($oldImages as $oldImg) {
                                Storage::disk('public')->delete($oldImg);
                            }
                            $imagePath = null;
                        } else {
                            $imagePath = $oldQuestion ? $oldQuestion->question_image : null;
                        }
                    }

                    $question = FormQuestion::updateOrCreate(
                       ['id' => $questionData['id'] ?? null, 'form_section_id' => $section->id, 'form_id' => $form->id ],
                        [
                            'form_id'         => $form->id,
                            'form_section_id'  => $section->id,
                            'question_code'    => $oldQuestion?->question_code ?? ($questionData['question_code'] ?? 'QST-' . Str::upper(Str::random(13))),
                            'question_text'    => $questionData['question_text'],
                            'input_type'       => $questionData['input_type'],
                            'question_image'   => $imagePath,
                            'question_file'    => $questionData['question_file'] ?? null,
                            'question_date'    => $questionData['question_date'] ?? null,
                            'question_time'    => $questionData['question_time'] ?? null,
                            'validation_rules' => $questionData['validation_rules'] ?? null,
                            'help_text'        => $questionData['help_text'] ?? null,
                            'standard_text'    => $questionData['standard_text'] ?? null,
                            'question_order'   => $qIndex + 1,
                            'is_required'      => $questionData['is_required'] ?? false,
                        ]
                    );
                    $existingQuestionIds[] = $question->id;

                    // Sync Options jika ada
                    if (isset($questionData['options']) && is_array($questionData['options'])) {
                        $existingOptionIds = [];

                        if (!$question || !$question->id) {
    throw new \Exception("Gagal menyimpan pertanyaan, ID kosong.");
}

                        foreach ($questionData['options'] as $oIndex => $optionData) {
                            
                            // Konversi index target section dari frontend menjadi ID database asli
                            $targetSectionIndex = $optionData['goto_form_section_id'] ?? null;
                            $realSectionId = null;

                            if ($targetSectionIndex !== '' && $targetSectionIndex !== null) {
                                $numericIndex = (int) $targetSectionIndex;
                                if (isset($createdSectionIds[$numericIndex])) {
                                    $realSectionId = $createdSectionIds[$numericIndex];
                                }
                            }

                            $existingOption = ! empty($optionData['id']) ? FormOption::find($optionData['id']) : null;
                            $option = FormOption::updateOrCreate(
                                ['id'               => $optionData['id'] ?? null,
                                'form_question_id' => $question->id
                                 ], 
                                [
                                    'form_question_id'     => $question->id,
                                    'option_code'          => $existingOption?->option_code ?? ($optionData['option_code'] ?? 'OPT-' . Str::upper(Str::random(13))),
                                    'option_text'          => $optionData['option_text'],
                                    'option_order'         => $oIndex + 1,
                                    'is_normal'            => $optionData['is_normal'] ?? false,
                                    'goto_form_section_id' => !empty($optionData['goto_form_section_id']) 
            ? intval($optionData['goto_form_section_id']) 
            : null,
                                ]
                            );
                            $existingOptionIds[] = $option->id;
                        }

                        // Hapus option yang sudah dihapus oleh user dari frontend
                        FormOption::where('form_question_id', $question->id)
                            ->whereNotIn('id', $existingOptionIds)
                            ->delete();
                    }
                }

                // Hapus pertanyaan di section ini yang sudah dibuang oleh user dari frontend
                FormQuestion::where('form_section_id', $section->id)
                    ->whereNotIn('id', $existingQuestionIds)
                    ->each(function ($q) {
                        foreach ($q->question_images as $imgPath) {
                            Storage::disk('public')->delete($imgPath);
                        }
                        $q->delete();
                    });
            }

            // Hapus section yang sudah dibuang beserta pertanyaan, opsi, dan gambarnya
            FormSection::with('questions.options')
                ->where('form_id', $form->id)
                ->whereNotIn('id', $existingSectionIds)
                ->each(function ($removedSection) {
                    foreach ($removedSection->questions as $q) {
                        foreach ($q->question_images as $imgPath) {
                            Storage::disk('public')->delete($imgPath);
                        }
                        $q->options()->delete();
                        $q->delete();
                    }
                    $removedSection->delete();
                });

            return redirect()->route('forms.index')
                ->with('success', 'Template form berhasil diperbarui!');
        });
    }

    public function destroy($id)
    {

        return DB::transaction(function () use ($id) {
            $form = Form::with('sections.questions.options')->findOrFail($id);

            // Guard: form masih dipakai kondisi trigger (lvl 1/lvl 2) — FK cascade akan
            // menghapus kondisinya secara diam-diam, jadi penghapusan diblok.
            $relatedConditions = ScheduleCondition::where(function ($query) use ($form) {
                $query->where('trigger_form_id', $form->id)
                    ->orWhere('target_form_id', $form->id);
            })->get();

            if ($relatedConditions->isNotEmpty()) {
                $codes = $relatedConditions->pluck('condition_code')->implode(', ');

                return redirect()->route('forms.index')
                    ->with('error', "Form tidak dapat dihapus karena masih dipakai kondisi trigger jadwal ({$codes}). Hapus kondisi tersebut terlebih dahulu di halaman Pengaturan Pola Jadwal.");
            }

            foreach ($form->sections as $section) {
                foreach ($section->questions as $question) {
                    foreach ($question->question_images as $imgPath) {
                        Storage::disk('public')->delete($imgPath);
                    }
                }
            }

            Task::where('form_id', $form->id)->delete();

            foreach ($form->sections as $section) {
                foreach ($section->questions as $question) {
                    $question->options()->delete();
                }
                $section->questions()->delete();
            }
            $form->sections()->delete();

            $form->delete();

            return redirect()->route('forms.index')
                ->with('success', 'Formulir, Task terkait, beserta seluruh pertanyaannya berhasil dihapus!');
        });
    }

    private function storeQuestionImage(\Illuminate\Http\UploadedFile $file): string
    {
        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $slug = Str::slug($baseName) ?: 'image';
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
        $fileName = time() . '_' . Str::lower(Str::random(4)) . '_' . Str::limit($slug, 80, '') . '.' . $ext;

        return $file->storeAs('question-images', $fileName, 'public');
    }

    public function destroyImage($questionId)
    {
        $question = FormQuestion::findOrFail($questionId);

        if (! empty($question->question_images)) {
            foreach ($question->question_images as $imgPath) {
                Storage::disk('public')->delete($imgPath);
            }
            $question->question_image = null;
            $question->save();
        }

        return back()->with('success', 'Gambar berhasil dihapus!');
    }
}

