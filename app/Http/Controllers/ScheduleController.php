<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Schedule;
use App\Models\Form;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    /**
     * Menampilkan halaman daftar jadwal (Settings)
     */
    public function index()
    {
        // Ambil semua jadwal beserta relasi form dan machine-nya
        $schedules = Schedule::with(['form.machine'])->latest()->get();

        // Ambil semua form untuk pilihan di dropdown modal
        $forms = Form::with('machine')->get()->map(function ($form) {
            return [
                'id' => $form->id,
                'form_title' => $form->form_title,
                'form_code' => $form->form_code,
                'machine_name   ' => $form->machine?->machine_name,
            ];
        });

        return Inertia::render('schedules/index', [
            'schedules' => $schedules,
            'forms' => $forms,
        ]);
    }

    /**
     * Menyimpan pengaturan jadwal baru
     */
    public function store(Request $request)
    {
        $validate = $request->validate([
            'form_id' => 'required|exists:forms,id',
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
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
            'form_id' => 'required|exists:forms,id',
            'frequency_type' => 'required|in:DAILY,WEEKLY,MONTHLY',
            'due_window_days' => 'required|integer|min:1',
            'selected_days' => 'required_if:frequency_type,WEEKLY|array',
            'selected_dates' => 'required_if:frequency_type,MONTHLY|array',
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
}