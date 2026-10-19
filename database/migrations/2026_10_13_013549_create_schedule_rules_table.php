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
        Schema::create('schedule_rules', function (Blueprint $table) {
            $table->string('rule_id')->primary();
            $table->string('rule_name')->nullable();
            $table->enum('level', ['L1', 'L2', 'L3', 'L4']);
            $table->string('machine_id')->nullable();
            $table->string('machine_type')->nullable();
            $table->string('category')->nullable();
            $table->enum('frequency_type', ['DAILY', 'WEEKLY', 'MONTHLY'])->default('DAILY');
            $table->integer('frequency_value')->nullable();
            $table->string('day_of_week')->nullable();
            $table->string('day_of_month')->nullable();
            $table->date('start_date');
            $table->integer('due_window_days');
            $table->integer('generate_ahead_days');
            $table->boolean('is_active')->default(false);
            $table->string('notes')->nullable();

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
