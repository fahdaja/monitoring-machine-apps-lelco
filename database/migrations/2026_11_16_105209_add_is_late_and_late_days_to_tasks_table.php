<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Catatan keterlambatan untuk keperluan audit; tidak menolak submit task OVERDUE.
            $table->boolean('is_late')->default(false)->after('completed_at');
            $table->unsignedInteger('late_days')->default(0)->after('is_late');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['is_late', 'late_days']);
        });
    }
};
