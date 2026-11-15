<?php

namespace App\Http\Controllers;

use App\Models\BreakdownTicket;
use App\Models\Form;
use App\Models\Machine;
use App\Models\Task;
use App\Models\TicketSubmission;
use App\Models\User;
use App\Enums\FormType;
use App\Enums\InputType;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class KanbanController extends Controller
{
    /**
     * Menampilkan Halaman Pipeline Breakdown (Kanban Board).
     */
    public function index(Request $request): Response
    {
        $breakdowns = BreakdownTicket::with(['reporter', 'assignee', 'verifier','machine','submissions'])
            ->whereIn('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_SPAREPART', 'WAITING_VENDOR', 'READY_FOR_CLOSING', 'CLOSED'])
            ->latest('reported_at')
            ->get()
            ->map(function ($ticket) use ($request) {
                $statusVal = is_object($ticket->status) ? ($ticket->status->value ?? (string)$ticket->status) : (string)$ticket->status;
                $statusVal = strtoupper(trim($statusVal));

                $pipelineStage = 'REPORT'; 

               if (in_array($statusVal, ['OPEN', 'ACKNOWLEDGED'])) {
                $pipelineStage = 'REPORT';
                  }
                 elseif (in_array($statusVal, ['IN_PROGRESS'])) {
                    $pipelineStage = 'REPAIR'; // Masuk tahap 2
                } elseif (in_array($statusVal, ['WAITING_SPAREPART', 'WAITING_VENDOR'])) {
                    $pipelineStage = 'WAITING'; // Masuk tahap 3
                } elseif ($statusVal === 'READY_FOR_CLOSING') {
                    $pipelineStage = 'CLOSING & VERIFICATION'; // Masuk tahap 4
                } elseif ($statusVal === 'CLOSED') {
                    $pipelineStage = 'COMPLETED'; // Masuk tahap 5
                }
                return [
                   'id' => $ticket->id,
    'ticket_code' => $ticket->ticket_code,
    'machine_id' => $ticket->machine_id,
    'machine_code' => $ticket->machine->machine_code ?? '-',
    'machine_name' => $ticket->machine->machine_name ?? '-',
    'location' => $ticket->machine->location ?? '-',
    'problems' => $ticket->problems ?? [], 
    'status' => $ticket->status,
    'pipelineStage' => $pipelineStage,
    'source_type' => $ticket->source_type,
    'reported_by_name' => $ticket->reporter->full_name ?? null,
    'assigned_to_name' => $ticket->assignee->full_name ?? null,
    'verified_by_name' => $ticket->verifier->full_name ?? null,
    'root_cause' => $ticket->root_cause,
    'corrective_action' => $ticket->corrective_action,
    'reported_at' => $ticket->reported_at?->format('Y-m-d H:i'),
    'started_at' => $ticket->started_at?->format('Y-m-d H:i'),
    'closed_at' => $ticket->closed_at?->format('Y-m-d H:i'),
    'verified_at' => $ticket->verified_at?->format('Y-m-d H:i'),
    'breakdownMinutes' => $ticket->reported_at?->diffInMinutes($ticket->closed_at ?? now()) ?? 0,
    'has_repair_submission' => $ticket->submissions->contains(fn ($s) => $s->context === FormType::START_REPAIR->value),
    'has_closing_submission' => $ticket->submissions->contains(fn ($s) => $s->context === FormType::CLOSE_TICKET->value),
    'can_view_detail' => $this->canReadSubmissions($request->user(), $ticket),
                ];
            });

            // dd($breakdowns);

        return Inertia::render('breakdown/index', [
            'breakdowns' => $breakdowns,
        ]);
    }


    public function acknowledge(Request $request, string $ticketCode): RedirectResponse
    {
        $ticket = BreakdownTicket::where('ticket_code', $ticketCode)->firstOrFail();

        $ticket->update([
            'assigned_to' => $request->user()->id, // Teknisi yang sedang login
            'status' => 'ACKNOWLEDGED',             // Atau 'ACKNOWLEDGED' lalu 'IN_PROGRESS'
        ]);

        return redirect()->back()->with('success', 'Tiket berhasil diterima dan dipindahkan ke tahap Repair.');
    }

    /**
     * Memperbarui Status Pending di Tahap Repair (Menunggu Sparepart / Vendor)
     */
    public function updateStatus(Request $request, string $ticketCode): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:ACKNOWLEDGED,IN_PROGRESS,WAITING_SPAREPART,WAITING_VENDOR,READY_FOR_CLOSING',
        ]);

        $ticket = BreakdownTicket::where('ticket_code', $ticketCode)->firstOrFail();

        $updateData =[
            'status' => $validated['status']
        ];

        // 💡 Catat started_at HANYA KETIKA masuk ke IN_PROGRESS / UNDER_REPAIR untuk pertama kalinya
        if (in_array($validated['status'], ['IN_PROGRESS']) && !$ticket->started_at) {
        $updateData['started_at'] = now();
        }

        $ticket->update($updateData);

       if ($validated['status'] === 'IN_PROGRESS') {
        Machine::where('id', $ticket->machine_id)
         ->update(['machine_status' => 'UNDER_REPAIR']);
        }
        return redirect()->back()->with('success', 'Status perbaikan berhasil diperbarui.');
    }


    public function close(Request $request, string $ticketCode): RedirectResponse
    {
        $validated = $request->validate([
            'root_cause' => 'required|string',
            'corrective_action' => 'required|string',
        ]);

        $ticket = BreakdownTicket::where('ticket_code', $ticketCode)->firstOrFail();
        
        $closedAt = now();
        $downtime = $ticket->reported_at ? (int) $ticket->reported_at->diffInMinutes($closedAt) : 0;

        $ticket->update([
            'root_cause' => $validated['root_cause'],
            'corrective_action' => $validated['corrective_action'],
            'status' => 'READY_FOR_CLOSING', // Ubah agar masuk ke tahap 4. Closing
            'closed_at' => $closedAt,
            'breakdown_minutes' => $downtime,
        ]);

        return redirect()->back()->with('success', 'Tiket berhasil diajukan ke tahap Closing.');
    }

    /**
     * Memverifikasi dan Menyelesaikan Ticket (READY_FOR_CLOSING -> CLOSED)
     */
    public function verifyClose(Request $request, string $ticketCode): RedirectResponse
    {
        $ticket = BreakdownTicket::where('ticket_code', $ticketCode)->firstOrFail();
        
        $verifiedAt = now();

        $ticket->update([
            'status' => 'CLOSED',
            'verified_by' => $request->user()->id,
            'verified_at' => $verifiedAt,
        ]);

        // Kembalikan Status Mesin ke RUNNING secara resmi
        Machine::where('id', $ticket->machine_id)->update(['machine_status' => 'RUNNING']);

        return redirect()->back()->with('success', 'Tiket breakdown berhasil diverifikasi dan ditutup sepenuhnya.');
    }
    
    /**
     * Halaman detail satu tiket breakdown: profil tiket, linimasa penanganan, dan
     * isi submission (laporan breakdown, form repair, form closing) dari ticket_submissions.
     */
    public function detail(Request $request, string $ticketCode)
    {
        $ticket = BreakdownTicket::with([
            'machine:id,machine_code,machine_name,machine_type,location,department,pic_department',
            'reporter:id,full_name,username,user_code',
            'assignee:id,full_name,username,user_code',
            'verifier:id,full_name,username,user_code',
            'submissions.submitter:id,full_name,username,user_code',
            'submissions.form',
        ])->where('ticket_code', $ticketCode)->firstOrFail();

        if (! $this->canReadSubmissions($request->user(), $ticket)) {
            abort(403, 'Hanya admin atau verifikator tiket yang bisa membaca isi submission.');
        }

        $status = is_object($ticket->status) ? $ticket->status->value : strtoupper((string) $ticket->status);
        $category = is_object($ticket->problem_category) ? $ticket->problem_category->value : strtoupper((string) $ticket->problem_category);
        $priority = is_object($ticket->priority) ? $ticket->priority->value : strtoupper((string) $ticket->priority);

        $submissions = $ticket->submissions
            ->sortBy(fn (TicketSubmission $s) => $this->contextOrder($s->context))
            ->map(fn (TicketSubmission $s) => $this->submissionView($s))
            ->filter()
            ->values()
            ->all();

        return Inertia::render('breakdown/detail', [
            'ticket' => [
                'ticket_code' => $ticket->ticket_code,
                'status' => $status,
                'status_label' => method_exists($ticket->status, 'label') ? $ticket->status->label() : $status,
                'priority' => $priority,
                'problem_category' => $category,
                'description' => $ticket->description,
                'solution' => $ticket->solution,
                'root_cause' => $ticket->root_cause,
                'corrective_action' => $ticket->corrective_action,
                'sparepart_needed' => (bool) $ticket->sparepart_needed,
                'vendor_name' => $ticket->vendor_name,
                'downtime_minutes' => $ticket->downtime_minutes,
                'breakdown_minutes' => $ticket->breakdown_minutes,
                'problems' => is_array($ticket->problems) ? $ticket->problems : [],
                'reported_at' => $ticket->reported_at?->format('d M Y H:i'),
            ],
            'machine' => [
                'id' => $ticket->machine_id,
                'machine_code' => $ticket->machine->machine_code ?? '-',
                'machine_name' => $ticket->machine->machine_name ?? '-',
                'machine_type' => $ticket->machine->machine_type ?? '-',
                'location' => $ticket->machine->location ?? '-',
                'department' => $ticket->machine->department ?? $ticket->machine->pic_department ?? '-',
                'detail_url' => '/machines/'.$ticket->machine_id,
            ],
            'people' => [
                'reporter' => $ticket->reporter?->full_name ?? '-',
                'assignee' => $ticket->assignee?->full_name ?? '-',
                'verifier' => $ticket->verifier?->full_name,
            ],
            'timeline' => array_values(array_filter([
                ['label' => 'Laporan masuk', 'at' => $ticket->reported_at?->format('d M Y H:i'), 'actor' => $ticket->reporter?->full_name],
                $ticket->acknowledged_at ? ['label' => 'Diterima teknisi', 'at' => $ticket->acknowledged_at->format('d M Y H:i'), 'actor' => $ticket->assignee?->full_name] : null,
                $ticket->started_repair_at ? ['label' => 'Repair dimulai', 'at' => $ticket->started_repair_at->format('d M Y H:i'), 'actor' => $ticket->assignee?->full_name] : null,
                $ticket->closed_at ? ['label' => 'Siap diverifikasi', 'at' => $ticket->closed_at->format('d M Y H:i'), 'actor' => $ticket->assignee?->full_name] : null,
                $ticket->verified_at ? ['label' => 'Tiket diverifikasi & ditutup', 'at' => $ticket->verified_at->format('d M Y H:i'), 'actor' => $ticket->verifier?->full_name] : null,
            ])),
            'submissions' => $submissions,
        ]);
    }

    /**
     * Urutan tampilan submission: laporan, repair, lalu closing.
     */
    private function contextOrder(?string $context): int
    {
        $index = array_search((string) $context, ['MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET'], true);

        return $index === false ? 99 : $index;
    }

    /**
     * Admin membaca semua submission; user lain hanya tiket yang ia verifikasi.
     */
    private function canReadSubmissions(?User $user, BreakdownTicket $ticket): bool
    {
        if (! $user) {
            return false;
        }

        if (strtoupper((string) $user->role) === 'ADMIN') {
            return true;
        }

        return (int) $ticket->verified_by === (int) $user->id;
    }

    /**
     * Path foto evidence menjadi URL yang bisa dibuka, kosong kalau file tidak ada.
     */
    private function photoUrl(mixed $path): ?string
    {
        $path = trim((string) $path);

        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return Storage::disk('public')->exists($path) ? Storage::url($path) : null;
    }

    /**
     * Submission + snapshot jawaban menjadi data read-only untuk halaman detail tiket.
     *
     * @return array<string, mixed>|null
     */
    private function submissionView(?TicketSubmission $submission): ?array
    {
        if (! $submission) {
            return null;
        }

        $snapshot = is_array($submission->answers_values) ? $submission->answers_values : [];
        $titles = $submission->form ? $this->questionTitleMap($submission->form) : [];

        $sections = collect($snapshot['sections'] ?? [])
            ->sortBy(fn (array $section) => (int) ($section['section_order'] ?? 0))
            ->map(function (array $section) use ($titles) {
                $questions = collect($section['questions'] ?? [])
                    ->sortBy(fn (array $question) => (int) ($question['question_order'] ?? 0))
                    ->map(function (array $question) use ($titles) {
                        $detail = is_array($question['answer_detail'] ?? null) ? $question['answer_detail'] : [];
                        $rawValue = $detail['value'] ?? null;

                        $selected = collect($question['selected_options'] ?? [])
                            ->sortBy(fn (array $option) => (int) ($option['option_order'] ?? 0))
                            ->map(fn (array $option) => [
                                'text' => (string) ($option['option_text'] ?? '-'),
                                'is_normal' => (bool) ($option['is_normal'] ?? true),
                            ])
                            ->values()
                            ->all();

                        $answerText = $selected !== []
                            ? implode(' | ', array_column($selected, 'text'))
                            : trim(is_array($rawValue) ? implode(', ', array_map('strval', $rawValue)) : (string) $rawValue);

                        $photos = collect($detail['photos'] ?? [])
                            ->map(fn ($path) => $this->photoUrl($path))
                            ->filter()
                            ->values()
                            ->all();

                        return [
                            'question_text' => (string) ($question['question_text'] ?? $titles[$question['form_question_id'] ?? null] ?? '-'),
                            'input_type' => strtoupper((string) ($question['input_type'] ?? '')),
                            'answer_text' => $answerText === '' ? '-' : $answerText,
                            'answer_note' => trim((string) ($detail['note'] ?? '')),
                            'photos' => $photos,
                            'is_abnormal' => $selected !== [] && ! collect($selected)->every(fn (array $option) => $option['is_normal']),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'section_title' => (string) ($section['section_title'] ?? 'Form'),
                    'section_description' => $section['section_description'] ?? null,
                    'questions' => $questions,
                ];
            })
            ->values()
            ->all();

        $answers = collect($sections)->flatMap->questions;

        return [
            'context' => (string) $submission->context,
            'label' => FormType::tryFrom((string) $submission->context)?->label() ?? (string) $submission->context,
            'form_title' => $submission->form?->form_title ?? ($snapshot['metadata']['form_title'] ?? '-'),
            'form_code' => $submission->form?->form_code ?? ($snapshot['metadata']['form_code'] ?? '-'),
            // kolom submitted_at belum ada di tabel, waktu submit terakhir = updated_at
            'submitted_at' => $submission->updated_at?->format('d M Y H:i'),
            'submitted_by' => $submission->submitter?->full_name ?? '-',
            'question_count' => $answers->count(),
            'answered_count' => $answers->filter(fn (array $q) => $q['answer_text'] !== '-')->count(),
            'note_count' => $answers->filter(fn (array $q) => $q['answer_note'] !== '')->count(),
            'photo_count' => $answers->sum(fn (array $q) => count($q['photos'])),
            'abnormal_count' => $answers->where('is_abnormal', true)->count(),
            'sections' => $sections,
        ];
    }

    /**
     * Judul pertanyaan asli dari form, dipakai bila snapshot tidak menyimpan teks pertanyaan.
     */
    private function questionTitleMap(Form $form): array
    {
        return $form->sections()->with('questions')->get()
            ->flatMap->questions
            ->mapWithKeys(fn ($question) => [$question->id => $question->question_text])
            ->all();
    }

    /**
     * Muat data yang dibutuhkan form transisi kanban (START_REPAIR / CLOSE_TICKET).
     * Kondisi tidak valid langsung di-abort supaya bisa dipakai bersama oleh halaman maupun endpoint JSON.
     *
     * @return array{ticket: BreakdownTicket, type: FormType, form: Form, submission: ?TicketSubmission, status: string}
     */
    private function ticketFormContext(string $ticketCode, string $context): array
    {
        $type = FormType::tryFrom(strtoupper($context));

        if (! $type || ! $type->isTicketTransition()) {
            abort(404, 'Kategori form tidak dikenali.');
        }

        $ticket = BreakdownTicket::with('machine')->where('ticket_code', $ticketCode)->firstOrFail();
        $status = is_object($ticket->status) ? $ticket->status->value : strtoupper((string) $ticket->status);

        $allowedStatuses = $type === FormType::START_REPAIR
            ? ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_SPAREPART', 'WAITING_VENDOR']
            : ['IN_PROGRESS', 'WAITING_SPAREPART', 'WAITING_VENDOR', 'READY_FOR_CLOSING'];

        if (! in_array($status, $allowedStatuses, true)) {
            abort(422, "{$type->label()} belum bisa diisi pada status tiket {$status}.");
        }

        $form = Form::findTemplate($type, $ticket->machine_id);

        if (! $form) {
            abort(422, "Template {$type->label()} belum tersedia. Buat dulu di menu Manajemen Form.");
        }

        return [
            'ticket' => $ticket,
            'type' => $type,
            'form' => $form,
            'submission' => $ticket->submissionFor($type->value),
            'status' => $status,
        ];
    }

    /**
     * Pertanyaan form repair / closing untuk modal di board breakdown.
     * Section di-flatten, jawaban terakhir ikut dikirim supaya modal bisa prefilled.
     */
    public function ticketFormData(string $ticketCode, string $context): JsonResponse
    {
        $data = $this->ticketFormContext($ticketCode, $context);
        $ticket = $data['ticket'];
        $submission = $data['submission'];

        return response()->json([
            'form' => $data['form']->modalPayload(),
            'meta' => [
                'ticket_code' => $ticket->ticket_code,
                'context' => $data['type']->value,
                'context_label' => $data['type']->label(),
                'machine_name' => $ticket->machine->machine_name ?? '-',
                'machine_code' => $ticket->machine->machine_code ?? '-',
                'status' => $data['status'],
                'submitted_at' => $submission?->updated_at?->format('Y-m-d H:i'),
            ],
            'initial_answers' => (object) $this->mapSnapshotToAnswers($submission?->answers_values),
        ]);
    }

    /**
     * Menampilkan form transisi kanban (START_REPAIR / CLOSE_TICKET) pada halaman form penuh.
     * Jawaban tidak masuk ke tasks_submissions, tapi ke ticket_submissions.
     */
    public function showTicketForm(string $ticketCode, string $context)
    {
        try {
            $data = $this->ticketFormContext($ticketCode, $context);
        } catch (HttpException $e) {
            return redirect()->route('breakdowns.index')
                ->with('error', $e->getMessage() !== '' ? $e->getMessage() : 'Form tidak bisa dibuka.');
        }

        $ticket = $data['ticket'];
        $type = $data['type'];
        $status = $data['status'];
        $submission = $data['submission'];

        $form = $data['form'];
        $form->load([
            'machine',
            'sections' => fn ($q) => $q->orderBy('section_order', 'asc'),
            'sections.questions' => fn ($q) => $q->orderBy('question_order', 'asc'),
            'sections.questions.options' => fn ($q) => $q->orderBy('option_order', 'asc'),
        ]);

        return Inertia::render('tasks/show', [
            // id negatif dipakai sebagai kunci localStorage terpisah dari task inspeksi
            'task' => [
                'id' => -1 * $form->id,
                'task_code' => $ticket->ticket_code,
                'status' => $status,
                'form' => $form,
            ],
            'mode' => 'TICKET',
            'ticket' => [
                'ticket_code' => $ticket->ticket_code,
                'context' => $type->value,
                'context_label' => $type->label(),
                'machine_name' => $ticket->machine->machine_name ?? '-',
                'machine_code' => $ticket->machine->machine_code ?? '-',
                'status' => $status,
                'submitted_at' => $submission?->updated_at?->format('Y-m-d H:i'),
            ],
            'initialAnswers' => $this->mapSnapshotToAnswers($submission?->answers_values),
        ]);
    }

    /**
     * Menyimpan jawaban form repair / closing ke ticket_submissions.
     */
    public function submitTicketForm(Request $request, string $ticketCode): RedirectResponse
    {
        $ticket = BreakdownTicket::where('ticket_code', $ticketCode)->firstOrFail();

        $validated = $request->validate([
            'context' => 'required|in:START_REPAIR,CLOSE_TICKET',
            'answers' => 'nullable|array',
            'answers.*.value' => 'nullable',
            'answers.*.note' => 'nullable|string',
            'answers.*.photos' => 'nullable|string',
        ]);

        $type = FormType::from($validated['context']);
        $form = Form::findTemplate($type, $ticket->machine_id);

        if (!$form) {
            return back()->with('error', "Template {$type->label()} belum tersedia. Buat dulu di menu Manajemen Form.");
        }

        $form->load(['sections.questions.options']);

        $answers = $validated['answers'] ?? [];
        $errors = $this->validateTicketAnswers($form, $answers);

        if (!empty($errors)) {
            return back()->withErrors($errors)->withInput();
        }

        $snapshot = $this->buildFormSnapshot($form, $answers);
        $userId = $request->user()->id;

        DB::transaction(function () use ($ticket, $form, $type, $snapshot, $userId) {
            // Satu submission per tiket + context, submit ulang akan memperbarui baris yang sama
            TicketSubmission::updateOrCreate(
                ['ticket_id' => $ticket->id, 'context' => $type->value],
                [
                    'form_id' => $form->id,
                    'submitted_by' => $userId,
                    'answers_values' => $snapshot,
                ]
            );

            if ($type === FormType::START_REPAIR) {
                $ticket->update([
                    'status' => 'IN_PROGRESS',
                    'assigned_to' => $ticket->assigned_to ?? $userId,
                    'started_at' => $ticket->started_at ?? now(),
                ]);

                Machine::where('id', $ticket->machine_id)->update(['machine_status' => 'UNDER_REPAIR']);
            } else {
                $closedAt = now();
                $ticket->update([
                    'status' => 'READY_FOR_CLOSING',
                    'closed_at' => $ticket->closed_at ?? $closedAt,
                    'breakdown_minutes' => $ticket->reported_at
                        ? (int) $ticket->reported_at->diffInMinutes($closedAt)
                        : 0,
                ]);
            }
        });

        return redirect()->route('breakdowns.index')
            ->with('success', "{$type->label()} untuk tiket {$ticket->ticket_code} berhasil disimpan.");
    }

    /**
     * Laporan breakdown manual dari halaman detail mesin.
     * Daftar pertanyaan diambil dari form kategori MANUAL_REPORT, jawaban masuk ke ticket_submissions.
     */
    public function storeReport(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'machine_id' => 'required|integer|exists:machines,id',
            'form_id' => 'required|integer|exists:forms,id',
            'answers' => 'required|array',
            'answers.*.value' => 'nullable',
            'answers.*.note' => 'nullable|string',
            'answers.*.photos' => 'nullable|string',
        ]);

        $form = Form::with(['sections.questions.options'])->findOrFail($validated['form_id']);

        if ($form->form_type !== FormType::MANUAL_REPORT) {
            return back()->with('error', 'Form yang dipakai bukan kategori Laporan Breakdown.');
        }

        $answers = $validated['answers'];
        $errors = $this->validateTicketAnswers($form, $answers);

        if (!empty($errors)) {
            return back()->withErrors($errors)->withInput();
        }

        $snapshot = $this->buildFormSnapshot($form, $answers);
        $problems = $this->deriveProblems($form, $answers);

        if (empty($problems)) {
            return back()->with('error', 'Laporan belum memuat temuan. Pilih kondisi abnormal atau isi deskripsi masalahnya.');
        }

        $user = $request->user();
        $ticket = null;

        DB::transaction(function () use ($form, $snapshot, $problems, $validated, $user, &$ticket) {
            $ticket = BreakdownTicket::create([
                'ticket_code' => $this->generateTicketCode(),
                'problem_category' => $this->deriveProblemCategory($form, $validated['answers']),
                'problems' => $problems,
                'status' => 'OPEN',
                'source_type' => 'MANUAL_REPORT',
                'reported_at' => now(),
                'reported_by' => $user->id,
                'machine_id' => $validated['machine_id'],
            ]);

            TicketSubmission::create([
                'ticket_id' => $ticket->id,
                'form_id' => $form->id,
                'submitted_by' => $user->id,
                'context' => FormType::MANUAL_REPORT->value,
                'answers_values' => $snapshot,
            ]);

            Machine::where('id', $validated['machine_id'])->update(['machine_status' => 'DOWN']);
        });

        return redirect()->route('breakdowns.index')
            ->with('success', "Laporan breakdown {$ticket->ticket_code} berhasil dikirim.");
    }

    /**
     * Kumpulkan temuan dari jawaban: opsi abnormal, atau jawaban teks bebas.
     */
    private function deriveProblems(Form $form, array $answers): array
    {
        $problems = [];

        foreach ($form->sections as $section) {
            foreach ($section->questions as $question) {
                $answer = $answers[$question->id] ?? [];
                $value = $answer['value'] ?? null;
                $note = trim((string) ($answer['note'] ?? ''));
                $photos = trim((string) ($answer['photos'] ?? ''));

                if ($value === null || $value === '' || (is_array($value) && count($value) === 0)) {
                    continue;
                }

                $abnormalTexts = $question->options
                    ->filter(fn ($opt) => ! $opt->is_normal && $this->isOptionSelected($opt, $value))
                    ->pluck('option_text')
                    ->all();

                if (!empty($abnormalTexts)) {
                    $problems[] = [
                        'id' => $question->id,
                        'question_text' => $question->question_text,
                        'abnormal_options' => implode(', ', $abnormalTexts),
                        'answer_text' => '',
                        'note' => $note,
                        'photo_evidence' => $photos,
                    ];

                    continue;
                }

                $inputType = $question->input_type instanceof InputType
                    ? $question->input_type->value
                    : strtoupper((string) $question->input_type);

                if ($question->options->isEmpty() && in_array($inputType, ['TEXT', 'TEXTAREA'], true)) {
                    $problems[] = [
                        'id' => $question->id,
                        'question_text' => $question->question_text,
                        'abnormal_options' => '',
                        'answer_text' => trim((string) (is_array($value) ? implode(', ', $value) : $value)),
                        'note' => $note,
                        'photo_evidence' => $photos,
                    ];
                }
            }
        }

        return $problems;
    }

    /**
     * Kategori problem diambil dari jawaban DROPDOWN pertama yang bukan indikator normal/abnormal.
     */
    private function deriveProblemCategory(Form $form, array $answers): string
    {
        foreach ($form->sections as $section) {
            foreach ($section->questions as $question) {
                $questionType = $question->input_type instanceof InputType
                    ? $question->input_type->value
                    : strtoupper((string) $question->input_type);

                if ($questionType !== InputType::DROPDOWN->value) {
                    continue;
                }

                // pertanyaan dengan opsi abnormal adalah indikator kondisi, bukan kategori
                if ($question->options->contains(fn ($opt) => ! $opt->is_normal)) {
                    continue;
                }

                $value = $answers[$question->id]['value'] ?? null;

                if ($value === null || $value === '') {
                    continue;
                }

                $option = $question->options->first(fn ($opt) => $this->isOptionSelected($opt, $value));

                if ($option) {
                    return strtoupper(trim($option->option_text));
                }
            }
        }

        return 'GENERAL';
    }

    private function isOptionSelected($option, mixed $value): bool
    {
        $values = is_array($value) ? $value : [$value];

        return collect($values)->contains(
            fn ($v) => (string) $v === (string) $option->id || (string) $v === (string) $option->option_text
        );
    }

    private function generateTicketCode(): string
    {
        do {
            $code = 'TKT-'.strtoupper(Str::random(6));
        } while (BreakdownTicket::where('ticket_code', $code)->exists());

        return $code;
    }

    /**
     * Validasi wajib isi + catatan/foto untuk temuan abnormal.
     * Section yang dilewati lewat goto_form_section_id tidak divalidasi.
     */
    private function validateTicketAnswers(Form $form, array $answers): array
    {
        $errors = [];
        $sections = $form->sections;
        $allQuestions = $sections->flatMap->questions;

        $skippedSectionIds = [];

        foreach ($sections as $index => $section) {
            foreach ($section->questions as $question) {
                $value = $answers[$question->id]['value'] ?? null;

                if ($value === null || $value === '') {
                    continue;
                }

                $selectedOption = $question->options->first(
                    fn ($opt) => (string) $opt->id === (string) $value || $opt->option_text === $value
                );

                if (!$selectedOption || !$selectedOption->goto_form_section_id) {
                    continue;
                }

                $targetIndex = $sections->search(
                    fn ($s) => (int) $s->id === (int) $selectedOption->goto_form_section_id
                );

                if ($targetIndex !== false && $targetIndex > $index) {
                    for ($i = $index + 1; $i < $targetIndex; $i++) {
                        $skippedSectionIds[] = $sections[$i]->id;
                    }
                }
            }
        }

        foreach ($answers as $questionId => $answer) {
            $question = $allQuestions->firstWhere('id', (int) $questionId);

            if (!$question) {
                continue;
            }

            $value = $answer['value'] ?? null;
            $note = trim((string) ($answer['note'] ?? ''));
            $photos = trim((string) ($answer['photos'] ?? ''));

            $isEmpty = $value === null || $value === '' || (is_array($value) && count($value) === 0);
            $isSkipped = in_array($question->form_section_id, $skippedSectionIds);

            if ($question->is_required && !$isSkipped && $isEmpty) {
                $errors["answers.{$questionId}.value"] = "Pertanyaan \"{$question->question_text}\" wajib diisi.";
                continue;
            }

            if ($this->isAbnormalAnswer($question, $value)) {
                if ($note === '') {
                    $errors["answers.{$questionId}.note"] = 'Catatan wajib diisi untuk temuan abnormal.';
                }

                if ($photos === '') {
                    $errors["answers.{$questionId}.photos"] = 'Foto evidence wajib diisi untuk temuan abnormal.';
                }
            }
        }

        return $errors;
    }

    /**
     * Cek apakah jawaban memilih opsi dengan is_normal = false.
     */
    private function isAbnormalAnswer($question, $value): bool
    {
        if ($value === null || $value === '' || (is_array($value) && count($value) === 0)) {
            return false;
        }

        $values = is_array($value) ? $value : [$value];

        return $question->options->contains(function ($option) use ($values) {
            $isSelected = collect($values)->contains(
                fn ($v) => (string) $v === (string) $option->id || (string) $v === (string) $option->option_text
            );

            return $isSelected && !$option->is_normal;
        });
    }

    /**
     * Snapshot jawaban (struktur enterprise) untuk disimpan di ticket_submissions.
     */
    private function buildFormSnapshot(Form $form, array $submittedAnswers): array
    {
        $sectionsSnapshot = [];

        foreach ($form->sections as $section) {
            $questionsSnapshot = [];

            foreach ($section->questions as $question) {
                $userAnswer = $submittedAnswers[$question->id] ?? [];

                $rawValue = $userAnswer['value'] ?? null;
                $note = $userAnswer['note'] ?? '';
                $photos = $userAnswer['photos'] ?? [];

                $selectedOptionsSnapshot = [];
                $valueArray = is_array($rawValue) ? $rawValue : [$rawValue];

                if (!empty($rawValue)) {
                    $matchedOptions = $question->options->filter(function ($opt) use ($valueArray) {
                        return in_array($opt->id, $valueArray) || in_array($opt->option_text, $valueArray);
                    });

                    foreach ($matchedOptions as $opt) {
                        $selectedOptionsSnapshot[] = [
                            'form_option_id' => $opt->id,
                            'option_code' => $opt->option_code,
                            'option_text' => $opt->option_text,
                            'option_order' => $opt->option_order,
                            'is_normal' => (bool) $opt->is_normal,
                            'goto_form_section_id' => $opt->goto_form_section_id,
                        ];
                    }
                }

                $questionsSnapshot[] = [
                    'form_question_id' => $question->id,
                    'question_code' => $question->question_code,
                    'question_text' => $question->question_text,
                    'input_type' => $question->input_type,
                    'is_required' => (bool) $question->is_required,
                    'question_order' => $question->question_order,
                    'answer_detail' => [
                        'value' => $rawValue,
                        'note' => $note,
                        'photos' => $photos,
                    ],
                    'selected_options' => $selectedOptionsSnapshot,
                ];
            }

            $sectionsSnapshot[] = [
                'form_section_id' => $section->id,
                'section_code' => $section->section_code,
                'section_title' => $section->section_title,
                'section_description' => $section->section_description,
                'section_order' => $section->section_order,
                'questions' => $questionsSnapshot,
            ];
        }

        return [
            'metadata' => [
                'form_id' => $form->id,
                'form_code' => $form->form_code,
                'form_type' => $form->form_type?->value,
                'form_title' => $form->form_title,
                'form_description' => $form->form_description,
            ],
            'sections' => $sectionsSnapshot,
        ];
    }

    /**
     * Ubah snapshot jawaban menjadi map siap pakai untuk form (initial answers).
     */
    private function mapSnapshotToAnswers(?array $snapshot): array
    {
        if (empty($snapshot['sections'])) {
            return [];
        }

        $answers = [];

        foreach ($snapshot['sections'] as $section) {
            foreach ($section['questions'] ?? [] as $question) {
                $questionId = $question['form_question_id'] ?? null;

                if (!$questionId) {
                    continue;
                }

                $detail = $question['answer_detail'] ?? [];

                $answers[$questionId] = [
                    'value' => $detail['value'] ?? '',
                    'note' => $detail['note'] ?? '',
                    'photos' => $detail['photos'] ?? '',
                ];
            }
        }

        return $answers;
    }
}