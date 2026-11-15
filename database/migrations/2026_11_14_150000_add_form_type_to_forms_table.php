<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kategori form: INSPECTION, MANUAL_REPORT, START_REPAIR, CLOSE_TICKET.
     * Form transisi tiket (START_REPAIR / CLOSE_TICKET) berlaku global,
     * sehingga machine_id boleh kosong.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('forms', 'form_type')) {
            Schema::table('forms', function (Blueprint $table) {
                $table->string('form_type', 30)->default('INSPECTION')->after('form_code')->index();
            });
        }

        $machineId = collect(Schema::getColumns('forms'))->firstWhere('name', 'machine_id');

        if ($machineId && ! ($machineId['nullable'] ?? false)) {
            Schema::table('forms', function (Blueprint $table) {
                $table->foreignId('machine_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('forms', 'form_type')) {
            Schema::table('forms', function (Blueprint $table) {
                $table->dropIndex(['form_type']);
            });

            Schema::table('forms', function (Blueprint $table) {
                $table->dropColumn('form_type');
            });
        }
    }
};
