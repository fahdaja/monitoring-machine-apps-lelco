<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FormInspectionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Masukkan data mesin terlebih dahulu agar Foreign Key terpenuhi
        DB::table('machines')->updateOrInsert(
            ['machine_id' => 'MCH-001'],
            [
                'machine_name' => 'Extruder Injection',
                'machine_type' => 'Extruder',
                'machine_code' => 'MCH-001',
                'machine_name' => 'Extruder Injection',
                'qr_id' => 'MCH-001',
                // tambahkan kolom lain jika ada di tabel machines Anda
            ]
        );
        $formId = 'FORM-L1-001';
        $sectionId1 = 'SEC-001';
        $sectionId2 = 'SEC-002';

        // Form
        DB::table('forms')->insert([
            'form_id'      => $formId,
            'form_name'    => 'PM Extruder Line 1',
            'description' => 'Form inspection untuk PM Extruder Line 1',
            'machine_id'   => 'MCH-001', // <--- Ditambahkan agar tidak error
            'machine_type' => 'Extruder',
            'process_type' => 'Preventive Maintenance',
            'category'     => 'Daily Check',
            'level'        => 'L1',
            'version'      => '1',
            'department'   => 'Production',
            'priority'     => 1,
            'is_active'    => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Sections
        DB::table('sections')->insert([
            ['section_id' => $sectionId1, 'form_id' => $formId, 'section_code' => 'L1-01', 'section_title' => 'Hopper Body', 'section_description' => '', 'section_order' =>1],
            ['section_id' => $sectionId2, 'form_id' => $formId, 'section_code' => 'L1-02', 'section_title' => 'Heater Barrel', 'section_description' => '', 'section_order' =>2],
        ]);

        // Questions
        DB::table('questions')->insert([
            // CHOICE type
            [
                'question_id'   => 'Q-001',
                'form_id'       => $formId,
                'section_id'    => $sectionId1,
                'question_code' => 'L1-01-Q1',
                'question_text' => 'Apakah Hopper Body bersih dari debu dan kotoran?',
                'help_text'     => 'Periksa secara visual seluruh permukaan hopper',
                'standard_text' => 'Bersih dari debu, minyak, dan benda asing',
                'input_type'    => 'CHOICE',
            ],
            // NUMERIC type
            [
                'question_id'   => 'Q-002',
                'form_id'       => $formId,
                'section_id'    => $sectionId2,
                'question_code' => 'L1-02-Q1',
                'question_text' => 'Berapa suhu aktual Heater Zone 1?',
                'help_text'     => 'Cek termometer digital pada panel',
                'standard_text' => '180°C - 200°C',
                'input_type'    => 'NUMERIC',
                'unit'          => '°C',
                'min_value'     => '180',
                'max_value'     => '200',
            ],
        ]);
    }
}