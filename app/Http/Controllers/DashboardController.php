<?php

namespace App\Http\Controllers;

use App\Enums\MachineStatus;
use App\Enums\TicketStatus;
use App\Models\BreakdownTicket;
use App\Models\Form;
use App\Models\Machine;
use App\Models\Schedule;
use App\Models\ScheduleCondition;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Menampilkan Halaman Utama Dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user && $user->hasRole(User::ROLE_ADMIN);
        $isSupervisor = $user && $user->hasRole('SUPERVISOR');
        $isMonitoringRole = $isAdmin || $isSupervisor;
        $isOperator = $user && $user->hasRole('OPERATOR');
        $today = Carbon::today();

        // 1. Ringkasan KPI Statistik
        $activeMachines = Machine::where('active_status', true);

        $summary = [
            'totalMachines' => (clone $activeMachines)->count(),
            'running' => (clone $activeMachines)->where('machine_status', MachineStatus::RUNNING->value)->count(),
            'down' => (clone $activeMachines)->where('machine_status', MachineStatus::DOWN->value)->count(),
            'underRepair' => (clone $activeMachines)->whereIn('machine_status', [
                MachineStatus::UNDER_REPAIR->value,
                MachineStatus::WAITING_SPAREPART->value,
                MachineStatus::WAITING_VENDOR->value,
                MachineStatus::WAITING_VERIFICATION->value,
            ])->count(),
            'openBreakdown' => BreakdownTicket::where('status', '!=', TicketStatus::CLOSED->value)->count(),
            'inspectionDueToday' => Task::where('status', '!=', 'COMPLETED')
                ->whereDate('due_date', $today)
                ->count(),
            'inspectionOverdue' => Task::where('status', '!=', 'COMPLETED')
                ->where(function ($q) use ($today) {
                    $q->where('status', 'OVERDUE')
                        ->orWhereDate('due_date', '<', $today);
                })
                ->count(),
            'inspectionCompletedToday' => Task::where('status', 'COMPLETED')
                ->whereDate('completed_at', $today)
                ->count(),
        ];

        // 2. Mesin Tanggung Jawab User (PIC via pivot machine_pics — untuk non-monitoring role)
        $assignedMachines = (! $isMonitoringRole && $user)
            ? $user->machines()
                ->where('active_status', true)
                ->orderBy('machine_code')
                ->get()
            : collect();

        $assignedMachineIds = $assignedMachines->pluck('id');

        $myMachines = $assignedMachines->map(function (Machine $machine) {
            $status = $machine->machine_status instanceof MachineStatus
                ? $machine->machine_status->value
                : (string) ($machine->machine_status ?? 'RUNNING');

            return [
                'id' => $machine->id,
                'machineId' => $machine->machine_code,
                'machineName' => $machine->machine_name,
                'machineType' => $machine->machine_type,
                'location' => $machine->location,
                'status' => $status,
                'responsibilityType' => 'PIC MESIN',
                'assignmentNote' => $machine->area ? "Area: {$machine->area}" : ($machine->department ? "Dept: {$machine->department}" : null),
            ];
        })->values();

        // 3. Inspection Tasks Aktif
        //    - Admin/Supervisor: hanya task yang butuh perhatian (OVERDUE, IN_PROGRESS, atau jatuh tempo <= hari ini)
        //    - Operator/Teknisi: task aktif untuk mesin PIC & assignedUsers
        $tasksQuery = Task::with(['machine', 'form', 'assignedUsers', 'user'])
            ->where('status', '!=', 'COMPLETED');

        if ($isMonitoringRole) {
            $tasksQuery->where(function ($q) use ($today) {
                $q->whereIn('status', ['OVERDUE', 'DUE', 'IN_PROGRESS'])
                    ->orWhereDate('due_date', '<=', $today);
            });
        } else {
            if ($assignedMachineIds->isEmpty()) {
                $tasksQuery->whereRaw('1 = 0');
            } else {
                $tasksQuery->whereIn('machine_id', $assignedMachineIds)
                    ->where(function ($q) use ($user) {
                        $q->whereDoesntHave('assignedUsers')
                            ->orWhereHas('assignedUsers', fn ($sub) => $sub->where('users.id', $user->id));
                    });
            }
        }

        $myInspectionTasks = $tasksQuery
            ->orderByRaw("CASE
                WHEN status = 'OVERDUE' OR due_date < ? THEN 1
                WHEN status = 'IN_PROGRESS' THEN 2
                WHEN status = 'DUE' OR due_date = ? THEN 3
                ELSE 4
            END", [$today->toDateString(), $today->toDateString()])
            ->orderBy('due_date')
            ->take(6)
            ->get()
            ->map(function (Task $task) use ($today, $user, $isAdmin) {
                $status = strtoupper((string) $task->status);
                if ($status !== 'COMPLETED' && $status !== 'IN_PROGRESS' && $task->due_date) {
                    if ($task->due_date->lt($today)) {
                        $status = 'OVERDUE';
                    } elseif ($task->due_date->isSameDay($today) && $status === 'UPCOMING') {
                        $status = 'DUE';
                    }
                }

                $isAssignedToOther = ! is_null($task->assigned_user_id)
                    && $user
                    && (int) $task->assigned_user_id !== (int) $user->id;

                return [
                    'taskId' => $task->id,
                    'taskCode' => $task->task_code,
                    'machineDbId' => $task->machine_id,
                    'machineId' => $task->machine?->machine_code ?? '-',
                    'machineName' => $task->machine?->machine_name ?? 'Mesin tidak ditemukan',
                    'activity' => $task->form?->form_title ?? 'Inspeksi Preventive',
                    'level' => $task->origin_type === 'CONDITION' ? 'Lanjutan' : 'Rutin',
                    'scheduledDate' => $task->due_date ? $task->due_date->format('Y-m-d') : '-',
                    'location' => $task->machine?->location ?? '-',
                    'status' => $status,
                    'assignedUserName' => $task->user?->full_name,
                    'isAssignedToOther' => $isAssignedToOther,
                    'canWork' => $isAdmin || ! $isAssignedToOther,
                ];
            })
            ->values();

        // 4. Breakdown Problem Spesifik Mesin Saya (untuk non-monitoring role)
        $myProblems = (! $isMonitoringRole && $assignedMachineIds->isNotEmpty())
            ? BreakdownTicket::with('machine')
                ->whereIn('machine_id', $assignedMachineIds)
                ->where('status', '!=', TicketStatus::CLOSED->value)
                ->latest('reported_at')
                ->take(6)
                ->get()
                ->map(fn (BreakdownTicket $ticket) => $this->transformTicket($ticket, $user))
                ->values()
            : collect();

        // 5. Seluruh Breakdown Aktif System (Top 6 — disembunyikan untuk OPERATOR murni)
        $breakdowns = ! $isOperator
            ? BreakdownTicket::with('machine')
                ->where('status', '!=', TicketStatus::CLOSED->value)
                ->latest('reported_at')
                ->take(6)
                ->get()
                ->map(fn (BreakdownTicket $ticket) => $this->transformTicket($ticket, $user))
                ->values()
            : collect();

        // 6. Distribusi Status Mesin (7 status operasional utama)
        $rawStatusCounts = Machine::selectRaw('machine_status, count(*) as count')
            ->groupBy('machine_status')
            ->pluck('count', 'machine_status');

        $statusCounts = collect([
            MachineStatus::RUNNING,
            MachineStatus::DOWN,
            MachineStatus::UNDER_REPAIR,
            MachineStatus::WAITING_SPAREPART,
            MachineStatus::WAITING_VENDOR,
            MachineStatus::WAITING_VERIFICATION,
            MachineStatus::INACTIVE,
        ])->mapWithKeys(fn (MachineStatus $case) => [
            $case->value => (int) ($rawStatusCounts[$case->value] ?? 0),
        ]);

        // 7. Metrics Khusus Monitoring (ADMIN & SUPERVISOR)
        $managementMetrics = null;
        if ($isMonitoringRole) {
            $monthStart = $today->copy()->startOfMonth();

            // PM Compliance bulan berjalan (task jatuh tempo s/d hari ini)
            $pmTotalDueThisMonth = Task::whereBetween('due_date', [$monthStart->toDateString(), $today->toDateString()])
                ->count();
            $pmCompletedThisMonth = Task::whereBetween('due_date', [$monthStart->toDateString(), $today->toDateString()])
                ->where('status', 'COMPLETED')
                ->count();
            $pmComplianceRate = $pmTotalDueThisMonth > 0
                ? (int) round(($pmCompletedThisMonth / $pmTotalDueThisMonth) * 100)
                : null;

            // Downtime & MTTR bulan berjalan
            $monthTickets = BreakdownTicket::where('reported_at', '>=', $monthStart)
                ->get(['status', 'reported_at', 'closed_at', 'breakdown_minutes']);

            $monthlyDowntimeMinutes = (int) $monthTickets->sum(fn (BreakdownTicket $t) => (int) $t->calculated_downtime);
            $closedThisMonth = $monthTickets->filter(function (BreakdownTicket $t) {
                $st = $t->status instanceof TicketStatus ? $t->status->value : (string) $t->status;
                return $st === TicketStatus::CLOSED->value;
            });
            $mttrMinutes = $closedThisMonth->isNotEmpty()
                ? (int) round($closedThisMonth->avg(fn (BreakdownTicket $t) => (int) $t->calculated_downtime))
                : 0;

            // Tiket menunggu verifikasi (READY_FOR_CLOSING)
            $pendingVerificationQuery = BreakdownTicket::with('machine')
                ->where('status', TicketStatus::READY_FOR_CLOSING->value);

            $pendingVerificationCount = (clone $pendingVerificationQuery)->count();
            $pendingVerificationTickets = $pendingVerificationQuery
                ->latest('closed_at')
                ->take(6)
                ->get()
                ->map(fn (BreakdownTicket $ticket) => $this->transformTicket($ticket, $user))
                ->values();

            // Top 5 mesin paling sering breakdown (30 hari terakhir)
            $topBreakdownMachines = BreakdownTicket::with('machine')
                ->whereNotNull('machine_id')
                ->where('reported_at', '>=', now()->subDays(30))
                ->get(['machine_id', 'reported_at', 'closed_at', 'breakdown_minutes'])
                ->groupBy('machine_id')
                ->map(function ($group) {
                    $first = $group->first();
                    $machine = $first->machine;

                    return [
                        'id' => $first->machine_id,
                        'machineCode' => $machine?->machine_code ?? '-',
                        'machineName' => $machine?->machine_name ?? 'Mesin tidak ditemukan',
                        'location' => $machine?->location ?? '-',
                        'ticketCount' => $group->count(),
                        'totalDowntimeMinutes' => (int) $group->sum(fn (BreakdownTicket $t) => (int) $t->calculated_downtime),
                    ];
                })
                ->sortByDesc('ticketCount')
                ->take(5)
                ->values();

            $managementMetrics = [
                'pendingVerificationCount' => $pendingVerificationCount,
                'pendingVerificationTickets' => $pendingVerificationTickets,
                'pmTotalDueThisMonth' => $pmTotalDueThisMonth,
                'pmCompletedThisMonth' => $pmCompletedThisMonth,
                'pmComplianceRate' => $pmComplianceRate,
                'monthlyDowntimeMinutes' => $monthlyDowntimeMinutes,
                'mttrMinutes' => $mttrMinutes,
                'closedThisMonthCount' => $closedThisMonth->count(),
                'topBreakdownMachines' => $topBreakdownMachines,
            ];
        }

        // 8. Kesehatan Master Data (Khusus ADMIN)
        $masterHealth = $isAdmin ? [
            'activeUsers' => User::where('is_active', true)->count(),
            'totalForms' => Form::count(),
            'activeSchedules' => Schedule::where('is_active', true)->count(),
            'activeConditions' => ScheduleCondition::where('is_active', true)->count(),
            'machinesWithoutPic' => Machine::where('active_status', true)->whereDoesntHave('pics')->count(),
        ] : null;

        return Inertia::render('dashboard', [
            'isAdmin' => $isAdmin,
            'isMonitoringRole' => $isMonitoringRole,
            'isOperator' => $isOperator,
            'summary' => $summary,
            'managementMetrics' => $managementMetrics,
            'masterHealth' => $masterHealth,
            'myMachines' => $myMachines,
            'myInspectionTasks' => $myInspectionTasks,
            'myProblems' => $myProblems,
            'breakdowns' => $breakdowns,
            'statusCounts' => $statusCounts,
            'syncedAt' => now()->format('H:i:s'),
        ]);
    }

    /**
     * Sama dengan KanbanController::canReadSubmissions — admin, supervisor, atau verifikator tiket.
     */
    private function canReadSubmissions(?User $user, BreakdownTicket $ticket): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole([User::ROLE_ADMIN, 'SUPERVISOR'])) {
            return true;
        }

        return (int) $ticket->verified_by === (int) $user->id;
    }

    /**
     * Helper Transform Data Ticket Breakdown
     */
    private function transformTicket(BreakdownTicket $ticket, ?User $user = null): array
    {
        $status = $ticket->status instanceof TicketStatus
            ? $ticket->status->value
            : (string) $ticket->status;

        $problemText = collect($ticket->problems ?? [])
            ->map(function ($p) {
                if (is_string($p)) {
                    return trim($p);
                }
                if (! is_array($p)) {
                    return '';
                }
                $detail = trim((string) ($p['abnormal_options'] ?? '')) !== ''
                    ? ($p['abnormal_options'] ?? '')
                    : trim((string) ($p['answer_text'] ?? ''));

                return trim(($p['question_text'] ?? '') . ($detail !== '' ? ' — ' . $detail : ''));
            })
            ->filter()
            ->implode(' • ');

        return [
            'id' => $ticket->id,
            'ticketId' => $ticket->ticket_code,
            'machineId' => $ticket->machine?->machine_code ?? (string) $ticket->machine_id,
            'machineName' => $ticket->machine?->machine_name ?? 'Mesin tidak ditemukan',
            'location' => $ticket->machine?->location ?? '-',
            'problem' => $problemText !== '' ? $problemText : ($ticket->problem_category ?? 'Laporan breakdown'),
            'status' => $status,
            'pipelineStage' => $ticket->pipeline_stage,
            'reportedAt' => $ticket->reported_at?->format('Y-m-d H:i') ?? '-',
            'breakdownMinutes' => (int) $ticket->calculated_downtime,
            'canViewDetail' => $this->canReadSubmissions($user, $ticket),
        ];
    }
}
