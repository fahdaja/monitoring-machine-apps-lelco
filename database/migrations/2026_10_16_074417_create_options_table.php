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
        Schema::create('options', function (Blueprint $table) {
            $table->string('option_id')->primary();
            $table->string('question_id');
            $table->string('option_text');
            $table->string('option_value')->nullable();
            $table->integer('sort_order')->default(0);

            $table->string('next_question_id')->nullable();

            // opsional info tambahan untuk membantu user
            $table->text('help_text')->nullable();
            $table->text('standard_text')->nullable();

            // opsional trigger breakdown
            $table->boolean('requires_breakdown_trigger')->nullable();
            $table->jsonb('locked_breakdown_parameters')->nullable();


            // opsional catatan
            $table->boolean('requires_notes')->default(false);
            $table->string('notes_label')->nullable();

            // opsional bukti pendukung pertanyaan
            $table->boolean('requires_attachment')->default(false);
            $table->enum('allowed_attachment_types',['PHOTO',' VIDEO','AUDIO', 'PDF'])->nullable();
            
            // relasi 
            $table->foreign('question_id')->references('question_id')->on('questions')->onDelete('cascade');
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
