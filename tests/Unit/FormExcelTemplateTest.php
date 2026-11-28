<?php

namespace Tests\Unit;

use App\Support\FormExcelTemplate;
use App\Support\SimpleXlsxWriter;
use PHPUnit\Framework\TestCase;

class FormExcelTemplateTest extends TestCase
{
    private function workbook(array $questionRows, string $type = 'INSPECTION'): string
    {
        return (new SimpleXlsxWriter())
            ->addSheet('Info Form', ['Isian', 'Nilai'], [['Judul Form', 'Cek Harian'], ['Deskripsi', ''], ['Tipe Form', $type]])
            ->addSheet('Pertanyaan', FormExcelTemplate::COLUMNS, $questionRows)
            ->addSheet('Petunjuk', ['Petunjuk', 'Keterangan'], [['Pertanyaan', 'jangan diimport']])
            ->writeToTempFile();
    }

    public function test_template_roundtrip_builds_sections_types_and_dependency(): void
    {
        $path = $this->workbook([
            [1, 'Oli', '', 'Level oli', 'Pilihan Ganda', 'Ya', 'OK; Kurang; Bocor', 'Kurang; Bocor', 'MIN-MAX', '', '', '', ''],
            [2, '', '', 'Lokasi bocor', 'Teks Singkat', 'Ya', '', '', '', '', 1, 'Bocor', ''],
            [3, 'Listrik', '', 'Foto panel', 'Upload Foto', 'Tidak', '', '', '', '', '', '', 'jpg; png'],
        ]);

        $r = FormExcelTemplate::parse($path);
        @unlink($path);

        $this->assertSame([], $r['errors']);
        $this->assertSame('Cek Harian', $r['metadata']['form_title']);
        $this->assertCount(2, $r['sections']);

        [$q1, $q2] = $r['sections'][0]['questions'];
        $this->assertSame('SELECT', $q1['input_type']);
        $this->assertTrue($q1['is_required']);
        $this->assertSame([true, false, false], array_column($q1['options'], 'is_normal'));
        $this->assertSame('order:1', $q2['validation_rules'][0]['trigger_question_code']);
        $this->assertSame(['Bocor'], $q2['validation_rules'][0]['trigger_option_texts']);
        $this->assertSame(['jpg', 'png'], $r['sections'][1]['questions'][0]['validation_rules'][0]['allowed_file_type']);
    }

    public function test_invalid_rows_are_reported_with_row_numbers(): void
    {
        $path = $this->workbook([
            [1, 'A', '', 'Q1', 'Tipe Ngawur', '', '', '', '', '', '', '', ''],
            [2, '', '', 'Q2', 'Teks Singkat', '', '', '', '', '', 9, '', ''],
        ]);

        $errors = FormExcelTemplate::parse($path)['errors'];
        @unlink($path);

        $this->assertStringContainsString('Baris 2', $errors[0]);
        $this->assertStringContainsString('Baris 3', $errors[1]);
    }

    public function test_template_download_parses_without_importing_guide_or_examples(): void
    {
        $path = FormExcelTemplate::writeTemplate();
        $r = FormExcelTemplate::parse($path);
        @unlink($path);

        $this->assertSame([], $r['sections']);
        $this->assertSame(['Sheet Pertanyaan belum berisi pertanyaan.'], $r['errors']);
    }
}
