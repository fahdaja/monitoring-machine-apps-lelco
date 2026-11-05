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

            // Mapping selected options (bisa single value atau array untuk checkbox)
            $selectedOptionsSnapshot = [];
            $valueArray = is_array($rawValue) ? $rawValue : [$rawValue];

            if (!empty($rawValue)) {
                // Cari opsi yang dipilih berdasarkan ID atau text
                $matchedOptions = $question->options->whereIn('id', $valueArray);
                
                foreach ($matchedOptions as $opt) {
                    $selectedOptionsSnapshot[] = [
                        'form_option_id'       => $opt->id,
                        'option_code'          => $opt->option_code,
                        'option_text'          => $opt->option_text,
                        'option_order'         => $opt->option_order,
                        'is_normal'            => (bool) $opt->is_normal,
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
                    'photos' => $photos, // Bisa berupa path file setelah di-upload
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
        if (Carbon::now()->isAfter($task->due_date) && !in_array($task->status, ['COMPLETED', 'OVERDUE'])) {
            $task->update(['status' => 'OVERDUE']);
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


    public function show($id){
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


    // --- OTOMATIS UPDATE STATUS & ASSIGNED USER SAAT DIBUKA ---
    $userId = auth()->id();
    $updateData = [];

    // Jika task belum memiliki assigned user, tetapkan ke user yang sedang login
    if (is_null($task->assigned_user_id)) {
        $updateData['assigned_user_id'] = $userId;
    }

    // Jika status awal task masih DUE / OVERDUE / UPCOMING, ubah jadi IN_PROGRESS
    if (in_array($task->status, ['DUE', 'OVERDUE', null])) {
        $updateData['status'] = 'IN_PROGRESS';
    }

    // Lakukan update ke database jika ada perubahan status atau penugasan
    if (!empty($updateData)) {
        $task->update($updateData);
    }
    // ---------------

    $draft = TaskSubmission::where('task_id', $task->id)
                           ->where('user_id', auth()->id())
                           ->where('status', 'DRAFT')
                           ->first();

    $initialAnswersMap = [];

// Di dalam method show($id):
if ($draft && isset($draft->answers_values['sections'])) {
    foreach ($draft->answers_values['sections'] as $section) {
        foreach ($section['questions'] as $q) {
            $answerDetail = $q['answer_detail'] ?? [];

            $initialAnswersMap[$q['form_question_id']] = [
                'value'  => $answerDetail['value'] ?? '',
                'note'   => $answerDetail['note'] ?? '',
                'photos' => $answerDetail['photos'] ?? [],
            ];
        }
    }
}

    // Render ke halaman React yang sesuai (misal: 'tasks/show' atau 'inspection-form')
    return Inertia::render('tasks/show', [
        'task' => $task, // Kirim sebagai 'task' agar sesuai dengan komponen frontend
        'initialAnswers' => $initialAnswersMap
    ]);
    }

    public function submit(Request $request, $id)
    {
        // 1. Load task beserta relasi form, sections, questions, dan options
        $task = Task::with(['form.sections.questions.options', 'form.machine'])->findOrFail($id);
        
        // 2. Validasi input dari frontend
        dd($request->all(), $request->allFiles());
        $validated = $request->validate([
            'answers' => 'required|array',
            'answers.*.value' => 'nullable',
            'answers.*.note' => 'nullable|string',
            'answers.*.photos' => 'nullable|array',
            'answers.*.photos.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // Validasi file max 5MB
        ]);
        
    return DB::transaction(function () use ($request, $task, $validated) {
        $form = $task->form;
        $submittedAnswers = $validated['answers'];

        // Proses upload file/photos evidence terlebih dahulu per pertanyaan
        foreach ($submittedAnswers as $qId => &$ans) {
            $uploadedPhotos = [];
            
            if ($request->hasFile("answers.{$qId}.photos")) {
                foreach ($request->file("answers.{$qId}.photos") as $file) {
                    $path = $file->store('evidence-photos', 'public');
                    $uploadedPhotos[] = $path;
                }
            }
            
            // Masukkan path foto yang berhasil di-upload ke dalam array photos
            $ans['photos'] = $uploadedPhotos;
        }
        unset($ans); // Putuskan referensi loop

        // 3. PANGGIL FUNGSI BUILD ENTERPRISE SNAPSHOT YANG SUDAH ANDA BUAT!
        $enterpriseSnapshot = $this->buildEnterpriseSnapshot($task, $submittedAnswers);

        // 4. Simpan ke tabel 'task_submissions' dengan status SUBMITTED
        // Jika sebelumnya ada DRAFT, kita bisa update atau create baru. Di sini kita buat record baru atau update draft yang ada.
        $submission = TaskSubmission::updateOrCreate(
            [
                'task_id' => $task->id, 
                'status'  => 'DRAFT'
            ],
            [
                'submission_code' => 'SUB-' . strtoupper(Str::random(8)),
                'user_id'         => auth()->id(),
                'status'          => 'SUBMITTED',
                'answers_values'  => $enterpriseSnapshot,
                'submitted_at'    => now(),
            ]
        );

        // Pastikan statusnya benar-benar menjadi SUBMITTED jika sebelumnya data ditemukan sebagai DRAFT
        $submission->update([
            'status'         => 'SUBMITTED',
            'answers_values' => $enterpriseSnapshot,
            'submitted_at'   => now(),
        ]);

        // 5. Auto-trigger Breakdown Ticket jika ditemukan opsi dengan 'is_normal' = false (Abnormal)
        foreach ($enterpriseSnapshot['sections'] as $sec) {
            foreach ($sec['questions'] as $q) {
                // Membaca dari selected_options yang dirakit oleh buildEnterpriseSnapshot
                $abnormalOptions = collect($q['selected_options'])->where('is_normal', false);

                if ($abnormalOptions->isNotEmpty()) {
                    $abnormalTexts = $abnormalOptions->pluck('option_text')->join(', ');
                    $issueDesc = "Temuan abnormal pada [{$q['question_text']}]: {$abnormalTexts}";
                    
                    if (!empty($q['answer_detail']['note'])) {
                        $issueDesc .= " | Catatan: {$q['answer_detail']['note']}";
                    }

                    $ticket = BreakdownTicket::create([
                        'ticket_code'       => 'TKT-' . strtoupper(Str::random(6)),
                        'machine_id'        => $form->machine_id,
                        'task_id'           => $task->id,
                        'source_type'       => 'AUTO_REPORT',
                        'submission_id'     => $submission->id,
                        'issue_description' => $issueDesc,
                        'status'            => 'OPEN',
                    ]);

                    // Hubungkan submission dengan tiket eskalasi
                    $submission->update(['escalation_ticket_id' => $ticket->id]);
                }
            }
        }

        // 6. Update status task jadi selesai (COMPLETED)
        $task->update([
            'status'       => 'COMPLETED',
            'completed_at' => now(),
        ]);

        return redirect()->route('tasks.index')
            ->with('success', 'Form inspeksi berhasil disubmit dengan struktur snapshot enterprise!');
    });
}
    

public function saveDraft(Request $request, $id)
{
    $task = Task::findOrFail($id);
    $rawAnswers = $request->input('answers', []);

    // Rakit otomatis menjadi struktur enterprise snapshot
    $enterpriseSnapshot = $this->buildEnterpriseSnapshot($task, $rawAnswers);

    $draft = TaskSubmission::firstOrCreate(
        ['task_id' => $task->id, 'status' => 'DRAFT'],
        [
            'submission_code' => 'DRF-' . strtoupper(Str::random(8)),
            'user_id'         => auth()->id(),
        ]
    );

    // Simpan bersih ke kolom answers_values
    $draft->update([
        'answers_values' => $enterpriseSnapshot
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Draft berhasil disimpan',
    ], 200);
}
}