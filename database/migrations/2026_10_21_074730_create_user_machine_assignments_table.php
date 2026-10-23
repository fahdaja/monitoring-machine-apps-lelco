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
            $table->string('assignment_id')->primary();
            $table->string('user_id');
            $table->string('machine_id');
            $table->enum('assigntment_type', ['PRIMARY', 'BACKUP', 'SUPPORT', 'VENDOR'])->nullable();
            $table->date('valid_from');
            $table->date('valid_until');

            // relasi
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('machine_id')->references('machine_id')->on('machines')->onDelete('cascade');
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
