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
            $table->id();
            $table->string('machine_code', 50)->unique();
            $table->string('machine_name', 255);
            $table->string('qr_image_path')->nullable();
            $table->string('qr_value')->nullable();
            $table->string('category', 100)->nullable();
            $table->string('machine_type')->nullable();
            $table->string('sub_type')->nullable();

            // informasi penting
            $table->string('location', 255)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('area', 100)->nullable();
            $table->string('pic_department', 100)->nullable();  
            $table->enum('machine_status', ['DOWN', 'RUNNING', 'UNDER_REPAIR', 'WAITING_SPAREPART','WAITING_L3', 'WAITING_VENDOR', 'WAITING_VERIFICATION', 'PLANNED_MAINTENANCE', 'INACTIVE'])->default('INACTIVE');
            $table->date('commission_date')->nullable();

            // spesifikasi mesin
            $table->jsonb('specifications')->nullable();
            
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
            
            // relasi
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machines');
    }
};