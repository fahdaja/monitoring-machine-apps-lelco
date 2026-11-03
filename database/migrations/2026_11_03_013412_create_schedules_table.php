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
        Schema::create('schedules', function (Blueprint $table) {
    $table->id();
    $table->string('schedule_code')->unique()->nullable(false); 
    $table->foreignId('form_id')->constrained('forms')->onDelete('cascade');
    $table->string('frequency_type'); 
    $table->date('start_date');
    $table->date('end_date');
    $table->json('custom_values')->nullable(); 
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
