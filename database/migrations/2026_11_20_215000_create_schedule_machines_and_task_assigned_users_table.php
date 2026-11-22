<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Pivot mesin untuk schedule (1 schedule bisa memilih banyak mesin dan menargetkan user PIC)
        if (!Schema::hasTable('schedule_machines')) {
            Schema::create('schedule_machines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('schedule_id')->constrained('schedules')->cascadeOnDelete();
                $table->foreignId('machine_id')->constrained('machines')->cascadeOnDelete();
                $table->json('assigned_user_ids')->nullable(); // PIC yang ditargetkan untuk mesin ini
                $table->timestamps();

                $table->unique(['schedule_id', 'machine_id']);
            });
        }

        // 2. Pivot penugasan user pada task (bisa 1 atau lebih user ditargetkan)
        if (!Schema::hasTable('task_assigned_users')) {
            Schema::create('task_assigned_users', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['task_id', 'user_id']);
            });
        }

        // 3. Tambah schedule_id pada tasks bila belum ada
        if (!Schema::hasColumn('tasks', 'schedule_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('schedule_id')->nullable()->after('form_id')
                    ->constrained('schedules')->nullOnDelete();
            });
        }

        // Backfill: isi schedule_machines dari jadwal lama yang form-nya punya machine_id
        $oldSchedules = DB::table('schedules')
            ->join('forms', 'forms.id', '=', 'schedules.form_id')
            ->whereNotNull('forms.machine_id')
            ->select('schedules.id as schedule_id', 'forms.machine_id')
            ->get();

        foreach ($oldSchedules as $sch) {
            $exists = DB::table('schedule_machines')
                ->where('schedule_id', $sch->schedule_id)
                ->where('machine_id', $sch->machine_id)
                ->exists();

            if (!$exists) {
                DB::table('schedule_machines')->insert([
                    'schedule_id' => $sch->schedule_id,
                    'machine_id' => $sch->machine_id,
                    'assigned_user_ids' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Backfill: isi task_assigned_users dari task lama yang sudah ada assigned_user_id
        $oldTasks = DB::table('tasks')
            ->whereNotNull('assigned_user_id')
            ->select('id as task_id', 'assigned_user_id as user_id')
            ->get();

        foreach ($oldTasks as $t) {
            $exists = DB::table('task_assigned_users')
                ->where('task_id', $t->task_id)
                ->where('user_id', $t->user_id)
                ->exists();

            if (!$exists) {
                DB::table('task_assigned_users')->insert([
                    'task_id' => $t->task_id,
                    'user_id' => $t->user_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tasks', 'schedule_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropForeign(['schedule_id']);
                $table->dropColumn('schedule_id');
            });
        }

        Schema::dropIfExists('task_assigned_users');
        Schema::dropIfExists('schedule_machines');
    }
};
