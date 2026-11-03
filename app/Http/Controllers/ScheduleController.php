<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Schedule; 
use App\Models\Form;
use App\Models\Machine;
use App\Models\Task;

class ScheduleController extends Controller
{
    /**
     * Tampilkan halaman manajemen jadwal.
     */
    public function index()
    {
        $schedules = Schedule::with(['form', 'machine'])->latest()->get();
        $forms = Form::select('id', 'form_title', 'form_code')->where('is_active', true)->get();
        $machines = Machine::select('id', 'machine_type')->get();

        return Inertia::render('schedules/index', [
            'schedules' => $schedules,
            'forms'     => $forms,
            'machines'  => $machines,
        ]);
    }

    /**
     * Simpan schedule baru dan otomatis generate tasks.
     */
    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {

            // 1. Validasi input
            $validated = $request->validate([
                'form_id'        => 'required|exists:forms,id',
                'machine_id'     => 'required|exists:machines,id',
                'frequency_type' => 'required|string|in:DAILY,WEEKLY,MONTHLY',
                'start_date'     => 'required|date',
                'end_date'       => 'required|date|after_or_equal:start_date',
            ]);

            // 2. Simpan ke tabel schedules
            $schedule = Schedule::create([
                'form_id'        => $validated['form_id'],
                'machine_id'     => $validated['machine_id'],
                'frequency_type' => $validated['frequency_type'],
                'start_date'     => $validated['start_date'],
                'end_date'       => $validated['end_date'],
                'is_active'      => true,
            ]);

            // 3. Logika Generator Task Berdasarkan Rentang Tanggal & Frekuensi
            $currentDate = new \DateTime($validated['start_date']);
            $endDate = new \DateTime($validated['end_date']);
            
            // Looping tanggal dari start_date sampai end_date
            while ($currentDate <= $endDate) {
                $dateString = $currentDate->format('Y-m-d');

                // Buat task otomatis untuk tanggal tersebut
                Task::create([
                    'machine_id'           => $validated['machine_id'],
                    'form_id'              => $validated['form_id'],
                    'task_code'            => 'TSK-' . strtoupper(uniqid()),
                    'start_date'           => $dateString,
                    'due_date'             => $dateString,
                    'status'               => 'DUE',
                    'source_type'          => null,
                    'assigned_user_id'     => null,
                    'escalation_ticket_id' => null,
                ]);

                // Increment tanggal berdasarkan frequency_type
                if ($validated['frequency_type'] === 'DAILY') {
                    $currentDate->modify('+1 day');
                } elseif ($validated['frequency_type'] === 'WEEKLY') {
                    $currentDate->modify('+1 week');
                } elseif ($validated['frequency_type'] === 'MONTHLY') {
                    $currentDate->modify('+1 month');
                } else {
                    break;
                }
            }

            return redirect()->route('schedules.index')
                ->with('success', 'Jadwal berhasil dibuat dan task pemantauan otomatis digenerate!');
        });
    }
}