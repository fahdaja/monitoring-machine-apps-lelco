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
        Schema::create('ticket_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('breakdown_tickets')->onDelete('cascade');
            $table->foreignId('form_id')->constrained('forms'); 
            $table->foreignId('submitted_by')->constrained('users');
            $table->enum('context', ['MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET']);
            $table->json('answers_values'); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_submissions');
    }
};
