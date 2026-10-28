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
            $table->id();
            $table->string('ticket_code')->unique()->nullable(false); 
            $table->string('problem_category');
            $table->text('problem_descriptions');
            $table->enum('priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])->default('MEDIUM');
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
                
                // teknisi yang menangani
                $table->timestamp('started_at')->useCurrent();
                $table->timestamp('closed_at')->useCurrent();
                
                // permasalahan dan aksi untuk menyelesaikan permasalahan
                $table->text('root_cause')->nullable();
                $table->text('corrective_action')->nullable();
                
                // task di verifikasi oleh siapa
                $table->timestamp('verified_at')->useCurrent();
                $table->text('verification_notes')->nullable();
                
                // relasi ke tabel users
                $table->foreignId('reported_by')->references('id')->on('users')->onDelete('cascade');
                $table->foreignId('verified_by')->references('id')->on('users')->onDelete('cascade');
                $table->foreignId('assigned_to')->references('id')->on('users')->onDelete('cascade');

                // relasi ke tabel machines
                $table->foreignId('machine_id')->constrained('machines')->onDelete('cascade');
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