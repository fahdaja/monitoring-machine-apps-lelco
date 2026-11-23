<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ROLE_MAP = [
        'MAINTENANCE_L2' => 'MAINTENANCE',
        'ENGINEERING_L3' => 'ENGINEERING',
        'VENDOR_L4'      => 'VENDOR',
    ];

    public function up(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'role')) {
            foreach (self::ROLE_MAP as $old => $new) {
                DB::table('users')
                    ->whereRaw('UPPER(role) = ?', [$old])
                    ->update(['role' => $new]);
            }
        }

        if (Schema::hasTable('roles') && Schema::hasColumn('roles', 'name')) {
            foreach (self::ROLE_MAP as $old => $new) {
                $targetExists = DB::table('roles')
                    ->whereRaw('UPPER(name) = ?', [$new])
                    ->exists();

                if ($targetExists) {
                    DB::table('roles')
                        ->whereRaw('UPPER(name) = ?', [$old])
                        ->delete();
                } else {
                    DB::table('roles')
                        ->whereRaw('UPPER(name) = ?', [$old])
                        ->update(['name' => $new]);
                }
            }
        }
    }

    public function down(): void
    {
        // Normalisasi nama role bersifat satu arah agar tidak mengembalikan duplikasi L2/L3/L4.
    }
};
