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
            $table->id();
            $table->string('form_code')->unique()->nullable(false); 
            $table->string('form_title');
            $table->string('form_description');
            $table->enum('frequency_type', ['DAILY', 'WEEKLY', 'MONTHLY'])->default('DAILY');
            $table->integer('due_window_days')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('created_at');
            $table->date('updated_at');

            // relasi
            $table->foreignId('machine_id')->constrained('machines')->onDelete('cascade');
            
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
