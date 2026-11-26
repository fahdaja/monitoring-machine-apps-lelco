<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_machine_status_check');
        }

        Schema::table('machines', function (Blueprint $table) {
            $table->string('machine_status', 50)->default('INACTIVE')->change();
        });
    }

    public function down(): void
    {
        Schema::table('machines', function (Blueprint $table) {
            $table->enum('machine_status', ['DOWN', 'RUNNING', 'UNDER_REPAIR', 'INACTIVE'])
                ->default('INACTIVE')
                ->change();
        });
    }
};
