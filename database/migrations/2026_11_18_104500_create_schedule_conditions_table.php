<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kondisi trigger antar level form inspeksi:
     * saat task form level 1 disubmit dengan jawaban yang dipilih sebagai trigger,
     * sistem membuat task untuk form level 2 dengan due_date keesokan harinya.
     */
    public function up(): void
    {
        Schema::create('schedule_conditions', function (Blueprint $table) {
            $table->id();
            $table->string('condition_code')->unique()->nullable(false);

            // relasi
            $table->foreignId('trigger_form_id')->constrained('forms')->onDelete('cascade');
            $table->foreignId('trigger_question_id')->constrained('form_questions')->onDelete('cascade');
            $table->foreignId('trigger_option_id')->constrained('form_options')->onDelete('cascade');
            $table->foreignId('target_form_id')->constrained('forms')->onDelete('cascade');

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
        Schema::dropIfExists('schedule_conditions');
    }
};
