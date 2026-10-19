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
        Schema::create('machines', function (Blueprint $table) {
            // nama dan tipe mesin
            $table->string('machine_id', 50)->primary();
            $table->string('machine_code', 50)->unique();
            $table->string('machine_name', 255);
            $table->string('qr_id', 100)->unique();
            $table->string('category', 100)->nullable();
            $table->string('machine_type')->nullable();
            $table->string('sub_type')->nullable();

            // informasi penting
            $table->string('location', 255)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('area', 100)->nullable();
            $table->string('pic_department', 100)->nullable();
            $table->enum('criticality', ['CRITICAL','HIGH', 'MEDIUM', 'LOW'])->default('MEDIUM');  
            $table->enum('machine_status', ['DOWN', 'RUNNING', 'UNDER_REPAIR', 'WAITING_SPAREPART','WAITING_L3', 'WAITING_VENDOR', 'WAITING_VERIFICATION', 'PLANNED_MAINTENANCE', 'INACTIVE'])->default('INACTIVE');
            $table->boolean('active_status')->default(false);
            $table->date('commission_date')->nullable();

            // spesifikasi mesin
            $table->jsonb('specifications')->nullable();
            
            // audit
            $table->string('notes', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->string('created_by', 100)->nullable();
            $table->timestamp('updated_at')->useCurrent();
            $table->string('updated_by', 100)->nullable();
            
            // relasi ke tabel users
            $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('updated_by')->references('user_id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machines');
    }
};