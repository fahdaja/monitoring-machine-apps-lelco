<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MachineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Mengambil user_id pertama dari tabel users untuk audit created_by/updated_by (opsional)
        $userId = DB::table('users')->value('user_id');

        $machines = [
            [
                'machine_id'        => 'MCH-001',
                'machine_code'      => 'STMP-500T-01',
                'machine_name'      => 'Hydraulic Press Machine 500T',
                'qr_id'             => 'QR-MCH001-XYZ',
                'category'          => 'PRESS',
                'machine_type'      => 'HYDRAULIC',
                'sub_type'          => 'HEAVY DUTY',
                'location'          => 'Line A - Area 01',
                'department'        => 'STAMPING',
                'area'              => 'ZONE A',
                'pic_department'    => 'MAINTENANCE DEPT',
                'criticality'       => 'CRITICAL',
                'machine_status'    => 'RUNNING',
                'active_status'     => true,
                'commission_date'   => '2021-05-15',
                'specifications'    => json_encode([
                    'brand'              => 'KOMATSU',
                    'model'              => 'PH500-V2',
                    'serial_number'      => 'KM-2021-98765',
                    'manufacturing_year' => 2021,
                    'capacity'           => '500 Tons',
                    'power_kw'           => 45,
                ]),
                'notes'             => 'Perlu pemeriksaan rutin harian pada kebocoran oli katup solenoid utama.',
                'created_by'        => $userId,
                'updated_by'        => $userId,
            ],
            [
                'machine_id'        => 'MCH-002',
                'machine_code'      => 'CNC-MILL-02',
                'machine_name'      => 'CNC Milling Machine 5-Axis',
                'qr_id'             => 'QR-MCH002-ABC',
                'category'          => 'MACHINING',
                'machine_type'      => 'CNC MILLING',
                'sub_type'          => 'HIGH PRECISION',
                'location'          => 'Line B - Area 03',
                'department'        => 'PRODUCTION',
                'area'              => 'ZONE B',
                'pic_department'    => 'MAINTENANCE DEPT',
                'criticality'       => 'HIGH',
                'machine_status'    => 'RUNNING',
                'active_status'     => true,
                'commission_date'   => '2022-08-10',
                'specifications'    => json_encode([
                    'brand'              => 'HAAS',
                    'model'              => 'VF-4SS',
                    'serial_number'      => 'HS-2022-11029',
                    'manufacturing_year' => 2022,
                    'max_rpm'            => 12000,
                    'tool_capacity'      => 30,
                ]),
                'notes'             => 'Penggantian coolant berkala setiap 3 bulan.',
                'created_by'        => $userId,
                'updated_by'        => $userId,
            ],
            [
                'machine_id'        => 'MCH-003',
                'machine_code'      => 'INJ-PLAST-01',
                'machine_name'      => 'Plastic Injection Molding Machine',
                'qr_id'             => 'QR-MCH003-DEF',
                'category'          => 'MOLDING',
                'machine_type'      => 'INJECTION',
                'sub_type'          => 'AUTOMATIC',
                'location'          => 'Line C - Area 02',
                'department'        => 'MOLDING',
                'area'              => 'ZONE C',
                'pic_department'    => 'MAINTENANCE DEPT',
                'criticality'       => 'MEDIUM',
                'machine_status'    => 'UNDER_REPAIR',
                'active_status'     => true,
                'commission_date'   => '2019-11-20',
                'specifications'    => json_encode([
                    'brand'              => 'ENGEL',
                    'model'              => 'e-mac 310',
                    'serial_number'      => 'ENG-2019-44512',
                    'manufacturing_year' => 2019,
                    'clamping_force'     => '3100 kN',
                ]),
                'notes'             => 'Sedang perbaikan pada heating element zone 2.',
                'created_by'        => $userId,
                'updated_by'        => $userId,
            ],
            [
                'machine_id'        => 'MCH-004',
                'machine_code'      => 'ROB-WELD-01',
                'machine_name'      => 'Robotic Arm Welding Machine',
                'qr_id'             => 'QR-MCH004-GHI',
                'category'          => 'WELDING',
                'machine_type'      => 'ROBOTIC',
                'sub_type'          => '6-AXIS ARM',
                'location'          => 'Line A - Area 05',
                'department'        => 'ASSEMBLY',
                'area'              => 'ZONE A',
                'pic_department'    => 'MAINTENANCE DEPT',
                'criticality'       => 'CRITICAL',
                'machine_status'    => 'WAITING_SPAREPART',
                'active_status'     => true,
                'commission_date'   => '2023-01-12',
                'specifications'    => json_encode([
                    'brand'              => 'FANUC',
                    'model'              => 'ARC Mate 120iD',
                    'serial_number'      => 'FN-2023-88319',
                    'manufacturing_year' => 2023,
                    'payload_kg'         => 25,
                    'reach_mm'           => 1831,
                ]),
                'notes'             => 'Menunggu sparepart servo motor joint 3 dari vendor.',
                'created_by'        => $userId,
                'updated_by'        => $userId,
            ],
            [
                'machine_id'        => 'MCH-005',
                'machine_code'      => 'AIR-COMP-01',
                'machine_name'      => 'Screw Air Compressor 75kW',
                'qr_id'             => 'QR-MCH005-JKL',
                'category'          => 'UTILITY',
                'machine_type'      => 'COMPRESSOR',
                'sub_type'          => 'ROTARY SCREW',
                'location'          => 'Utility Room 01',
                'department'        => 'UTILITY',
                'area'              => 'ZONE U',
                'pic_department'    => 'FACILITY DEPT',
                'criticality'       => 'HIGH',
                'machine_status'    => 'PLANNED_MAINTENANCE',
                'active_status'     => true,
                'commission_date'   => '2020-03-01',
                'specifications'    => json_encode([
                    'brand'              => 'ATLAS COPCO',
                    'model'              => 'GA 75+',
                    'serial_number'      => 'AC-2020-55910',
                    'manufacturing_year' => 2020,
                    'pressure_bar'       => 8.5,
                    'capacity_fAD'       => '13.2 m3/min',
                ]),
                'notes'             => 'Jadwal PM bulanan untuk penggantian filter udara dan oli.',
                'created_by'        => $userId,
                'updated_by'        => $userId,
            ],
        ];

        DB::table('machines')->insert($machines);
    }
}