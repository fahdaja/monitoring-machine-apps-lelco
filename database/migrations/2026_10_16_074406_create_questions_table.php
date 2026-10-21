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
        Schema::create('questions', function (Blueprint $table) {
            $table->string('question_id')->primary();
            $table->string('form_id');
            $table->string('section_id');
            $table->string('question_code');
            $table->text('question_text');
            $table->enum('input_type', ['TEXT' , 'TEXTAREA' , 'SELECT' , 'CHECKBOX' , 'DROPDOWN' , 'FILE' , 'DATE' , 'TIME']);
            $table->string('media_url')->nullable();
            $table->string('media_type')->nullable();
            $table->string('media_title')->nullable();

            // relasi
            $table->foreign('form_id')->references('form_id')->on('forms')->onDelete('cascade');
            $table->foreign('section_id')->references('section_id')->on('sections')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
