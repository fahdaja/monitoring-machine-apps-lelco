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
        Schema::create('form_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('submission_code')->unique()->nullable(false); 
            $table->jsonb('answers_value')->nullable(); 
            $table->dateTime('submitted_at')->nullable();
            //relasi
            $table->foreignId('tasks_id')->nullable()->references('id')->on('tasks')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->references('id')->on('users')->onDelete('cascade');
            $table->foreignId('escalation_ticket_id')->nullable()->references('id')->on('breakdown_tickets')->onDelete('cascade');
        });

        
    }



    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
