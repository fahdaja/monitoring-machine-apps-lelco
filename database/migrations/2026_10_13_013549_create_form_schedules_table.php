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
            $table->string('schedule_id')->primary();
            $table->string('form_id')->nullable();
            $table->string('schedule_name')
            $table->enum('frequency_type', ['DAILY', 'WEEKLY', 'MONTHLY'])->default('DAILY');
            $table->string('days_of_week')->nullable();
            $table->string('days_of_month')->nullable();
            $table->date('start_date');
            $table->boolean('is_active')->default(true);

            // relasi
            $table->foreign('machine_id')->references('machine_id')->on('machines')->onDelete('cascade');
            
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
