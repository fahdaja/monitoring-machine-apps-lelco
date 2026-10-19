<?php

namespace App\Http\Controllers;

use App\Models\BreakdownTicket;
use App\Models\Machine;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class BreakdownController extends Controller
{
    /**
     * Menampilkan Halaman Pipeline Breakdown (Kanban Board).
     */
    public function index(): Response
    {
        $breakdowns = BreakdownTicket::with(['machine', 'reporter', 'technician'])
            ->where('status', '!=', 'CLOSED')
            ->latest('reported_at')
            ->get()
            ->map(function ($ticket) {
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
                    'currentLevel' => $ticket->category,
                    'reportedAt' => $ticket->reported_at->format('Y-m-d H:i'),
                    'breakdownMinutes' => $ticket->calculated_downtime,
                ];
            });

        return Inertia::render('Breakdown/Index', [
            'breakdowns' => $breakdowns,
        ]);
    }

    /**
     * Menyimpan Laporan Breakdown Baru dari Operator.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'machine_id' => 'required|exists:machines,machine_id',
            'category' => 'nullable|string',
            'priority' => 'required|in:LOW,MEDIUM,HIGH,CRITICAL',
            'description' => 'required|string',
        ]);

        // Generate Ticket ID Unik (Format: BD-YYYYMM-XXX)
        $datePrefix = 'BD-' . now()->format('Ym') . '-';
        $lastTicket = BreakdownTicket::where('ticket_id', 'LIKE', $datePrefix . '%')
            ->latest('id')
            ->first();

        $number = $lastTicket ? ((int) Str::afterLast($lastTicket->ticket_id, '-')) + 1 : 1;
        $ticketId = $datePrefix . str_pad($number, 3, '0', STR_PAD_LEFT);

        // Buat Ticket Baru
        BreakdownTicket::create([
            'ticket_id' => $ticketId,
            'machine_id' => $validated['machine_id'],
            'reporter_id' => $request->user()->id,
            'category' => $validated['category'] ?? 'GENERAL',
            'priority' => $validated['priority'],
            'description' => $validated['description'],
            'pipeline_stage' => 'REPORT',
            'status' => 'OPEN',
            'reported_at' => now(),
        ]);

        // Ubah Status Mesin Menjadi DOWN
        Machine::where('machine_id', $validated['machine_id'])->update(['status' => 'DOWN']);

        return redirect()->back()->with('success', 'Laporan breakdown berhasil dibuat.');
    }

    /**
     * Menutup (Close) Ticket Breakdown.
     */
    public function close(Request $request, string $ticketId): RedirectResponse
    {
        $validated = $request->validate([
            'root_cause' => 'required|string',
            'corrective_action' => 'required|string',
        ]);

        $ticket = BreakdownTicket::where('ticket_id', $ticketId)->firstOrFail();
        
        $closedAt = now();
        $downtime = $ticket->reported_at->diffInMinutes($closedAt);

        $ticket->update([
            'root_cause' => $validated['root_cause'],
            'corrective_action' => $validated['corrective_action'],
            'pipeline_stage' => 'VERIFICATION',
            'status' => 'CLOSED',
            'closed_at' => $closedAt,
            'breakdown_minutes' => $downtime,
        ]);

        // Kembalikan Status Mesin ke RUNNING
        Machine::where('machine_id', $ticket->machine_id)->update(['status' => 'RUNNING']);

        return redirect()->back()->with('success', 'Breakdown ticket berhasil ditutup.');
    }
}