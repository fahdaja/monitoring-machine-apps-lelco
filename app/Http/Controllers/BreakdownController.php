<?php

namespace App\Http\Controllers;

use App\Models\BreakdownTicket;
use App\Models\Machine;
use App\Models\Task;
use App\Models\User;
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
        $breakdowns = BreakdownTicket::with(['machine'])
            ->whereIn('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_SPAREPART', 'WAITING_VENDOR', 'READY_FOR_CLOSING', 'CLOSED'])
            ->latest('reported_at')
            ->get()
            ->map(function ($ticket) {
  $statusVal = is_object($ticket->status) ? ($ticket->status->value ?? (string)$ticket->status) : (string)$ticket->status;
                $statusVal = strtoupper(trim($statusVal));

                $pipelineStage = 'REPORT'; 

                if ($statusVal === 'OPEN') {
                    $pipelineStage = 'REPORT';
                } elseif (in_array($statusVal, ['ACKNOWLEDGED', 'IN_PROGRESS', 'UNDER_REPAIR'])) {
                    $pipelineStage = 'REPAIR'; // Masuk tahap 2
                } elseif (in_array($statusVal, ['WAITING_SPAREPART', 'WAITING_VENDOR'])) {
                    $pipelineStage = 'WAITING'; // Masuk tahap 3
                } elseif ($statusVal === 'READY_FOR_CLOSING') {
                    $pipelineStage = 'CLOSING'; // Masuk tahap 4
                } elseif ($statusVal === 'CLOSED') {
                    $pipelineStage = 'VERIFICATION'; // Masuk tahap 5
                }
                return [
                    'id' => $ticket->id,
                    'ticket_code' => $ticket->ticket_code,
                    'machine_id' => $ticket->machine_id,
                    'machine_code' => $ticket->machine->machine_code ?? '-',
                    'machine_name' => $ticket->machine->machine_name ?? '-',
                    'location' => $ticket->machine->location ?? '-',
                    'problem' => $ticket->problem_descriptions,
                    'status' => $statusVal,
                    'source_type' => $ticket->source_type,
                    'pipelineStage' => $pipelineStage, // Dibuat camelCase agar cocok dengan FE
                    'reportedAt' => $ticket->reported_at ? $ticket->reported_at->format('Y-m-d H:i') : '-', // Dibuat camelCase
                    'breakdownMinutes' => $ticket->calculated_downtime,
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
            'status' => 'IN_PROGRESS',             // Atau 'ACKNOWLEDGED' lalu 'IN_PROGRESS'
            'started_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Tiket berhasil diterima dan dipindahkan ke tahap Repair.');
    }

    /**
     * Memperbarui Status Pending di Tahap Repair (Menunggu Sparepart / Vendor)
     */
    public function updateStatus(Request $request, string $ticketCode): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:IN_PROGRESS,WAITING_SPAREPART,WAITING_VENDOR,READY_FOR_CLOSING',
        ]);

        $ticket = BreakdownTicket::where('ticket_code', $ticketCode)->firstOrFail();

        $ticket->update([
            'status' => $validated['status'],
        ]);

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
        $downtime = $ticket->reported_at ? $ticket->reported_at->diffInMinutes($closedAt) : 0;

        $ticket->update([
            'root_cause' => $validated['root_cause'],
            'corrective_action' => $validated['corrective_action'],
            'status' => 'READY_FOR_CLOSING', // Ubah agar masuk ke tahap 4. Closing
            'closed_at' => $closedAt,
            'breakdownMinutes' => $downtime,
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
}