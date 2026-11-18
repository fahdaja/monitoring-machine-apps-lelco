<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PIC mesin sekarang banyak orang (bukan teks satu kolom lagi),
     * dan daftar ini yang jadi gerbang siapa boleh mengerjakan task mesin tersebut.
     */
    public function up(): void
    {
        Schema::create('machine_pics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('machine_id')->constrained('machines')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['machine_id', 'user_id']);
        });

        // Warisi teks PIC lama ke pivot kalau namanya persis sama dengan nama user,
        // supaya mesin yang sudah punya PIC tidak langsung kehilangan aturan.
        $textOnly = DB::table('machines')->whereNotNull('pic_department')->pluck('pic_department', 'id');

        $textOnly->each(function ($text, $machineId) {
            foreach (preg_split('/[;,\.]+/', (string) $text) as $name) {
                $name = trim($name);

                if ($name === '') {
                    continue;
                }

                $userId = DB::table('users')
                    ->whereRaw('UPPER(full_name) = ?', [strtoupper($name)])
                    ->where('is_active', true)
                    ->value('id');

                if (! $userId) {
                    continue;
                }

                $exists = DB::table('machine_pics')
                    ->where('machine_id', $machineId)
                    ->where('user_id', $userId)
                    ->exists();

                if (! $exists) {
                    DB::table('machine_pics')->insert([
                        'machine_id'  => $machineId,
                        'user_id'     => $userId,
                        'created_at'  => now(),
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_pics');
    }
};
