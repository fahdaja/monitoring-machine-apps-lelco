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
        Schema::create('form_options', function (Blueprint $table) {
            $table->id();
            $table->string('option_code')->unique()->nullable(false); 
            $table->string('option_text');
            $table->string('option_value')->nullable();
            $table->integer('option_order')->default(0);


            // opsional trigger breakdown
            $table->boolean('requires_breakdown_trigger')->default(false);
            $table->jsonb('locked_breakdown_parameters')->nullable();


            // opsional catatan
            $table->boolean('allowed_notes')->default(false);
            $table->boolean('requires_notes')->default(false);
            $table->string('notes_label')->nullable();

            // opsional bukti pendukung pertanyaan
            $table->boolean('requires_attachment')->default(false);
            $table->enum('allowed_attachment_types',['PHOTO',' VIDEO'])->nullable();
            $table->integer('allowed_maximum_file')->nullable();
            $table->enum('allowed_file_size', [1, 3, 5])->nullable();
            $table->boolean('is_normal')->default(false);
            
            // relasi 
            $table->foreignId('form_question_id')->constrained('form_questions')->onDelete('cascade');
            $table->foreignId('goto_form_section_id')->constrained('form_sections')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('options');
    }
};
