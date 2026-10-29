<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Department;

class RoleAndDepartmentSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Data Pilihan Role (Jabatan / Hak Akses)
        $roles = [
            [
                'name' => 'ADMIN', 
            ],
            [
                'name' => 'SUPERVISOR', 
            ],
            [
                'name' => 'OPERATOR', 
            ],
            [
                'name' => 'MAINTENANCE', 
            ],
            [
                'name' => 'ENGINEERING', 
            ],
            [
                'name' => 'VENDOR', 
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }

        // 2. Data Pilihan Departemen / Bagian Pabrik
        $departments = [
            [
                'name' => 'Maintenance',
                'code' => 'MNT',
            ],
            [
                'name' => 'Production',
                'code' => 'PRD',
            ],
            [
                'name' => 'Quality Control',
                'code' => 'QC',
            ],
            [
                'name' => 'Engineering',
                'code' => 'ENG',
            ],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(['code' => $dept['code']], $dept);
        }
    }
}