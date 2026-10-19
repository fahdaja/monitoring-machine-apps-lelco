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
        Schema::create('breakdown_tickets', function (Blueprint $table) {
            
            $table->string('ticket_id')->primary(); 
            $table->string('machine_id');
            $table->string('problem_category');
            $table->text('problem_descriptions');
            $table->enum('priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])->default('MEDIUM');
            $table->enum('current_level', ['L1', 'L2', 'L3', 'L4']);
            $table->enum('status', [
                'OPEN', 
                'IN_PROGRESS', 
                'WAITING_SPAREPART', 
                'WAITING_VENDOR', 
                'READY_FOR_CLOSING', 
                'CLOSED'
                ])->default('OPEN');
                
                // pelapor 
                $table->timestamp('reported_at')->useCurrent();
                $table->string('reported_by');
                
                // teknisi yang menangani
                $table->string('assigned_to')->nullable();
                $table->timestamp('started_at')->useCurrent();
                $table->timestamp('closed_at')->useCurrent();
                
                // permasalahan dan aksi untuk menyelesaikan permasalahan
                $table->text('root_cause')->nullable();
                $table->text('corrective_action')->nullable();
                
                // task di verifikasi oleh siapa
                $table->string('verified_by')->nullable();
                // $table->string('source_task_id')->nullable();
                // $table->foreign('source_task_id')->references('task_id')->on('tasks')->onDelete('cascade');
                $table->timestamp('verified_at')->useCurrent();
                $table->text('verification_notes')->nullable();
                
                // relasi ke tabel users
                $table->foreign('reported_by')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('verified_by')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('assigned_to')->references('user_id')->on('users')->onDelete('cascade');

                // relasi ke tabel machines
                $table->foreign('machine_id')->references('machine_id')->on('machines')->onDelete('cascade');
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('breakdown_tickets');
    }
};