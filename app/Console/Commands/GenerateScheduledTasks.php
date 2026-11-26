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
   /**
    * Jumlah hari ke depan yang diisi untuk jadwal DAILY (harian).
    * Daily tetap rolling dari besok (look-ahead) untuk lead time & catch-up.
    * WEEKLY = berulang per hari (minggu depan), MONTHLY = bulan berikutnya.
    * Lihat dueDatesFor().
    */
   private const DAILY_HORIZON_DAYS = 1;

   protected $signature = 'tasks:generate';
   protected $description = 'Generate task otomatis berdasarkan pola jadwal';

   public function handle()
   {
       $schedules = Schedule::where('is_active', true)
           ->with(['form', 'scheduleMachines.machine.pics'])
           ->get();

       $count = 0;

       foreach ($schedules as $schedule) {
           $windowDays = max(1, (int) ($schedule->due_window_days ?? 1));

           // Ambil daftar mesin dari schedule_machines (atau fallback ke form->machine_id jika ada legacy)
           $machinesData = [];
           if ($schedule->scheduleMachines->isNotEmpty()) {
               foreach ($schedule->scheduleMachines as $sm) {
                   $targeted = !empty($sm->assigned_user_ids) ? (array) $sm->assigned_user_ids : [];
                   // Jika tidak ada user spesifik yang ditargetkan, seluruh PIC mesin menjadi kandidat
                   if (empty($targeted) && $sm->machine) {
                       $targeted = $sm->machine->pics->pluck('id')->values()->all();
                   }
                   $machinesData[] = [
                       'machine_id' => $sm->machine_id,
                       'targeted_user_ids' => $targeted,
                   ];
               }
           } elseif ($schedule->form && $schedule->form->machine_id) {
               $machinesData[] = [
                   'machine_id' => $schedule->form->machine_id,
                   'targeted_user_ids' => [],
               ];
           }

           if (empty($machinesData)) {
               continue;
           }

           foreach ($machinesData as $mData) {
               $machineId = $mData['machine_id'];
               $targetedUserIds = $mData['targeted_user_ids'];

               foreach ($this->dueDatesFor($schedule) as $targetDate) {
                   $dueDateStr = $targetDate->format('Y-m-d');

                   // Cegah duplikat: cek task untuk form ini dan mesin ini pada tanggal yang sama
                   $existingTask = Task::where('form_id', $schedule->form_id)
                       ->where('machine_id', $machineId)
                       ->whereDate('due_date', $dueDateStr)
                       ->first();

                   if ($existingTask) {
                       if (!empty($targetedUserIds)) {
                           $existingTask->assignedUsers()->syncWithoutDetaching($targetedUserIds);
                       }
                       continue;
                   }

                   $task = Task::create([
                       'machine_id'       => $machineId,
                       'form_id'          => $schedule->form_id,
                       'schedule_id'      => $schedule->id,
                       'task_code'        => 'TSK-' . strtoupper(uniqid()),
                       'due_date'         => $dueDateStr,
                       'end_date'         => $targetDate->copy()->addDays($windowDays)->format('Y-m-d'),
                       'status'           => 'UPCOMING',
                       'assigned_user_id' => null,
                   ]);

                   if (!empty($targetedUserIds)) {
                       $task->assignedUsers()->sync($targetedUserIds);
                   }

                   $count++;
               }
           }
       }

       $this->info("✅ {$count} task UPCOMING dibuat (daily rolling ".self::DAILY_HORIZON_DAYS." hari, weekly = minggu depan, monthly = bulan depan).");
   }

    /**
     * Daftar tanggal (Carbon) yang seharusnya punya task untuk sebuah jadwal.
     * - DAILY   : besok .. H+DAILY_HORIZON_DAYS (rolling, untuk catch-up).
     * - WEEKLY  : hari-hari terpilih pada MINGGU DEPAN (Senin-Minggu ISO).
     * - MONTHLY : tanggal terpilih pada BULAN DEPAN (hanya tanggal yang ada).
     *
     * @return array<int, \Carbon\Carbon>
     */
    private function dueDatesFor(Schedule $schedule): array
    {
        $dates = [];

        if ($schedule->frequency_type === 'DAILY') {
            for ($i = 1; $i <= self::DAILY_HORIZON_DAYS; $i++) {
                $dates[] = Carbon::now()->addDays($i);
            }
        } elseif ($schedule->frequency_type === 'WEEKLY') {
            // WEEKLY = berulang mingguan berdasarkan hari (ISO 1=Senin..7=Minggu).
            // Isi minggu depan (Senin-Minggu), cocokkan dayOfWeekIso vs selected_days.
            $nextMonday = Carbon::now()->startOfWeek(Carbon::MONDAY)->addWeek();
            $selected = array_map('strval', $schedule->selected_days ?? []);
            for ($i = 0; $i < 7; $i++) {
                $day = $nextMonday->copy()->addDays($i);
                if (in_array((string) $day->dayOfWeekIso, $selected)) {
                    $dates[] = $day;
                }
            }
        } elseif ($schedule->frequency_type === 'MONTHLY') {
            // Bulan depan: hanya tanggal yang benar-benar ada di bulan tersebut.
            $nextMonth = Carbon::now()->startOfMonth()->addMonthNoOverflow();
            $lastDay = $nextMonth->daysInMonth;
            $selected = array_map('intval', $schedule->selected_dates ?? []);
            for ($d = 1; $d <= $lastDay; $d++) {
                if (in_array($d, $selected)) {
                    $dates[] = $nextMonth->copy()->day($d);
                }
            }
        }

        return $dates;
    }
}
