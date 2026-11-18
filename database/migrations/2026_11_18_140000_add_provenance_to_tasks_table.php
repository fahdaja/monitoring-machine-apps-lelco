<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fase 1 - Provenance task:
     * setiap task harus tahu dirinya lahir dari mana (jadwal rutin / kondisi trigger lvl 2),
     * dan idempotency_key menegakkan "satu follow-up per submission pemicu" di level database.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // NULL untuk task jadwal (dedup miliknya tetap form_id + due_date di generator).
            // Untuk task kondisi: "COND:{source_task_id}" -> duplicate diblok unique index.
            $table->string('idempotency_key', 120)->nullable()->unique()->after('task_code');
            $table->string('origin_type', 20)->default('SCHEDULE')->after('status');
            $table->foreignId('source_task_id')->nullable()->after('origin_type')
                ->constrained('tasks')->nullOnDelete();
            $table->foreignId('source_condition_id')->nullable()->after('source_task_id')
                ->constrained('schedule_conditions')->nullOnDelete();
            $table->foreignId('source_submission_id')->nullable()->after('source_condition_id')
                ->constrained('tasks_submissions')->nullOnDelete();
        });

        // Backfill: task pada form INSPECTION Lvl 2 lahir dari kondisi trigger, bukan jadwal
        // (form Lvl 2 tidak bisa dijadwalkan). Source id tidak diketahui, jadi dibiarkan NULL.
        // Kolom baru dibuat dengan default 'SCHEDULE', jadi baris lama sudah terisi sebelum update ini.
        DB::table('tasks')
            ->join('forms', 'forms.id', '=', 'tasks.form_id')
            ->where('forms.form_type', 'INSPECTION')
            ->where('forms.form_level', 2)
            ->update(['tasks.origin_type' => 'CONDITION']);
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['source_submission_id']);
            $table->dropForeign(['source_condition_id']);
            $table->dropForeign(['source_task_id']);
            $table->dropUnique(['idempotency_key']);
            $table->dropColumn([
                'idempotency_key',
                'origin_type',
                'source_task_id',
                'source_condition_id',
                'source_submission_id',
            ]);
        });
    }
};
