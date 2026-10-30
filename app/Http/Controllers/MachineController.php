<?php

namespace App\Http\Controllers;

use App\Models\Machine;
use App\Models\BreakdownTicket;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MachineController extends Controller
{
    /**
     * Menampilkan Daftar Seluruh Mesin.
     */
    public function index(Request $request): Response
    {
        $machines = Machine::latest('created_at')->get()->map(function ($m) {
            return [
                'id'           => $m->id,
                'machineCode'  => $m->machine_code,
                'machineName'  => $m->machine_name,
                'category'     => $m->category ?? 'General',
                'machineType'  => $m->machine_type ?? 'Machinery',
                'subType'      => $m->sub_type,
                'brand'        => $m->specifications['brand'] ?? null,
                'model'        => $m->specifications['model'] ?? null,
                'department'   => $m->department ?? $m->pic_department,
                'area'         => $m->area,
                'location'     => $m->location ?? '-',
                'criticality'  => $m->criticality ?? 'MEDIUM',
                'status'       => $m->machine_status ?? 'RUNNING',
                'activeStatus' => (bool) ($m->active_status ?? true),
            ];
        });

        return Inertia::render('machines/index', [
            'machines' => $machines,
        ]);
    }

    /**
     * Menampilkan Detail Profil Mesin Spesifik.
    */
    /**
     * Mendaftarkan Mesin Baru (Admin / Role MANAGE_MASTER).
     */
    public function create(Request $request)
    {
        return Inertia::render('machines/create');
    }

    // untuk menampilkan detail mesin
    public function show(Request $request, $id): Response
    {
        $machine = Machine::findOrFail($id);

        // Ambil riwayat breakdown aktif dan histori penanganan
        $breakdowns = BreakdownTicket::with(['reporter', 'assignee'])
            ->where('machine_id', $id)
            ->latest('reported_at')
            ->get()
            ->map(function ($ticket) {
                return [
                    'ticketId'         => $ticket->ticket_code ?? $ticket->id,
                    'category'         => $ticket->problem_category ?? '-',
                    'priority'         => $ticket->priority,
                    'problem'          => $ticket->problem_description ?? '-',
                    'status'           => $ticket->status,
                    'pipelineStage'    => $ticket->status,
                    'reportedAt'       => $ticket->reported_at ? $ticket->reported_at->format('Y-m-d H:i') : '-',
                    'closedAt'         => $ticket->closed_at ? $ticket->closed_at->format('Y-m-d H:i') : null,
                    'breakdownMinutes' => 0,
                    'rootCause'        => $ticket->root_cause,
                    'correctiveAction' => $ticket->corrective_action,
                ];
            });

        return Inertia::render('machines/show', [
            'machine' => [
                'id'                => $machine->id,
                'machineCode'       => $machine->machine_code,
                'machineName'       => $machine->machine_name,
                'machineType'       => $machine->machine_type,
                'category'          => $machine->category,
                'subType'           => $machine->sub_type,

                'specifications'    => $machine->specifications ?? [],
                // Ambil data lokasi dan area operasional
                'location'          => $machine->location,
                'department'        => $machine->department,
                'area'              => $machine->area,
                'picDepartment'     => $machine->pic_department,
                'criticality'       => $machine->criticality ?? 'MEDIUM',
                'status'            => $machine->machine_status ?? 'RUNNING',
                'commissionDate'    => $machine->commission_date ? $machine->commission_date->format('Y-m-d') : null,
                'qrId'              => $machine->qr_value ?? $machine->qr_id ?? $machine->machine_code,
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
            'qr_image_path'      => 'nullable|string',
            'qr_value'           => 'nullable|string',
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

            'specifications'         => 'nullable|array',
            'specifications.*.key'   => 'nullable|string',
            'specifications.*.label' => 'nullable|string',
            'specifications.*.value' => 'nullable|string',
        ]);

        // Auto-generate Machine code acak 
        $machineType = substr(strtoupper($validated['machine_type']), 0, 3);
        $randomNumber = str_pad((string) rand(1, 999), 2, '0', STR_PAD_LEFT);
        $machineCode = "FMC{$machineType}000{$randomNumber}";

        while (Machine::where('machine_code', $machineCode)->exists()) {
            $randomNumber = str_pad((string) rand(1, 999), 2, '0', STR_PAD_LEFT);
            $machineCode = "FMC{$machineType}000{$randomNumber}";
        }

        $finalCode = !empty($validated['machine_code']) ? $validated['machine_code'] : $machineCode;

        // Kumpulkan spesifikasi ke dalam JSON array
        $specifications = [];
        if (!empty($validated['brand'])) {
            $specifications['brand'] = $validated['brand'];
        }
        if (!empty($validated['model'])) {
            $specifications['model'] = $validated['model'];
        }
        if (!empty($validated['serial_number'])) {
            $specifications['serial_number'] = $validated['serial_number'];
        }
        if (!empty($validated['manufacturing_year'])) {
            $specifications['manufacturing_year'] = (int) $validated['manufacturing_year'];
        }

        if (!empty($validated['specifications']) && is_array($validated['specifications'])) {
            foreach ($validated['specifications'] as $item) {
                if (!empty($item['key'])) {
                    $specifications[$item['key']] = $item['value'] ?? '';
                }
            }
        }

        $machine = Machine::create([
            'user_id'         => $request->user()?->id ?? 1,
            'machine_code'    => $finalCode,
            'machine_name'    => $validated['machine_name'],
            'qr_value'        => $validated['qr_value'] ?? $finalCode,
            'qr_image_path'   => $validated['qr_image_path'] ?? null,
            'category'        => $validated['category'],
            'machine_type'    => $validated['machine_type'],
            'sub_type'        => $validated['sub_type'] ?? null,
            'location'        => $validated['location'],
            'department'      => $validated['department'] ?? null,
            'area'            => $validated['area'] ?? null,
            'pic_department'  => $validated['pic_department'] ?? null,
            'machine_status'  => $validated['status'] ?? 'RUNNING',
            'active_status'   => true,
            'commission_date' => $validated['commission_date'] ?? null,
            'specifications'  => $specifications,
        ]);

        return redirect()->route('machines.show', $machine->id)->with('success', "Mesin {$finalCode} dan QR berhasil terdaftar.");
    }

    /**
     * Menampilkan Form Edit Profil Mesin.
     */
    public function edit(Request $request, $id): Response
    {
        $machine = Machine::findOrFail($id);

        $fixedKeys = ['brand', 'model', 'serial_number', 'manufacturing_year'];
        $specs = $machine->specifications ?? [];
        $customSpecs = [];

        if (is_array($specs)) {
            foreach ($specs as $key => $val) {
                if (!in_array($key, $fixedKeys)) {
                    $customSpecs[] = [
                        'key' => $key,
                        'label' => ucwords(str_replace('_', ' ', $key)),
                        'value' => (string) $val,
                    ];
                }
            }
        }

        $currentStatus = is_object($machine->machine_status) && property_exists($machine->machine_status, 'value')
            ? $machine->machine_status->value
            : (string) ($machine->machine_status ?? 'RUNNING');

        return Inertia::render('machines/edit', [
            'machine' => [
                'id'                 => $machine->id,
                'machine_code'       => $machine->machine_code,
                'machine_name'       => $machine->machine_name,
                'category'           => $machine->category ?? '',
                'machine_type'       => $machine->machine_type ?? '',
                'sub_type'           => $machine->sub_type ?? '',
                'brand'              => $specs['brand'] ?? '',
                'model'              => $specs['model'] ?? '',
                'serial_number'      => $specs['serial_number'] ?? '',
                'manufacturing_year' => $specs['manufacturing_year'] ?? '',
                'location'           => $machine->location ?? '',
                'department'         => $machine->department ?? '',
                'area'               => $machine->area ?? '',
                'pic_department'     => $machine->pic_department ?? '',
                'status'             => $currentStatus,
                'commission_date'    => $machine->commission_date ? $machine->commission_date->format('Y-m-d') : '',
                'specifications'     => $customSpecs,
            ],
        ]);
    }

    /**
     * Menyimpan Perubahan Data Mesin.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $machine = Machine::findOrFail($id);

        $validated = $request->validate([
            'machine_name'       => 'required|string|max:255',
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

            'specifications'         => 'nullable|array',
            'specifications.*.key'   => 'nullable|string',
            'specifications.*.label' => 'nullable|string',
            'specifications.*.value' => 'nullable|string',
        ]);

        $specifications = [];
        if (!empty($validated['brand'])) {
            $specifications['brand'] = $validated['brand'];
        }
        if (!empty($validated['model'])) {
            $specifications['model'] = $validated['model'];
        }
        if (!empty($validated['serial_number'])) {
            $specifications['serial_number'] = $validated['serial_number'];
        }
        if (!empty($validated['manufacturing_year'])) {
            $specifications['manufacturing_year'] = (int) $validated['manufacturing_year'];
        }

        if (!empty($validated['specifications']) && is_array($validated['specifications'])) {
            foreach ($validated['specifications'] as $item) {
                if (!empty($item['key'])) {
                    $specifications[$item['key']] = $item['value'] ?? '';
                }
            }
        }

        $machine->update([
            'machine_name'    => $validated['machine_name'],
            'category'        => $validated['category'],
            'machine_type'    => $validated['machine_type'],
            'sub_type'        => $validated['sub_type'] ?? null,
            'location'        => $validated['location'],
            'department'      => $validated['department'] ?? null,
            'area'            => $validated['area'] ?? null,
            'pic_department'  => $validated['pic_department'] ?? null,
            'machine_status'  => $validated['status'] ?? $machine->machine_status,
            'commission_date' => $validated['commission_date'] ?? null,
            'specifications'  => $specifications,
        ]);

        return redirect()->route('machines.show', $machine->id)->with('success', "Data mesin {$machine->machine_code} berhasil diperbarui.");
    }

    /**
     * Menghapus Mesin.
     */
    public function destroy(Request $request, $id): RedirectResponse
    {
        $machine = Machine::findOrFail($id);
        $code = $machine->machine_code;
        $machine->delete();

        return redirect()->route('machines.index')->with('success', "Mesin {$code} berhasil dihapus.");
    }
}