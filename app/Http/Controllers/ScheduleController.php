<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Schedule;
use App\Models\ScheduleCondition;
use App\Models\ScheduleMachine;
use App\Models\Form;
use App\Models\Machine;
use App\Models\Task;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

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
            'triggerQuestion',
            'triggerOption',
            'targetForm.machine',
        ])->latest()->get()->map(function ($condition) {
            return [
                'id' => $condition->id,
                'condition_code' => $condition->condition_code,
                'trigger_form' => $condition->triggerForm ? [
                    'id' => $condition->triggerForm->id,
                    'form_title' => $condition->triggerForm->form_title,
                    'form_code' => $condition->triggerForm->form_code,
                ] : null,
                'trigger_question' => $condition->triggerQuestion ? [
                    'id' => $condition->triggerQuestion->id,
                    'question_text' => $condition->triggerQuestion->question_text,
                ] : null,
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
        ]);
    }

    /**
     * Menyimpan pengaturan jadwal baru
     */
    public function store(Request $request)
    {
        $validate = $request->validate([
            'form_id' => ['required', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')],
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1|max:30',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_days.*' => 'integer|between:1,7',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
            'selected_dates.*' => 'integer|between:1,31',
            'machine_assignments' => 'required|array|min:1',
            'machine_assignments.*.machine_id' => 'required|integer|exists:machines,id',
            'machine_assignments.*.assigned_user_ids' => 'nullable|array',
            'machine_assignments.*.assigned_user_ids.*' => 'integer|exists:users,id',
        ]);

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

            return redirect()->back()->with('success', 'Pengaturan jadwal berhasil dibuat dan task telah digenerate!');
        });
    }

    public function update(Request $request, $id)
    {
        $oldSchedule = Schedule::findOrFail($id);

        $validate = $request->validate([
            'form_id' => ['required', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')],
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1|max:30',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_days.*' => 'integer|between:1,7',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
            'selected_dates.*' => 'integer|between:1,31',
            'machine_assignments' => 'required|array|min:1',
            'machine_assignments.*.machine_id' => 'required|integer|exists:machines,id',
            'machine_assignments.*.assigned_user_ids' => 'nullable|array',
            'machine_assignments.*.assigned_user_ids.*' => 'integer|exists:users,id',
        ]);

        return DB::transaction(function () use ($request, $oldSchedule, $validate) {
            // Matikan jadwal lama
            $oldSchedule->update(['is_active' => false]);

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

            return redirect()->back()->with('success', 'Jadwal berhasil diperbarui! (Jadwal lama telah dinonaktifkan).');
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
    // KONDISI TRIGGER ANTAR FORM INSPEKSI
    // =========================================================================

    public function conditionQuestions($formId)
    {
        $form = Form::with(['sections.questions' => function ($q) {
            $q->whereIn('input_type', ['SELECT', 'DROPDOWN', 'CHECKBOX'])
              ->with('options');
        }])->findOrFail($formId);

        $questions = $form->sections->flatMap(function ($section) {
            return $section->questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'input_type' => $question->input_type,
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

        return response()->json($questions);
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
            'trigger_option_id'   => $validated['trigger_option_id'],
            'target_form_id'      => $validated['target_form_id'],
            'due_window_days'     => $validated['due_window_days'],
            'is_active'           => true,
        ]);

        return redirect()->back()->with('success', 'Kondisi trigger berhasil ditambahkan!');
    }

    public function updateCondition(Request $request, $id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $validated = $this->validateCondition($request);

        $condition->update([
            'trigger_form_id'     => $validated['trigger_form_id'],
            'trigger_question_id' => $validated['trigger_question_id'],
            'trigger_option_id'   => $validated['trigger_option_id'],
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

    private function validateCondition(Request $request): array
    {
        return $request->validate([
            'trigger_form_id' => ['required', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')],
            'trigger_question_id' => ['required', Rule::exists('form_questions', 'id')->where('form_id', $request->input('trigger_form_id'))],
            'trigger_option_id' => ['required', Rule::exists('form_options', 'id')->where('form_question_id', $request->input('trigger_question_id'))],
            'target_form_id' => ['required', 'different:trigger_form_id', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')],
            'due_window_days' => 'required|integer|min:1|max:30',
        ]);
    }
}
