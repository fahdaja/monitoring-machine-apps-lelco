<?php

namespace App\Http\Controllers;

use App\Models\Machine;
use App\Models\BreakdownTicket;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class MachineController extends Controller
{
    /**
     * Menampilkan Daftar Seluruh Mesin.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('machines/index' );
    }

    /**
     * Menampilkan Detail Profil Mesin Spesifik.
    */
    /**
     * Mendaftarkan Mesin Baru (Admin / Role MANAGE_MASTER).
     */
    public function create()
    {
        
        return Inertia::render('machines/create');
    }

    public function show(Request $request, $id): Response
    {


        $machine = Machine::where($id)->firstOrFail();

        // Ambil riwayat breakdown aktif dan histori penanganan
        $breakdowns = BreakdownTicket::with(['reporter', 'technician'])
            ->where($id)
            ->latest('reported_at')
            ->get()
            ->map(function ($ticket) {
                return [
                    'ticketId'         => $ticket->ticket_id,
                    'category'         => $ticket->category,
                    'priority'         => $ticket->priority,
                    'problem'          => $ticket->description,
                    'status'           => $ticket->status,
                    'pipelineStage'    => $ticket->pipeline_stage,
                    'reportedAt'       => $ticket->reported_at ? $ticket->reported_at->format('Y-m-d H:i') : '-',
                    'closedAt'         => $ticket->closed_at ? $ticket->closed_at->format('Y-m-d H:i') : null,
                    'breakdownMinutes' => $ticket->calculated_downtime ?? 0,
                    'rootCause'        => $ticket->root_cause,
                    'correctiveAction' => $ticket->corrective_action,
                ];
            });
            

        return Inertia::render('machines/show', [
            'machine' => [
                'id'                => $machine->machine_id,
                'machineCode'       => $machine->machine_code,
                'machineName'       => $machine->machine_name,
                'machineType'       => $machine->machine_type,
                'category'          => $machine->category,
                'subType'           => $machine->sub_type,

                // Ambil data spesifikasi dari JSON
                'brand'             => $machine->specifications['brand'] ?? '-',
                'model'             => $machine->specifications['model'] ?? '-',
                'serialNumber'      => $machine->specifications['serial_number'] ?? '-',
                'manufacturingYear' => $machine->specifications['manufacturing_year'] ?? null,

                // Ambil data lokasi dan area operasional
                'location'          => $machine->location,
                'department'        => $machine->department,
                'area'              => $machine->area,
                'picDepartment'     => $machine->pic_department,
                'criticality'       => $machine->criticality,
                'status'            => $machine->machine_status, // Sesuaikan nama ke 'status'
                'commissionDate'    => $machine->commission_date ? $machine->commission_date->format('Y-m-d') : null,
                'qrId'              => $machine->qr_id,
            ],
            'breakdowns'  => $breakdowns,
            'inspections' => [],
        ]);
    }

    

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'machine_code'       => 'nullable|string|unique:machines,machine_code',
            'machine_name'       => 'required|string|max:255',
            'qr_image_path' => 'nullable|string',
            'qr_value' => 'nullable|string',
            'category'           => 'required|string',
            'machine_type'       => 'required|string',
            'sub_type'           => 'nullable|string',
            'brand'              => 'nullable|string',
            'model'              => 'nullable|string',
            'serial_number'      => 'nullable|string',
            'manufacturing_year' => 'nullable|integer|min:1900|max:2100',
            'department'         => 'nullable|string',
            'area'               => 'nullable|string',
            'location'           => 'required|string',
            'pic_department'     => 'nullable|string',
            'commission_date'    => 'nullable|date',
            'status'             => 'nullable|string',

            'specifications'     => 'nullable|array',
            'specifications.*.key'   => 'required|string',
            'specifications.*.label' => 'required|string',
            'specifications.*.value' => 'required|string',
        ]);

        // Auto-generate Machine code acak 
    $machineType = substr(strtoupper($validated['machine_type']),0,2);

    $randomNumber = str_pad(rand(1,999),2, '0', STR_PAD_LEFT);

    $machineCode = "MC{$machineType}00{$randomNumber}";

    while(Machine::where('machine_code', $machineCode)->exists()){
        $randomNumber = str_pad(rand(1,999),2, '0', STR_PAD_LEFT);
        $machineCode = "MC{$machineType}00{$randomNumber}";
    }


        // Buat record baru dengan nama kolom yang sesuai dengan skema DB
        Machine::create([
            'machine_code'    => $validated['machine_code'],
            'machine_name'    => $validated['machine_name'],
            'qr_value'      => $validated['qr_value'],
            'qr_image_path' => $validated['qr_image_path'],
            'category'        => $validated['category'],
            'machine_type'    => $validated['machine_type'],
            'sub_type'        => $validated['sub_type'] ?? null,
            'location'        => $validated['location'],
            'department'      => $validated['department'] ?? null,
            'area'            => $validated['area'] ?? null,
            'pic_department'  => $validated['pic_department'] ?? null,
            'machine_status'  => 'RUNNING',
            'active_status'   => true,
            'commission_date' => $validated['commission_date'] ?? null,
            'specifications'  => $validated['specifications'] ?? [],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Mesin baru dan QR berhasil terdaftar.');
    }

    /**
     * Generasi ulang / Replace QR Code Mesin.
     */
    public function updateQr(Request $request, string $machineId): RedirectResponse
    {
        $machine = Machine::where('machine_id', $machineId)->firstOrFail();
        
        $newQrId = 'QR-' . strtoupper(Str::random(8));
        $machine->update([
            'qr_id'      => $newQrId,
            'updated_by' => auth()->id(),
        ]);

        return redirect()->back()->with('success', 'QR Code mesin berhasil diperbarui.');
    }
}