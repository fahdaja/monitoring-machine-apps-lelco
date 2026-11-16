<?php
// Simulasi maju N hari: jalankan mark-due + generate sesuai scheduler
// Usage: php simulate_day.php        (maju 1 hari)
//        php simulate_day.php 3      (maju 3 hari berturut-turut)

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$days = isset($argv[1]) ? (int) $argv[1] : 1;

// Ambil tanggal real SEBELUM simulasi dimulai
$realToday = \Carbon\Carbon::today();

for ($i = 1; $i <= $days; $i++) {
    // Simulasi: hari ini = REAL today + $i hari
    $simulatedToday = $realToday->copy()->addDays($i);
    \Carbon\Carbon::setTestNow($simulatedToday->copy()->startOfDay());

    echo "\n===== Simulasi Hari: " . $simulatedToday->format('d M Y (l)') . " =====\n";

    // Jam 00:00 → tasks:generate
    echo "[00:00] tasks:generate\n";
    \Illuminate\Support\Facades\Artisan::call('tasks:generate');
    echo "  " . trim(\Illuminate\Support\Facades\Artisan::output());

    // Jam 00:01 → tasks:mark-due
    \Carbon\Carbon::setTestNow($simulatedToday->copy()->startOfDay()->addMinutes(1));
    echo "[00:01] tasks:mark-due\n";
    \Illuminate\Support\Facades\Artisan::call('tasks:mark-due');
    echo "  " . trim(\Illuminate\Support\Facades\Artisan::output());

    // Tampilkan ringkasan task
    $summary = \Illuminate\Support\Facades\DB::table('tasks')
        ->selectRaw("status, COUNT(*) as total")
        ->groupBy('status')
        ->get();
    echo "  Status: ";
    $parts = [];
    foreach ($summary as $row) {
        $parts[] = "{$row->status}={$row->total}";
    }
    echo implode(", ", $parts) . "\n";
}

// Reset ke waktu asli
\Carbon\Carbon::setTestNow();

// Reset status task berdasarkan tanggal REAL (undo efek simulasi ke status)
// Task COMPLETED tidak disentuh.
$today = \Carbon\Carbon::today()->toDateString();

\Illuminate\Support\Facades\DB::table('tasks')
    ->where('status', '!=', 'COMPLETED')
    ->update(['status' => 'UPCOMING']);

\Illuminate\Support\Facades\DB::table('tasks')
    ->where('status', 'UPCOMING')
    ->whereDate('due_date', '<=', $today)
    ->update(['status' => 'DUE']);

\Illuminate\Support\Facades\DB::table('tasks')
    ->where('status', 'DUE')
    ->whereNotNull('end_date')
    ->whereDate('end_date', '<', $today)
    ->update(['status' => 'OVERDUE']);

echo "\n===== Selesai. Status task di-reset sesuai tanggal real ({$today}). =====\n";
echo "Catatan: task hasil simulasi (due_date > real today) tetap ada di DB.\n";
echo "Hapus dengan: DELETE FROM tasks WHERE due_date > '{$today}' AND status = 'UPCOMING' AND assigned_user_id IS NULL;\n";
