<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * working_days  : hari kerja ISO (1=Senin..7=Minggu) untuk jadwal DAILY. null = semua hari.
     * skip_holidays : lewati tanggal yang terdaftar di tabel holidays.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->json('working_days')->nullable()->after('selected_dates');
            $table->boolean('skip_holidays')->default(true)->after('working_days');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['working_days', 'skip_holidays']);
        });
    }
};
