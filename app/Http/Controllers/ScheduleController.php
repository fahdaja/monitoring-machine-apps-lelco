<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Enums\ConditionOperator;
use App\Models\Schedule;
use App\Models\ScheduleCondition;
use App\Models\ScheduleMachine;
use App\Models\Form;
use App\Models\FormQuestion;
use App\Models\Machine;
use App\Models\Task;
use App\Models\Holiday;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ScheduleController extends Controller
{
    /**
     * Menampilkan halaman daftar jadwal (Settings)
     */
    public function index()
    {
        // Ambil semua jadwal beserta form dan mesin-mesin yang terdaftar
        $schedules = Schedule::with(['form', 'scheduleMachines.machine.pics'])->latest()->get()->map(function ($schedule) {
            return [
                'id' => $schedule->id,
                'schedule_code' => $schedule->schedule_code,
                'form' => $schedule->form ? [
                    'id' => $schedule->form->id,
                    'form_title' => $schedule->form->form_title,
                    'form_code' => $schedule->form->form_code,
                ] : null,
                'machines' => $schedule->scheduleMachines->map(function ($sm) {
                    $m = $sm->machine;
                    $targetedIds = (array) ($sm->assigned_user_ids ?? []);
                    $targetedUsers = $m ? $m->pics->whereIn('id', $targetedIds)->values() : collect();

                    return [
                        'machine_id' => $sm->machine_id,
                        'machine_name' => $m?->machine_name,
                        'machine_code' => $m?->machine_code,
                        'location' => $m?->location,
                        'assigned_user_ids' => $targetedIds,
                        'targeted_pics' => $targetedUsers->map(fn ($u) => [
                            'id' => $u->id,
                            'full_name' => $u->full_name,
                        ])->all(),
                    ];
                })->values()->all(),
                'frequency_type' => $schedule->frequency_type,
                'selected_days' => $schedule->selected_days ?? [],
                'selected_dates' => $schedule->selected_dates ?? [],
                'working_days' => $schedule->working_days ?? [],
                'skip_holidays' => (bool) $schedule->skip_holidays,
                'due_window_days' => $schedule->due_window_days,
                'is_active' => $schedule->is_active,
            ];
        });

        // Ambil form INSPECTION template murni (tanpa keterikatan mesin atau level)
        $forms = Form::ofType(\App\Enums\FormType::INSPECTION)->get()->map(function ($form) {
            return [
                'id' => $form->id,
                'form_title' => $form->form_title,
                'form_code' => $form->form_code,
            ];
        });

        // Ambil seluruh mesin terdaftar beserta PIC-nya
        $machines = Machine::with(['pics' => function ($q) {
            $q->orderBy('full_name');
        }])
        ->orderBy('machine_code')
        ->get()
        ->map(function ($m) {
            return [
                'id' => $m->id,
                'machine_code' => $m->machine_code,
                'machine_name' => $m->machine_name,
                'location' => $m->location ?? '-',
                'department' => $m->department ?? $m->pic_department ?? '-',
                'pics' => $m->pics->map(fn ($p) => [
                    'id' => $p->id,
                    'full_name' => $p->full_name,
                    'user_code' => $p->user_code,
                    'role' => $p->role,
                    'department' => $p->department,
                ])->values()->all(),
            ];
        });

        // Ambil semua kondisi trigger antar form inspeksi
        $conditions = ScheduleCondition::with([
            'triggerForm.machine',
            'triggerQuestion.section',
            'triggerOption',
            'targetForm.machine',
        ])->latest()->get()->map(function ($condition) {
            $section = $condition->triggerQuestion?->section;
            $rawOperator = $condition->trigger_operator ?: 'option_selected';
            $normalizedOp = match ($rawOperator) {
                'file_uploaded' => ConditionOperator::IS_FILLED->value,
                'file_empty' => ConditionOperator::IS_EMPTY->value,
                default => $rawOperator,
            };
            $opEnum = ConditionOperator::tryFrom($normalizedOp) ?? ConditionOperator::OPTION_SELECTED;
            $displayVal = $opEnum->needsOption()
                ? $condition->triggerOption?->option_text
                : $condition->trigger_value;

            return [
                'id' => $condition->id,
                'condition_code' => $condition->condition_code,
                'trigger_form' => $condition->triggerForm ? [
                    'id' => $condition->triggerForm->id,
                    'form_title' => $condition->triggerForm->form_title,
                    'form_code' => $condition->triggerForm->form_code,
                ] : null,
                'trigger_section' => $section ? [
                    'id' => $section->id,
                    'section_order' => $section->section_order,
                    'section_title' => $section->section_title,
                ] : null,
                'trigger_question' => $condition->triggerQuestion ? [
                    'id' => $condition->triggerQuestion->id,
                    'question_text' => $condition->triggerQuestion->question_text,
                    'input_type' => $condition->triggerQuestion->input_type instanceof \BackedEnum
                        ? $condition->triggerQuestion->input_type->value
                        : (string) $condition->triggerQuestion->input_type,
                ] : null,
                'trigger_operator' => $normalizedOp,
                'trigger_value' => $condition->trigger_value,
                'trigger_rule_label' => ucfirst($opEnum->describe($displayVal)),
                'trigger_option' => $condition->triggerOption ? [
                    'id' => $condition->triggerOption->id,
                    'option_text' => $condition->triggerOption->option_text,
                    'is_normal' => (bool) $condition->triggerOption->is_normal,
                ] : null,
                'target_form' => $condition->targetForm ? [
                    'id' => $condition->targetForm->id,
                    'form_title' => $condition->targetForm->form_title,
                    'form_code' => $condition->targetForm->form_code,
                ] : null,
                'due_window_days' => $condition->due_window_days,
                'is_active' => $condition->is_active,
            ];
        });

        return Inertia::render('schedules/index', [
            'schedules' => $schedules,
            'forms' => $forms,
            'machines' => $machines,
            'conditions' => $conditions,
            // Pola form per mesin (Breakdown -> Repair -> Tutup Tiket)
            'patternForms' => collect(self::PATTERN_COLUMNS)->map(
                fn ($col, $type) => Form::ofType($type)->orderBy('form_title')
                    ->get(['id', 'form_title', 'form_code'])
            )->all(),
            'patterns' => \App\Models\MachineFormPattern::all()->keyBy('machine_id')->map(fn ($p) => [
                'MANUAL_REPORT' => $p->manual_report_form_id,
                'START_REPAIR' => $p->start_repair_form_id,
                'CLOSE_TICKET' => $p->close_ticket_form_id,
            ])->all(),
            // Kalender kerja: hari libur mulai awal tahun lalu agar riwayat tetap terlihat
            'holidays' => Holiday::where('holiday_date', '>=', now()->subYear()->startOfYear())
                ->orderBy('holiday_date')
                ->get()
                ->map(fn (Holiday $h) => [
                    'id' => $h->id,
                    'holiday_date' => $h->holiday_date->format('Y-m-d'),
                    'name' => $h->name,
                ])->values(),
        ]);
    }

    /**
     * Menyimpan pengaturan jadwal baru
     */
    public function store(Request $request)
    {
        $validate = $request->validate([
            'form_id' => [
                'required',
                Rule::exists('forms', 'id')->where('form_type', 'INSPECTION'),
                Rule::unique('schedules', 'form_id'),
            ],
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1|max:30',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_days.*' => 'integer|between:1,7',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
            'selected_dates.*' => 'integer|between:1,31',
            'working_days' => 'nullable|array',
            'working_days.*' => 'integer|between:1,7',
            'skip_holidays' => 'nullable|boolean',
            'machine_assignments' => 'required|array|min:1',
            'machine_assignments.*.machine_id' => 'required|integer|distinct|exists:machines,id',
            'machine_assignments.*.assigned_user_ids' => 'nullable|array',
            'machine_assignments.*.assigned_user_ids.*' => 'integer|exists:users,id',
        ], [
            'form_id.unique' => 'Form ini sudah memiliki pengaturan jadwal. Silakan edit jadwal yang sudah ada.',
        ]);

        if (ScheduleCondition::where('target_form_id', $validate['form_id'])->exists()) {
            throw ValidationException::withMessages([
                'form_id' => 'Form ini sudah digunakan sebagai Form Lanjutan pada Kondisi Trigger sehingga tidak dapat dibuatkan jadwal rutin.',
            ]);
        }

        return DB::transaction(function () use ($request, $validate) {
            do {
                $scheduleCode = 'SCH-' . strtoupper(uniqid());
            } while (Schedule::where('schedule_code', $scheduleCode)->exists());

            $schedule = Schedule::create([
                'schedule_code'    => $scheduleCode,
                'form_id'          => $validate['form_id'],
                'frequency_type'   => $validate['frequency_type'],
                'due_window_days'  => $validate['due_window_days'],
                'selected_days'    => $request->selected_days ?? [],
                'selected_dates'   => $request->selected_dates ?? [],
                'working_days'     => $this->normalizeWorkingDays($validate),
                'skip_holidays'    => $request->boolean('skip_holidays', true),
                'is_active'        => true,
            ]);

            foreach ($validate['machine_assignments'] as $ma) {
                $assignedIds = !empty($ma['assigned_user_ids']) ? array_values(array_unique($ma['assigned_user_ids'])) : null;
                $schedule->scheduleMachines()->create([
                    'machine_id' => $ma['machine_id'],
                    'assigned_user_ids' => $assignedIds,
                ]);
            }

            Artisan::call('tasks:generate');

            return redirect()->back()->with('success', 'Pengaturan jadwal berhasil dibuat dan task UPCOMING untuk jadwal berikutnya langsung digenerate!');
        });
    }

    public function update(Request $request, $id)
    {
        $schedule = Schedule::findOrFail($id);

        $validate = $request->validate([
            'form_id' => [
                'required',
                Rule::exists('forms', 'id')->where('form_type', 'INSPECTION'),
                Rule::unique('schedules', 'form_id')->ignore($schedule->id),
            ],
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1|max:30',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_days.*' => 'integer|between:1,7',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
            'selected_dates.*' => 'integer|between:1,31',
            'working_days' => 'nullable|array',
            'working_days.*' => 'integer|between:1,7',
            'skip_holidays' => 'nullable|boolean',
            'machine_assignments' => 'required|array|min:1',
            'machine_assignments.*.machine_id' => 'required|integer|distinct|exists:machines,id',
            'machine_assignments.*.assigned_user_ids' => 'nullable|array',
            'machine_assignments.*.assigned_user_ids.*' => 'integer|exists:users,id',
        ], [
            'form_id.unique' => 'Form ini sudah memiliki pengaturan jadwal. Silakan edit jadwal yang sudah ada.',
        ]);

        return DB::transaction(function () use ($request, $schedule, $validate) {
            $schedule->update([
                'form_id'         => $validate['form_id'],
                'frequency_type'  => $validate['frequency_type'],
                'due_window_days' => $validate['due_window_days'],
                'selected_days'   => $request->selected_days ?? [],
                'selected_dates'  => $request->selected_dates ?? [],
                'working_days'    => $this->normalizeWorkingDays($validate),
                'skip_holidays'   => $request->boolean('skip_holidays', true),
            ]);

            // Kalender kerja bisa berubah: buang task UPCOMING yang kini jatuh di hari non-kerja
            $this->purgeNonWorkingUpcomingTasks($schedule->fresh());

            $schedule->scheduleMachines()->delete();

            foreach ($validate['machine_assignments'] as $ma) {
                $assignedIds = !empty($ma['assigned_user_ids']) ? array_values(array_unique($ma['assigned_user_ids'])) : null;
                $schedule->scheduleMachines()->create([
                    'machine_id' => $ma['machine_id'],
                    'assigned_user_ids' => $assignedIds,
                ]);
            }

            if ($schedule->is_active) {
                Artisan::call('tasks:generate');
            }

            return redirect()->back()->with('success', 'Pengaturan jadwal berhasil diperbarui!');
        });
    }

    /**
     * Mengubah status AKTIF / NONAKTIF pada jadwal
     */
    public function toggleStatus(Request $request, $id)
    {
        $schedule = Schedule::findOrFail($id);

        $schedule->update([
            'is_active' => $request->boolean('is_active')
        ]);

        if ($schedule->is_active) {
            Artisan::call('tasks:generate');
        }

        return redirect()->back()->with('success', 'Status jadwal berhasil diperbarui!');
    }

    /**
     * Menghapus pengaturan jadwal
     */
    public function destroy($id)
    {
        $schedule = Schedule::findOrFail($id);
        $schedule->delete();

        return redirect()->back()->with('success', 'Pengaturan jadwal berhasil dihapus!');
    }

    // =========================================================================
    // KALENDER KERJA (hari kerja per jadwal & daftar hari libur)
    // =========================================================================

    /**
     * Hari kerja hanya relevan untuk DAILY. Kosong / ketujuh hari dipilih = null (semua hari).
     */
    private function normalizeWorkingDays(array $validated): ?array
    {
        if (($validated['frequency_type'] ?? null) !== 'DAILY') {
            return null;
        }

        $days = collect($validated['working_days'] ?? [])
            ->map(fn ($d) => (int) $d)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return (empty($days) || count($days) === 7) ? null : $days;
    }

    /**
     * Hapus task UPCOMING hasil jadwal yang tanggalnya kini bukan hari kerja.
     * Task UPCOMING belum bisa dibuka operator, jadi aman dihapus (tidak ada draft).
     */
    private function purgeNonWorkingUpcomingTasks(?Schedule $schedule = null): int
    {
        $tasks = Task::with('schedule')
            ->where('status', 'UPCOMING')
            ->whereNotNull('schedule_id')
            ->where(fn ($q) => $q->whereNull('origin_type')->orWhere('origin_type', 'SCHEDULE'))
            ->whereDate('due_date', '>=', Carbon::today())
            ->when($schedule, fn ($q) => $q->where('schedule_id', $schedule->id))
            ->get();

        if ($tasks->isEmpty()) {
            return 0;
        }

        $holidayMap = Holiday::mapBetween(Carbon::today(), $tasks->max('due_date'));
        $deleted = 0;

        foreach ($tasks as $task) {
            if ($task->schedule && ! $task->schedule->isWorkingDate($task->due_date->copy(), $holidayMap)) {
                $task->assignedUsers()->detach();
                $task->delete();
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Tambah hari libur (satu tanggal atau rentang, misal cuti bersama).
     */
    public function storeHoliday(Request $request)
    {
        $validated = $request->validate([
            'holiday_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:holiday_date',
            'name' => 'required|string|max:255',
        ]);

        $start = Carbon::parse($validated['holiday_date'])->startOfDay();
        $end = ! empty($validated['end_date']) ? Carbon::parse($validated['end_date'])->startOfDay() : $start->copy();

        if ($start->diffInDays($end) > 60) {
            throw ValidationException::withMessages([
                'end_date' => 'Rentang hari libur maksimal 60 hari.',
            ]);
        }

        $count = 0;
        foreach (CarbonPeriod::create($start, $end) as $date) {
            Holiday::updateOrCreate(
                ['holiday_date' => $date->format('Y-m-d')],
                ['name' => $validated['name']]
            );
            $count++;
        }

        $purged = $this->purgeNonWorkingUpcomingTasks();

        $message = "{$count} hari libur disimpan.";
        if ($purged > 0) {
            $message .= " {$purged} task UPCOMING pada tanggal libur dibatalkan.";
        }

        return redirect()->back()->with('success', $message);
    }

    private const PATTERN_COLUMNS = [
        'MANUAL_REPORT' => 'manual_report_form_id',
        'START_REPAIR' => 'start_repair_form_id',
        'CLOSE_TICKET' => 'close_ticket_form_id',
    ];

    /**
     * Simpan pola form satu mesin: tiap kolom harus form dengan kategori yang cocok.
     */
    public function updatePattern(Request $request, Machine $machine)
    {
        $rules = [];
        foreach (self::PATTERN_COLUMNS as $type => $column) {
            $rules[$type] = [
                'nullable',
                'integer',
                Rule::exists('forms', 'id')->where('form_type', $type),
            ];
        }

        $validated = $request->validate($rules);

        $values = [];
        foreach (self::PATTERN_COLUMNS as $type => $column) {
            $values[$column] = $validated[$type] ?? null;
        }

        \App\Models\MachineFormPattern::updateOrCreate(['machine_id' => $machine->id], $values);

        return redirect()->back()->with('success', "Pola form mesin {$machine->machine_name} disimpan.");
    }

    public function destroyHoliday($id)
    {
        Holiday::findOrFail($id)->delete();

        // Tanggal kembali jadi hari kerja: isi ulang task yang masih dalam jangkauan generate
        Artisan::call('tasks:generate');

        return redirect()->back()->with('success', 'Hari libur dihapus.');
    }

    // =========================================================================
    // KONDISI TRIGGER ANTAR FORM INSPEKSI
    // =========================================================================

    public function conditionQuestions($formId)
    {
        $form = Form::with([
            'sections' => fn ($s) => $s->orderBy('section_order', 'asc'),
            'sections.questions' => function ($q) {
                $q->orderBy('question_order', 'asc')
                  ->with('options');
            },
        ])->findOrFail($formId);

        $questions = $form->sections->flatMap(function ($section) {
            return $section->questions->map(function ($question) use ($section) {
                $inputType = $question->input_type instanceof \BackedEnum
                    ? strtoupper($question->input_type->value)
                    : strtoupper((string) $question->input_type);

                $operators = array_map(fn (ConditionOperator $op) => [
                    'value' => $op->value,
                    'label' => $op->label(),
                    'needs_option' => $op->needsOption(),
                    'needs_value' => $op->needsValue(),
                    'value_kind' => $op->valueKind($inputType),
                ], ConditionOperator::forInputType($inputType));

                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'input_type' => $inputType,
                    'section_id' => $section->id,
                    'section_order' => $section->section_order,
                    'section_title' => $section->section_title,
                    'operators' => $operators,
                    'options' => $question->options->map(function ($opt) {
                        return [
                            'id' => $opt->id,
                            'option_text' => $opt->option_text,
                            'is_normal' => (bool) $opt->is_normal,
                        ];
                    })->values()->all(),
                ];
            });
        })->values()->all();

        return response()
            ->json($questions)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function storeCondition(Request $request)
    {
        $validated = $this->validateCondition($request);

        do {
            $code = 'CND-' . strtoupper(uniqid());
        } while (ScheduleCondition::where('condition_code', $code)->exists());

        ScheduleCondition::create([
            'condition_code'      => $code,
            'trigger_form_id'     => $validated['trigger_form_id'],
            'trigger_question_id' => $validated['trigger_question_id'],
            'trigger_operator'    => $validated['trigger_operator'],
            'trigger_option_id'   => $validated['trigger_option_id'],
            'trigger_value'       => $validated['trigger_value'],
            'target_form_id'      => $validated['target_form_id'],
            'due_window_days'     => $validated['due_window_days'],
            'is_active'           => true,
        ]);

        return redirect()->back()->with('success', 'Kondisi trigger berhasil ditambahkan!');
    }

    public function updateCondition(Request $request, $id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $validated = $this->validateCondition($request, $condition->id);

        $condition->update([
            'trigger_form_id'     => $validated['trigger_form_id'],
            'trigger_question_id' => $validated['trigger_question_id'],
            'trigger_operator'    => $validated['trigger_operator'],
            'trigger_option_id'   => $validated['trigger_option_id'],
            'trigger_value'       => $validated['trigger_value'],
            'target_form_id'      => $validated['target_form_id'],
            'due_window_days'     => $validated['due_window_days'],
        ]);

        return redirect()->back()->with('success', 'Kondisi trigger berhasil diperbarui!');
    }

    public function toggleConditionStatus($id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $condition->update(['is_active' => !$condition->is_active]);

        return redirect()->back()->with('success', 'Status kondisi trigger berhasil diubah.');
    }

    public function destroyCondition($id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $condition->delete();

        return redirect()->back()->with('success', 'Kondisi trigger berhasil dihapus.');
    }

    private function validateCondition(Request $request, ?int $ignoreId = null): array
    {
        $question = FormQuestion::find($request->input('trigger_question_id'));
        $inputType = $question?->input_type instanceof \BackedEnum
            ? strtoupper($question->input_type->value)
            : strtoupper((string) ($question?->input_type ?? 'TEXT'));

        $allowedOperators = array_map(
            fn (ConditionOperator $op) => $op->value,
            ConditionOperator::forInputType($inputType)
        );

        $rawOperator = (string) $request->input('trigger_operator', $allowedOperators[0] ?? 'option_selected');
        $normalizedOp = match ($rawOperator) {
            'file_uploaded' => ConditionOperator::IS_FILLED->value,
            'file_empty' => ConditionOperator::IS_EMPTY->value,
            default => $rawOperator,
        };
        $request->merge(['trigger_operator' => $normalizedOp]);

        $operatorEnum = ConditionOperator::tryFrom($normalizedOp);

        $rules = [
            'trigger_form_id' => ['required', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')],
            'trigger_question_id' => ['required', Rule::exists('form_questions', 'id')->where('form_id', $request->input('trigger_form_id'))],
            'trigger_operator' => ['required', Rule::in($allowedOperators)],
            'target_form_id' => ['required', 'different:trigger_form_id', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')],
            'due_window_days' => 'required|integer|min:1|max:30',
        ];

        if ($operatorEnum?->needsOption()) {
            $rules['trigger_option_id'] = ['required', Rule::exists('form_options', 'id')->where('form_question_id', $request->input('trigger_question_id'))];
        } elseif ($operatorEnum?->needsValue()) {
            $valueKind = $operatorEnum->valueKind($inputType);
            $rules['trigger_value'] = $valueKind === 'number'
                ? ['required', 'numeric']
                : ['required', 'string', 'max:255'];
        }

        $validated = $request->validate($rules);

        $operatorEnum = ConditionOperator::from($validated['trigger_operator']);
        $validated['trigger_option_id'] = $operatorEnum->needsOption()
            ? $validated['trigger_option_id']
            : null;
        $validated['trigger_value'] = $operatorEnum->needsValue()
            ? trim((string) $validated['trigger_value'])
            : null;

        if (Schedule::where('form_id', $validated['target_form_id'])->exists()) {
            throw ValidationException::withMessages([
                'target_form_id' => 'Form ini sudah digunakan pada Pengaturan Pola Jadwal sehingga tidak dapat digunakan lagi sebagai Form Lanjutan.',
            ]);
        }

        $targetUsedInCondition = ScheduleCondition::where('target_form_id', $validated['target_form_id'])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($targetUsedInCondition) {
            throw ValidationException::withMessages([
                'target_form_id' => 'Form Lanjutan ini sudah digunakan pada kondisi trigger lain.',
            ]);
        }

        $duplicateQuery = ScheduleCondition::where('trigger_form_id', $validated['trigger_form_id'])
            ->where('trigger_question_id', $validated['trigger_question_id'])
            ->where('trigger_operator', $validated['trigger_operator'])
            ->where('target_form_id', $validated['target_form_id'])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId));

        if ($operatorEnum->needsOption()) {
            $duplicateQuery->where('trigger_option_id', $validated['trigger_option_id']);
        } elseif ($operatorEnum->needsValue()) {
            $duplicateQuery->where('trigger_value', $validated['trigger_value']);
        } else {
            $duplicateQuery->whereNull('trigger_option_id')->whereNull('trigger_value');
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages([
                'target_form_id' => 'Kondisi trigger dengan kombinasi form, pertanyaan, operator, nilai, dan form lanjutan yang sama sudah ada. Silakan edit kondisi yang sudah ada.',
            ]);
        }

        return $validated;
    }
}
