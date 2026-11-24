<?php

declare(strict_types=1);

namespace App\Support;

use RuntimeException;
use ZipArchive;

/**
 * Generator file Excel (.xlsx / OOXML) multi-sheet ringan tanpa dependensi eksternal.
 * Menggunakan ZipArchive bawaan PHP (ext-zip).
 */
class SimpleXlsxWriter
{
    /**
     * @var array<int, array{name: string, headers: array<int, string>, rows: array<int, array<int, mixed>>}>
     */
    private array $sheets = [];

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     */
    public function addSheet(string $name, array $headers, array $rows): self
    {
        // Nama sheet Excel maksimal 31 karakter dan tidak boleh mengandung : \ / ? * [ ]
        $cleanName = preg_replace('/[:\\\\\/?*\[\]]/', ' ', $name) ?: 'Sheet';
        $cleanName = mb_substr(trim($cleanName), 0, 31);

        $this->sheets[] = [
            'name' => $cleanName,
            'headers' => array_values($headers),
            'rows' => array_values($rows),
        ];

        return $this;
    }

    /**
     * Tulis workbook ke file sementara dan kembalikan path absolutnya.
     */
    public function writeToTempFile(): string
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Ekstensi PHP zip (ZipArchive) tidak tersedia.');
        }

        $tmpPath = tempnam(sys_get_temp_dir(), 'lelco_xlsx_');
        if ($tmpPath === false) {
            throw new RuntimeException('Gagal membuat file sementara untuk export Excel.');
        }

        $zip = new ZipArchive();
        if ($zip->open($tmpPath, ZipArchive::OVERWRITE) !== true) {
            @unlink($tmpPath);
            throw new RuntimeException('Gagal membuka arsip XLSX.');
        }

        $zip->addFromString('[Content_Types].xml', $this->buildContentTypesXml());
        $zip->addFromString('_rels/.rels', $this->buildRootRelsXml());
        $zip->addFromString('xl/workbook.xml', $this->buildWorkbookXml());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->buildWorkbookRelsXml());
        $zip->addFromString('xl/styles.xml', $this->buildStylesXml());

        foreach ($this->sheets as $index => $sheet) {
            $sheetNum = $index + 1;
            $zip->addFromString(
                "xl/worksheets/sheet{$sheetNum}.xml",
                $this->buildWorksheetXml($sheet['headers'], $sheet['rows'])
            );
        }

        $zip->close();

        return $tmpPath;
    }

    private function buildContentTypesXml(): string
    {
        $overrides = '';
        foreach ($this->sheets as $index => $_) {
            $num = $index + 1;
            $overrides .= '<Override PartName="/xl/worksheets/sheet' . $num . '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . $overrides
            . '</Types>';
    }

    private function buildRootRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function buildWorkbookXml(): string
    {
        $sheetsXml = '';
        foreach ($this->sheets as $index => $sheet) {
            $num = $index + 1;
            $name = $this->escapeXml($sheet['name']);
            $sheetsXml .= '<sheet name="' . $name . '" sheetId="' . $num . '" r:id="rId' . $num . '"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            . 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets>' . $sheetsXml . '</sheets>'
            . '</workbook>';
    }

    private function buildWorkbookRelsXml(): string
    {
        $rels = '';
        foreach ($this->sheets as $index => $_) {
            $num = $index + 1;
            $rels .= '<Relationship Id="rId' . $num . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' . $num . '.xml"/>';
        }
        $styleRid = count($this->sheets) + 1;
        $rels .= '<Relationship Id="rId' . $styleRid . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . $rels
            . '</Relationships>';
    }

    /**
     * Style 0 = default, Style 1 = header bold putih di atas background slate gelap (#0F172A).
     */
    private function buildStylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2">'
            . '<font><sz val="10"/><name val="Calibri"/></font>'
            . '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
            . '</fonts>'
            . '<fills count="3">'
            . '<fill><patternFill patternType="none"/></fill>'
            . '<fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>'
            . '</fills>'
            . '<borders count="2">'
            . '<border><left/><right/><top/><bottom/><diagonal/></border>'
            . '<border>'
            . '<left style="thin"><color rgb="FFE2E8F0"/></left>'
            . '<right style="thin"><color rgb="FFE2E8F0"/></right>'
            . '<top style="thin"><color rgb="FFE2E8F0"/></top>'
            . '<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>'
            . '<diagonal/>'
            . '</border>'
            . '</borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="2">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
            . '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
            . '</cellXfs>'
            . '</styleSheet>';
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function buildWorksheetXml(array $headers, array $rows): string
    {
        $colWidths = [];
        foreach ($headers as $cIdx => $h) {
            $colWidths[$cIdx] = max(12, min(42, mb_strlen($h) + 5));
        }

        $sheetData = '<row r="1" ht="24" customHeight="1">';
        foreach ($headers as $cIdx => $h) {
            $ref = $this->colLetter($cIdx) . '1';
            $sheetData .= '<c r="' . $ref . '" t="inlineStr" s="1"><is><t>' . $this->escapeXml($h) . '</t></is></c>';
        }
        $sheetData .= '</row>';

        foreach ($rows as $rIdx => $row) {
            $rowNum = $rIdx + 2;
            $sheetData .= '<row r="' . $rowNum . '">';
            foreach ($headers as $cIdx => $_) {
                $val = $row[$cIdx] ?? '';
                $ref = $this->colLetter($cIdx) . $rowNum;

                if (is_int($val) || is_float($val)) {
                    $strLen = strlen((string) $val) + 3;
                    $colWidths[$cIdx] = max($colWidths[$cIdx], min(42, $strLen));
                    $sheetData .= '<c r="' . $ref . '" s="0"><v>' . $val . '</v></c>';
                } else {
                    $text = (string) $val;
                    $colWidths[$cIdx] = max($colWidths[$cIdx], min(45, mb_strlen($text) + 4));
                    $sheetData .= '<c r="' . $ref . '" t="inlineStr" s="0"><is><t xml:space="preserve">' . $this->escapeXml($text) . '</t></is></c>';
                }
            }
            $sheetData .= '</row>';
        }

        $colsXml = '<cols>';
        foreach ($colWidths as $cIdx => $width) {
            $colNum = $cIdx + 1;
            $colsXml .= '<col min="' . $colNum . '" max="' . $colNum . '" width="' . $width . '" customWidth="1"/>';
        }
        $colsXml .= '</cols>';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            . $colsXml
            . '<sheetData>' . $sheetData . '</sheetData>'
            . '</worksheet>';
    }

    private function colLetter(int $index): string
    {
        $letter = '';
        $n = $index + 1;
        while ($n > 0) {
            $mod = ($n - 1) % 26;
            $letter = chr(65 + $mod) . $letter;
            $n = intdiv($n - 1, 26);
        }

        return $letter;
    }

    private function escapeXml(string $value): string
    {
        // Hapus karakter kontrol ilegal XML 1.0
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';

        return htmlspecialchars($clean, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
