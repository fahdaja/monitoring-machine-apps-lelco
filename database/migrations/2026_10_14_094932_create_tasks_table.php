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
            $table->id();
            $table->string('task_code')->unique()->nullable(false); 
            $table->date('due_date');
            $table->enum('status', ['DUE','OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])->nullable();
            $table->date('started_at');
            $table->date('completed_at');
            $table->enum('source_type', ['AUTO_REPORT', 'MANUAL_REPORT']);
            $table->date('created_at');
            $table->date('updated_at');
            $table->string('notes');
            
           // relasi 
            $table->foreignId('machine_id')->constrained('machines')->onDelete('cascade');
            $table->foreignId('schedule_id')->constrained('form_schedules')->onDelete('cascade');
            $table->foreignId('assigned_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('escalation_ticket_id')->constrained('breakdown_tickets')->onDelete('cascade');
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
