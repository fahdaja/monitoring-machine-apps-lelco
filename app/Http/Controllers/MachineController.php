<?php

namespace App\Http\Controllers;

use App\Models\Machine;
use App\Models\BreakdownTicket;
use App\Models\Form;
use App\Models\Task;
use App\Models\User;
use App\Enums\FormType;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MachineController extends Controller
{
    /**
     * Halaman detail tiket breakdown boleh dibuka admin atau verifikator tiket tersebut.
     */
    private function canViewTicketDetail(Request $request, BreakdownTicket $ticket): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if (strtoupper((string) $user->role) === 'ADMIN') {
            return true;
        }

        return (int) $ticket->verified_by === (int) $user->id;
    }

    /**
     * Daftar user aktif yang bisa dipilih jadi PIC mesin.
     * ADMIN sengaja tidak dijadikan kandidat: PIC itu penanggung jawab lapangan,
     * sementara admin cuma pengawas (tetap bisa membuka task tanpa perlu terdaftar).
     * Flag akses inspeksi ikut dikirim supaya admin tidak salah pilih role yang
     * toh tidak bisa membuka form pemeriksaan.
     */
    private function picCandidates(): array
    {
        return User::whereRaw('UPPER(role) <> ?', [User::ROLE_ADMIN])
            ->orderBy('full_name')
            ->get()
            ->map(fn (User $user) => [
                'id'                   => $user->id,
                'full_name'            => $user->full_name,
                'user_code'            => $user->user_code,
                'role'                 => (string) $user->role,
                'department'           => $user->department,
                'can_access_inspection' => $user->hasRole(['ADMIN', 'OPERATOR', 'MAINTENANCE', 'SUPERVISOR', 'ENGINEERING', 'VENDOR']),
            ])
            ->values()
            ->all();
    }

    /**
     * Aturan validasi PIC: id bukan ADMIN (admin bukan kandidat PIC).
     */
    private function picUserRules(): array
    {
        return [
            'pic_user_ids'   => 'nullable|array',
            'pic_user_ids.*' => [
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->whereRaw('UPPER(role) <> ?', [User::ROLE_ADMIN])),
            ],
        ];
    }

    /**
     * Simpan pilihan PIC ke pivot. Array kosong = gate dilepas (mesin terbuka lagi).
     */
    private function syncPics(Machine $machine, array $picUserIds): void
    {
        $ids = collect($picUserIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $machine->pics()->sync($ids);
    }

    /**
     * Menampilkan Daftar Seluruh Mesin.
     */
    public function index(Request $request): Response
    {
        $machines = Machine::with('pics')->latest('created_at')->get()->map(function ($m) {
            return [
                'id'           => $m->id,
                'machineCode'  => $m->machine_code,
                'machineName'  => $m->machine_name,
                'category'     => $m->category ?? 'General',
                'machineType'  => $m->machine_type ?? 'Machinery',
                'subType'      => $m->sub_type,
                'brand'        => $m->specifications['brand'] ?? null,
                'model'        => $m->specifications['model'] ?? null,
                'department'   => $m->department ?? $m->picNamesText(),
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
        return Inertia::render('machines/create', [
            'picCandidates' => $this->picCandidates(),
        ]);
    }

    // untuk menampilkan detail mesin
    public function show(Request $request, $id): Response
    {
        $machine = Machine::with('pics')->findOrFail($id);


        // Ambil riwayat breakdown aktif dan histori penanganan
        $breakdowns = BreakdownTicket::with(['reporter', 'assignee'])
        ->where('machine_id', $id)
        ->latest('reported_at')
        ->get()
        ->map(function ($ticket) use ($request) {
            $closed_at = now();
            $downtime = $ticket->reported_at ? $ticket->reported_at->diffInMinutes($closed_at) : 0;

            $problemText = collect($ticket->problems ?? [])
                ->map(function ($p) {
                    $detail = trim((string) ($p['abnormal_options'] ?? '')) !== ''
                        ? ($p['abnormal_options'] ?? '')
                        : trim((string) ($p['answer_text'] ?? ''));

                    return trim(($p['question_text'] ?? '') . ($detail !== '' ? ' — ' . $detail : ''));
                })
                ->filter()
                ->implode(' • ');

            return [
                'ticket_code'         => $ticket->ticket_code,
                // halaman detail tiket hanya bisa dibuka admin atau verifikator tiket ini
                'detail_url'          => $this->canViewTicketDetail($request, $ticket) ? '/breakdowns/'.$ticket->ticket_code : null,
                'category'         => $ticket->problem_category ?? '-',
                    'priority'         => $ticket->priority,
                    'problem'          => $problemText !== '' ? $problemText : '-',
                    'status'           => $ticket->status,
                    'pipelineStage'    => $ticket->status,
                    'reported_at'       => $ticket->reported_at ? $ticket->reported_at->format('Y-m-d H:i') : '-',
                    'closed_at'         => $ticket->closed_at ? $ticket->closed_at->format('Y-m-d H:i') : null,
                    'breakdownMinutes' => $downtime,
                    'rootCause'        => $ticket->root_cause,
                    'correctiveAction' => $ticket->corrective_action,
                ];
            });

            $currentUser = $request->user();

            $tasks = Task::with(['form', 'user', 'assignedUsers'])
                ->where('machine_id', $machine->id)
                ->orderByRaw("CASE
                    WHEN status = 'OVERDUE' THEN 1
                    WHEN status = 'IN_PROGRESS' THEN 2
                    WHEN status = 'DUE' THEN 3
                    WHEN status = 'COMPLETED' THEN 4
                    ELSE 5
                END")
                ->orderByDesc('completed_at')
                ->orderByDesc('due_date')
                ->take(10)
                ->get()
                ->map(function (Task $task) use ($machine, $currentUser) {
                    $status = strtoupper((string) $task->status);
                    if ($status !== 'COMPLETED' && $status !== 'IN_PROGRESS' && $task->due_date) {
                        if ($task->due_date->lt(today())) {
                            $status = 'OVERDUE';
                        } elseif ($task->due_date->isSameDay(today()) && $status === 'UPCOMING') {
                            $status = 'DUE';
                        }
                    }

                    $isAssignedToOther = $status === 'IN_PROGRESS'
                        && ! is_null($task->assigned_user_id)
                        && $currentUser
                        && (int) $task->assigned_user_id !== (int) $currentUser->id;

                    $canWork = in_array($status, ['DUE', 'OVERDUE', 'IN_PROGRESS'], true);
                    if ($canWork && $currentUser) {
                        if ($currentUser->hasRole(User::ROLE_ADMIN)) {
                            $canWork = ! $isAssignedToOther;
                        } else {
                            if (! $machine->isPic($currentUser)) {
                                $canWork = false;
                            } elseif ($task->assignedUsers->isNotEmpty() && ! $task->assignedUsers->contains('id', $currentUser->id)) {
                                $canWork = false;
                            } elseif ($isAssignedToOther) {
                                $canWork = false;
                            }
                        }
                    } else {
                        $canWork = false;
                    }

                    return [
                        'id'                => $task->id,
                        'task_code'         => $task->task_code,
                        'title'             => $task->form?->form_title ?? 'Pemeliharaan Berkala',
                        'inspectorName'     => $task->user?->full_name ?? '-',
                        'status'            => $status,
                        'resultStatus'      => null,
                        'started_at'        => $task->completed_at
                            ? $task->completed_at->format('Y-m-d H:i')
                            : ($task->due_date ? $task->due_date->format('Y-m-d') : '-'),
                        'next_schedule_at'  => $task->end_date ? $task->end_date->format('Y-m-d') : null,
                        'findings'          => null,
                        'notes'             => null,
                        'canWork'           => $canWork,
                        'isAssignedToOther' => $isAssignedToOther,
                    ];
                })
                ->values();

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
                'picDepartment'     => $machine->picNamesText(),
                'pics'              => $machine->pics
                    ->map(fn (User $pic) => [
                        'id'         => $pic->id,
                        'full_name'  => $pic->full_name,
                        'role'       => (string) $pic->role,
                        'department' => $pic->department,
                        'is_active'  => (bool) $pic->is_active,
                    ])
                    ->values()
                    ->all(),
                'criticality'       => $machine->criticality ?? 'MEDIUM',
                'status'            => $machine->machine_status ?? 'RUNNING',
                'commissionDate'    => $machine->commission_date ? $machine->commission_date->format('Y-m-d') : null,
                'qrId'              => $machine->qr_value ?? $machine->qr_id ?? $machine->machine_code,
            ],
            'breakdowns'  => $breakdowns,
            'tasks'       => $tasks,
            'reportForm' => $this->reportFormPayload($machine->id),
        ]);
    }

    /**
     * Daftar pertanyaan form MANUAL_REPORT untuk modal "Laporkan Breakdown".
     * Section diabaikan, pertanyaan ditampilkan datar di dalam modal.
     */
    private function reportFormPayload(int $machineId): ?array
    {
        return Form::findTemplate(FormType::MANUAL_REPORT, $machineId)?->modalPayload();
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate(array_merge([
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
            'commission_date'    => 'nullable|date',
            'status'             => 'nullable|string',

            'specifications'         => 'nullable|array',
            'specifications.*.key'   => 'nullable|string',
            'specifications.*.label' => 'nullable|string',
            'specifications.*.value' => 'nullable|string',
        ], $this->picUserRules()));

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
            'machine_status'  => $validated['status'] ?? 'RUNNING',
            'active_status'   => true,
            'commission_date' => $validated['commission_date'] ?? null,
            'specifications'  => $specifications,
        ]);

        $this->syncPics($machine, $validated['pic_user_ids'] ?? []);

        return redirect()->route('machines.show', $machine->id)->with('success', "Mesin {$finalCode} dan QR berhasil terdaftar.");
    }

    /**
     * Menampilkan Form Edit Profil Mesin.
     */
    public function edit(Request $request, $id): Response
    {
        $machine = Machine::with('pics')->findOrFail($id);

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
            'picCandidates' => $this->picCandidates(),
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
                'pic_user_ids'       => $machine->pics->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
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

        $validated = $request->validate(array_merge([
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
            'commission_date'    => 'nullable|date',
            'status'             => 'nullable|string',

            'specifications'         => 'nullable|array',
            'specifications.*.key'   => 'nullable|string',
            'specifications.*.label' => 'nullable|string',
            'specifications.*.value' => 'nullable|string',
        ], $this->picUserRules()));

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
            'machine_status'  => $validated['status'] ?? $machine->machine_status,
            'commission_date' => $validated['commission_date'] ?? null,
            'specifications'  => $specifications,
        ]);

        // Hanya sentuh pivot kalau form memang mengirim daftar PIC,
        // supaya teks PIC lama tidak terhapus oleh flow lama.
        if (array_key_exists('pic_user_ids', $validated)) {
            $this->syncPics($machine, $validated['pic_user_ids'] ?? []);
        }

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