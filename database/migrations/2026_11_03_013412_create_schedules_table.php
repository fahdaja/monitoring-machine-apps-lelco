<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
        public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->string('schedule_code')->unique(); 
            $table->foreignId('form_id')->constrained('forms')->onDelete('cascade');
            $table->string('frequency_type'); 
            $table->json('selected_days')->nullable(); 
            $table->json('selected_dates')->nullable(); 
            $table->integer('due_window_days')->default(1); 
            $table->boolean('is_active')->default(true); 
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
