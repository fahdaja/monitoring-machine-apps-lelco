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
        Schema::create('permissions', function (Blueprint $table) {
            $table->string('role_id');
            $table->enum('permission', ['VIEW_ALL', 'MANAGE_MASTER', 'INSPECTION_MASTER', 'BREAKDOWN_MASTER' 'VIEW_DASHBOARD', 'L1_INSPECTION', 'L2_INSPECTION', 'L3_INSPECTION', 'L4_INSPECTION', 'REPORT_BREAKDOWN', 'HANDLE_BREAKDOWN', 'VERIFY_BREAKDOWN', 'CLOSE_BREAKDOWN'])
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
