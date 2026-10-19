<?php

namespace App\Http\Controllers;

use App\Models\Machine;
use App\Models\BreakdownTicket;
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

        // 1. Ringkasan KPI Statistik
        $summary = [
            'totalMachines' => Machine::where('is_active', true)->count(),
            'running' => Machine::where('status', 'RUNNING')->count(),
            'down' => Machine::where('status', 'DOWN')->count(),
            'underRepair' => Machine::where('status', 'UNDER_REPAIR')->count(),
            'openBreakdown' => BreakdownTicket::where('status', '!=', 'CLOSED')->count(),
            'inspectionDueToday' => 0, // Placeholder jika modul preventive inspection ditambahkan
            'inspectionOverdue' => 0,
            'inspectionCompletedToday' => 0,
        ];

        // 2. Mesin Tanggung Jawab User
        $myMachines = $user->assignedMachines()
            ->where('is_active', true)
            ->get()
            ->map(function ($machine) {
                return [
                    'id' => $machine->id,
                    'machineId' => $machine->machine_id,
                    'machineName' => $machine->machine_name,
                    'machineType' => $machine->machine_type,
                    'location' => $machine->location,
                    'status' => $machine->status,
                    'responsibilityType' => $machine->pivot->responsibility_type,
                    'assignmentNote' => $machine->pivot->notes,
                ];
            });

        // 3. Breakdown Problem Spesifik Mesin Saya
        $assignedMachineIds = $myMachines->pluck('machineId');
        $myProblems = BreakdownTicket::with('machine')
            ->whereIn('machine_id', $assignedMachineIds)
            ->where('status', '!=', 'CLOSED')
            ->latest('reported_at')
            ->get()
            ->map(fn ($ticket) => $this->transformTicket($ticket));

        // 4. Seluruh Breakdown Aktif System (Top 6)
        $breakdowns = BreakdownTicket::with('machine')
            ->where('status', '!=', 'CLOSED')
            ->latest('reported_at')
            ->take(6)
            ->get()
            ->map(fn ($ticket) => $this->transformTicket($ticket));

        // 5. Distribusi Status Mesin
        $statusCounts = Machine::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return Inertia::render('Dashboard', [
            'summary' => $summary,
            'myMachines' => $myMachines,
            'myProblems' => $myProblems,
            'breakdowns' => $breakdowns,
            'statusCounts' => $statusCounts,
            'syncedAt' => now()->format('H:i:s'),
        ]);
    }

    /**
     * Helper Transform Data Ticket
     */
    private function transformTicket(BreakdownTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'ticketId' => $ticket->ticket_id,
            'machineId' => $ticket->machine_id,
            'machineName' => $ticket->machine->machine_name ?? $ticket->machine_id,
            'location' => $ticket->machine->location ?? '-',
            'problem' => $ticket->description,
            'status' => $ticket->status,
            'pipelineStage' => $ticket->pipeline_stage,
            'priority' => $ticket->priority,
            'reportedAt' => $ticket->reported_at->format('Y-m-d H:i'),
            'breakdownMinutes' => $ticket->calculated_downtime,
        ];
    }
}