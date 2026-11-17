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
   private const DAILY_HORIZON_DAYS = 7;

   protected $signature = 'tasks:generate';
   protected $description = 'Generate task otomatis berdasarkan pola jadwal';
   public function handle()
{
    $schedules = Schedule::where('is_active', true)->with('form')->get();

    $count = 0;

    foreach ($schedules as $schedule) {
        $windowDays = max(1, (int) ($schedule->due_window_days ?? 1));

        foreach ($this->dueDatesFor($schedule) as $targetDate) {
            $dueDateStr = $targetDate->format('Y-m-d');

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
                'end_date'         => $targetDate->copy()->addDays($windowDays)->format('Y-m-d'),
                'status'           => 'UPCOMING',
                'assigned_user_id' => null,
            ]);
            $count++;
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
