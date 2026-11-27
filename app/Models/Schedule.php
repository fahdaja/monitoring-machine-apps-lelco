<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_code',
        'form_id',
        'frequency_type',
        'selected_days',
        'selected_dates',
        'working_days',
        'skip_holidays',
        'due_window_days',
        'is_active',
    ];

    protected $casts = [
        'selected_days' => 'array',
        'selected_dates' => 'array',
        'working_days' => 'array',
        'skip_holidays' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Apakah tanggal ini hari kerja menurut kalender kerja jadwal?
     * - working_days hanya berlaku untuk DAILY (WEEKLY sudah memilih harinya sendiri).
     * - skip_holidays berlaku untuk semua frekuensi.
     *
     * @param  array<string, string>  $holidayMap  [Y-m-d => nama libur]
     */
    public function isWorkingDate(\Carbon\Carbon $date, array $holidayMap = []): bool
    {
        if ($this->frequency_type === 'DAILY' && ! empty($this->working_days)) {
            $days = array_map('intval', (array) $this->working_days);
            if (! in_array((int) $date->dayOfWeekIso, $days, true)) {
                return false;
            }
        }

        if ($this->skip_holidays && isset($holidayMap[$date->format('Y-m-d')])) {
            return false;
        }

        return true;
    }

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class, 'form_id');
    }

    public function scheduleMachines(): HasMany
    {
        return $this->hasMany(ScheduleMachine::class, 'schedule_id');
    }

    public function machines(): BelongsToMany
    {
        return $this->belongsToMany(Machine::class, 'schedule_machines', 'schedule_id', 'machine_id')
            ->withPivot('assigned_user_ids')
            ->withTimestamps();
    }
}
