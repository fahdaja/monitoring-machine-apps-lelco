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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_code', 50)->unique()->nullable(false);
            $table->string('username',100)->unique()->nullable(false);
            $table->string('full_name',255)->nullable(false);
            $table->string('email',100)->nullable(false);
            $table->string('role',50)->nullable(false);
            $table->string('department',50)->nullable(false);
            $table->string('phone_number', 20)->nullable(false);
            $table->string('password',255)->nullable(false);
            $table->boolean('is_active')->default(false);
            $table->timestamp('last_login_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
