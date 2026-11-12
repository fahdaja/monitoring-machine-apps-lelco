<?php

    namespace App\Http\Controllers;

    use Inertia\Inertia;
    use Illuminate\Http\Request;
    use Illuminate\Support\Facades\DB;
    use Illuminate\Support\Facades\Storage;
    use Illuminate\Support\Facades\Log;
    use Illuminate\Support\Str;
    use App\Models\User;
    use App\Models\Form;
    use App\Models\Machine;
    use App\Models\FormSection;
    use App\Models\FormQuestion;
    use App\Models\FormOption;
    use App\Models\Task;
    use App\Models\TaskSubmission;
    use App\Models\BreakdownTicket;
    use Carbon\Carbon;

    class TaskController extends Controller {



        private function buildEnterpriseSnapshot($task, array $submittedAnswers)
    {
        $form = $task->form()->with(['sections.questions.options'])->first();
        
        $sectionsSnapshot = [];

        foreach ($form->sections as $section) {
            $questionsSnapshot = [];

            foreach ($section->questions as $question) {
                $qId = $question->id;
                // Ambil jawaban user berdasarkan question ID
                $userAns = $submittedAnswers[$qId] ?? [];

                $rawValue = $userAns['value'] ?? null;
                $note = $userAns['note'] ?? '';
                $photos = $userAns['photos'] ?? [];

                // Mapping selected options (mendukung single value atau array untuk checkbox/dropdown)
                $selectedOptionsSnapshot = [];
                $valueArray = is_array($rawValue) ? $rawValue : [$rawValue];

                if (!empty($rawValue)) {
                    // 🔥 PERBAIKAN: Cocokkan opsi berdasarkan ID ATAU text opsi (agar checkbox & dropdown terbaca)
                    $matchedOptions = $question->options->filter(function($opt) use ($valueArray) {
                        return in_array($opt->id, $valueArray) || in_array($opt->option_text, $valueArray);
                    });
                    
                    foreach ($matchedOptions as $opt) {
                        $selectedOptionsSnapshot[] = [
                            'form_option_id'       => $opt->id,
                            'option_code'          => $opt->option_code,
                            'option_text'          => $opt->option_text,
                            'option_order'         => $opt->option_order,
                            'is_normal'            => (bool) $opt->is_normal, // Properti is_normal sekarang dijamin ikut terbawa!
                            'goto_form_section_id' => $opt->goto_form_section_id,
                        ];
                    }
                }

                $questionsSnapshot[] = [
                    'form_question_id' => $question->id,
                    'question_code'    => $question->question_code,
                    'question_text'    => $question->question_text,
                    'input_type'       => $question->input_type,
                    'is_required'      => (bool) $question->is_required,
                    'question_order'   => $question->question_order,
                    'answer_detail'    => [
                        'value'  => $rawValue,
                        'note'   => $note,
                        'photos' => $photos,
                    ],
                    'selected_options' => $selectedOptionsSnapshot,
                ];
            }

            $sectionsSnapshot[] = [
                'form_section_id'     => $section->id,
                'section_code'        => $section->section_code,
                'section_title'       => $section->section_title,
                'section_description' => $section->section_description,
                'section_order'       => $section->section_order,
                'questions'           => $questionsSnapshot,
            ];
        }

        return [
            'metadata' => [
                'form_id'          => $form->id,
                'form_code'        => $form->form_code,
                'form_title'       => $form->form_title,
                'form_description' => $form->form_description,
            ],
            'sections' => $sectionsSnapshot,
        ];
    }


        public function index(){
            $tasks = Task::with(['machine', 'form', 'user'])->whereIn('status', ['UPCOMING', 'IN_PROGRESS', 'OVERDUE', 'DUE', 'COMPLETED'])->orderBy('due_date', 'asc')->get();

    
            
            foreach ($tasks as $task) {
                if (!$task->due_date) {
            continue;
        }
            if ($task->status === 'UPCOMING' && ($now->equalTo($dueDate) || $now->isAfter($dueDate))) {
                    $task->update(['status' => 'DUE']);
                    $task->refresh();
            }
            if ($task->due_date && Carbon::now()->isAfter($task->due_date) && !in_array($task->status, ['COMPLETED', 'OVERDUE', 'IN_PROGRESS'])) {
                $task->update(['status' => 'OVERDUE']);
                $task->refresh(); // Refresh instance agar status terupdate di memori
            }
        }

        $formattedTasks = $tasks->map(function($task){
            $machine = $task->machine;
            $inspectorName = $task->user->full_name ?? 'Belum ditugaskan';

            return [
                'taskId' => $task->id,
                'taskCode' => $task->task_code,
                'machineCode' => $machine->machine_code,
                'machineName' => $machine->machine_name,
                'location' => $machine->location,
                'activity' => $task->form->form_title,
                'scheduledDate' => $task->due_date,
                'status' => $task->status,
                'inspectorName' => $inspectorName,
                'completedAt' => $task->completed_at ? Carbon::parse($task->completed_at)->format('H:i') : null,
                'assignedUserId' => $task->assigned_user_id,
            ];
        });

        $now = Carbon::now();
        $calendarData = [
            'year' => $now->year,
            'month' => $now->month,
            'daysInMonth' => $now->daysInMonth,
            'daysInWeek' => $now->copy()->startOfMonth()->dayOfWeekIso - 1,
            'today' => $now->toDateString(),
            'tasks' => $formattedTasks,
        ];
        // dd($tasks->toArray());
            return Inertia::render('tasks/index', [
                'calendarData' => $calendarData
            ]);
        }


        public function show($id)
    {
        $task = Task::with([
            'form.machine',
            'form.sections' => function($query) {
                $query->orderBy('section_order', 'asc');
            },
            'form.sections.questions' => function($query) {
                $query->orderBy('question_order', 'asc');
            },
            'form.sections.questions.options' => function($query) {
                $query->orderBy('option_order', 'asc');
            }
        ])->findOrFail($id);

        $userId = auth()->id();
        $updateData = [];

        if ($task->status === 'COMPLETED') {
            return redirect()->route('tasks.index')->with('error', 'Task ini sudah selesai dikerjakan.');
        }

        if (!is_null($task->assigned_user_id) && $task->assigned_user_id !== $userId) {
            return redirect()->route('tasks.index')
                ->with('error', 'Task ini sedang dikerjakan atau sudah di-assign ke teknisi lain.');
        }

        if (is_null($task->assigned_user_id)) {
            $updateData['assigned_user_id'] = $userId;
        }

        if (in_array($task->status, ['DUE', 'OVERDUE', null ])) {
            $updateData['status'] = 'IN_PROGRESS';
        }

        if (!empty($updateData)) {
            $task->update($updateData);
        }

        // --- CARI DRAFT DENGAN AMAN ---
        $draft = TaskSubmission::where('task_id', $task->id)
                            ->where('user_id', $userId)
                            ->where('status', 'DRAFT')
                            ->first();

        $initialAnswersMap = [];

        // Jika draft ditemukan, ekstrak datanya
        if ($draft && !empty($draft->answers_values)) {
            $answersData = $draft->answers_values;

            // Mendukung struktur enterprise snapshot (yang memiliki key 'sections')
            if (isset($answersData['sections']) && is_array($answersData['sections'])) {
                foreach ($answersData['sections'] as $section) {
                    if (isset($section['questions']) && is_array($section['questions'])) {
                        foreach ($section['questions'] as $q) {
                            $qId = $q['form_question_id'] ?? null;
                            $answerDetail = $q['answer_detail'] ?? [];

                            if ($qId) {
                                $initialAnswersMap[$qId] = [
                                    'value'  => $answerDetail['value'] ?? '',
                                    'note'   => $answerDetail['note'] ?? '',
                                    'photos' => $answerDetail['photos'] ?? '', // String tunggal foto evidence
                                ];
                            }
                        }
                    }
                }
            } 
            // Jikalau struktur lama berupa key-value langsung (fallback)
            else {
                $initialAnswersMap = $answersData;
            }
        }

        // Kirim ke Inertia React
        return Inertia::render('tasks/show', [
            'task' => $task,
            'initialAnswers' => $initialAnswersMap
        ]);
    }
    public function submit(Request $request, $id)
        {
            // 1. Load task beserta relasi form, sections, questions, dan options
            $task = Task::with(['form.sections.questions.options', 'form.machine'])->findOrFail($id);
            
            // 2. Validasi input dasar dari frontend
            $validated = $request->validate([
                'answers' => 'nullable|array',
                'answers.*.value' => 'nullable',
                'answers.*.note' => 'nullable|string',
                'answers.*.photos' => 'nullable|string',
            ]);

            $submittedAnswers = $request->input('answers', []);
            $customErrors = [];

            // Flatten semua questions dari form untuk pengecekan cepat
            $allQuestions = $task->form->sections->flatMap->questions;

            $skippedSectionIds = [];
            $sections = $task->form->sections;

            foreach ($sections as $index => $section) {
            foreach ($section->questions as $q) {
            $ans = $submittedAnswers[$q->id] ?? null;
            $val = $ans['value'] ?? null;
            
            if ($val !== null && $val !== '') {
                // Cari opsi yang dipilih
                $selectedOpt = $q->options->first(function($opt) use ($val) {
                    return $opt->id == $val || $opt->option_text == $val;
                });

                // Jika opsi ini punya tujuan lompatan
                if ($selectedOpt && $selectedOpt->goto_form_section_id) {
                    $targetIndex = $sections->search(fn($s) => $s->id == $selectedOpt->goto_form_section_id);
                    if ($targetIndex !== false && $targetIndex !== -1) {
                        // Tandai semua section di antara section ini dan target sebagai "dilewati"
                        for ($i = $index + 1; $i < $targetIndex; $i++) {
                            $skippedSectionIds[] = $sections[$i]->id;
                        }
                    }
                }
            }
        }
    }

            // 3. Validasi kondisional per pertanyaan (Wajibkan note & photos jika abnormal)
            foreach ($submittedAnswers as $questionId => $answer) {
                $question = $allQuestions->firstWhere('id', $questionId);
                if (!$question) continue;

                $value = $answer['value'] ?? null;
                $note = trim($answer['note'] ?? '');
                $photos = trim($answer['photos'] ?? '');

                // Cek jika pertanyaan wajib (is_required) tapi kosong
                $isEmptyValue = empty($value) && $value !== '0' && $value !== 0;
                if (is_array($value) && count($value) === 0) {
                    $isEmptyValue = true;
                }
                
                $isSectionSkipped = in_array($question->form_section_id, $skippedSectionIds);
                if ($question->is_required && !$isSectionSkipped && $isEmptyValue) {
                    $customErrors["answers.{$questionId}.value"] = "Pertanyaan \"{$question->question_text}\" wajib diisi.";
                    continue;
                }

                // Cek apakah jawaban ini abnormal berdasarkan is_normal == false
                $isAbnormal = false;

                if (!$isEmptyValue) {
                    $valueArray = is_array($value) ? $value : [$value];

                    $matchedAbnormalOptions = $question->options->filter(function($opt) use ($valueArray) {
                        return (in_array($opt->id, $valueArray) || in_array($opt->option_text, $valueArray))
                            && ($opt->is_normal === false || $opt->is_normal == 0);
                    });

                    if ($matchedAbnormalOptions->isNotEmpty()) {
                        $isAbnormal = true;
                    }
                }

                // Jika abnormal, note dan photos wajib diisi!
                if ($isAbnormal) {
                    if (empty($note)) {
                        $customErrors["answers.{$questionId}.note"] = 'Catatan wajib diisi untuk temuan abnormal.';
                    }
                    if (empty($photos)) {
                        $customErrors["answers.{$questionId}.photos"] = 'Foto evidence wajib diisi untuk temuan abnormal.';
                    }
                }
            }

            // 💡 KUNCI UTAMA: Jika ada error kustom validasi abnormal/required, kembalikan ke frontend!
            if (!empty($customErrors)) {
                return back()->withErrors($customErrors)->withInput();
            }
            
            return DB::transaction(function () use ($request, $task, $validated) {
                
                try {
                $form = $task->form;
                $submittedAnswers = $validated['answers'] ?? [];

                // 4. Panggil fungsi build enterprise snapshot
                $enterpriseSnapshot = $this->buildEnterpriseSnapshot($task, $submittedAnswers);

                // 5. Simpan ke tabel 'task_submissions' dengan status SUBMITTED
                $submission = TaskSubmission::updateOrCreate(
                    [
                        'task_id' => $task->id, 
                        'user_id' => auth()->id()
                    ],
                    [
                        'submission_code' => 'SUB-' . strtoupper(Str::random(8)),
                        'user_id'         => auth()->id(),
                        'status'          => 'SUBMITTED',
                        'answers_values'  => $enterpriseSnapshot,
                        'submitted_at'    => now(),
                    ]
                );
                // 6. Kumpulkan semua item abnormal dari enterprise snapshot
                $abnormalItems = [];

                foreach ($enterpriseSnapshot['sections'] as $sec) {
                    foreach ($sec['questions'] as $q) {
                        $abnormalOptions = collect($q['selected_options'])->where('is_normal', false);

                        if ($abnormalOptions->isNotEmpty()) {
                            $abnormalTexts = $abnormalOptions->pluck('option_text')->join(', ');
                            $note = !empty($q['answer_detail']['note']) ? " (Catatan: {$q['answer_detail']['note']})" : "";
                            
                            $abnormalItems[] = "- [{$q['question_text']}]: {$abnormalTexts}{$note}";
                        }
                    }
                }
                // dd($abnormalItems);

                // 7. Auto-trigger Breakdown Ticket (Terkonsolidasi & Anti-Spam)
                if (!empty($abnormalItems)) {
        $machineId = $form->machine_id;

        // Kumpulkan detail data abnormal dalam bentuk struktur array rapi
        $problemsList = [];
        foreach ($enterpriseSnapshot['sections'] as $sec) {
            foreach ($sec['questions'] as $q) {
                $abnormalOptions = collect($q['selected_options'])->where('is_normal', false);

                if ($abnormalOptions->isNotEmpty()) {
                    $problemsList[] = [
                        'question_text'    => $q['question_text'],
                        'abnormal_options' => $abnormalOptions->pluck('option_text')->join(', '),
                        'note'             => $q['answer_detail']['note'] ?? null,
                        'photo_evidence'   => is_array($q['answer_detail']['photos']) ? ($q['answer_detail']['photos'][0] ?? null) : ($q['answer_detail']['photos'] ?? null),
                    ];
                }
            }
        }

        $datePrefix = 'BD-' . now()->format('Ym') . '-';
        $lastTicket = BreakdownTicket::where('ticket_code', 'LIKE', $datePrefix . '%')
            ->latest('id')
            ->first();

        $ticketCode = 'TKT-' . strtoupper(Str::random(6));

        // Buat tiket dengan menyimpan data array langsung ke kolom 'problems'
        $ticket = BreakdownTicket::create([
            'ticket_code'      => $ticketCode,
            'machine_id'       => $machineId,
            'source_type'      => 'AUTO_REPORT',
            'problem_category' => 'Inspeksi Abnormal',
            'problems'         => $problemsList, // 💡 Simpan sebagai array JSON
            'status'           => 'OPEN',
            'reported_at'      => now(),
        ]);

        Machine::where('id', $machineId)->update(['machine_status' => 'DOWN']);
        $submission->update(['escalation_ticket_id' => $ticket->id]);
    }
                // 8. Update status task jadi selesai (COMPLETED)
                $task->update([
                    'status'       => 'COMPLETED',
                    'completed_at' => now(),
                ]);
                return redirect()->route('tasks.index')
                    ->with('success', 'Form inspeksi berhasil diselesaikan dan tiket eskalasi telah diperiksa!');
            } catch (\Exception $e) {
                    // Tangkap error asli jika ada kendala database
                    dd("ERROR DATABASE ASLI:", $e->getMessage(), $e->getFile(), $e->getLine());
                }
            });
            
        }
        

    public function saveDraft(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $rawAnswers = $request->input('answers', []);
        if (!is_array($rawAnswers)) {
            $rawAnswers = [];
        }

        $enterpriseSnapshot = $this->buildEnterpriseSnapshot($task, $rawAnswers);
        
        $draft = TaskSubmission::updateOrCreate(
            ['task_id' => $task->id, 'user_id' => auth()->id()],
            [
                'submission_code' => 'DRF-' . strtoupper(Str::random(8)),
                'status'          => 'DRAFT',
                'answers_values'  => $enterpriseSnapshot,
            ]
        );

        if ($request->has('current_section_index')) {
            $task->current_section_index = $request->current_section_index;
            $task->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Draft berhasil disimpan',
        ], 200);
    }

    public function uploadTempFile(Request $request)
    {
        $folder = $request->input('folder', 'question-files');
        $questionId = $request->input('question_id');

        // Inisialisasi awal kosong (tanpa default bebas untuk question-files)
        $maxKb = null;
        $allowedMimes = null;
        $maxSizeLabel = '';
        $allowedTypesLabel = '';

        // Jika ini question file dan membawa ID pertanyaan, baca validation_rules murni dari DB
    if ($folder === 'question-files' && $questionId) {
            $question = FormQuestion::find($questionId);
            if ($question && $question->validation_rules) {
                $parsedRules = is_string($question->validation_rules) 
                    ? json_decode($question->validation_rules, true) 
                    : $question->validation_rules;
                
                // Amankan berbagai bentuk struktur: objek langsung, array bersarang [0], atau key tunggal
                $rules = [];
                if (is_array($parsedRules)) {
                    $rules = isset($parsedRules[0]) && is_array($parsedRules[0]) ? $parsedRules[0] : $parsedRules;
                }

                // 1. Tangkap max_file_size (mendukung berbagai variasi penulisan key)
                $rawMaxSize = $rules['max_file_size'] ?? $rules['max_size'] ?? $rules['size'] ?? null;
                if (!empty($rawMaxSize)) {
                    $sizeStr = strtoupper(trim($rawMaxSize));
                    $maxSizeLabel = $rawMaxSize;
                    $num = floatval($sizeStr);
                    
                    if (str_contains($sizeStr, 'MB')) {
                        $maxKb = intval($num * 1024);
                    } elseif (str_contains($sizeStr, 'KB')) {
                        $maxKb = intval($num);
                    }
                }

                // 2. Tangkap allowed_file_type (mendukung berbagai variasi penulisan key & format array/string)
                $rawAllowed = $rules['allowed_file_type'] ?? $rules['allowed_types'] ?? $rules['file_types'] ?? null;
                if (!empty($rawAllowed)) {
                    $types = is_array($rawAllowed) 
                        ? $rawAllowed 
                        : explode(',', $rawAllowed);
                    
                    $filteredTypes = array_filter(array_map('trim', $types), function($t) {
                        return strtoupper($t) !== 'IMAGE' && !empty($t);
                    });

                    if (!empty($filteredTypes)) {
                        $allowedTypesLabel = implode(', ', $filteredTypes);
                        $allowedMimes = implode(',', $filteredTypes);
                    }
                }
            }
        }
        // Jika evidence foto, gunakan aturan statis khusus gambar (maks 2MB)
        elseif ($folder === 'evidence-photos') {
            $maxKb = 2048; // 2MB
            $allowedMimes = 'jpg,jpeg,png';
            $maxSizeLabel = '2MB';
            $allowedTypesLabel = 'jpg, jpeg, png';
        }

        if ($folder === 'question-files') {
            if (!$maxKb) {
                $maxKb = 5048; // Default 10MB jika admin kosongkan
                $maxSizeLabel = '5MB';
            }
            if (!$allowedMimes) {
                // Biarkan kosong / izinkan format dokumen & gambar umum jika admin tidak set apa-apa
                $allowedMimes = 'jpg.jpeg,png,pdf'; 
                $allowedTypesLabel = 'JPG, JPEG, PNG, PDF';
            }
        }

        // Jalankan validasi dinamis berdasarkan data murni dari admin
        $request->validate([
            'file' => "required|file|mimes:{$allowedMimes}|max:{$maxKb}",
        ], [
            'file.mimes' => "Format file tidak sesuai dengan: {$allowedTypesLabel}.",
            'file.max' => "Ukuran file terlalu besar. Batas maksimal ukuran file adalah {$maxSizeLabel}.",
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store($folder, 'public');

            return response()->json([
                'success' => true,
                'path' => $path,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Gagal mengunggah file.'
        ], 400);
    }

    public function removeFile(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $path = $request->input('path');

        // Cek apakah file benar-benar ada di disk public (mencakup folder evidence-photos / question-files)
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);

            return response()->json([
                'success' => true,
                'message' => 'File fisik berhasil dihapus dari storage.'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'File tidak ditemukan di storage.'
        ], 404);
    }


    public function apiFindTaskByMachine(Request $request, $code)
    {
        // Bersihkan kode (jika yang diskan berupa URL lengkap, ambil bagian paling belakangnya)
        $cleanCode = strtoupper(trim(basename($code)));
        $userId = auth()->id();

        // 1. Cari mesin berdasarkan kode atau ID
        $machine = Machine::whereRaw('UPPER(machine_code) = ?', [$cleanCode])->first();

        if (!$machine) {
            return response()->json([
                'success' => false,
                'message' => "Mesin dengan kode '{$cleanCode}' tidak ditemukan di sistem."
            ], 404);
        }

        // 2. Cari task aktif (DUE, OVERDUE, atau IN_PROGRESS) milik user ini
        $task = Task::where('machine_id', $machine->id)
            ->whereIn('status', ['DUE', 'OVERDUE', 'IN_PROGRESS'])
            ->where(function($query) use ($userId) {
                $query->where('assigned_user_id', $userId)
                    ->orWhereNull('assigned_user_id');
            })
            ->orderBy('due_date', 'asc')
            ->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => "Tidak ada task aktif (Due/Overdue) untuk mesin {$machine->machine_name} ({$machine->machine_code})."
            ], 404);
        }

        // 3. Kembalikan ID task yang dituju
        return response()->json([
            'success' => true,
            'taskId' => $task->id,
            'machineName' => $machine->machine_name
        ]);
    }



    public function handleQrScanRedirect(Request $request, $machineCode)
    {
        // 1. Jika user belum login, lempar ke halaman login
        if (!auth()->check()) {
            // Simpan URL yang ingin dituju agar setelah login bisa langsung diarahkan kembali ke sini
            session(['url.intended' => request()->fullUrl()]);
            return redirect()->route('login');
        }

        $userId = auth()->id();
        $upperMachineCode = strtoupper(trim($machineCode));

        // 2. Cari mesin berdasarkan kode QR
        $machine = Machine::whereRaw('UPPER(machine_code) = ?', [$upperMachineCode])->first();

        if (!$machine) {
            return redirect()->route('tasks.index')
                ->with('error', "Mesin dengan kode '{$machineCode}' tidak ditemukan di sistem.");
        }

        // Cari task apapun untuk mesin ini, tanpa filter user
    $tasks = Task::where('machine_id', $machine->id)
        ->whereIn('status', ['DUE', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED'])
        ->orderBy('due_date', 'asc')
        ->get();

    $priority = ['IN_PROGRESS' => 1, 'OVERDUE' => 2, 'DUE' => 3, 'COMPLETED' => 4];

    $task = $tasks->sortBy(fn($t) => $priority[$t->status] ?? 5)->first();

        if (!$task) {
            return redirect()->route('tasks.index')
                ->with('error', "Tidak ada task untuk mesin {$machine->machine_name} ({$machine->machine_code}).");
        }

        // Kasus 1: task sudah selesai
        if ($task->status === 'COMPLETED') {
            return redirect()->route('tasks.index')
                ->with('error', "Task untuk mesin {$machine->machine_name} sudah selesai dikerjakan pada " .
                    ($task->completed_at ? Carbon::parse($task->completed_at)->format('d M Y H:i') : '-') . ".");
        }

        // Kasus 2: task sedang dikerjakan / di-assign ke orang lain
        if (!is_null($task->assigned_user_id) && $task->assigned_user_id !== $userId) {
            $assignee = $task->user?->full_name ?? 'teknisi lain';
            return redirect()->route('tasks.index')
                ->with('error', "Task untuk mesin {$machine->machine_name} sedang dikerjakan oleh {$assignee} (status: {$task->status}).");
        }

        // Kasus 3: task milik user atau belum di-assign → arahkan ke form
        return redirect()->route('tasks.show', $task->id);
    }
    }