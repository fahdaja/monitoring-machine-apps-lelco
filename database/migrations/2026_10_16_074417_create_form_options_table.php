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
            $table->integer('option_order')->default(0);
            $table->boolean('is_normal')->default(false);
            
            // relasi 
            $table->foreignId('form_question_id')->constrained('form_questions')->onDelete('cascade');
            $table->foreignId('goto_form_section_id')->nullable()->constrained('form_sections')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_options');
    }
};
