<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Machine;
use Illuminate\Support\Facades\DB;

class MachineSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Kosongkan tabel dan reset ID
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Machine::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. Data mesin TANPA machine_code (karena akan digenerate otomatis)
        $machines = [
            [
                'machine_name'    => 'Hydraulic Press 100 Ton (Line 1)',
                'category'        => 'Press Machine',
                'machine_type'    => 'HYDRAULIC PRESS',
                'sub_type'        => '100 Ton',
                'location'        => 'Plant A - Pressing Area',
                'department'      => 'Production',
                'area'            => 'Zone 1',
                'pic_department'  => 'Maintenance Production',
                'machine_status'  => 'RUNNING',
                'commission_date' => '2021-05-15',
                'specifications'  => [
                    'brand'              => 'Amada',
                    'model'              => 'HP-100',
                    'oil_capacity'       => '120 Liters',
                ],
            ],
            [
                'machine_name'    => 'Hydraulic Press 200 Ton (Line 2)',
                'category'        => 'Press Machine',
                'machine_type'    => 'HYDRAULIC PRESS',
                'sub_type'        => '200 Ton',
                'location'        => 'Plant A - Pressing Area',
                'department'      => 'Production',
                'area'            => 'Zone 2',
                'pic_department'  => 'Maintenance Production',
                'machine_status'  => 'RUNNING',
                'commission_date' => '2022-01-10',
                'specifications'  => [
                    'brand'              => 'Komatsu',
                    'model'              => 'H1F-200',
                    'oil_capacity'       => '250 Liters',
                ],
            ],
            [
                'machine_name'    => 'CNC Lathe Machine (Turning 1)',
                'category'        => 'Machining Center',
                'machine_type'    => 'CNC LATHE',
                'sub_type'        => 'Turning Center',
                'location'        => 'Plant B - Machining Area',
                'department'      => 'Production',
                'area'            => 'Zone 3',
                'pic_department'  => 'Maintenance Machining',
                'machine_status'  => 'RUNNING',
                'commission_date' => '2020-11-20',
                'specifications'  => [
                    'brand'              => 'Mazak',
                    'model'              => 'QT-200',
                    'coolant_capacity'   => '200 Liters',
                ],
            ],
            [
                'machine_name'    => 'Screw Air Compressor 1',
                'category'        => 'Utility',
                'machine_type'    => 'AIR COMPRESSOR',
                'sub_type'        => 'Screw Type',
                'location'        => 'Utility Room 1',
                'department'      => 'Utility',
                'area'            => 'Zone 5',
                'pic_department'  => 'Maintenance Utility',
                'machine_status'  => 'RUNNING',
                'commission_date' => '2023-03-12',
                'specifications'  => [
                    'brand'              => 'Atlas Copco',
                    'model'              => 'GA-30',
                    'oil_capacity'       => '40 Liters',
                ],
            ],
        ];

        // 3. Proses Generate Code & Simpan ke Database
        foreach ($machines as $data) {
            
            // --- LOGIKA GENERATE MACHINE CODE (Sama seperti di Controller) ---
            $machineTypePrefix = substr(strtoupper($data['machine_type']), 0, 3);
            $randomNumber = str_pad((string) rand(1, 99), 2,  STR_PAD_LEFT);
            $machineCode = "FMC{$machineTypePrefix}000{$randomNumber}";

            // Pastikan kode belum ada di database (looping jika bentrok)
            while (Machine::where('machine_code', $machineCode)->exists()) {
                $randomNumber = str_pad((string) rand(1, 99), 2, STR_PAD_LEFT);
                $machineCode = "FMC{$machineTypePrefix}000{$randomNumber}";
            }
            // -----------------------------------------------------------------

            Machine::create([
                'user_id'         => 1, 
                'machine_code'    => $machineCode, // <-- Hasil generate otomatis dimasukkan ke sini
                'machine_name'    => $data['machine_name'],
                'qr_value'        => $machineCode, // QR Value disamakan dengan code
                'category'        => $data['category'],
                'machine_type'    => $data['machine_type'],
                'sub_type'        => $data['sub_type'],
                'location'        => $data['location'],
                'department'      => $data['department'],
                'area'            => $data['area'],
                'pic_department'  => $data['pic_department'],
                'machine_status'  => $data['machine_status'],
                'active_status'   => true,
                'commission_date' => $data['commission_date'],
                'specifications'  => $data['specifications'],
            ]);
        }
    }
}