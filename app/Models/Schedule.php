<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id');
    }
}