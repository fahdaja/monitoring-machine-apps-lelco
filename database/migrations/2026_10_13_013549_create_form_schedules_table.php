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
        Schema::create('form_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('schedule_code')->unique()->nullable(false); 
            $table->string('schedule_name');
            $table->enum('frequency_type', ['DAILY', 'WEEKLY', 'MONTHLY'])->default('DAILY');
            $table->string('days_of_week')->nullable();
            $table->string('days_of_month')->nullable();
            $table->date('due_window_date')->nullable();
            $table->time('due_window_time')->nullable();
            $table->date('start_date')->nullable();
            $table->boolean('is_active')->default(true);

            // relasi
            $table->foreignId('machine_id')->constrained('machines')->onDelete('cascade');
            $table->foreignId('form_id')->constrained('forms')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_rules');
    }
};
