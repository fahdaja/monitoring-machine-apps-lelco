<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Schedule;
use App\Models\Task;
use Carbon\Carbon;


class GenerateScheduledTasks extends Command
{
   protected $signature = 'tasks:generate';
   protected $description = 'Generate task otomatis berdasarkan pola jadwal';
   public function handle()
{
    $today =  Carbon::now()->day(13);
    // $tomorrow = Carbon::now()->addMonth()->startOfMonth()->day(1); 
    // $tomorrow = Carbon::now()->day(13); 
    // $tomorrow = Carbon::now()->addWeek()->day(16); 
    $dayOfWeek = $today->dayOfWeekIso; // 1 (Senin) - 7 (Minggu)
    $dateOfMonth = $today->day; // 1 - 31

    $schedules = Schedule::where('is_active', true)->get();

    $count = 0; // Penampung jumlah task yang dibuat
    foreach ($schedules as $schedule) {
        $shouldCreateTask = false;

        if ($schedule->frequency_type === 'DAILY') {
            $shouldCreateTask = true;
        } elseif ($schedule->frequency_type === 'WEEKLY') {
            // Cek apakah besok harinya ada di array selected_days
            if (in_array((string)$dayOfWeek, $schedule->selected_days ?? [])) {
                $shouldCreateTask = true;
            }
        } elseif ($schedule->frequency_type === 'MONTHLY') {
            // Cek apakah besok tanggalnya ada di array selected_dates
            if (in_array($dateOfMonth, $schedule->selected_dates ?? [])) {
                $shouldCreateTask = true;
            }
        }   

        // Jika jadwal besok harus jalan, buat Task baru
        if ($shouldCreateTask) {
            Task::create([
                'machine_id'       => $schedule->form->machine_id,
                'form_id'          => $schedule->form_id,
                'task_code'        => 'TSK-' . strtoupper(uniqid()),
                'due_date'         => $today->format('Y-m-d'), // Jatuh tempo besok
                'status'           => 'DUE', // Atau DUE
                'assigned_user_id' => null,
            ]);
            $count++;
        }
    }
     if ($count > 0) {
            $this->info("✅ Berhasil membuat {$count} task untuk besok ({$today->format('d M Y')}).");
        } else {
            $this->info("ℹ️ Tidak ada jadwal yang cocok untuk besok. (0 task dibuat).");
        }
    }
}
