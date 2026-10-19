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
        Schema::create('tasks', function (Blueprint $table) {
            $table->string('task_id')->primary();
            $table->string('rule_id')->nullable();
            $table->string('machine_id')->nullable();
            $table->enum('level', ['L1', 'L2', 'L3', 'L4'])->nullable();
            $table->string('form_id');
            $table->date('scheduled_date');
            $table->date('due_date');
            $table->enum('status', ['DUE','OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])->nullable();
            $table->string('assigned_user_id')->nullable();
            $table->date('started_at');
            $table->date('completed_at');
            $table->string('response_id');
            $table->string('result');
            $table->string('escalation_level');
            $table->string('escalation_ticket_id');
            $table->date('created_at');
            $table->date('updated_at');
            $table->string('notes');
           // relasi 
            $table->foreign('machine_id')->references('machine_id')->on('machines')->onDelete('cascade');
            $table->foreign('rule_id')->references('rule_id')->on('schedule_rules')->onDelete('cascade');
            $table->foreign('form_id')->references('form_id')->on('forms')->onDelete('cascade');
            $table->foreign('assigned_user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('escalation_ticket_id')->references('ticket_id')->on('breakdown_tickets')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
