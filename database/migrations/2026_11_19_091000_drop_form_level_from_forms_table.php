<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Leveling form dihapus: form INSPECTION tidak lagi punya Level 1 / Level 2.
     * Rantai "form lanjutan" sekarang ditunjuk eksplisit lewat kondisi trigger
     * (schedule_conditions.target_form_id), jadi kolom ini tidak punya guna lagi.
     *
     * Migration 2026_11_18_140000 masih membaca kolom ini saat backfill, jadi
     * file ini sengaja diberi timestamp lebih baru supaya urutannya aman
     * saat migrate dari nol.
     */
    public function up(): void
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->dropColumn('form_level');
        });
    }

    public function down(): void
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->unsignedTinyInteger('form_level')->nullable()->after('form_type');
        });
    }
};
