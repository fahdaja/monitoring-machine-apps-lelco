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
    use App\Models\ScheduleCondition;
    use App\Models\BreakdownTicket;
    use Carbon\Carbon;
    use Illuminate\Database\UniqueConstraintViolationException;

    class TaskController extends Controller {

         public function buildEnterpriseSnapshot($task, array $submittedAnswers)
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
                $photos = \App\Support\PhotoValue::list($userAns['photos'] ?? null);
                $answeredAt = $userAns['answered_at'] ?? null;

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
                        'value'       => $rawValue,
                        'note'        => $note,
                        'photos'      => $photos,
                        'answered_at' => $answeredAt,
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

        /**
         * Pesan penolakan seragam: user bukan PIC dari mesin pemilik task.
         */
        private function picDeniedMessage(Machine $machine): string
        {
            $pics = $machine->picNamesText();

            return 'Task mesin ' . $machine->machine_name . ' (' . $machine->machine_code . ') '
                . 'hanya boleh dikerjakan oleh PIC mesin tersebut'
                . ($pics !== '' ? ": {$pics}" : '')
                . '. Hubungi admin jika penanggung jawab mesin perlu diubah.';
        }

        /**
         * ID pertanyaan dependen yang sedang tersembunyi.
         *
         * Pertanyaan bertanda validation_rules[0].show_on_abnormal hanya tampil jika pertanyaan
         * pemicunya (pilihan SELECT/DROPDOWN/CHECKBOX) dijawab salah satu opsi di
         * validation_rules[0].trigger_option_texts (dipilih admin; kosong = opsi abnormal/NG apa pun)
         * DAN pemicu itu sendiri sedang tampil — jadi dependensi bisa berantai.
         * Pemicu: trigger_question_code ("order:N" atau question_code), default pertanyaan pilihan
         * terdekat di atasnya dalam section yang sama.
         * Logika ini dicerminkan di resources/js/lib/question-visibility.ts.
         *
         * @param  iterable  $sections  FormSection dengan relasi questions
         * @param  array<int, int>  $abnormalQuestionIds
         * @return array<int, int>
         */
        private function hiddenConditionalQuestionIds($sections, array $abnormalQuestionIds, array $submittedAnswers = []): array
        {
            $abnormal = array_map('intval', $abnormalQuestionIds);
            $hidden = [];

            $typeOf = function ($q): string {
                $t = $q->input_type;
                return strtoupper($t instanceof \BackedEnum ? (string) $t->value : (string) $t);
            };
            $rulesOf = function ($q): array {
                $r = $q->validation_rules;
                if (! is_array($r)) {
                    return [];
                }
                return is_array($r[0] ?? null) ? $r[0] : $r;
            };
            $isConditional = fn ($q) => filter_var($rulesOf($q)['show_on_abnormal'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $isChoice = fn ($q) => in_array($typeOf($q), ['SELECT', 'DROPDOWN', 'CHECKBOX'], true);
            $isVisibleNg = fn ($q) => in_array((int) $q->id, $abnormal, true) && ! in_array((int) $q->id, $hidden, true);

            foreach ($sections as $section) {
                $qs = collect($section->questions)->sortBy('question_order')->values();

                foreach ($qs as $idx => $q) {
                    if ($idx === 0 || ! $isConditional($q)) {
                        continue;
                    }

                    $triggerCode = $rulesOf($q)['trigger_question_code'] ?? null;
                    $wantedTexts = collect($rulesOf($q)['trigger_option_texts'] ?? [])
                        ->map(fn ($t) => mb_strtolower(trim((string) $t)))
                        ->filter(fn ($t) => $t !== '')
                        ->values()
                        ->all();
                    $trigger = null;

                    if ($triggerCode) {
                        $trigger = (is_string($triggerCode) && str_starts_with($triggerCode, 'order:'))
                            ? $qs->get((int) substr($triggerCode, 6) - 1)
                            : $qs->firstWhere('question_code', $triggerCode);
                        if ($trigger && (int) $trigger->id === (int) $q->id) {
                            $trigger = null;
                        }
                    } else {
                        for ($i = $idx - 1; $i >= 0; $i--) {
                            if ($isChoice($qs[$i])) {
                                $trigger = $qs[$i];
                                break;
                            }
                        }
                    }

                    if ($trigger) {
                        // Pemicu harus tampil, lalu jawabannya = salah satu opsi pilihan admin
                        // (tanpa pilihan opsi → aturan lama: opsi NG apa pun).
                        $visible = ! in_array((int) $trigger->id, $hidden, true) && (
                            $wantedTexts !== []
                                ? $this->answerHasOptionText($trigger, $submittedAnswers[$trigger->id] ?? null, $wantedTexts)
                                : in_array((int) $trigger->id, $abnormal, true)
                        );
                    } else {
                        $visible = ! $triggerCode
                            && $qs->contains(fn ($item) => (int) $item->id !== (int) $q->id && $isVisibleNg($item));
                    }

                    if (! $visible) {
                        $hidden[] = (int) $q->id;
                    }
                }
            }

            return $hidden;
        }

        /**
         * Apakah jawaban pertanyaan pilihan memuat salah satu opsi dengan teks tertentu?
         * Nilai jawaban bisa berupa ID opsi (SELECT) atau teks opsi (DROPDOWN/CHECKBOX).
         *
         * @param  array<int, string>  $wantedTexts  teks opsi, sudah lowercase + trim
         */
        private function answerHasOptionText($question, $answer, array $wantedTexts): bool
        {
            $value = is_array($answer) ? ($answer['value'] ?? null) : null;
            if ($value === null || $value === '' || $value === []) {
                return false;
            }

            $values = array_map('strval', is_array($value) ? $value : [$value]);

            return $question->options->contains(function ($opt) use ($values, $wantedTexts) {
                $text = mb_strtolower(trim((string) $opt->option_text));

                return in_array($text, $wantedTexts, true)
                    && (in_array((string) $opt->id, $values, true)
                        || in_array($text, array_map(fn ($v) => mb_strtolower(trim($v)), $values), true));
            });
        }

        public function index(){
        $currentUser = auth()->user();

        $query = Task::with(['machine.pics', 'form', 'user', 'sourceTask.form', 'triggerCondition', 'assignedUsers', 'finalSubmission'])
            ->whereIn('status', ['UPCOMING', 'IN_PROGRESS', 'OVERDUE', 'DUE', 'COMPLETED']);

        // PIC departemen yang tidak terdaftar di dalam sebuah mesin tidak boleh melihat task mesin tersebut
        if (! $currentUser->hasRole(User::ROLE_ADMIN)) {
            $query->whereHas('machine.pics', function ($q) use ($currentUser) {
                $q->where('users.id', $currentUser->id);
            });
        }

        $tasks = $query->orderBy('due_date', 'asc')->get();

        $formattedTasks = $tasks->map(function($task) use ($currentUser){
            $machine = $task->machine;
            $sourceTask = $task->sourceTask;

            if ($task->user) {
                $inspectorName = $task->user->full_name;
            } elseif ($task->assignedUsers->isNotEmpty()) {
                $inspectorName = $task->assignedUsers->pluck('full_name')->implode(', ');
            } else {
                $inspectorName = 'Semua PIC Mesin';
            }

            // Hitung hak kerja (canWork)
            $canWork = true;
            if ($task->status === 'COMPLETED') {
                $canWork = false;
            } elseif ($currentUser->hasRole(User::ROLE_ADMIN)) {
                $canWork = true;
            } else {
                if (! $machine || ! $machine->isPic($currentUser)) {
                    $canWork = false;
                } elseif ($task->assignedUsers->isNotEmpty() && ! $task->assignedUsers->contains('id', $currentUser->id)) {
                    $canWork = false;
                } elseif (!is_null($task->assigned_user_id) && (int) $task->assigned_user_id !== (int) $currentUser->id && $task->status === 'IN_PROGRESS') {
                    $canWork = false;
                }
            }

            return [
                'taskId' => $task->id,
                'taskCode' => $task->task_code,
                'machineCode' => $machine?->machine_code,
                'machineName' => $machine?->machine_name,
                'location' => $machine?->location,
                'activity' => $task->form?->form_title,
                'scheduledDate' => $task->due_date ? $task->due_date->format('Y-m-d') : null,
                'endDate'  => $task->end_date ? $task->end_date->format('Y-m-d') : null,
                'status' => $task->status,
                'inspectorName' => $inspectorName,
                'completedAt' => $task->completed_at ? Carbon::parse($task->completed_at)->format('H:i') : null,
                'assignedUserId' => $task->assigned_user_id,
                // Provenance: panel detail & kalender butuh ini untuk membedakan task lanjutan.
                'originType' => $task->origin_type ?: 'SCHEDULE',
                'sourceTaskId' => $task->source_task_id,
                'sourceTaskCode' => $sourceTask?->task_code,
                'sourceFormTitle' => $sourceTask?->form?->form_title,
                'conditionCode' => $task->triggerCondition?->condition_code,
                'canWork' => $canWork,
                'picNames' => $machine?->picNamesText() ?? '',
                // Record jawaban hanya ada setelah task COMPLETED
                'recordUrl' => $task->finalSubmission ? '/records/'.$task->finalSubmission->id : null,
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
        $todayCreateOptions = null;
        if ($currentUser->hasRole(User::ROLE_ADMIN)) {
            $todayCreateOptions = [
                'machines' => Machine::with('pics:id,full_name,department')
                    ->where('active_status', true)
                    ->orderBy('machine_code')
                    ->get()
                    ->map(fn (Machine $m) => [
                        'id' => $m->id,
                        'machine_code' => $m->machine_code,
                        'machine_name' => $m->machine_name,
                        'location' => $m->location,
                        'pics' => $m->pics->map(fn (User $u) => [
                            'id' => $u->id,
                            'full_name' => $u->full_name,
                            'department' => $u->department,
                        ])->values()->all(),
                    ])->values()->all(),
                'forms' => Form::where('form_type', 'INSPECTION')
                    ->orderBy('form_title')
                    ->get(['id', 'form_code', 'form_title'])
                    ->values()
                    ->all(),
            ];
        }

        return Inertia::render('tasks/index', [
            'calendarData' => $calendarData,
            'todayCreateOptions' => $todayCreateOptions,
        ]);
        }

        /**
         * Admin membuat task inspeksi khusus untuk HARI INI saja (due_date = end_date = today).
         */
        public function storeToday(Request $request)
        {
            $today = Carbon::today();

            $validated = $request->validate([
                'machine_id' => 'required|integer|exists:machines,id',
                'form_id' => 'required|integer|exists:forms,id',
                'end_date' => ['nullable', 'date', 'after_or_equal:' . $today->toDateString()],
                'assigned_user_ids' => 'nullable|array',
                'assigned_user_ids.*' => 'integer|exists:users,id',
            ]);

            $endDate = ! empty($validated['end_date']) ? Carbon::parse($validated['end_date']) : $today;
            $machine = Machine::findOrFail($validated['machine_id']);

            $alreadyExists = Task::where('machine_id', $machine->id)
                ->where('form_id', $validated['form_id'])
                ->whereDate('due_date', $today)
                ->exists();

            if ($alreadyExists) {
                return back()->with('error', "Task untuk mesin {$machine->machine_code} dengan formulir tersebut sudah ada untuk hari ini.");
            }

            $task = Task::create([
                'task_code' => 'TSK-' . strtoupper(Str::random(10)),
                'machine_id' => $machine->id,
                'form_id' => $validated['form_id'],
                'due_date' => $today,
                'end_date' => $endDate,
                'status' => 'DUE',
                'origin_type' => 'SCHEDULE',
            ]);

            $assignedIds = collect($validated['assigned_user_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all();

            if (! empty($assignedIds)) {
                $task->assignedUsers()->sync($assignedIds);
            }

            return back()->with('success', "Task inspeksi hari ini ({$task->task_code}) untuk mesin {$machine->machine_code} berhasil dibuat.");
        }


        public function show($id)
    {
        $task = Task::with([
            'machine.pics',
            'form.machine',
            'form.sections' => function($query) {
                $query->orderBy('section_order', 'asc');
            },
            'form.sections.questions' => function($query) {
                $query->orderBy('question_order', 'asc');
            },
            'form.sections.questions.options' => function($query) {
                $query->orderBy('option_order', 'asc');
            },
            'sourceTask.form',
            'triggerCondition.triggerQuestion',
            'triggerCondition.triggerOption',
        ])->findOrFail($id);

        $userId = auth()->id();
        $updateData = [];

        if ($task->status === 'COMPLETED') {
            return redirect()->route('tasks.index')->with('error', 'Task ini sudah selesai dikerjakan.');
        }

        if ($task->status === 'UPCOMING') {
            return redirect()->route('tasks.index')->with('error', 'Task ini belum dapat dikerjakan karena jadwal belum dimulai.');
        }

        // Gate PIC: hanya penanggung jawab mesin yang boleh membuka form inspeksi ini.
        $machine = $task->machine;
        $currentUser = auth()->user();

        if ($machine && ! $machine->canBeWorkedBy($currentUser)) {
            return redirect()->route('tasks.index')->with('error', $this->picDeniedMessage($machine));
        }

        // Jika task memiliki daftar teknisi/PIC khusus yang ditargetkan
        if (! $currentUser->hasRole(User::ROLE_ADMIN) && $task->assignedUsers()->exists()) {
            if (! $task->assignedUsers()->where('users.id', $userId)->exists()) {
                return redirect()->route('tasks.index')
                    ->with('error', 'Anda tidak ditugaskan untuk mengerjakan task inspeksi mesin ini.');
            }
        }

        if (!is_null($task->assigned_user_id) && $task->assigned_user_id !== $userId) {
            return redirect()->route('tasks.index')
                ->with('error', 'Task ini sedang dikerjakan atau sudah di-assign ke teknisi lain.');
        }

        if (is_null($task->assigned_user_id)) {
            // Admin boleh melihat tanpa merampas penugasan dari PIC-nya.
            if (! $machine || $machine->mayOwnTask(auth()->user())) {
                $updateData['assigned_user_id'] = $userId;
            }
        }

        if (in_array($task->status, ['DUE', 'OVERDUE', null ])) {
            $updateData['status'] = 'IN_PROGRESS';
        }

        if (is_null($task->started_at)) {
            $updateData['started_at'] = now();
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
                                    'value'       => $answerDetail['value'] ?? '',
                                    'note'        => $answerDetail['note'] ?? '',
                                    'photos'      => $answerDetail['photos'] ?? '', // String tunggal foto evidence
                                    'answered_at' => $answerDetail['answered_at'] ?? null,
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

        // Asal-usul task lanjutan: operator harus tahu kenapa form lvl 2 ini muncul.
        $followUp = null;

        if ($task->isFollowUp()) {
            $followUp = [
                'sourceTaskId'        => $task->source_task_id,
                'sourceTaskCode'      => $task->sourceTask?->task_code,
                'sourceFormTitle'     => $task->sourceTask?->form?->form_title,
                'conditionCode'       => $task->triggerCondition?->condition_code,
                'triggerQuestionText' => $task->triggerCondition?->triggerQuestion?->question_text,
                'triggerOptionText'   => $task->triggerCondition?->triggerOption?->option_text,
            ];
        }

        // Kirim ke Inertia React
        return Inertia::render('tasks/show', [
            'task' => $task,
            'initialAnswers' => $initialAnswersMap,
            'followUp' => $followUp,
        ]);
    }
    public function submit(Request $request, $id)
        {
            // 1. Load task beserta relasi form, sections, questions, dan options
            $task = Task::with(['form.sections.questions.options', 'form.machine'])->findOrFail($id);

            // 1b. Gate PIC: tolak submit dari user yang bukan penanggung jawab mesin
            // (misalnya tab lama yang masih terbuka setelah PIC mesin diubah).
            $taskMachine = $task->machine;

            if ($taskMachine && ! $taskMachine->canBeWorkedBy(auth()->user())) {
                return redirect()->route('tasks.index')->with('error', $this->picDeniedMessage($taskMachine));
            }

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

            // 3. Kumpulkan pertanyaan yang memiliki jawaban abnormal (is_normal == false)
            $abnormalQuestionIds = [];
            foreach ($submittedAnswers as $questionId => $answer) {
                $question = $allQuestions->firstWhere('id', $questionId);
                if (!$question) continue;

                $value = $answer['value'] ?? null;
                $isEmptyValue = empty($value) && $value !== '0' && $value !== 0;
                if (is_array($value) && count($value) === 0) {
                    $isEmptyValue = true;
                }
                if ($isEmptyValue) continue;

                $valueArray = is_array($value) ? $value : [$value];
                $matchedAbnormalOptions = $question->options->filter(function($opt) use ($valueArray) {
                    return (in_array($opt->id, $valueArray) || in_array($opt->option_text, $valueArray))
                        && ($opt->is_normal === false || $opt->is_normal == 0);
                });

                if ($matchedAbnormalOptions->isNotEmpty()) {
                    $abnormalQuestionIds[] = $question->id;
                }
            }

            // 4. Validasi required per pertanyaan (termasuk pertanyaan kondisional show_on_abnormal per pemicu)
            // Pertanyaan dependen (mis. "muncul jika pertanyaan 1 = NG") yang pemicunya tidak NG → tersembunyi.
            $hiddenQuestionIds = $this->hiddenConditionalQuestionIds($sections, $abnormalQuestionIds, $submittedAnswers);

            foreach ($submittedAnswers as $questionId => $answer) {
                $question = $allQuestions->firstWhere('id', $questionId);
                if (!$question) continue;

                $value = $answer['value'] ?? null;
                $isEmptyValue = empty($value) && $value !== '0' && $value !== 0;
                if (is_array($value) && count($value) === 0) {
                    $isEmptyValue = true;
                }

                $isSectionSkipped = in_array($question->form_section_id, $skippedSectionIds);
                $isHiddenConditional = in_array((int) $question->id, $hiddenQuestionIds, true);

                if ($question->is_required && !$isSectionSkipped && !$isHiddenConditional && $isEmptyValue) {
                    $customErrors["answers.{$questionId}.value"] = "Pertanyaan \"{$question->question_text}\" wajib diisi.";
                }
            }

            // 💡 KUNCI UTAMA: Jika ada error kustom validasi abnormal/required, kembalikan ke frontend!
            if (!empty($customErrors)) {
                return back()->withErrors($customErrors)->withInput();
            }

            // Jawaban sisa dari pertanyaan yang kini tersembunyi (mis. pemicu diganti NG → OK) dibuang,
            // supaya tidak ikut tersimpan / memicu tiket breakdown.
            if (!empty($hiddenQuestionIds) && is_array($validated['answers'] ?? null)) {
                $validated['answers'] = array_filter(
                    $validated['answers'],
                    fn ($qid) => !in_array((int) $qid, $hiddenQuestionIds, true),
                    ARRAY_FILTER_USE_KEY
                );
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
        $machineId = $task->machine_id ?? $form->machine_id;

        // Kumpulkan detail data abnormal beserta pertanyaan Notes (TEXT/TEXTAREA) & Evidence (FILE) pasangannya
        $problemsList = [];
        foreach ($enterpriseSnapshot['sections'] as $sec) {
            $secQuestions = array_values($sec['questions'] ?? []);
            $secTotal = count($secQuestions);

            foreach ($secQuestions as $qIdx => $q) {
                $abnormalOptions = collect($q['selected_options'])->where('is_normal', false);

                if ($abnormalOptions->isNotEmpty()) {
                    $note = trim((string) ($q['answer_detail']['note'] ?? ''));
                    $rawPhotos = $q['answer_detail']['photos'] ?? null;
                    $photoEvidence = \App\Support\PhotoValue::list($rawPhotos)[0] ?? null;

                    // Ambil jawaban dari pertanyaan lanjutan (Catatan & Upload Foto Evidence) di bawahnya dalam section yang sama
                    $followUpNotes = [];
                    for ($j = $qIdx + 1; $j < $secTotal; $j++) {
                        $nextQ = $secQuestions[$j];
                        $rawNextType = $nextQ['input_type'] ?? '';
                        $nextType = strtoupper($rawNextType instanceof \BackedEnum ? (string) $rawNextType->value : (string) $rawNextType);

                        // Berhenti jika bertemu pertanyaan pilihan berikutnya (pemicu baru)
                        if (in_array($nextType, ['SELECT', 'DROPDOWN', 'CHECKBOX'], true)) {
                            break;
                        }

                        $nextVal = $nextQ['answer_detail']['value'] ?? null;
                        if (is_array($nextVal)) {
                            $nextVal = implode(', ', array_filter($nextVal, fn ($v) => $v !== null && $v !== ''));
                        }
                        $nextValStr = trim((string) $nextVal);
                        if ($nextValStr === '') {
                            continue;
                        }

                        if (in_array($nextType, ['TEXT', 'TEXTAREA'], true)) {
                            $followUpNotes[] = $nextValStr;
                        } elseif ($nextType === 'FILE' && empty($photoEvidence)) {
                            $photoEvidence = \App\Support\PhotoValue::list($nextValStr)[0] ?? $nextValStr;
                        }
                    }

                    if ($note === '' && !empty($followUpNotes)) {
                        $note = implode(' • ', $followUpNotes);
                    }

                    $problemsList[] = [
                        'question_text'    => $q['question_text'],
                        'abnormal_options' => $abnormalOptions->pluck('option_text')->join(', '),
                        'note'             => $note !== '' ? $note : null,
                        'photo_evidence'   => $photoEvidence,
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
            'reported_by'      => auth()->id(),
        ]);

        // Temuan inspeksi L1 (AUTO_REPORT) tidak langsung mematikan mesin (tetap RUNNING);
        // status mesin baru berubah menjadi UNDER_REPAIR saat teknisi mulai melakukan perbaikan.
        $submission->update(['escalation_ticket_id' => $ticket->id]);
    }

                // 7b. Evaluasi kondisi trigger antar level form (task lvl 2 dibuat untuk besok)
                $this->evaluateScheduleConditions($task, $enterpriseSnapshot, $submission->id ?? null);

                // 8. Update status task jadi selesai (COMPLETED)
                // Task OVERDUE tetap boleh disubmit — keterlambatan hanya dicatat untuk audit.
                $isLate = $task->end_date && Carbon::today()->greaterThan($task->end_date);
                $lateDays = $isLate
                    ? (int) Carbon::parse($task->end_date)->diffInDays(Carbon::today())
                    : 0;

                $completedAt = now();

                $task->update([
                    'status'       => 'COMPLETED',
                    'completed_at' => $completedAt,
                    'is_late'      => $isLate,
                    'late_days'    => $lateDays,
                ]);

                if ($isLate) {
                    Log::warning('Task inspection diselesaikan terlambat', [
                        'task_code'    => $task->task_code,
                        'end_date'     => $task->end_date ? $task->end_date->toDateString() : null,
                        'completed_at' => $completedAt->toDateTimeString(),
                        'user_id'      => auth()->id(),
                        'late_days'    => $lateDays,
                    ]);
                }

                return redirect()->route('tasks.index')
                    ->with('success', 'Form inspeksi berhasil diselesaikan dan tiket eskalasi telah diperiksa!');
            } catch (\Exception $e) {
                    // Tangkap error asli jika ada kendala database
                    dd("ERROR DATABASE ASLI:", $e->getMessage(), $e->getFile(), $e->getLine());
                }
            });
            
        }
        

    /**
     * Evaluasi ScheduleCondition untuk form yang baru disubmit.
     * Jika snapshot jawaban mengandung opsi trigger kondisi aktif,
     * buat task lanjutan (lvl 2) dengan due_date besok.
     *
     * Dua invariant sekaligus:
     *  1. satu follow-up per submission pemicu -> ditegakkan unique index tasks.idempotency_key
     *  2. satu task per form target per tanggal due -> sama dengan invariant tasks:generate
     * Keduanya dicatat ke log, jadi tidak ada lagi skenario "dilewati diam-diam".
     */
    public function evaluateScheduleConditions(Task $task, array $enterpriseSnapshot, ?int $submissionId = null): void
    {
        $conditions = ScheduleCondition::with(['triggerOption', 'targetForm'])
            ->where('is_active', true)
            ->where('trigger_form_id', $task->form_id)
            ->get();

        foreach ($conditions as $condition) {
            if (!$this->snapshotMatchesTrigger($enterpriseSnapshot, $condition)) {
                continue;
            }

            $targetForm = $condition->targetForm;

            if (!$targetForm) {
                Log::warning('Kondisi trigger dilewati: form target tidak ditemukan', [
                    'condition_code' => $condition->condition_code,
                    'source_task_id' => $task->id,
                ]);

                continue;
            }

            $dueDate = Carbon::tomorrow();
            $windowDays = max(1, (int) $condition->due_window_days);
            $idempotencyKey = 'COND:' . $task->id . ':' . $condition->id;

            // Invariant 1: submission pemicu yang sama tidak boleh menghasilkan dua task.
            if (Task::where('idempotency_key', $idempotencyKey)->exists()) {
                Log::info('Kondisi trigger dilewati: task lanjutan dari submission ini sudah ada', [
                    'condition_code'  => $condition->condition_code,
                    'idempotency_key' => $idempotencyKey,
                ]);

                continue;
            }

            $targetMachineId = $task->machine_id ?? $targetForm->machine_id;

            // Invariant 2: satu task per form target + mesin per tanggal due (cegah dobel di kalender
            // saat dua task lvl 1 dengan due date berbeda disubmit pada hari yang sama).
            $existingOnDate = Task::where('form_id', $condition->target_form_id)
                ->when($targetMachineId, fn ($q) => $q->where('machine_id', $targetMachineId))
                ->whereDate('due_date', $dueDate->format('Y-m-d'))
                ->first();

            if ($existingOnDate) {
                Log::info('Kondisi trigger dilewati: form target sudah punya task pada tanggal due itu', [
                    'condition_code'   => $condition->condition_code,
                    'source_task_id'   => $task->id,
                    'existing_task_id' => $existingOnDate->id,
                    'existing_task_code' => $existingOnDate->task_code,
                    'due_date'         => $dueDate->toDateString(),
                ]);

                continue;
            }

            try {
                $createdTask = Task::create([
                    'machine_id'           => $targetMachineId,
                    'form_id'              => $condition->target_form_id,
                    'task_code'            => 'TSK-' . strtoupper(uniqid()),
                    'idempotency_key'      => $idempotencyKey,
                    'due_date'             => $dueDate->format('Y-m-d'),
                    'end_date'             => $dueDate->copy()->addDays($windowDays)->format('Y-m-d'),
                    'status'               => 'UPCOMING',
                    'assigned_user_id'     => null,
                    'origin_type'          => 'CONDITION',
                    'source_task_id'       => $task->id,
                    'source_condition_id'  => $condition->id,
                    'source_submission_id' => $submissionId,
                ]);

                Log::info('Kondisi trigger aktif: task lanjutan lvl 2 dibuat untuk besok', [
                    'condition_code'  => $condition->condition_code,
                    'source_task_id'  => $task->id,
                    'trigger_form_id' => $condition->trigger_form_id,
                    'target_form_id'  => $condition->target_form_id,
                    'created_task_id' => $createdTask->id,
                    'due_date'        => $dueDate->toDateString(),
                ]);
            } catch (UniqueConstraintViolationException $e) {
                // Unique index idempotency_key = pagar terakhir saat dua submit balapan.
                // Jenis error constraint lain tetap dilempar supaya transaction di-rollback.
                Log::info('Kondisi trigger dilewati: idempotency_key sudah dipakai (race)', [
                    'condition_code'  => $condition->condition_code,
                    'idempotency_key' => $idempotencyKey,
                ]);
            }
        }
    }

    /**
     * Cek apakah snapshot jawaban memenuhi aturan trigger dari sebuah kondisi
     * (opsi terpilih atau status upload file).
     */
    private function snapshotMatchesTrigger(array $enterpriseSnapshot, ScheduleCondition $condition): bool
    {
        $rawOperator = $condition->trigger_operator ?: 'option_selected';
        $operator = match ($rawOperator) {
            'file_uploaded' => 'filled',
            'file_empty' => 'empty',
            default => $rawOperator,
        };

        foreach ($enterpriseSnapshot['sections'] ?? [] as $section) {
            foreach ($section['questions'] ?? [] as $question) {
                if (($question['form_question_id'] ?? null) != $condition->trigger_question_id) {
                    continue;
                }

                $val = $question['answer_detail']['value'] ?? null;
                $photos = \App\Support\PhotoValue::list($question['answer_detail']['photos'] ?? null);
                $selectedOptions = $question['selected_options'] ?? [];

                $isFilled = (is_string($val) && trim($val) !== '')
                    || (is_numeric($val))
                    || (is_array($val) && count(array_filter($val)) > 0)
                    || (is_array($photos) && count(array_filter($photos)) > 0)
                    || (is_array($selectedOptions) && count($selectedOptions) > 0);

                if ($operator === 'filled') {
                    return $isFilled;
                }
                if ($operator === 'empty') {
                    return ! $isFilled;
                }

                if ($operator === 'option_selected') {
                    foreach ($selectedOptions as $selected) {
                        if (($selected['form_option_id'] ?? null) == $condition->trigger_option_id) {
                            return true;
                        }
                    }

                    return false;
                }

                $answerStr = is_scalar($val) ? trim((string) $val) : '';
                $expectedStr = trim((string) ($condition->trigger_value ?? ''));

                if ($answerStr === '' || $expectedStr === '') {
                    return false;
                }

                $answerNum = str_replace(',', '.', $answerStr);
                $expectedNum = str_replace(',', '.', $expectedStr);

                return match ($operator) {
                    'equals' => (is_numeric($answerNum) && is_numeric($expectedNum))
                        ? (float) $answerNum == (float) $expectedNum
                        : mb_strtolower($answerStr) === mb_strtolower($expectedStr),
                    'not_equals' => (is_numeric($answerNum) && is_numeric($expectedNum))
                        ? (float) $answerNum != (float) $expectedNum
                        : mb_strtolower($answerStr) !== mb_strtolower($expectedStr),
                    'contains' => mb_stripos($answerStr, $expectedStr) !== false,
                    'greater_than' => is_numeric($answerNum) && is_numeric($expectedNum) && (float) $answerNum > (float) $expectedNum,
                    'greater_or_equal' => is_numeric($answerNum) && is_numeric($expectedNum) && (float) $answerNum >= (float) $expectedNum,
                    'less_than' => is_numeric($answerNum) && is_numeric($expectedNum) && (float) $answerNum < (float) $expectedNum,
                    'less_or_equal' => is_numeric($answerNum) && is_numeric($expectedNum) && (float) $answerNum <= (float) $expectedNum,
                    'on' => $answerStr === $expectedStr,
                    'before' => $answerStr < $expectedStr,
                    'after' => $answerStr > $expectedStr,
                    default => false,
                };
            }
        }

        return false;
    }

    public function saveDraft(Request $request, $id)
    {
        $task = Task::findOrFail($id);

        $draftMachine = $task->machine;

        if ($draftMachine && ! $draftMachine->canBeWorkedBy(auth()->user())) {
            return response()->json([
                'success' => false,
                'message' => $this->picDeniedMessage($draftMachine),
            ], 403);
        }

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
                $allowedMimes = 'jpg,jpeg,png,webp';
                $allowedTypesLabel = 'JPG, JPEG, PNG, WEBP';
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

        // Scan hanya berhak mengambil task mesin yang PIC-nya user ini.
        if (! $machine->canBeWorkedBy($request->user())) {
            return response()->json([
                'success' => false,
                'message' => $this->picDeniedMessage($machine),
            ], 403);
        }

        // 2. Cari task aktif (DUE, OVERDUE, atau IN_PROGRESS) milik user ini
        $task = Task::where('machine_id', $machine->id)
            ->whereIn('status', ['DUE', 'OVERDUE', 'IN_PROGRESS'])
            ->where(function($query) use ($userId, $request) {
                if (! $request->user()->hasRole(User::ROLE_ADMIN)) {
                    $query->where(function ($sub) use ($userId) {
                        $sub->where('assigned_user_id', $userId)
                            ->orWhere(function ($q2) use ($userId) {
                                $q2->whereNull('assigned_user_id')
                                   ->where(function ($q3) use ($userId) {
                                       $q3->whereDoesntHave('assignedUsers')
                                          ->orWhereHas('assignedUsers', fn($u) => $u->where('users.id', $userId));
                                   });
                            });
                    });
                }
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

        // Gate PIC untuk jalur scan QR (termasuk scan dari kamera HP).
        $machine->load('pics');

        if (! $machine->canBeWorkedBy($request->user())) {
            return redirect()->route('tasks.index')
                ->with('error', $this->picDeniedMessage($machine));
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

        // Kasus 2b: bukan PIC yang ditargetkan untuk task ini
        if (! auth()->user()->hasRole(User::ROLE_ADMIN) && $task->assignedUsers()->exists()) {
            if (! $task->assignedUsers()->where('users.id', $userId)->exists()) {
                return redirect()->route('tasks.index')
                    ->with('error', "Anda tidak ditugaskan untuk mengerjakan task inspeksi mesin {$machine->machine_name}.");
            }
        }

        // Kasus 3: task milik user atau belum di-assign → arahkan ke form
        return redirect()->route('tasks.show', $task->id);
    }
    }