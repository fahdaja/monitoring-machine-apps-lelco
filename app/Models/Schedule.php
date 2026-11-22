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
        'due_window_days',
        'is_active',
    ];

    protected $casts = [
        'selected_days' => 'array',
        'selected_dates' => 'array',
        'is_active' => 'boolean',
    ];

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
