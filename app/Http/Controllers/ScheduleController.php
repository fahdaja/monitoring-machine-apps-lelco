<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Schedule;
use App\Models\ScheduleCondition;
use App\Models\Form;
use App\Models\Task;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ScheduleController extends Controller
{
    /**
     * Menampilkan halaman daftar jadwal (Settings)
     */
    public function index()
    {
        // Ambil semua jadwal beserta relasi form dan machine-nya
        $schedules = Schedule::with(['form.machine'])->latest()->get()->map(function ($schedule) {
            return [
                'id' => $schedule->id,
                'schedule_code' => $schedule->schedule_code,
                'form' => $schedule->form ? [
                    'id' => $schedule->form->id,
                    'form_title' => $schedule->form->form_title,
                    'form_code' => $schedule->form->form_code,
                    'machine_name' => $schedule->form->machine?->machine_name,
                ] : null,
                'frequency_type' => $schedule->frequency_type,
                'selected_days' => $schedule->selected_days ?? [],
                'selected_dates' => $schedule->selected_dates ?? [],
                'due_window_days' => $schedule->due_window_days,
                'is_active' => $schedule->is_active,
            ];
        });

        // Ambil form INSPECTION saja untuk pilihan di dropdown modal
        $forms = Form::ofType(\App\Enums\FormType::INSPECTION)->with('machine')->get()->map(function ($form) {
            return [
                'id' => $form->id,
                'form_title' => $form->form_title,
                'form_code' => $form->form_code,
                'machine_name' => $form->machine?->machine_name,
                'form_level' => $form->form_level,
            ];
        });

        // Ambil semua kondisi trigger antar level form inspeksi (lvl 1 -> lvl 2)
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
                    'machine_name' => $condition->triggerForm->machine?->machine_name,
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
                    'machine_name' => $condition->targetForm->machine?->machine_name,
                ] : null,
                'due_window_days' => $condition->due_window_days,
                'is_active' => $condition->is_active,
            ];
        });

        return Inertia::render('schedules/index', [
            'schedules' => $schedules,
            'forms' => $forms,
            'conditions' => $conditions,
        ]);
    }

    /**
     * Menyimpan pengaturan jadwal baru
     */
    public function store(Request $request)
    {
        $validate = $request->validate([
            'form_id' => ['required', Rule::exists('forms', 'id')->where(function ($query) {
                // Jadwal hanya boleh menarget form INSPECTION Lvl 1 (atau tanpa level);
                // form Lvl 2 dikerjakan otomatis lewat kondisi trigger.
                $query->where('form_type', 'INSPECTION')
                    ->where(function ($sub) {
                        $sub->whereNull('form_level')->orWhere('form_level', 1);
                    });
            })],
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1|max:30',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_days.*' => 'integer|between:1,7',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
            'selected_dates.*' => 'integer|between:1,31',
        ]);

        // Generate kode jadwal unik
        do {
            $scheduleCode = 'SCH-' . strtoupper(uniqid());
        } while (Schedule::where('schedule_code', $scheduleCode)->exists());

        Schedule::create([
            'schedule_code'    => $scheduleCode,
            'form_id'          => $validate['form_id'],
            'frequency_type'   => $validate['frequency_type'],
            'due_window_days'  => $validate['due_window_days'],
            'selected_days'    => $request->selected_days ?? [],
            'selected_dates'   => $request->selected_dates ?? [],
            'is_active'        => true,
        ]);

        return redirect()->back()->with('success', 'Pengaturan jadwal berhasil dibuat!');
    }


    public function update(Request $request, $id)
    {
        $oldSchedule = Schedule::findOrFail($id);

        // 1. Matikan jadwal lama (Nonaktifkan) agar tidak generate task lagi
        $oldSchedule->update(['is_active' => false]);

        // 2. Buat jadwal baru berdasarkan input edit
        $validate = $request->validate([
            'form_id' => ['required', Rule::exists('forms', 'id')->where(function ($query) {
                // Jadwal hanya boleh menarget form INSPECTION Lvl 1 (atau tanpa level);
                // form Lvl 2 dikerjakan otomatis lewat kondisi trigger.
                $query->where('form_type', 'INSPECTION')
                    ->where(function ($sub) {
                        $sub->whereNull('form_level')->orWhere('form_level', 1);
                    });
            })],
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1|max:30',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_days.*' => 'integer|between:1,7',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
            'selected_dates.*' => 'integer|between:1,31',
        ]);

        do {
            $scheduleCode = 'SCH-' . strtoupper(uniqid());
        } while (Schedule::where('schedule_code', $scheduleCode)->exists());

        Schedule::create([
            'schedule_code'    => $scheduleCode,
            'form_id'          => $validate['form_id'],
            'frequency_type'   => $validate['frequency_type'],
            'due_window_days'  => $validate['due_window_days'],
            'selected_days'    => $request->selected_days ?? [],
            'selected_dates'   => $request->selected_dates ?? [],
            'is_active'        => true,
        ]);

        return redirect()->back()->with('success', 'Jadwal berhasil diperbarui! (Jadwal lama telah dinonaktifkan).');
    }

    /**
     * Mengubah status AKTIF / NONAKTIF pada jadwal
     */
    public function toggleStatus(Request $request, $id)
    {
        $schedule = Schedule::findOrFail($id);
        
        $schedule->update([
            'is_active' => !$schedule->is_active
        ]);

        return redirect()->back()->with('success', 'Status jadwal berhasil diubah.');
    }

    /**
     * Menghapus pengaturan jadwal
     */
    public function destroy($id)
    {
        $schedule = Schedule::findOrFail($id);
        $schedule->delete();

        return redirect()->back()->with('success', 'Pengaturan jadwal berhasil dihapus.');
    }

    // ==================== KONDISI TRIGGER (LEVEL FORM INSPECTION) ====================

    /**
     * Data pertanyaan + opsi milik form INSPECTION (untuk memilih trigger jawaban).
     * Hanya pertanyaan yang punya opsi yang dikembalikan.
     */
    public function conditionQuestions($formId)
    {
        $form = Form::ofType(\App\Enums\FormType::INSPECTION)->findOrFail($formId);

        $questions = $form->questions()
            ->with(['options' => fn ($query) => $query->orderBy('option_order', 'asc')])
            ->orderBy('question_order', 'asc')
            ->get()
            ->filter(fn ($question) => $question->options->isNotEmpty())
            ->values()
            ->map(function ($question) {
                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'input_type' => $question->input_type instanceof \App\Enums\InputType
                        ? $question->input_type->value
                        : strtoupper((string) $question->input_type),
                    'options' => $question->options->map(fn ($option) => [
                        'id' => $option->id,
                        'option_text' => $option->option_text,
                        'is_normal' => (bool) $option->is_normal,
                    ])->values(),
                ];
            });

        return response()->json($questions);
    }

    /**
     * Menyimpan kondisi trigger baru (form lvl 1 -> form lvl 2).
     */
    public function storeCondition(Request $request)
    {
        $validate = $this->validateCondition($request);

        do {
            $conditionCode = 'CON-' . strtoupper(uniqid());
        } while (ScheduleCondition::where('condition_code', $conditionCode)->exists());

        ScheduleCondition::create([
            'condition_code'      => $conditionCode,
            'trigger_form_id'     => $validate['trigger_form_id'],
            'trigger_question_id' => $validate['trigger_question_id'],
            'trigger_option_id'   => $validate['trigger_option_id'],
            'target_form_id'      => $validate['target_form_id'],
            'due_window_days'     => $validate['due_window_days'],
            'is_active'           => true,
        ]);

        return redirect()->back()->with('success', 'Kondisi trigger berhasil dibuat!');
    }

    /**
     * Memperbarui kondisi trigger (langsung, tanpa versioning).
     */
    public function updateCondition(Request $request, $id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $validate = $this->validateCondition($request);

        $condition->update([
            'trigger_form_id'     => $validate['trigger_form_id'],
            'trigger_question_id' => $validate['trigger_question_id'],
            'trigger_option_id'   => $validate['trigger_option_id'],
            'target_form_id'      => $validate['target_form_id'],
            'due_window_days'     => $validate['due_window_days'],
        ]);

        return redirect()->back()->with('success', 'Kondisi trigger berhasil diperbarui!');
    }

    /**
     * Mengubah status AKTIF / NONAKTIF pada kondisi trigger.
     */
    public function toggleConditionStatus($id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $condition->update(['is_active' => !$condition->is_active]);

        return redirect()->back()->with('success', 'Status kondisi trigger berhasil diubah.');
    }

    /**
     * Menghapus kondisi trigger.
     */
    public function destroyCondition($id)
    {
        $condition = ScheduleCondition::findOrFail($id);
        $condition->delete();

        return redirect()->back()->with('success', 'Kondisi trigger berhasil dihapus.');
    }

    /**
     * Validasi bersama kondisi trigger: rantai form -> pertanyaan -> opsi harus konsisten.
     */
    private function validateCondition(Request $request): array
    {
        return $request->validate([
            'trigger_form_id' => ['required', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')->where('form_level', 1)],
            'trigger_question_id' => ['required', Rule::exists('form_questions', 'id')->where('form_id', $request->input('trigger_form_id'))],
            'trigger_option_id' => ['required', Rule::exists('form_options', 'id')->where('form_question_id', $request->input('trigger_question_id'))],
            'target_form_id' => ['required', 'different:trigger_form_id', Rule::exists('forms', 'id')->where('form_type', 'INSPECTION')->where('form_level', 2)],
            'due_window_days' => 'required|integer|min:1|max:30',
        ]);
    }
}