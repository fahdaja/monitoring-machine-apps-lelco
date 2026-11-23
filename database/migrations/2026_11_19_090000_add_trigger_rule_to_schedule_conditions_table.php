<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kondisi trigger tidak lagi terbatas pada "jawaban == opsi X".
     * Dua kolom baru menyimpan aturan lengkap: operator + nilai pembanding,
     * sehingga pertanyaan TEXT/TEXTAREA/DATE/TIME/FILE pun bisa jadi pemicu.
     *
     * trigger_option_id jadi nullable karena hanya operator "option_selected"
     * yang masih memakai ID opsi. Nilainya lama tetap ada, dan baris lama
     * otomatis memakai default 'option_selected' jadi perilaku tidak berubah.
     */
    public function up(): void
    {
        // FK dilepas lebih dulu: kolomnya mau dibuat NULL, dan ke depan
        // opsi yang dihapus tidak boleh ikut menghapus kondisi (nullOnDelete).
        Schema::table('schedule_conditions', function (Blueprint $table) {
            $table->dropForeign(['trigger_option_id']);
        });

        Schema::table('schedule_conditions', function (Blueprint $table) {
            $table->string('trigger_operator')->default('option_selected')->after('trigger_question_id');
            $table->string('trigger_value')->nullable()->after('trigger_operator');
            $table->foreignId('trigger_option_id')->nullable()->change();
        });

        Schema::table('schedule_conditions', function (Blueprint $table) {
            $table->foreign('trigger_option_id')
                ->references('id')
                ->on('form_options')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('schedule_conditions', function (Blueprint $table) {
            $table->dropForeign(['trigger_option_id']);
        });

        Schema::table('schedule_conditions', function (Blueprint $table) {
            $table->dropColumn(['trigger_operator', 'trigger_value']);
        });

        // Kolom tidak bisa dikembalikan jadi NOT NULL: kondisi non-opsi sudah menyimpan NULL.
        Schema::table('schedule_conditions', function (Blueprint $table) {
            $table->foreign('trigger_option_id')
                ->references('id')
                ->on('form_options')
                ->nullOnDelete();
        });
    }
};
