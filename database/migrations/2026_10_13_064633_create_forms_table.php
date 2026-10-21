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
        Schema::create('forms', function (Blueprint $table) {
            $table->string('form_id')->primary();
            $table->string('form_name');
            $table->string('description');
            $table->string('machine_id');
            $table->boolean('is_active')->nullable();
            $table->date('created_at');
            $table->date('updated_at');

            // relasi
            $table->foreign('machine_id')->references('machine_id')->on('machines')->onDelete('cascade');
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form');
    }
};
