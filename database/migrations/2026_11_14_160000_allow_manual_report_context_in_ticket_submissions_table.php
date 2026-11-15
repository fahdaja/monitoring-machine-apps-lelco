<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Laporan breakdown manual (MANUAL_REPORT) juga disimpan ke ticket_submissions,
     * sehingga context tidak lagi hanya START_REPAIR / CLOSE_TICKET.
     */
    public function up(): void
    {
        if ($this->allowsManualReport()) {
            return;
        }

        Schema::table('ticket_submissions', function (Blueprint $table) {
            $table->enum('context', ['MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->allowsManualReport()) {
            return;
        }

        Schema::table('ticket_submissions', function (Blueprint $table) {
            $table->enum('context', ['START_REPAIR', 'CLOSE_TICKET'])->change();
        });
    }

    private function allowsManualReport(): bool
    {
        if (! Schema::hasTable('ticket_submissions')) {
            return true;
        }

        $sql = optional(DB::selectOne("select sql from sqlite_master where type = 'table' and name = 'ticket_submissions'"))->sql ?? '';

        return str_contains((string) $sql, 'MANUAL_REPORT');
    }
};
