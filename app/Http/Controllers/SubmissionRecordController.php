<?php

namespace App\Http\Controllers;

use App\Enums\FormType;
use App\Models\Form;
use App\Models\Machine;
use App\Models\TaskSubmission;
use App\Models\TicketSubmission;
use App\Models\User;
use App\Support\SubmissionRecords;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Record hasil pengisian form yang sudah selesai (read-only):
 * daftar dengan filter + halaman detail jawaban.
 */
class SubmissionRecordController extends Controller
{
    private const PER_PAGE = 20;

    public function index(Request $request): Response
    {
        $user = $request->user();

        $filters = $request->validate([
            'machine_id' => 'nullable|integer',
            'form_id' => 'nullable|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'kind' => 'nullable|in:INSPECTION,TICKET',
        ]);

        $rows = SubmissionRecords::rows($user, $filters);

        if (! empty($filters['kind'])) {
            $rows = $rows->where('kind', $filters['kind'])->values();
        }

        $page = max(1, (int) $request->input('page', 1));
        $paginator = new LengthAwarePaginator(
            $rows->forPage($page, self::PER_PAGE)->values(),
            $rows->count(),
            self::PER_PAGE,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        // Pilihan filter: mesin yang boleh dilihat user + semua form
        $machines = Machine::query()
            ->when(! SubmissionRecords::canSeeAll($user), fn ($q) => $q->whereHas('pics', fn ($p) => $p->where('users.id', $user->id)))
            ->orderBy('machine_code')
            ->get(['id', 'machine_code', 'machine_name']);

        $forms = Form::orderBy('form_title')->get(['id', 'form_code', 'form_title', 'form_type'])
            ->map(fn (Form $f) => [
                'id' => $f->id,
                'form_code' => $f->form_code,
                'form_title' => $f->form_title,
                'type_label' => $f->form_type instanceof FormType ? $f->form_type->label() : (string) $f->form_type,
            ]);

        return Inertia::render('records/index', [
            'records' => $paginator,
            'filters' => [
                'machine_id' => $filters['machine_id'] ?? null,
                'form_id' => $filters['form_id'] ?? null,
                'date_from' => $filters['date_from'] ?? null,
                'date_to' => $filters['date_to'] ?? null,
                'kind' => $filters['kind'] ?? null,
            ],
            'machines' => $machines,
            'forms' => $forms,
        ]);
    }

    /**
     * Detail record inspeksi (tasks_submissions).
     */
    public function show(Request $request, $id): Response
    {
        $submission = TaskSubmission::with([
            'task.form', 'task.machine.pics', 'task.sourceTask', 'user:id,full_name', 'escalationTicket',
        ])->where('status', 'SUBMITTED')->findOrFail($id);

        $task = $submission->task;
        abort_unless($task, 404);
        $this->authorizeRecord($request->user(), $task->machine, (int) $submission->user_id);

        $snapshot = is_array($submission->answers_values) ? $submission->answers_values : [];
        $ticket = $submission->escalationTicket;

        return Inertia::render('records/show', [
            'record' => [
                'kind' => 'INSPECTION',
                'type_label' => FormType::INSPECTION->label(),
                'form_title' => $task->form?->form_title ?? ($snapshot['metadata']['form_title'] ?? '-'),
                'form_code' => $task->form?->form_code ?? ($snapshot['metadata']['form_code'] ?? '-'),
                'reference_label' => 'Task',
                'reference_code' => $task->task_code,
                'submitted_by' => $submission->user?->full_name ?? '-',
                'submitted_at' => $submission->submitted_at?->format('d M Y H:i'),
                'started_at' => $task->started_at?->format('d M Y H:i'),
                'due_date' => $task->due_date?->format('d M Y'),
                'end_date' => $task->end_date?->format('d M Y'),
                'is_late' => (bool) $task->is_late,
                'late_days' => (int) $task->late_days,
                'origin_type' => $task->origin_type ?: 'SCHEDULE',
                'source_task_code' => $task->sourceTask?->task_code,
                'abnormal_count' => SubmissionRecords::abnormalCount($snapshot),
                'ticket' => $ticket ? [
                    'ticket_code' => $ticket->ticket_code,
                    'status' => is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status,
                    'detail_url' => SubmissionRecords::canSeeAll($request->user()) || (int) $ticket->verified_by === (int) $request->user()->id
                        ? '/breakdowns/'.$ticket->ticket_code
                        : null,
                ] : null,
                'show_normality' => true,
                'sections' => SubmissionRecords::sections($snapshot, true),
            ],
            'machine' => $this->machinePayload($task->machine),
        ]);
    }

    /**
     * Detail record form tiket (laporan breakdown, repair, closing).
     */
    public function showTicket(Request $request, $id): Response
    {
        $submission = TicketSubmission::with(['form', 'ticket.machine.pics', 'submitter:id,full_name'])->findOrFail($id);
        $ticket = $submission->ticket;
        abort_unless($ticket, 404);
        $this->authorizeRecord($request->user(), $ticket->machine, (int) $submission->submitted_by);

        $snapshot = is_array($submission->answers_values) ? $submission->answers_values : [];

        return Inertia::render('records/show', [
            'record' => [
                'kind' => 'TICKET',
                'type_label' => FormType::tryFrom((string) $submission->context)?->label() ?? (string) $submission->context,
                'form_title' => $submission->form?->form_title ?? ($snapshot['metadata']['form_title'] ?? '-'),
                'form_code' => $submission->form?->form_code ?? ($snapshot['metadata']['form_code'] ?? '-'),
                'reference_label' => 'Tiket',
                'reference_code' => $ticket->ticket_code,
                'submitted_by' => $submission->submitter?->full_name ?? '-',
                'submitted_at' => $submission->updated_at?->format('d M Y H:i'),
                'started_at' => null,
                'due_date' => null,
                'end_date' => null,
                'is_late' => false,
                'late_days' => 0,
                'origin_type' => null,
                'source_task_code' => null,
                'abnormal_count' => 0,
                'ticket' => [
                    'ticket_code' => $ticket->ticket_code,
                    'status' => is_object($ticket->status) ? $ticket->status->value : (string) $ticket->status,
                    'detail_url' => SubmissionRecords::canSeeAll($request->user()) || (int) $ticket->verified_by === (int) $request->user()->id
                        ? '/breakdowns/'.$ticket->ticket_code
                        : null,
                ],
                // Form tiket = data entry murni, tanpa penilaian normal/abnormal
                'show_normality' => false,
                'sections' => SubmissionRecords::sections($snapshot, false),
            ],
            'machine' => $this->machinePayload($ticket->machine),
        ]);
    }

    private function authorizeRecord(?User $user, ?Machine $machine, int $submitterId): void
    {
        if (SubmissionRecords::canSeeAll($user)) {
            return;
        }

        $allowed = $user && ((int) $user->id === $submitterId || ($machine && $machine->isPic($user)));

        abort_unless($allowed, 403, 'Anda hanya dapat melihat record mesin yang Anda tangani.');
    }

    private function machinePayload(?Machine $machine): ?array
    {
        if (! $machine) {
            return null;
        }

        return [
            'id' => $machine->id,
            'machine_code' => $machine->machine_code,
            'machine_name' => $machine->machine_name,
            'location' => $machine->location,
            'detail_url' => '/machines/'.$machine->id,
        ];
    }
}
