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
        Schema::create('user_machine_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('assignment_code')->unique()->nullable(false); 
            $table->enum('assigntment_type', ['PRIMARY', 'BACKUP', 'SUPPORT', 'VENDOR'])->nullable();
            $table->date('valid_from');
            $table->date('valid_until');

            // relasi
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('machine_id')->constrained('machines')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_machine_assignments');
    }
};
