<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;
use App\Models\Department;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'user_code'    => 'USR-ADMIN-001',
                'username'     => 'admin',
                'full_name'    => 'Super Admin',
                'password'     => Hash::make('password'),
                'role'         => 'ADMIN',
                'department'   => 'E',
                'email'        => 'admin@lelco.com',
                'phone_number' => '08100000001',
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'user_code'    => 'USR-OPERATOR-001',
                'username'     => 'budi',
                'full_name'    => 'Budi Santoso',
                'password'     => Hash::make('password'),
                'role'         => 'OPERATOR',
                'department'   => 'PRODUCTION',
                'email'        => 'budi@lelco.com',
                'phone_number' => '08100000002',
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'user_code'    => 'USR-MAINTEN-001',
                'username'     => 'fahd',
                'full_name'    => 'Muhammad Fahd',
                'password'     => Hash::make('password'),
                'role'         => 'MAINTENANCE_L2',
                'department'   => 'MAINTENANCE',
                'email'        => 'fahd@lelco.com',
                'phone_number' => '08100000003',
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ];

        foreach ($users as $userData) {
            DB::table('users')->updateOrInsert(
                ['user_code' => $userData['user_code']], 
                $userData
            );
        }
    }
}