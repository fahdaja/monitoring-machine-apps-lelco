<?php

namespace App\Enums;

/**
 * Aturan pembanding jawaban pada kondisi trigger.
 *
 * Dulu kondisi hanya bisa "jawaban == opsi X", sehingga hanya pertanyaan
 * SELECT/CHECKBOX/DROPDOWN yang bisa dijadikan pemicu. Enum ini membuat
 * seluruh tipe pertanyaan bisa dijadikan pemicu: tiap tipe punya operator
 * yang masuk akal (teks dibandingkan, angka dibandingkan, tanggal diurutkan,
 * file cukup dicek terisi/kosong).
 */
enum ConditionOperator: string
{
    case OPTION_SELECTED = 'option_selected';
    case EQUALS = 'equals';
    case NOT_EQUALS = 'not_equals';
    case CONTAINS = 'contains';
    case GREATER_THAN = 'greater_than';
    case GREATER_OR_EQUAL = 'greater_or_equal';
    case LESS_THAN = 'less_than';
    case LESS_OR_EQUAL = 'less_or_equal';
    case ON = 'on';
    case BEFORE = 'before';
    case AFTER = 'after';
    case IS_FILLED = 'filled';
    case IS_EMPTY = 'empty';

    public function label(): string
    {
        return match ($this) {
            self::OPTION_SELECTED => 'Memilih opsi tertentu',
            self::EQUALS => 'Sama dengan',
            self::NOT_EQUALS => 'Tidak sama dengan',
            self::CONTAINS => 'Mengandung kata',
            self::GREATER_THAN => 'Lebih dari (angka)',
            self::GREATER_OR_EQUAL => 'Minimal (angka)',
            self::LESS_THAN => 'Kurang dari (angka)',
            self::LESS_OR_EQUAL => 'Maksimal (angka)',
            self::ON => 'Tepat pada',
            self::BEFORE => 'Sebelum',
            self::AFTER => 'Sesudah',
            self::IS_FILLED => 'Dijawab (terisi)',
            self::IS_EMPTY => 'Tidak dijawab (kosong)',
        };
    }

    /**
     * Operator yang boleh dipakai untuk satu tipe pertanyaan.
     * Urutan array = urutan tampil di dropdown operator.
     *
     * @return array<int, self>
     */
    public static function forInputType(InputType|string $type): array
    {
        return match (self::normalizeType($type)) {
            InputType::SELECT, InputType::CHECKBOX, InputType::DROPDOWN => [
                self::OPTION_SELECTED,
                self::IS_FILLED,
                self::IS_EMPTY,
            ],
            InputType::TEXT, InputType::TEXTAREA => [
                self::EQUALS,
                self::NOT_EQUALS,
                self::CONTAINS,
                self::GREATER_THAN,
                self::GREATER_OR_EQUAL,
                self::LESS_THAN,
                self::LESS_OR_EQUAL,
                self::IS_FILLED,
                self::IS_EMPTY,
            ],
            InputType::DATE, InputType::TIME => [
                self::ON,
                self::BEFORE,
                self::AFTER,
                self::IS_FILLED,
                self::IS_EMPTY,
            ],
            // FILE & tipe tak dikenal: hanya bisa dicek ada/tidak lampirannya.
            default => [
                self::IS_FILLED,
                self::IS_EMPTY,
            ],
        };
    }

    /**
     * True bila aturan ini disimpan lewat ID opsi (bukan teks pembanding).
     */
    public function needsOption(): bool
    {
        return $this === self::OPTION_SELECTED;
    }

    /**
     * True bila aturan ini butuh nilai pembanding yang diketik user.
     */
    public function needsValue(): bool
    {
        return ! in_array($this, [self::OPTION_SELECTED, self::IS_FILLED, self::IS_EMPTY], true);
    }

    /**
     * Jenis input nilai yang harus ditampilkan di form kondisi.
     * 'option' = dropdown opsi, 'none' = tidak butuh nilai sama sekali.
     */
    public function valueKind(InputType|string $type): string
    {
        if ($this === self::OPTION_SELECTED) {
            return 'option';
        }

        if (! $this->needsValue()) {
            return 'none';
        }

        if (in_array($this, [self::GREATER_THAN, self::GREATER_OR_EQUAL, self::LESS_THAN, self::LESS_OR_EQUAL], true)) {
            return 'number';
        }

        if (in_array($this, [self::ON, self::BEFORE, self::AFTER], true)) {
            return self::normalizeType($type) === InputType::TIME ? 'time' : 'date';
        }

        return 'text';
    }

    /**
     * Potongan kalimat penjelasan untuk operator ini, dipakai di kartu kondisi
     * dan di banner "kenapa task ini ada" pada halaman task.
     */
    public function describe(?string $display): string
    {
        $value = trim((string) $display);

        return match ($this) {
            self::OPTION_SELECTED => 'memilih opsi "' . ($value !== '' ? $value : '?') . '"',
            self::EQUALS => 'jawabannya sama dengan "' . $value . '"',
            self::NOT_EQUALS => 'jawabannya bukan "' . $value . '"',
            self::CONTAINS => 'jawabannya mengandung "' . $value . '"',
            self::GREATER_THAN => 'jawabannya lebih dari ' . $value,
            self::GREATER_OR_EQUAL => 'jawabannya minimal ' . $value,
            self::LESS_THAN => 'jawabannya kurang dari ' . $value,
            self::LESS_OR_EQUAL => 'jawabannya maksimal ' . $value,
            self::ON => 'jawabannya tepat pada ' . $value,
            self::BEFORE => 'jawabannya sebelum ' . $value,
            self::AFTER => 'jawabannya sesudah ' . $value,
            self::IS_FILLED => 'dijawab (terisi apa pun)',
            self::IS_EMPTY => 'tidak dijawab / kosong',
        };
    }

    /**
     * InputType bisa datang sebagai string dari snapshot/HTTP; dinormalisasi di sini.
     */
    private static function normalizeType(InputType|string $type): InputType
    {
        if ($type instanceof InputType) {
            return $type;
        }

        return InputType::tryFrom(strtoupper(trim($type))) ?? InputType::TEXT;
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
