<?php

namespace App\Support;

use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Template Excel form builder: download template kosong + petunjuk, dan baca file terisi
 * menjadi struktur yang sama dengan state builder (resources/js/pages/forms/create.tsx).
 *
 * Sheet yang dibaca saat import: "Info Form" dan "Pertanyaan". Sheet "Petunjuk" tidak pernah dibaca.
 * Murni PHP (tanpa Laravel) supaya bisa dicek dengan skrip biasa.
 */
class FormExcelTemplate
{
    public const SHEET_INFO = 'Info Form';
    public const SHEET_QUESTIONS = 'Pertanyaan';
    public const SHEET_GUIDE = 'Petunjuk';

    /** Kolom sheet Pertanyaan (urutan = kolom A, B, C, ...). */
    public const COLUMNS = [
        'No', 'Bagian', 'Deskripsi Bagian', 'Pertanyaan', 'Tipe', 'Wajib',
        'Opsi Jawaban', 'Opsi Abnormal (NG)', 'Standar', 'Keterangan',
        'Muncul Jika No', 'Jika Jawaban', 'Tipe File',
    ];

    /** Label di template → input_type sistem (kunci sudah dinormalisasi: huruf besar tanpa spasi). */
    private const TYPES = [
        'TEKSSINGKAT' => 'TEXT', 'TEKS' => 'TEXT', 'TEXT' => 'TEXT',
        'PARAGRAF' => 'TEXTAREA', 'TEKSPANJANG' => 'TEXTAREA', 'TEXTAREA' => 'TEXTAREA',
        'PILIHANGANDA' => 'SELECT', 'SELECT' => 'SELECT',
        'DROPDOWN' => 'DROPDOWN',
        'CHECKBOX' => 'CHECKBOX', 'KOTAKCENTANG' => 'CHECKBOX',
        'UPLOADFOTO' => 'FILE', 'UPLOADFILE' => 'FILE', 'FOTO' => 'FILE', 'FILE' => 'FILE',
        'TANGGAL' => 'DATE', 'DATE' => 'DATE',
        'WAKTU' => 'TIME', 'JAM' => 'TIME', 'TIME' => 'TIME',
    ];

    private const CHOICE_TYPES = ['SELECT', 'DROPDOWN', 'CHECKBOX'];
    private const FILE_TYPES = ['jpg', 'jpeg', 'png', 'webp'];
    private const FORM_TYPES = ['INSPECTION', 'MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET'];

    // =========================================================================
    // TEMPLATE
    // =========================================================================

    public static function writeTemplate(): string
    {
        $example = [
            [1, 'Pemeriksaan Oli', 'Cek sebelum mesin jalan', 'Kondisi level oli', 'Pilihan Ganda', 'Ya', 'OK; Kurang; Bocor', 'Kurang; Bocor', 'Level di antara garis MIN-MAX', '', '', '', ''],
            [2, '', '', 'Lokasi kebocoran', 'Teks Singkat', 'Ya', '', '', '', 'Sebutkan bagian yang bocor', 1, 'Bocor', ''],
            [3, '', '', 'Foto kebocoran', 'Upload Foto', 'Ya', '', '', '', '', 1, 'Bocor', 'jpg; png'],
            [4, 'Kelistrikan', '', 'Panel listrik bersih?', 'Pilihan Ganda', 'Tidak', 'Ya; Tidak', 'Tidak', '', '', '', '', ''],
            [5, '', '', 'Tanggal pembersihan terakhir', 'Tanggal', 'Tidak', '', '', '', '', 4, 'Tidak', ''],
        ];

        $guide = [
            ['CARA PAKAI', ''],
            ['1', 'Isi judul & tipe form di sheet "Info Form".'],
            ['2', 'Isi pertanyaan di sheet "Pertanyaan", satu baris = satu pertanyaan, mulai baris 2. Jangan ubah judul kolom.'],
            ['3', 'Di aplikasi: Manajemen Formulir → Buat Form → Import Excel. Periksa hasilnya di builder, lalu klik Simpan.'],
            ['4', 'Sheet "Petunjuk" ini TIDAK ikut diimport. Boleh dibiarkan.'],
            ['', ''],
            ['KOLOM', 'CARA ISI'],
            ['No', 'Nomor urut pertanyaan (1, 2, 3, ...). Dipakai oleh kolom "Muncul Jika No".'],
            ['Bagian', 'Judul bagian/section. Isi di baris pertama tiap bagian; baris kosong di bawahnya ikut bagian yang sama.'],
            ['Deskripsi Bagian', 'Opsional. Diisi sekali di baris yang sama dengan judul bagian.'],
            ['Pertanyaan', 'WAJIB. Teks pertanyaan.'],
            ['Tipe', 'WAJIB. Salah satu: Teks Singkat, Paragraf, Pilihan Ganda, Dropdown, Checkbox, Upload Foto, Tanggal, Waktu.'],
            ['Wajib', 'Ya / Tidak (kosong = Tidak).'],
            ['Opsi Jawaban', 'Khusus Pilihan Ganda / Dropdown / Checkbox. Pisahkan dengan titik koma ( ; ). Contoh: OK; Kurang; Bocor'],
            ['Opsi Abnormal (NG)', 'Opsi yang dianggap temuan/NG (memicu tiket breakdown pada form inspeksi). Harus sama persis dengan teks di Opsi Jawaban. Pisahkan dengan ;'],
            ['Standar', 'Opsional. Standar/acuan pemeriksaan (tampil di form inspeksi).'],
            ['Keterangan', 'Opsional. Petunjuk singkat untuk operator di bawah pertanyaan.'],
            ['Muncul Jika No', 'Opsional (dependensi). Nomor pertanyaan pemicu. Pemicu harus bertipe pilihan, berada di ATAS dan di BAGIAN YANG SAMA.'],
            ['Jika Jawaban', 'Opsi pemicu yang memunculkan pertanyaan ini, pisahkan dengan ;. Kosong = muncul jika pemicu dijawab opsi NG.'],
            ['Tipe File', 'Khusus Upload Foto: jpg; jpeg; png; webp (kosong = semua).'],
            ['', ''],
            ['TIPE FORM', 'Isi di sheet "Info Form"'],
            ['INSPECTION', 'Form inspeksi rutin (punya opsi Normal/NG).'],
            ['MANUAL_REPORT', 'Form laporan breakdown manual.'],
            ['START_REPAIR', 'Form mulai repair (tiket).'],
            ['CLOSE_TICKET', 'Form tutup tiket.'],
            ['', ''],
            ['CONTOH', 'Lihat sheet "Contoh (tidak diimport)". Salin barisnya ke sheet Pertanyaan bila mau dipakai.'],
        ];

        // Contoh di sheet terpisah: hanya "Info Form" & "Pertanyaan" yang dibaca saat import
        return (new SimpleXlsxWriter())
            ->addSheet(self::SHEET_INFO, ['Isian', 'Nilai'], [
                ['Judul Form', ''],
                ['Deskripsi', ''],
                ['Tipe Form', 'INSPECTION'],
            ])
            ->addSheet(self::SHEET_QUESTIONS, self::COLUMNS, [])
            ->addSheet(self::SHEET_GUIDE, ['Petunjuk', 'Keterangan'], $guide)
            ->addSheet('Contoh (tidak diimport)', self::COLUMNS, $example)
            ->writeToTempFile();
    }

    // =========================================================================
    // IMPORT
    // =========================================================================

    /**
     * @return array{metadata: array<string, mixed>, sections: array<int, array<string, mixed>>, errors: array<int, string>}
     */
    public static function parse(string $path): array
    {
        $sheets = self::readWorkbook($path);
        $errors = [];

        if (! isset($sheets[self::SHEET_QUESTIONS])) {
            return ['metadata' => [], 'sections' => [], 'errors' => ['Sheet "'.self::SHEET_QUESTIONS.'" tidak ditemukan. Gunakan template dari tombol Download Template.']];
        }

        // --- Info Form (key/value) ---
        $info = [];
        foreach (array_slice($sheets[self::SHEET_INFO] ?? [], 1) as $row) {
            $info[self::key($row[0] ?? '')] = trim((string) ($row[1] ?? ''));
        }
        $formType = strtoupper(str_replace(' ', '_', $info['TIPEFORM'] ?? '')) ?: 'INSPECTION';
        if (! in_array($formType, self::FORM_TYPES, true)) {
            $errors[] = "Info Form: Tipe Form \"{$formType}\" tidak dikenal. Pilih salah satu: ".implode(', ', self::FORM_TYPES).'.';
            $formType = 'INSPECTION';
        }
        $isTicketing = $formType !== 'INSPECTION';

        // --- Pertanyaan ---
        $rows = $sheets[self::SHEET_QUESTIONS];
        $header = array_map(fn ($h) => self::key($h), $rows[0] ?? []);
        $col = [];
        foreach (self::COLUMNS as $name) {
            $idx = array_search(self::key($name), $header, true);
            $col[$name] = $idx === false ? null : $idx;
        }
        foreach (['Pertanyaan', 'Tipe'] as $required) {
            if ($col[$required] === null) {
                $errors[] = "Sheet Pertanyaan: kolom \"{$required}\" tidak ditemukan. Jangan ubah judul kolom template.";
            }
        }
        if ($errors && $col['Pertanyaan'] === null) {
            return ['metadata' => [], 'sections' => [], 'errors' => $errors];
        }

        $get = fn (array $row, string $name) => $col[$name] === null ? '' : trim((string) ($row[$col[$name]] ?? ''));

        $sections = [];
        $byNo = []; // No → [sIndex, qIndex]

        foreach (array_slice($rows, 1, null, true) as $i => $row) {
            $line = $i + 1; // nomor baris di Excel
            $text = $get($row, 'Pertanyaan');
            $typeRaw = $get($row, 'Tipe');
            $sectionTitle = $get($row, 'Bagian');

            if ($text === '' && $typeRaw === '' && $sectionTitle === '') {
                continue; // baris kosong
            }
            if ($text === '') {
                $errors[] = "Baris {$line}: kolom Pertanyaan kosong.";
                continue;
            }

            $type = self::TYPES[self::key($typeRaw)] ?? null;
            if ($type === null) {
                $errors[] = "Baris {$line}: Tipe \"{$typeRaw}\" tidak dikenal (lihat sheet Petunjuk).";
                continue;
            }

            if ($sectionTitle !== '' || $sections === []) {
                $sections[] = [
                    'section_title' => $sectionTitle !== '' ? $sectionTitle : ($isTicketing ? 'Detail' : 'Bagian 1'),
                    'section_description' => $get($row, 'Deskripsi Bagian'),
                    'section_order' => count($sections) + 1,
                    'questions' => [],
                ];
            }
            $sIndex = count($sections) - 1;
            $qIndex = count($sections[$sIndex]['questions']);

            $options = [];
            if (in_array($type, self::CHOICE_TYPES, true)) {
                $texts = self::splitList($get($row, 'Opsi Jawaban'));
                $ng = array_map([self::class, 'key'], self::splitList($get($row, 'Opsi Abnormal (NG)')));
                if ($texts === []) {
                    $errors[] = "Baris {$line}: tipe {$typeRaw} wajib punya Opsi Jawaban (pisahkan dengan ;).";
                }
                foreach ($ng as $n) {
                    if (! in_array($n, array_map([self::class, 'key'], $texts), true)) {
                        $errors[] = "Baris {$line}: opsi NG \"{$n}\" tidak ada di Opsi Jawaban.";
                    }
                }
                foreach ($texts as $oi => $t) {
                    $options[] = [
                        'option_text' => $t,
                        'is_normal' => $isTicketing || ! in_array(self::key($t), $ng, true),
                        'option_order' => $oi + 1,
                        'goto_form_section_id' => null,
                    ];
                }
            }

            $rule = ['validation_error_message' => '', 'expected_answer' => '', 'allowed_file_type' => [], 'max_file_size' => ''];
            if ($type === 'FILE') {
                $fileTypes = array_map('strtolower', self::splitList($get($row, 'Tipe File')));
                $bad = array_diff($fileTypes, self::FILE_TYPES);
                if ($bad) {
                    $errors[] = "Baris {$line}: Tipe File \"".implode(', ', $bad).'" tidak didukung (jpg, jpeg, png, webp).';
                }
                $rule['allowed_file_type'] = array_values(array_intersect($fileTypes, self::FILE_TYPES)) ?: self::FILE_TYPES;
            }

            // Dependensi: "Muncul Jika No" → trigger_question_code "order:N" (posisi di section)
            $depNo = $get($row, 'Muncul Jika No');
            if ($depNo !== '') {
                $dep = $byNo[self::key($depNo)] ?? null;
                $trigger = $dep ? $sections[$dep[0]]['questions'][$dep[1]] : null;
                if (! $dep) {
                    $errors[] = "Baris {$line}: Muncul Jika No \"{$depNo}\" tidak ditemukan di baris sebelumnya.";
                } elseif ($dep[0] !== $sIndex) {
                    $errors[] = "Baris {$line}: pertanyaan pemicu No {$depNo} harus berada di bagian yang sama.";
                } elseif (! in_array($trigger['input_type'], self::CHOICE_TYPES, true)) {
                    $errors[] = "Baris {$line}: pemicu No {$depNo} harus bertipe pilihan (Pilihan Ganda / Dropdown / Checkbox).";
                } else {
                    $want = self::splitList($get($row, 'Jika Jawaban'));
                    $known = array_map(fn ($o) => self::key($o['option_text']), $trigger['options']);
                    foreach ($want as $w) {
                        if (! in_array(self::key($w), $known, true)) {
                            $errors[] = "Baris {$line}: Jika Jawaban \"{$w}\" bukan opsi dari pertanyaan No {$depNo}.";
                        }
                    }
                    $rule['show_on_abnormal'] = true;
                    $rule['trigger_question_code'] = 'order:'.($dep[1] + 1);
                    $rule['trigger_option_texts'] = $want;
                }
            }

            $sections[$sIndex]['questions'][] = [
                'question_order' => $qIndex + 1,
                'question_text' => $text,
                'question_image' => null,
                'question_image_url' => '',
                'input_type' => $type,
                'help_text' => $get($row, 'Keterangan'),
                'standard_text' => $isTicketing ? '' : $get($row, 'Standar'),
                'is_required' => in_array(self::key($get($row, 'Wajib')), ['YA', 'Y', 'YES', 'WAJIB', '1', 'TRUE'], true),
                'validation_rules' => [$rule],
                'options' => $options,
            ];

            $no = $get($row, 'No');
            if ($no !== '') {
                if (isset($byNo[self::key($no)])) {
                    $errors[] = "Baris {$line}: No \"{$no}\" dipakai lebih dari sekali.";
                }
                $byNo[self::key($no)] = [$sIndex, $qIndex];
            }
        }

        if ($sections === [] && $errors === []) {
            $errors[] = 'Sheet Pertanyaan belum berisi pertanyaan.';
        }

        return [
            'metadata' => [
                'form_type' => $formType,
                'form_title' => ($info['JUDULFORM'] ?? '') !== '' ? $info['JUDULFORM'] : 'Formulir Hasil Import',
                'form_description' => $info['DESKRIPSI'] ?? '',
            ],
            'sections' => $sections,
            'errors' => $errors,
        ];
    }

    /** Huruf besar tanpa spasi — perbandingan longgar untuk label buatan manusia. */
    private static function key(mixed $v): string
    {
        return strtoupper(preg_replace('/\s+/u', '', trim((string) $v)));
    }

    /** "a; b ;c" → ['a','b','c'] (juga menerima baris baru sebagai pemisah). */
    private static function splitList(string $v): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/[;\n]/', $v)), fn ($s) => $s !== ''));
    }

    /**
     * Pembaca XLSX minimal: nama sheet → baris → sel (string). Mendukung shared string,
     * inline string, angka, dan sel kosong di tengah baris.
     *
     * @return array<string, array<int, array<int, string>>>
     */
    private static function readWorkbook(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('File bukan Excel (.xlsx) yang valid.');
        }

        $xml = function (string $name) use ($zip): ?SimpleXMLElement {
            $raw = $zip->getFromName($name);
            return $raw === false ? null : simplexml_load_string($raw, SimpleXMLElement::class, LIBXML_NONET);
        };

        $workbook = $xml('xl/workbook.xml');
        $rels = $xml('xl/_rels/workbook.xml.rels');
        if (! $workbook || ! $rels) {
            $zip->close();
            throw new RuntimeException('File bukan Excel (.xlsx) yang valid.');
        }

        $shared = [];
        if ($ss = $xml('xl/sharedStrings.xml')) {
            foreach ($ss->si as $si) {
                // Rich text: gabungkan semua potongan <r><t>
                $shared[] = isset($si->t) ? (string) $si->t : implode('', array_map('strval', $si->xpath('.//*[local-name()="t"]')));
            }
        }

        $targets = [];
        foreach ($rels->Relationship as $rel) {
            $targets[(string) $rel['Id']] = ltrim(str_replace('/xl/', '', (string) $rel['Target']), '/');
        }

        $result = [];
        foreach ($workbook->sheets->sheet as $sheet) {
            $rid = (string) $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
            $data = isset($targets[$rid]) ? $xml('xl/'.$targets[$rid]) : null;
            if (! $data) {
                continue;
            }

            $rows = [];
            foreach ($data->sheetData->row as $row) {
                $cells = [];
                foreach ($row->c as $c) {
                    $colIdx = self::colIndex(preg_replace('/\d+/', '', (string) $c['r']));
                    $t = (string) $c['t'];
                    $cells[$colIdx] = match ($t) {
                        's' => $shared[(int) $c->v] ?? '',
                        'inlineStr' => isset($c->is->t) ? (string) $c->is->t : implode('', array_map('strval', $c->is->xpath('.//*[local-name()="t"]'))),
                        default => (string) $c->v,
                    };
                }
                if ($cells) {
                    $max = max(array_keys($cells));
                    $rows[(int) $row['r'] - 1] = array_replace(array_fill(0, $max + 1, ''), $cells);
                }
            }
            ksort($rows);
            $result[(string) $sheet['name']] = $rows;
        }

        $zip->close();

        return $result;
    }

    private static function colIndex(string $letters): int
    {
        $n = 0;
        foreach (str_split(strtoupper($letters)) as $ch) {
            $n = $n * 26 + (ord($ch) - 64);
        }

        return $n - 1;
    }
}
