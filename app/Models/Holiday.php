<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $fillable = [
        'holiday_date',
        'name',
    ];

    protected $casts = [
        'holiday_date' => 'date',
    ];

    /**
     * Set tanggal libur (format Y-m-d) dalam rentang tertentu untuk pengecekan cepat.
     *
     * @return array<string, string> [Y-m-d => nama libur]
     */
    public static function mapBetween(\DateTimeInterface $from, \DateTimeInterface $to): array
    {
        return static::whereBetween('holiday_date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->get()
            ->mapWithKeys(fn (Holiday $h) => [$h->holiday_date->format('Y-m-d') => $h->name])
            ->all();
    }
}
