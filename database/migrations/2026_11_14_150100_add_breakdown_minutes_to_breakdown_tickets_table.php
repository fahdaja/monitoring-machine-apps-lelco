<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom downtime yang dipakai BreakdownTicket::getCalculatedDowntimeAttribute()
     * dan disimpan saat form closing (CLOSE_TICKET) di-submit.
     */
    public function up(): void
    {
        if (Schema::hasColumn('breakdown_tickets', 'breakdown_minutes')) {
            return;
        }

        Schema::table('breakdown_tickets', function (Blueprint $table) {
            $table->unsignedInteger('breakdown_minutes')->nullable()->after('corrective_action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('breakdown_tickets', 'breakdown_minutes')) {
            Schema::table('breakdown_tickets', function (Blueprint $table) {
                $table->dropColumn('breakdown_minutes');
            });
        }
    }
};
