<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Form;
use App\Models\FormOption;
use App\Models\FormQuestion;
use App\Models\FormSection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class L1InjectionMoldingFormSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $form = Form::updateOrCreate(
                ['form_code' => 'FRM6B05612882C7A'],
                [
                    'form_type' => 'INSPECTION',
                    'form_title' => 'L1 Injection Molding',
                    'form_description' => 'Checklist L1 Injection Molding Native Form.',
                    'machine_id' => null,
                ]
            );

            $okNgOptions = static fn (string $okCode, string $ngCode): array => [
                ['option_code' => $okCode, 'option_text' => 'OK', 'option_order' => 1, 'is_normal' => true],
                ['option_code' => $ngCode, 'option_text' => 'NG', 'option_order' => 2, 'is_normal' => false],
            ];

            $fileRule = [[
                'max_file_size' => '10MB',
                'expected_answer' => null,
                'allowed_file_type' => ['jpg', 'jpeg', 'png', 'webp'],
                'validation_error_message' => null,
                'show_on_abnormal' => true,
            ]];

            $emptyRule = [[
                'max_file_size' => null,
                'expected_answer' => null,
                'validation_error_message' => null,
            ]];

            $numberRule = [[
                'max_file_size' => null,
                'expected_answer' => 'angka',
                'validation_error_message' => 'Harap masukkan angka temperatur (°C).',
            ]];

            $sectionsData = [
                [
                    'section_code' => 'SEC-6B05620A97100',
                    'section_title' => 'L1-01 • Hopper Body',
                    'section_description' => 'C - Clean  Pastikan Hopper Body bersih dari debu, bijih material yang tercecer, minyak, dan benda asing.  Metode: Pemeriksaan Visual / Touch',
                    'section_order' => 1,
                    'questions' => [
                        [
                            'question_code' => 'QST-195C418031744',
                            'question_text' => 'Apakah bodi Hopper bersih, tidak ada debu material diarea hopper?',
                            'images' => ['question-images/L1-Point 1-Hopper Body.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Pemeriksaan Visual / Touch',
                            'standard_text' => 'Pastikan Hopper Body bersih dari debu, bijih material yang tercecer, minyak, dan benda asing.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-CB4680926E51F', 'OPT-0AA928BB069E3'),
                        ],
                        [
                            'question_code' => 'QST-E20A2A6E6FA34',
                            'question_text' => 'Catatan / Notes - L1-01 Hopper Body',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Bersihkan. Hentikan pengisian jika terdapat kontaminasi. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-7D854D524A719',
                            'question_text' => 'Upload Foto Evidence - L1-01 Hopper Body',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-A0F0996B1747A',
                    'section_title' => 'L1-02 • Hopper - Tutup Atas',
                    'section_description' => 'C - Clean  Pastikan tutup atas hopper tertutup rapat dan tidak rusak.  Metode: Pemeriksaan Visual / Touch',
                    'section_order' => 2,
                    'questions' => [
                        [
                            'question_code' => 'QST-1EE54885F2F01',
                            'question_text' => 'Apakah tutup atas Hopper tertutup rapat dan posisi klem terkunci?',
                            'images' => ['question-images/L1-Point 2-Hopper Tutup Atas.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Pemeriksaan Visual / Touch',
                            'standard_text' => 'Pastikan tutup atas hopper tertutup rapat dan tidak rusak.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-22C8DF4F13512', 'OPT-37A725E16EFA2'),
                        ],
                        [
                            'question_code' => 'QST-48C9F85144E23',
                            'question_text' => 'Catatan / Notes - L1-02 Hopper - Tutup Atas',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Tutup kembali; jika rusak, lakukan penggantian/eskalasi sesuai prosedur. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-1CA1F200A8699',
                            'question_text' => 'Upload Foto Evidence - L1-02 Hopper - Tutup Atas',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-97231D2F6EB17',
                    'section_title' => 'L1-03 • Hopper - Feed Throat / Saluran Material',
                    'section_description' => 'C - Clean  Tidak ada material menggumpal atau sumbatan akibat sisa material halus. Aliran material menuju barrel aman.  Metode: Pemeriksaan Visual / Touch',
                    'section_order' => 3,
                    'questions' => [
                        [
                            'question_code' => 'QST-ACDF36736D073',
                            'question_text' => 'Apakah Feed Throat / saluran material bebas gumpalan dan sumbatan, sehingga material aman mengalir ke barrel?',
                            'images' => ['question-images/L1-Point 3-Hopper (feed throatsaluran material).JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Pemeriksaan Visual / Touch',
                            'standard_text' => 'Tidak ada material menggumpal atau sumbatan akibat sisa material halus. Aliran material menuju barrel aman.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-94A01854D4B02', 'OPT-FDF13B6B07E9E'),
                        ],
                        [
                            'question_code' => 'QST-590152F1C034D',
                            'question_text' => 'Catatan / Notes - L1-03 Hopper - Feed Throat / Saluran Material',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Hentikan pengisian; eskalasi jika tidak dapat dipulihkan dengan metode aman. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-BB05115E31E1D',
                            'question_text' => 'Upload Foto Evidence - L1-03 Hopper - Feed Throat / Saluran Material',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-338D12369F4D3',
                    'section_title' => 'L1-04 • Hopper - Filter',
                    'section_description' => 'C - Clean  Pastikan filter bersih dan tertutup, serta tidak terjadi kebocoran pada area supply (leher output).  Metode: Pemeriksaan Visual / Touch',
                    'section_order' => 4,
                    'questions' => [
                        [
                            'question_code' => 'QST-75A53FFCC85C2',
                            'question_text' => 'Apakah filter Hopper bersih dan tertutup, serta area supply (leher output) bebas kebocoran?',
                            'images' => ['question-images/L1-Point 4-Hopper Filter.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Pemeriksaan Visual / Touch',
                            'standard_text' => 'Pastikan filter bersih dan tertutup, serta tidak terjadi kebocoran pada area supply (leher output).',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-919AAC3348CA7', 'OPT-5AD155B4CB370'),
                        ],
                        [
                            'question_code' => 'QST-5EFC44986ED48',
                            'question_text' => 'Catatan / Notes - L1-04 Hopper - Filter',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Bersihkan sesuai prosedur aman. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-8B9452CA475BF',
                            'question_text' => 'Upload Foto Evidence - L1-04 Hopper - Filter',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-128C6D4F8D870',
                    'section_title' => 'L1-05 • Temperatur Oli Hydraulic',
                    'section_description' => 'L - Lubricant  Rentang temperatur oli hydraulic yang disetujui: 35–55 °C.  Metode: Pemeriksaan Instrumen (layar HMI)',
                    'section_order' => 5,
                    'questions' => [
                        [
                            'question_code' => 'QST-9E9F4131DA25F',
                            'question_text' => 'Berapa temperatur oli hydraulic yang terbaca pada HMI saat ini? (°C)',
                            'images' => [
                                'question-images/L1-Point 5-Temperature Oli Hydraulic.png',
                                'question-images/L1-Point 5-Temperature Oli Hydraulic(Monitor).png',
                            ],
                            'input_type' => 'TEXT',
                            'help_text' => 'Metode: Pemeriksaan Instrumen (layar HMI) Masukkan angka temperatur (°C).',
                            'standard_text' => 'Rentang temperatur oli hydraulic yang disetujui: 35–55 °C.',
                            'question_order' => 1,
                            'validation_rules' => $numberRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-87002BBC8025E',
                            'question_text' => 'Catatan / Notes - L1-05 Temperatur Oli Hydraulic',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Temperatur oli hydraulic di luar rentang 35–55 °C. Buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-298C7029329C6',
                            'question_text' => 'Upload Foto Evidence - L1-05 Temperatur Oli Hydraulic',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-079B165CD861D',
                    'section_title' => 'L1-06 • Level Oli Pelumas',
                    'section_description' => 'L - Lubricant  Level aman; tidak ada alarm level rendah/tinggi; warna oli natural (tidak hitam atau putih susu).  Metode: Pemeriksaan Visual',
                    'section_order' => 6,
                    'questions' => [
                        [
                            'question_code' => 'QST-847DB9193139F',
                            'question_text' => 'Bagaimana kondisi level oli pelumas?',
                            'images' => ['question-images/L1-Point 6-Tangki Oli Pelumas Toggle.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Pemeriksaan Visual',
                            'standard_text' => 'Level aman; tidak ada alarm level rendah/tinggi; warna oli natural (tidak hitam atau putih susu).',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => [
                                ['option_code' => 'OPT-22068EBE48845', 'option_text' => 'Aman', 'option_order' => 1, 'is_normal' => true],
                                ['option_code' => 'OPT-9796AF93EBB2A', 'option_text' => 'Kurang', 'option_order' => 2, 'is_normal' => false],
                                ['option_code' => 'OPT-D9DBB6BCF5546', 'option_text' => 'Lebih', 'option_order' => 3, 'is_normal' => false],
                            ],
                        ],
                        [
                            'question_code' => 'QST-60408A6FE7B22',
                            'question_text' => 'Catatan / Notes - L1-06 Level Oli Pelumas',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Level oli tidak aman. Buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-DF6C555127B6C',
                            'question_text' => 'Upload Foto Evidence - L1-06 Level Oli Pelumas',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-CAD227538FA59',
                    'section_title' => 'L1-07 • Selang Air',
                    'section_description' => 'I - Inspected  Selang berfungsi; clamping/sambungan rapat; tidak ada kebocoran air.  Metode: Pemeriksaan Visual / Touch',
                    'section_order' => 7,
                    'questions' => [
                        [
                            'question_code' => 'QST-BAD4078917C20',
                            'question_text' => 'Apakah selang air berfungsi, sambungan/clamping rapat, dan tidak ada kebocoran air?',
                            'images' => ['question-images/L1-Point 7-Selang Air.png'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Pemeriksaan Visual / Touch',
                            'standard_text' => 'Selang berfungsi; clamping/sambungan rapat; tidak ada kebocoran air.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-C14852FD5050E', 'OPT-FDE65146BBAA8'),
                        ],
                        [
                            'question_code' => 'QST-FA5FCFB8B3C6B',
                            'question_text' => 'Catatan / Notes - L1-07 Selang Air',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Kondisi selang air abnormal. Buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-0486FE41DE50A',
                            'question_text' => 'Upload Foto Evidence - L1-07 Selang Air',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-2318B898B232F',
                    'section_title' => 'L1-08 • Selang Angin',
                    'section_description' => 'I - Inspected  Selang berfungsi dan rapat; tidak ada kebocoran angin maupun suara desis udara.  Metode: Auditory Check / Dengarkan',
                    'section_order' => 8,
                    'questions' => [
                        [
                            'question_code' => 'QST-BC89AA9AAB270',
                            'question_text' => 'Apakah selang angin berfungsi, rapat, dan tidak ada kebocoran atau suara desis udara?',
                            'images' => ['question-images/L1-Point 8-Selang Angin.jpg'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Auditory Check / Dengarkan',
                            'standard_text' => 'Selang berfungsi dan rapat; tidak ada kebocoran angin maupun suara desis udara.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-D5A585E5224A3', 'OPT-244F6783DBF1F'),
                        ],
                        [
                            'question_code' => 'QST-622BF8728E52E',
                            'question_text' => 'Catatan / Notes - L1-08 Selang Angin',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Kondisi selang angin abnormal. Buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-1F8587A390046',
                            'question_text' => 'Upload Foto Evidence - L1-08 Selang Angin',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-3C993495F347F',
                    'section_title' => 'L1-09 • Tekanan Oli Clamping & Ejector',
                    'section_description' => 'I - Inspected  Tekanan oli Clamping & Ejector berfungsi dan berada dalam rentang standar yang berlaku pada mesin.  Metode: Visual Check (instrumen)',
                    'section_order' => 9,
                    'questions' => [
                        [
                            'question_code' => 'QST-A6FF992D9A76C',
                            'question_text' => 'Apakah pressure gauge berfungsi (pada saat mesin berjalan jarum pressure gauge bergerak) ?',
                            'images' => ['question-images/L1-Point 9-Tekanan oli clamping & ejector.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Visual Check (instrumen)',
                            'standard_text' => 'Tekanan oli Clamping & Ejector berfungsi dan berada dalam rentang standar yang berlaku pada mesin.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-D0CF7E4B67950', 'OPT-98B9F8E792377'),
                        ],
                        [
                            'question_code' => 'QST-8214BAC904FB1',
                            'question_text' => 'Catatan / Notes - L1-09 Tekanan Oli Clamping & Ejector',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Tekanan oli Clamping & Ejector abnormal. Buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-37553DD6FD7B5',
                            'question_text' => 'Upload Foto Evidence - L1-09 Tekanan Oli Clamping & Ejector',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-FD9C1B7ECB1E7',
                    'section_title' => 'L1-10 • Tekanan Oli Inject & Screw',
                    'section_description' => 'I - Inspected  Tekanan oli Inject & Screw berfungsi dan berada dalam rentang standar yang berlaku pada mesin.  Metode: Visual Check (instrumen)',
                    'section_order' => 10,
                    'questions' => [
                        [
                            'question_code' => 'QST-5D01912531CE1',
                            'question_text' => 'Apakah tekanan oli Inject & Screw berfungsi dan berada dalam rentang standar mesin ((pada saat mesin berjalan jarum pressure gauge bergerak)?',
                            'images' => ['question-images/L1-Point 10-Tekanan Oli Inject&Screw.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Visual Check (instrumen)',
                            'standard_text' => 'Tekanan oli Inject & Screw berfungsi dan berada dalam rentang standar yang berlaku pada mesin.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-22AE44C4D4CA8', 'OPT-FD7B79EE24A44'),
                        ],
                        [
                            'question_code' => 'QST-FF1E1102B72C9',
                            'question_text' => 'Catatan / Notes - L1-10 Tekanan Oli Inject & Screw',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Tekanan oli Inject & Screw abnormal. Buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-FA92E7B3CCAC8',
                            'question_text' => 'Upload Foto Evidence - L1-10 Tekanan Oli Inject & Screw',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-F69CDAC1167FF',
                    'section_title' => 'L1-11 • Baut Pengencang (Anchor)',
                    'section_description' => 'T - Tightened  Baut pengencang/anchor lengkap dan tidak tampak longgar. Tidak melakukan pengencangan selama mesin beroperasi.  Metode: Visual Check / Touch (sesuai SOP aman)',
                    'section_order' => 11,
                    'questions' => [
                        [
                            'question_code' => 'QST-413F06F328A86',
                            'question_text' => 'Apakah baut pengencang (anchor) lengkap dan tidak ada bagian yang tampak longgar?',
                            'images' => [
                                'question-images/L1-Point 11-Baut Pengencang(Anchor).png',
                                'question-images/L1-Point 11-Baut Pengencang.jpg',
                            ],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Visual Check / Touch (sesuai SOP aman)',
                            'standard_text' => 'Baut pengencang/anchor lengkap dan tidak tampak longgar. Tidak melakukan pengencangan selama mesin beroperasi.',
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-41453B0A0D9C3', 'OPT-06F4884B27D90'),
                        ],
                        [
                            'question_code' => 'QST-4601FF6C6FFFC',
                            'question_text' => 'Catatan / Notes - L1-11 Baut Pengencang (Anchor)',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Anchor abnormal. Jangan melakukan pengencangan saat mesin beroperasi; buat tiket/WO maintenance. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-866DB1361E368',
                            'question_text' => 'Upload Foto Evidence - L1-11 Baut Pengencang (Anchor)',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
                [
                    'section_code' => 'SEC-6C4B4BCE91661',
                    'section_title' => 'L1-12 • Front Safety Door',
                    'section_description' => "S - Safety  Saat Front Safety Door terbuka, mold tidak bergerak. Alarm 206 'Front Safety Gate Opened!' muncul.  Metode: Test Fungsi sesuai SOP Keselamatan",
                    'section_order' => 12,
                    'questions' => [
                        [
                            'question_code' => 'QST-9C5539D1BD054',
                            'question_text' => "Apakah Front Safety Door menghalangi gerakan mold saat terbuka dan memunculkan alarm 206 'Front Safety Gate Opened!'?",
                            'images' => ['question-images/L1-Point 12-Front Safety Door.JPG'],
                            'input_type' => 'SELECT',
                            'help_text' => 'Metode: Test Fungsi sesuai SOP Keselamatan',
                            'standard_text' => "Saat Front Safety Door terbuka, mold tidak bergerak. Alarm 206 'Front Safety Gate Opened!' muncul.",
                            'question_order' => 1,
                            'validation_rules' => $emptyRule,
                            'is_required' => true,
                            'options' => $okNgOptions('OPT-DEB47AE1559AB', 'OPT-BD5E1981D00F9'),
                        ],
                        [
                            'question_code' => 'QST-3762F8A5823E4',
                            'question_text' => 'Catatan / Notes - L1-12 Front Safety Door',
                            'images' => [],
                            'input_type' => 'TEXT',
                            'help_text' => 'Wajib diisi jika hasil pemeriksaan abnormal. Jika abnormal: Front Safety Door/interlock tidak aman. Hentikan operasi dan eskalasi L3 sesuai SOP. Jelaskan abnormality dan tindakan awal yang dilakukan.',
                            'standard_text' => null,
                            'question_order' => 2,
                            'validation_rules' => $emptyRule,
                            'is_required' => false,
                            'options' => [],
                        ],
                        [
                            'question_code' => 'QST-C127422BFEE8F',
                            'question_text' => 'Upload Foto Evidence - L1-12 Front Safety Door',
                            'images' => [],
                            'input_type' => 'FILE',
                            'help_text' => 'Wajib upload foto hasil pemeriksaan aktual. Ambil foto langsung dengan kamera.',
                            'standard_text' => null,
                            'question_order' => 3,
                            'validation_rules' => $fileRule,
                            'is_required' => true,
                            'options' => [],
                        ],
                    ],
                ],
            ];

            foreach ($sectionsData as $secData) {
                $section = FormSection::updateOrCreate(
                    ['section_code' => $secData['section_code'], 'form_id' => $form->id],
                    [
                        'section_title' => $secData['section_title'],
                        'section_description' => $secData['section_description'],
                        'section_order' => $secData['section_order'],
                    ]
                );

                foreach ($secData['questions'] as $qData) {
                    $questionImage = ! empty($qData['images'])
                        ? json_encode(array_values($qData['images']))
                        : null;

                    $question = FormQuestion::updateOrCreate(
                        ['question_code' => $qData['question_code'], 'form_id' => $form->id],
                        [
                            'form_section_id' => $section->id,
                            'question_text' => $qData['question_text'],
                            'question_image' => $questionImage,
                            'question_file' => null,
                            'question_date' => null,
                            'question_time' => null,
                            'input_type' => $qData['input_type'],
                            'help_text' => $qData['help_text'],
                            'standard_text' => $qData['standard_text'],
                            'question_order' => $qData['question_order'],
                            'validation_rules' => $qData['validation_rules'],
                            'is_required' => $qData['is_required'],
                        ]
                    );

                    foreach ($qData['options'] as $optData) {
                        FormOption::updateOrCreate(
                            ['option_code' => $optData['option_code'], 'form_question_id' => $question->id],
                            [
                                'option_text' => $optData['option_text'],
                                'option_order' => $optData['option_order'],
                                'is_normal' => $optData['is_normal'],
                                'goto_form_section_id' => null,
                            ]
                        );
                    }
                }
            }
        });

        $this->command?->info('Berhasil seed Form L1 Injection Molding (12 section, 36 pertanyaan, 23 opsi).');
    }
}
