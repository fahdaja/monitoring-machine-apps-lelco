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
            $table->enum('status', ['UPCOMING','DUE','OVERDUE', 'IN_PROGRESS', 'COMPLETED'])->nullable();
            $table->enum('source_type', ['AUTO_REPORT', 'MANUAL_REPORT'])->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
            
           // relasi 
            $table->foreignId('machine_id')->nullable()->references('id')->on('machines')->onDelete('cascade');
            $table->foreignId('form_id')->nullable()->references('id')->on('forms')->onDelete('cascade');
            $table->foreignId('assigned_user_id')->nullable()->references('id')->on('users')->onDelete('cascade');
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
