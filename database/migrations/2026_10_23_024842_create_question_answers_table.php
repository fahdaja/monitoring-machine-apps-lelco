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
        Schema::create('question_answers', function (Blueprint $table) {
            $table->string('questions_answer_id')->primary();
            $table->string('submission_id');
            $table->string('question_id');
            $table->jsonb('answer_value')->nullable();
            // relasi
            $table->foreign('submission_id')->references('submission_id')->on('submissions')->onDelete('cascade');
            $table->foreign('question_id')->references('question_id')->on('questions')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('question_answers');
    }
};
