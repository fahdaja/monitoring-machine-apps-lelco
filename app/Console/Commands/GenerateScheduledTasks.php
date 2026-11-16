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
    $tomorrow = Carbon::now()->addDay();

    $dayOfWeek   = $tomorrow->dayOfWeekIso;
    $dateOfMonth = $tomorrow->day;

    $schedules = Schedule::where('is_active', true)->with('form')->get();

    $count = 0;

    foreach ($schedules as $schedule) {
        $shouldCreateTask = false;

        if ($schedule->frequency_type === 'DAILY') {
            $shouldCreateTask = true;
        } elseif ($schedule->frequency_type === 'WEEKLY') {
            if (in_array((string) $dayOfWeek, $schedule->selected_days ?? [])) {
                $shouldCreateTask = true;
            }
        } elseif ($schedule->frequency_type === 'MONTHLY') {
            if (in_array($dateOfMonth, $schedule->selected_dates ?? [])) {
                $shouldCreateTask = true;
            }
        }

        if ($shouldCreateTask) {
            $windowDays = max(1, (int) ($schedule->due_window_days ?? 1));
            $dueDateStr = $tomorrow->format('Y-m-d');

            // Cegah duplikat: skip jika sudah ada task untuk form ini di tanggal yang sama
            $exists = Task::where('form_id', $schedule->form_id)
                ->whereDate('due_date', $dueDateStr)
                ->exists();

            if ($exists) {
                continue;
            }

            Task::create([
                'machine_id'       => $schedule->form->machine_id,
                'form_id'          => $schedule->form_id,
                'task_code'        => 'TSK-' . strtoupper(uniqid()),
                'due_date'         => $dueDateStr,
                'end_date'         => $tomorrow->copy()->addDays($windowDays)->format('Y-m-d'),
                'status'           => 'UPCOMING',
                'assigned_user_id' => null,
            ]);
            $count++;
        }
    }

    $this->info("✅ {$count} task UPCOMING dibuat untuk besok ({$tomorrow->format('d M Y')}).");
}
}
