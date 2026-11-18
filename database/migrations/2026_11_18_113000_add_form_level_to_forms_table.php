<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Level template untuk form INSPECTION: 1 = inspeksi rutin (level 1),
     * 2 = form lanjutan (level 2) yang dikerjakan otomatis lewat kondisi trigger.
     * Non-INSPECTION dibiarkan NULL.
     */
    public function up(): void
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->unsignedTinyInteger('form_level')->nullable()->after('form_type');
        });
    }

    public function down(): void
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->dropColumn('form_level');
        });
    }
};
