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
        Schema::create('sections', function (Blueprint $table) {
            $table->string('section_id')->primary();
            $table->string('form_id');
            $table->string('section_code');
            $table->string('section_title');
            $table->text('section_description');
            $table->integer('section_order');

            // relasi
            $table->foreign('form_id')->references('form_id')->on('forms')->onDelete('cascade');
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
