<?php

namespace App\Support;

/**
 * Nilai foto evidence bisa berupa: path tunggal (data lama), JSON array string
 * (kiriman form baru), atau array. Semuanya dinormalisasi menjadi list path.
 */
class PhotoValue
{
    /**
     * @return array<int, string>
     */
    public static function list(mixed $value): array
    {
        if (is_string($value)) {
            $trimmed = trim($value);

            if ($trimmed !== '' && $trimmed[0] === '[') {
                $decoded = json_decode($trimmed, true);
                $value = is_array($decoded) ? $decoded : [$trimmed];
            } else {
                $value = [$trimmed];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map(fn ($p) => is_string($p) ? trim($p) : '', $value),
            fn ($p) => $p !== '',
        )));
    }
}
