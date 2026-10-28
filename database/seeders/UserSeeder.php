<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
                'department'   => 'IT',
                'email'        => 'admin@lelco.com',
                'phone_number' => '08100000001',
                'is_active'    => true,
            ],
            [
                'user_code'    => 'USR-OPERATOR-001',
                'username'     => 'budi',
                'full_name'    => 'Budi Santoso',
                'password'     => Hash::make('password'),
                'role'         => 'OPERATOR',
                'department'   => 'Production',
                'email'        => 'budi@lelco.com',
                'phone_number' => '08100000002',
                'is_active'    => true,
            ],
            [
                'user_code'    => 'USR-MAINTEN-001',
                'username'     => 'fahd',
                'full_name'    => 'Muhammad Fahd',
                'password'     => Hash::make('password'),
                'role'         => 'MAINTENANCE_L2',
                'department'   => 'Maintenance',
                'email'        => 'fahd@lelco.com',
                'phone_number' => '08100000003',
                'is_active'    => true,
            ],
        ];

        DB::table('users')->insert($users);
    }
}
