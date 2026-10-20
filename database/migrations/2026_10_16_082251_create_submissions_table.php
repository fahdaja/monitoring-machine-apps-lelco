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
        Schema::create('submissions', function (Blueprint $table) {
            $table->string('submission_id')->primary();
            $table->string('machine_id')->nullable();
            $table->string('form_id')->nullable();
            $table->jsonb('answers_json')->nullable(); // parameters: value, unit, data_type
            // relasi
            $table->foreign('machine_id')->references('machine_id')->on('machines')->onDelete('cascade');
            $table->foreign('form_id')->references('form_id')->on('forms')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
