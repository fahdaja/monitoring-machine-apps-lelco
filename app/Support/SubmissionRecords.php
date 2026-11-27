<?php

namespace App\Support;

use App\Enums\FormType;
use App\Models\TaskSubmission;
use App\Models\TicketSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * Record hasil pengisian form (read-only), dipakai halaman Record, profil mesin, dan detail.
 *
 * Dua sumber data:
 *  - INSPECTION : tasks_submissions (status SUBMITTED) milik task inspeksi
 *  - TICKET     : ticket_submissions (laporan breakdown, form repair, form closing)
 *
 * Hak baca: ADMIN & SUPERVISOR semua record; user lain hanya record mesin yang ia PIC-i
 * atau record yang ia isi sendiri.
 */
class SubmissionRecords
{
    public static function canSeeAll(?User $user): bool
    {
        return $user !== null && $user->hasRole([User::ROLE_ADMIN, 'SUPERVISOR']);
    }

    /**
     * @param  array{machine_id?: int|string|null, form_id?: int|string|null, date_from?: string|null, date_to?: string|null}  $filters
     */
    public static function inspectionQuery(?User $user, array $filters = []): Builder
    {
        $query = TaskSubmission::query()
            ->with(['task.form:id,form_code,form_title,form_type', 'task.machine:id,machine_code,machine_name,location', 'user:id,full_name'])
            ->where('status', 'SUBMITTED')
            ->whereHas('task');

        if (! self::canSeeAll($user)) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('user_id', $user?->id ?? 0)
                    ->orWhereHas('task.machine.pics', fn (Builder $p) => $p->where('users.id', $user?->id ?? 0));
            });
        }

        if (! empty($filters['machine_id'])) {
            $query->whereHas('task', fn (Builder $q) => $q->where('machine_id', $filters['machine_id']));
        }
        if (! empty($filters['form_id'])) {
            $query->whereHas('task', fn (Builder $q) => $q->where('form_id', $filters['form_id']));
        }
        if (! empty($filters['date_from'])) {
            $query->whereDate('submitted_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('submitted_at', '<=', $filters['date_to']);
        }

        return $query->orderByDesc('submitted_at')->orderByDesc('id');
    }

    /**
     * @param  array{machine_id?: int|string|null, form_id?: int|string|null, date_from?: string|null, date_to?: string|null}  $filters
     */
    public static function ticketQuery(?User $user, array $filters = []): Builder
    {
        $query = TicketSubmission::query()
            ->with(['form:id,form_code,form_title,form_type', 'ticket.machine:id,machine_code,machine_name,location', 'submitter:id,full_name'])
            ->whereHas('ticket');

        if (! self::canSeeAll($user)) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('submitted_by', $user?->id ?? 0)
                    ->orWhereHas('ticket.machine.pics', fn (Builder $p) => $p->where('users.id', $user?->id ?? 0));
            });
        }

        if (! empty($filters['machine_id'])) {
            $query->whereHas('ticket', fn (Builder $q) => $q->where('machine_id', $filters['machine_id']));
        }
        if (! empty($filters['form_id'])) {
            $query->where('form_id', $filters['form_id']);
        }
        if (! empty($filters['date_from'])) {
            $query->whereDate('updated_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('updated_at', '<=', $filters['date_to']);
        }

        return $query->orderByDesc('updated_at')->orderByDesc('id');
    }

    /**
     * Gabungan record inspeksi + tiket, terbaru dulu.
     */
    public static function rows(?User $user, array $filters = [], int $limitPerSource = 300): Collection
    {
        $inspections = self::inspectionQuery($user, $filters)->limit($limitPerSource)->get()
            ->map(fn (TaskSubmission $s) => self::inspectionRow($s));

        $tickets = self::ticketQuery($user, $filters)->limit($limitPerSource)->get()
            ->map(fn (TicketSubmission $s) => self::ticketRow($s));

        return $inspections->concat($tickets)
            ->sortByDesc('sort_at')
            ->values();
    }

    public static function inspectionRow(TaskSubmission $s): array
    {
        $task = $s->task;
        $snapshot = is_array($s->answers_values) ? $s->answers_values : [];

        return [
            'key' => 'I-'.$s->id,
            'kind' => 'INSPECTION',
            'type_label' => FormType::INSPECTION->label(),
            'form_title' => $task?->form?->form_title ?? ($snapshot['metadata']['form_title'] ?? '-'),
            'form_code' => $task?->form?->form_code ?? ($snapshot['metadata']['form_code'] ?? '-'),
            'reference_code' => $task?->task_code ?? '-',
            'machine' => self::machineArray($task?->machine),
            'submitted_by' => $s->user?->full_name ?? '-',
            'submitted_at' => $s->submitted_at?->format('Y-m-d H:i'),
            'sort_at' => $s->submitted_at?->timestamp ?? 0,
            'is_late' => (bool) ($task?->is_late ?? false),
            'late_days' => (int) ($task?->late_days ?? 0),
            'abnormal_count' => self::abnormalCount($snapshot),
            'detail_url' => '/records/'.$s->id,
        ];
    }

    public static function ticketRow(TicketSubmission $s): array
    {
        $ticket = $s->ticket;
        $snapshot = is_array($s->answers_values) ? $s->answers_values : [];

        return [
            'key' => 'T-'.$s->id,
            'kind' => 'TICKET',
            'type_label' => FormType::tryFrom((string) $s->context)?->label() ?? (string) $s->context,
            'form_title' => $s->form?->form_title ?? ($snapshot['metadata']['form_title'] ?? '-'),
            'form_code' => $s->form?->form_code ?? ($snapshot['metadata']['form_code'] ?? '-'),
            'reference_code' => $ticket?->ticket_code ?? '-',
            'machine' => self::machineArray($ticket?->machine),
            'submitted_by' => $s->submitter?->full_name ?? '-',
            'submitted_at' => $s->updated_at?->format('Y-m-d H:i'),
            'sort_at' => $s->updated_at?->timestamp ?? 0,
            'is_late' => false,
            'late_days' => 0,
            'abnormal_count' => 0,
            'detail_url' => '/records/ticket/'.$s->id,
        ];
    }

    private static function machineArray($machine): ?array
    {
        if (! $machine) {
            return null;
        }

        return [
            'id' => $machine->id,
            'machine_code' => $machine->machine_code,
            'machine_name' => $machine->machine_name,
            'location' => $machine->location,
        ];
    }

    public static function abnormalCount(array $snapshot): int
    {
        return collect($snapshot['sections'] ?? [])
            ->flatMap(fn ($sec) => $sec['questions'] ?? [])
            ->filter(fn ($q) => collect($q['selected_options'] ?? [])->contains(fn ($o) => ($o['is_normal'] ?? true) === false))
            ->count();
    }

    /**
     * Snapshot jawaban → section/pertanyaan siap tampil.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function sections(array $snapshot, bool $withNormality): array
    {
        return collect($snapshot['sections'] ?? [])
            ->sortBy(fn ($section) => (int) ($section['section_order'] ?? 0))
            ->map(function ($section) use ($withNormality) {
                $questions = collect($section['questions'] ?? [])
                    ->sortBy(fn ($question) => (int) ($question['question_order'] ?? 0))
                    ->map(function ($question) use ($withNormality) {
                        $detail = is_array($question['answer_detail'] ?? null) ? $question['answer_detail'] : [];
                        $rawValue = $detail['value'] ?? null;
                        $selected = collect($question['selected_options'] ?? [])
                            ->sortBy(fn ($o) => (int) ($o['option_order'] ?? 0))
                            ->values();

                        $inputType = $question['input_type'] ?? '';
                        $inputType = strtoupper($inputType instanceof \BackedEnum ? (string) $inputType->value : (string) $inputType);

                        $answerText = $selected->isNotEmpty()
                            ? $selected->pluck('option_text')->map(fn ($t) => (string) $t)->implode(' | ')
                            : trim(is_array($rawValue) ? implode(', ', array_map('strval', $rawValue)) : (string) $rawValue);

                        // Jawaban FILE berupa path → tampil sebagai foto, bukan teks
                        $photoPaths = collect(is_array($detail['photos'] ?? null) ? $detail['photos'] : [$detail['photos'] ?? null]);
                        if ($inputType === 'FILE') {
                            $photoPaths = $photoPaths->concat(is_array($rawValue) ? $rawValue : [$rawValue]);
                            $answerText = '';
                        }

                        $photos = $photoPaths
                            ->map(fn ($path) => self::photoUrl($path))
                            ->filter()
                            ->unique()
                            ->values()
                            ->all();

                        $isAbnormal = $withNormality && $selected->contains(fn ($o) => ($o['is_normal'] ?? true) === false);

                        return [
                            'question_text' => (string) ($question['question_text'] ?? '-'),
                            'input_type' => $inputType,
                            'answer_text' => $answerText === '' ? ($inputType === 'FILE' && $photos ? 'File terlampir' : '-') : $answerText,
                            'answer_note' => trim((string) ($detail['note'] ?? '')),
                            'photos' => $photos,
                            'is_abnormal' => $isAbnormal,
                            'answered_at' => $detail['answered_at'] ?? null,
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'section_title' => (string) ($section['section_title'] ?? 'Form'),
                    'section_description' => ($section['section_description'] ?? null) === '-' ? null : ($section['section_description'] ?? null),
                    'questions' => $questions,
                ];
            })
            ->values()
            ->all();
    }

    public static function photoUrl(mixed $path): ?string
    {
        if (! is_string($path)) {
            return null;
        }

        $path = trim($path);
        if ($path === '') {
            return null;
        }
        if (str_starts_with($path, 'http') || str_starts_with($path, '/storage/')) {
            return $path;
        }

        return Storage::disk('public')->exists($path) ? Storage::url($path) : null;
    }
}
