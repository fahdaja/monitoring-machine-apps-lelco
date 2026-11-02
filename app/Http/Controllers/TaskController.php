<?php

class TaskController extends Controller {


    public function index(){
        $tasks = Task::with(['form.machine'])->whereIn('status', ['UPCOMING', 'IN_PROGRESS', 'OVERDUE', 'DUE', 'COMPLETED'])->orderBy('due_date', 'asc')->get();

        return Inertia::render('tasks/index', [
            'tasks' => $tasks
        ]);
    }

    public function store(Request $request){
        $validate = $request->validate([
            'due_date' => 'required|date',
        ]);

        Task::create([
            'machine_id' => $request->input('machine_id'),
            'task_code' => 'TASK-' . strtoupper(uniqid()),
            'due_date' => $validate['due_date'],

            'status' => 'PENDING',
            'source_type' => 'MANUAL_REPORT',
            'form_id' => $request->input('form_id'),
            'assigned_user_id' => Auth::user()->id,
            'escalation_ticket_id' => $request->input('escalation_ticket_id'),
        ]);

        return redirect()->route('tasks.index')
            ->with('success', 'Task berhasil dibuat');
    }

    public function show($id){
        $tasks = Task::with([
            'form.machine',
            'form.sections.questions.options',
        ])->findOrFail($id);

        if(Carbon::new()->isAfter($tasks->due_date) && $tasks->status !== 'COMPLETED'){
            $tasks->update([
                'status' => 'OVERDUE'
            ]);
            
        }
        return Inertia::render('tasks/show', [
            'tasks' => $tasks,
            'initialAnswers' => $tasks->draft_answers ?? []
        ]);
    }

   public function submit(Request $request, $id)
    {
        // Load task beserta relasi form, sections, questions, dan options
        $task = Task::with(['form.sections.questions.options', 'form.machine'])->findOrFail($id);

        // Validasi input dari frontend (menampung jawaban berdasarkan question_id)
        $validated = $request->validate([
            'answers' => 'required|array', 
            // Format yang diharapkan dari frontend:
            // [ question_id => [ 'answer_values' => [...], 'option_ids' => [...] ] ]
        ]);

        return DB::transaction(function () use ($request, $task, $validated) {
            $form = $task->form;
            $submittedAnswers = $validated['answers'];

            $sectionsSnapshot = [];

            // 1. Rakit struktur hierarki Section -> Question -> Option secara otomatis
            foreach ($form->sections as $section) {
                $questionsSnapshot = [];

                foreach ($section->questions as $question) {
                    $qId = $question->id;
                    $userAnswer = $submittedAnswers[$qId] ?? null;

                    $answerValues = $userAnswer['answer_values'] ?? [];
                    $optionIds = $userAnswer['option_ids'] ?? [];

                    $selectedOptionsSnapshot = [];

                    // Jika ada opsi yang dipilih, ambil data detailnya dari database
                    if (!empty($optionIds)) {
                        $options = $question->options->whereIn('id', $optionIds);
                        
                        foreach ($options as $opt) {
                            $isAbnormalOpt = !$opt->is_normal; // Cek apakah opsi ini abnormal

                            $selectedOptionsSnapshot[] = [
                                'option_id'   => $opt->id,
                                'option_text' => $opt->option_text,
                                'goto_section_id' => $opt->goto_section_id,
                                'option_order' => $opt->option_order,
                                'is_abnormal' => $isAbnormalOpt,
                            ];
                        }
                    }

                    // Susun snapshot per pertanyaan
                    $questionsSnapshot[] = [
                        'question_id'      => $question->id,
                        'question_text'    => $question->question_text,
                        'input_type'       => $question->input_type,
                        'is_required'      => (bool) $question->is_required,
                        'answer_values'    => is_array($answerValues) ? $answerValues : [$answerValues],
                        'selected_options' => $selectedOptionsSnapshot,
                        'question_order' => $question->question_order,
                    ];
                }

                // Susun snapshot per section
                $sectionsSnapshot[] = [
                    'section_id'    => $section->id,
                    'section_title' => $section->section_title,
                    'section_order'    => $section->section_order ?? 0,
                    'questions'     => $questionsSnapshot,
                ];
            }

            // 2. Bungkus ke dalam Format Enterprise Snapshot (Metadata + Sections)
            $enterpriseSnapshot = [
                'metadata' => [
                    'form_id'      => $form->id,
                    'form_code'    => $form->form_code,
                    'form_title'   => $form->form_title,
                    'form_description' => $form->form_description,
                ],
                'sections' => $sectionsSnapshot,
            ];

            // 3. Simpan ke tabel 'submissions' milik lu
            $submission = Submission::create([
                'submission_code' => 'SUB-' . strtoupper(Str::random(8)),
                'answers_value'   => $enterpriseSnapshot, // Masuk ke kolom JSONB
                'submitted_at'    => now(),
                'task_id'         => $task->id,
                'user_id'         => auth()->id(), // Teknisi yang sedang login
            ]);

            // 4. Auto-trigger Breakdown Ticket jika ditemukan opsi dengan 'is_abnormal' = true
            foreach ($sectionsSnapshot as $sec) {
                foreach ($sec['questions'] as $q) {
                    $abnormalOptions = collect($q['selected_options'])->where('is_abnormal', true);

                    if ($abnormalOptions->isNotEmpty()) {
                        $abnormalTexts = $abnormalOptions->pluck('option_text')->join(', ');

                        BreakdownTicket::create([
                            'ticket_code'        => 'TKT-' . strtoupper(Str::random(6)),
                            'machine_id'         => $form->machine_id,
                            'task_id'            => $task->id,
                            'submission_id'      => $submission->id,
                            'issue_description'  => "Temuan abnormal pada [{$q['question_text']}]: {$abnormalTexts}",
                            'status'             => 'OPEN',
                        ]);
                    }
                }
            }

            // 5. Update status task jadi selesai
            $task->update([
                'status'       => 'COMPLETED',
                'submitted_at' => now(),
            ]);

            return redirect()->route('tasks.index')
                ->with('success', 'Form inspeksi berhasil disubmit dengan standar enterprise snapshot!');
        });
    }
    

    public function saveDraft(Request $request, $id)
{
    $task = Task::findOrFail($id);

    // Pastikan task belum selesai dikerjakan
    if ($task->status === 'COMPLETED') {
        return response()->json(['message' => 'Task sudah selesai.'], 400);
    }

    // Simpan jawaban sementara ke kolom draft_answers
    $task->update([
        'draft_answers' => $request->input('answers'),
    ]);

    return response()->json([
        'status' => 'success',
        'message' => 'Draft tersimpan otomatis',
        'saved_at' => now()->format('H:i:s')
    ]);
}
}