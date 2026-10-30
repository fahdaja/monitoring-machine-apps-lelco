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
        Schema::create('form_questions', function (Blueprint $table) {
            $table->id();
            $table->string('question_code')->unique()->nullable(false); 
            $table->text('question_text');
            $table->string('question_image')->nullable();
            $table->enum('input_type', ['TEXT' , 'TEXTAREA' , 'SELECT' , 'CHECKBOX' , 'DROPDOWN' , 'FILE' , 'DATE' , 'TIME']);
            $table->text('help_text')->nullable();
            $table->text('standard_text')->nullable();
            $table->string('media_url')->nullable();
            $table->string('media_type')->nullable();
            $table->string('media_title')->nullable();
            $table->integer('question_order')->default(0);
            $table->json('validation_rules')->nullable();
            $table->boolean('is_required')->default(false);


            // relasi
            $table->foreignId('form_id')->constrained('forms')->onDelete('cascade');
            $table->foreignId('form_section_id')->constrained('form_sections')->onDelete('cascade');
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
