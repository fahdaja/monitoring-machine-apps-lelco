<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Form;
use App\Models\Machine;
use App\Models\FormSection;
use App\Models\FormQuestion;
use App\Models\FormOption;
use App\Models\Task;

class FormController extends Controller
{
    public function index()
    {
        $forms = Form::with('machine','sections.questions.options')->latest()->get();
        return Inertia::render('forms/index', [
            'forms' => $forms,
        ]);
    }

    public function create()
    {
        $machines = Machine::select('id', 'machine_type')->get();
        return Inertia::render('forms/create', [
            'machines' => $machines,
        ]);
    }

    public function store(Request $request)
{
    return DB::transaction(function () use ($request) {

        $validated = $request->validate([
            'metadata.machine_type'              => 'required|string|exists:machines,machine_type',
            'metadata.form_title'                => 'required|string|max:255',
            'metadata.form_description'          => 'nullable|string',

            'sections'                           => 'required|array|min:1',
            'sections.*.section_title'           => 'required|string|max:255',
            'sections.*.section_description'     => 'nullable|string',
            'sections.*.questions'               => 'required|array|min:1',
            'sections.*.questions.*.question_text' => 'required|string',
            'sections.*.questions.*.question_image' => 'nullable',
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
            'sections.*.questions.*.options.*.goto_form_section_id' => 'nullable',
            'sections.*.questions.*.is_required'   => 'required|boolean',
            'sections.*.questions.*.validation_rules' => 'nullable',
        ]);

        $meta = $validated['metadata'];
        $machine = Machine::where('machine_type', $meta['machine_type'])->firstOrFail();
        $machineTypePrefix = substr(strtoupper($machine->machine_type), 0, 3);

        do {
            $formCode = "FRM{$machineTypePrefix}" . strtoupper(uniqid());
        } while (Form::where('form_code', $formCode)->exists());

        // 1. Simpan Form Utama
        $form = new Form();
        $form->machine_id       = $machine->id;
        $form->form_code        = $formCode;
        $form->form_title       = $meta['form_title'];
        $form->form_description = $meta['form_description'] ?? '-';
        $form->save();
        
        // Array penampung untuk memetakan index section ke ID database asli (untuk goto_form_section_id)
        $createdSectionIds = [];

        // 2. Simpan Sections Terlebih Dahulu agar Mendapatkan ID Database
        foreach ($validated['sections'] as $sIndex => $sectionData) {
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
        foreach ($validated['sections'] as $sIndex => $sectionData) {
            // Ambil section yang bersangkutan berdasarkan form_id dan urutannya
            $section = FormSection::where('form_id', $form->id)
                ->where('section_order', $sIndex + 1)
                ->first();

            foreach ($sectionData['questions'] as $qIndex => $questionData) {
                $imagePath = null;
                if (isset($questionData['question_image']) && $questionData['question_image'] instanceof \Illuminate\Http\UploadedFile) {
                    $imagePath = $questionData['question_image']->store('question-images', 'public');
                } else {
                    $imagePath = $questionData['question_image'] ?? null;
                }

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
                        
                        // Konversi index section dari frontend menjadi ID database asli
                        $targetSectionIndex = $optionData['goto_form_section_id'] ?? null;
                        $realSectionId = null;

                        if ($targetSectionIndex !== '' && $targetSectionIndex !== null) {
                            // Cek apakah index tersebut ada di array mapping kita
                            $numericIndex = (int) $targetSectionIndex;
                            if (isset($createdSectionIds[$numericIndex])) {
                                $realSectionId = $createdSectionIds[$numericIndex];
                            }
                        }

                        FormOption::create([
                            'form_question_id'     => $question->id,
                            'option_code'          => "OPT-" . strtoupper(uniqid()),
                            'option_text'          => $optionData['option_text'],
                            'option_order'         => $oIndex + 1,
                            'is_normal'            => $optionData['is_normal'] ?? false,
                            'goto_form_section_id' => $realSectionId, // Disimpan dengan ID database yang valid
                        ]);
                    }
                }
            }
        }

            Task::create([
                'machine_id'           => $machine->id,
                'form_id'              => $form->id,
                'task_code'            => 'TSK-' . strtoupper(uniqid()), 
                'due_date'             => now()->addDays(1)->format('Y-m-d'),
                'status'               => 'DUE',
                'assigned_user_id'     => null,
            ]);

           return redirect()->route('forms.index')->with('success', 'Template form baru berhasil dibuat!');
        });
    }

   public function edit($id)
{
    $form = Form::with('sections.questions.options')->findOrFail($id);
    $machines = Machine::select('id', 'machine_type')->get(); // Jika butuh pilihan mesin juga

    // Sesuaikan string ini dengan lokasi file React Anda di resources/js/Pages/
    return Inertia::render('forms/edit', [ // Ganti 'forms/{id}/edit' menjadi 'forms/edit' (atau 'forms/Edit')
        'form' => $form,
        'machines' => $machines,
    ]);
}

   public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $form = Form::findOrFail($id);

            $validated = $request->validate([
                'metadata.machine_type'              => 'required|string|exists:machines,machine_type',
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
                'sections.*.questions.*.options.*.goto_form_section_id' => 'nullable', // Tambahan validasi untuk goto section
                'sections.*.questions.*.is_required'   => 'required|boolean',
                'sections.*.questions.*.validation_rules' => 'nullable',
            ]);

            $meta = $validated['metadata'];
            $machine = Machine::where('machine_type', $meta['machine_type'])->firstOrFail();

            // Update info utama form
            $form->update([
                'machine_id'       => $machine->id,
                'form_title'       => $meta['form_title'],
                'form_description' => $meta['form_description'] ?? '-',
            ]);

            $form->touch();

            $existingSectionIds = [];
            // Array untuk memetakan index section di frontend ke ID database asli
            $createdSectionIds = [];

            // 1. Simpan / Update Sections Terlebih Dahulu
            foreach ($validated['sections'] as $sIndex => $sectionData) {
                $section = FormSection::updateOrCreate(
                    ['id' => $sectionData['id'] ?? null, 'form_id' => $form->id],
                    [
                        'section_code'        => $sectionData['section_code'] ?? "SEC-" . strtoupper(uniqid()),
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
            foreach ($validated['sections'] as $sIndex => $sectionData) {
                // Ambil section berdasarkan form_id dan urutannya yang valid
                $section = FormSection::where('form_id', $form->id)
                    ->where('section_order', $sIndex + 1)
                    ->first();

                $existingQuestionIds = [];

                foreach ($sectionData['questions'] as $qIndex => $questionData) {
                    $questionId = $questionData['id'] ?? null;
                    $oldQuestion = $questionId ? FormQuestion::find($questionId) : null;
                    
                    $imagePath = null;
                    $incomingImage = $questionData['question_image'] ?? null;

                    // Logika Gambar (Upload baru, Hapus, atau Pertahankan)
                    if ($incomingImage instanceof \Illuminate\Http\UploadedFile) {
                        if ($oldQuestion && $oldQuestion->question_image) {
                            Storage::disk('public')->delete($oldQuestion->question_image);
                        }
                        $imagePath = $incomingImage->store('question-images', 'public');
                    } elseif (is_null($incomingImage) || $incomingImage === '' || $incomingImage === 'null') {
                        if ($oldQuestion && $oldQuestion->question_image) {
                            Storage::disk('public')->delete($oldQuestion->question_image);
                        }
                        $imagePath = null;
                    } else {
                        $imagePath = $oldQuestion ? $oldQuestion->question_image : null;
                    }

                    $question = FormQuestion::updateOrCreate(
                        ['id' => $questionId, 'form_id' => $form->id, 'form_section_id' => $section->id],
                        [
                            'question_code'    => $questionData['question_code'] ?? "QST-" . strtoupper(uniqid()),
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

                            $option = FormOption::updateOrCreate(
                                ['id' => $optionData['id'] ?? null, 'form_question_id' => $question->id],
                                [
                                    'option_code'          => $optionData['option_code'] ?? "OPT-" . strtoupper(uniqid()),
                                    'option_text'          => $optionData['option_text'],
                                    'option_order'         => $oIndex + 1,
                                    'is_normal'            => $optionData['is_normal'] ?? false,
                                    'goto_form_section_id' => $realSectionId, // Disimpan dengan ID database yang valid
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
                        if ($q->question_image) {
                            Storage::disk('public')->delete($q->question_image);
                        }
                        $q->delete();
                    });
            }

            // Hapus section yang sudah dibuang
            FormSection::where('form_id', $form->id)
                ->whereNotIn('id', $existingSectionIds)
                ->delete();

            return redirect()->route('forms.index')
                ->with('success', 'Template form berhasil diperbarui!');
        });
    }

    public function destroy($id)
    {
        return DB::transaction(function () use ($id) {
            $form = Form::with('sections.questions.options')->findOrFail($id);

            foreach ($form->sections as $section) {
                foreach ($section->questions as $question) {
                    if ($question->question_image) {
                        Storage::disk('public')->delete($question->question_image);
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

    public function destroyImage($questionId)
    {
        $question = FormQuestion::findOrFail($questionId);

        if ($question->question_image) {
            Storage::disk('public')->delete($question->question_image);
            $question->question_image = null;
            $question->save();
        }

        return back()->with('success', 'Gambar berhasil dihapus!');
    }
}