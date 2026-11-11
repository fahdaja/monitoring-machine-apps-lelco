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
        $breakdowns = BreakdownTicket::with(['reporter', 'assignee', 'verifier','machine'])
            ->whereIn('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_SPAREPART', 'WAITING_VENDOR', 'READY_FOR_CLOSING', 'CLOSED'])
            ->latest('reported_at')
            ->get()
            ->map(function ($ticket) {
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
        $downtime = $ticket->reported_at ? $ticket->reported_at->diffInMinutes($closedAt) : 0 ;

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
            'machine_id' => 'required|exists:machines,id',
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