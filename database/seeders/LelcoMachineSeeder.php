<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\MachineStatus;
use App\Models\Machine;
use App\Models\User;
use Illuminate\Database\Seeder;

class LelcoMachineSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('username', 'admin')->value('id')
            ?? User::query()->orderBy('id')->value('id')
            ?? 1;

        $rows = [
            // [machine_code, machine_name, category, machine_type, sub_type, location, pic_department, status, commission_date, qr_id, criticality]
            ['FMCINJ00001', 'Mesin Injection Super Master 350 Ton SN -', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', 'Molding Area', 'Production', 'RUNNING', '2024-01-01', 'QR-MC-INJ-00001', 'HIGH'],
            ['FMCINJ00002', 'Mesin Injection Super Master 90 Ton SN 916213', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00002', 'HIGH'],
            ['FMCINJ00003', 'Mesin Injection Borche 160 Ton SN 1223Y214', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00003', 'HIGH'],
            ['FMCINJ00004', 'Mesin Injection Hyundai 150 Ton SN 86182', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00004', 'HIGH'],
            ['FMCINJ00005', 'Mesin Injection Hyundai 150 Ton SN 86181', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00005', 'HIGH'],
            ['FMCINJ00006', 'Mesin Injection Super Master 250 Ton SN 21906', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00006', 'HIGH'],
            ['FMCINJ00007', 'Mesin Injection Super Master 250 Ton SN 21904', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00007', 'HIGH'],
            ['FMCINJ00008', 'Mesin Injection Jon Wai 120 Ton SN CCD0147', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00008', 'HIGH'],
            ['FMCINJ00009', 'Mesin Injection Jon Wai 120 Ton SN CCD0146', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00009', 'HIGH'],
            ['FMCINJ00010', 'Mesin Injection Jon Wai 120 Ton SN CD1089', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00010', 'HIGH'],
            ['FMCINJ00011', 'Mesin Injection Jon Wai 150 Ton SN DD1176', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00011', 'HIGH'],
            ['FMCINJ00012', 'Mesin Injection Jon Wai 150 Ton SN CCD0098', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00012', 'HIGH'],
            ['FMCINJ00013', 'Mesin Injection Jon Wai 150 Ton SN DD1177', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00013', 'HIGH'],
            ['FMCINJ00014', 'Mesin Injection Jon Wai 120 Ton SN CD1011', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00014', 'HIGH'],
            ['FMCINJ00015', 'Mesin Injection Jon Wai 120 Ton SN CD1103', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00015', 'HIGH'],
            ['FMCINJ00016', 'Mesin Injection Jon Wai 180 Ton SN ED1188', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00016', 'HIGH'],
            ['FMCINJ00017', 'Mesin Injection Jon Wai 180 Ton SN CED0123', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00017', 'HIGH'],
            ['FMCINJ00018', 'Mesin Injection Hyundai 150 Ton SN 86135', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00018', 'HIGH'],
            ['FMCINJ00019', 'Mesin Injection Accel 220 Ton SN 70270', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00019', 'HIGH'],
            ['FMCINJ00020', 'Mesin Injection Borche 320 Ton SN 30E009', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00020', 'HIGH'],
            ['FMCINJ00021', 'Mesin Injection Omni Plastic — Ton SN 80127081', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00021', 'HIGH'],
            ['FMCINJ00022', 'Mesin Injection Borche 320 Ton SN ZJ30G039', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00022', 'HIGH'],
            ['FMCINJ00023', 'Mesin Injection Borche 120 Ton SN 2026J226', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00023', 'HIGH'],
            ['FMCINJ00024', 'Mesin Injection Borche 120 Ton SN 2026J230', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00024', 'HIGH'],
            ['FMCINJ00025', 'Mesin Injection Borche 80 Ton SN 2025J184', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00025', 'HIGH'],
            ['FMCINJ00026', 'Mesin Injection Borche 80 Ton SN 2025J165', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00026', 'HIGH'],
            ['FMCINJ00027', 'Mesin Injection Borche 80 Ton SN 2025J167', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00027', 'HIGH'],
            ['FMCINJ00028', 'Mesin Injection Borche 80 Ton SN 2025J180', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00028', 'HIGH'],
            ['FMCINJ00029', 'Mesin Injection Borche 8 Ton SN 2025J181', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00029', 'HIGH'],
            ['FMCINJ00030', 'Mesin Injection Borche 80 Ton SN 2025J163', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00030', 'HIGH'],
            ['FMCINJ00031', 'Mesin Injection Borche 80 Ton SN 2025J161', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00031', 'HIGH'],
            ['FMCINJ00032', 'Mesin Injection Borche 80 Ton SN 2025J183', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00032', 'HIGH'],
            ['FMCINJ00033', 'Mesin Injection Borche 80 Ton SN 2025J168', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00033', 'HIGH'],
            ['FMCINJ00034', 'Mesin Injection Borche 80 Ton SN 2025J164', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00034', 'HIGH'],
            ['FMCINJ00035', 'Mesin Injection Borche 80 Ton SN 2025J168', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00035', 'HIGH'],
            ['FMCINJ00036', 'Mesin Injection Borche 80 Ton SN 2025J170', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00036', 'HIGH'],
            ['FMCINJ00037', 'Mesin Injection Borche 80 Ton SN 2025J169', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00037', 'HIGH'],
            ['FMCINJ00038', 'Mesin Injection Borche 80 Ton SN 2025J182', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00038', 'HIGH'],
            ['FMCINJ00039', 'Mesin Injection Borche 80 Ton SN 2025J162', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00039', 'HIGH'],
            ['FMCINJ00040', 'Mesin Injection Borche 120 Ton SN 2026J228', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00040', 'HIGH'],
            ['FMCINJ00041', 'Mesin Injection Borche 120 Ton SN 2025J227', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00041', 'HIGH'],
            ['FMCINJ00042', 'Mesin Injection Borche 180 Ton SN 2026K003', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00042', 'HIGH'],
            ['FMCINJ00043', 'Mesin Injection Borche 120 Ton SN 2026K004', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00043', 'HIGH'],
            ['FMCINJ00044', 'Mesin Injection Borche 120 Ton SN 2026J229', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00044', 'HIGH'],
            ['FMCINJ00045', 'Mesin Injection Hyundai 150 Ton SN 03-5012', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00045', 'HIGH'],
            ['FMCINJ00046', 'Mesin Injection Hyundai 150 Ton SN 03-5013', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00046', 'HIGH'],
            ['FMCINJ00047', 'Mesin Injection Hyundai 250 Ton SN 03-5016', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00047', 'HIGH'],
            ['FMCINJ00048', 'Mesin Injection Hyundai 250 Ton SN 03-5014', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00048', 'HIGH'],
            ['FMCINJ00049', 'Mesin Injection Borche 400 Ton SN 1207P052', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00049', 'HIGH'],
            ['FMCINJ00050', 'Mesin Injection Hyundai 350 Ton SN 03-4983', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00050', 'HIGH'],
            ['FMCINJ00051', 'Mesin Injection Borche 160 Ton SN 2223W027', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00051', 'HIGH'],
            ['FMCINJ00052', 'Mesin Injection Borche 160 Ton SN 1223X024', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00052', 'HIGH'],
            ['FMCINJ00053', 'Mesin Injection Borche 90 Ton SN 2221X035', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00053', 'HIGH'],
            ['FMCINJ00054', 'Mesin Injection Borche 90 Ton SN 22213X037', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00054', 'HIGH'],
            ['FMCINJ00055', 'Mesin Injection Borche 90 Ton SN 2221X036', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00055', 'HIGH'],
            ['FMCINJ00056', 'Mesin Injection Borche 160 Ton SN 1223X025', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00056', 'HIGH'],
            ['FMCINJ00057', 'Mesin Injection Borche 160 Ton SN 2223X122', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00057', 'HIGH'],
            ['FMCINJ00058', 'Mesin Injection Borche 160 Ton SN 2223X121', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00058', 'HIGH'],
            ['FMCINJ00059', 'Mesin Injection Borche 130 Ton SN 1222Y099', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00059', 'HIGH'],
            ['FMCINJ00060', 'Mesin Injection Hyundai 150 Ton SN 07-6017', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00060', 'HIGH'],
            ['FMCINJ00061', 'Mesin Injection Borche 400 Ton SN 1227X008', 'PLASTIC PROCESSING', 'INJECTION MOLDING', 'HORIZONTAL', null, 'Production', 'RUNNING', null, 'QR-MC-INJ-00061', 'HIGH'],
        ];

        $productionPic = User::where('role', 'OPERATOR')->orderBy('id')->value('full_name') ?? 'Budi Santoso';
        $maintenancePic = User::where('role', 'MAINTENANCE')->orderBy('id')->value('full_name') ?? 'Andi Pratama';

        foreach ($rows as $row) {
            [
                $machineCode,
                $machineName,
                $category,
                $machineType,
                $subType,
                $location,
                $department,
                $status,
                $commissionDate,
            ] = $row;

            $validStatus = MachineStatus::tryFrom($status)?->value ?? MachineStatus::RUNNING->value;

            // Ekstrak spesifikasi dinamis dari nama mesin (brand, kapasitas/tonnage, serial number)
            $specs = [];
            if (preg_match('/Mesin Injection\s+(.+?)\s+(\d+|—)\s*Ton\s+SN\s+(.+)$/i', $machineName, $m)) {
                $specs['brand'] = trim($m[1]);
                if ($m[2] !== '—') {
                    $specs['tonnage'] = trim($m[2]) . ' Ton';
                }
                if (trim($m[3]) !== '' && trim($m[3]) !== '-') {
                    $specs['serial_number'] = trim($m[3]);
                }
            } else {
                $specs['machine_type'] = $machineType;
                $specs['sub_type'] = $subType;
            }

            $picPerson = strtolower($department) === 'maintenance' ? $maintenancePic : $productionPic;

            Machine::updateOrCreate(
                ['machine_code' => $machineCode],
                [
                    'user_id' => $adminId,
                    'machine_name' => $machineName,
                    'qr_value' => $machineCode,
                    'category' => $category,
                    'machine_type' => $machineType,
                    'sub_type' => $subType,
                    'location' => $location,
                    'department' => $department,
                    'pic_department' => $picPerson,
                    'machine_status' => $validStatus,
                    'active_status' => true,
                    'commission_date' => $commissionDate,
                    'specifications' => $specs,
                ]
            );
        }

        $this->command?->info('Berhasil seed ' . count($rows) . ' data mesin Lelco.');
    }
}
