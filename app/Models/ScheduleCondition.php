<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleCondition extends Model
{
    use HasFactory;

    protected $fillable = [
        'condition_code',
        'trigger_form_id',
        'trigger_question_id',
        'trigger_option_id',
        'target_form_id',
        'due_window_days',
        'is_active',
    ];

    protected $casts = [
        'due_window_days' => 'integer',
        'is_active' => 'boolean',
    ];

    public function triggerForm()
    {
        return $this->belongsTo(Form::class, 'trigger_form_id');
    }

    public function triggerQuestion()
    {
        return $this->belongsTo(FormQuestion::class, 'trigger_question_id');
    }

    public function triggerOption()
    {
        return $this->belongsTo(FormOption::class, 'trigger_option_id');
    }

    public function targetForm()
    {
        return $this->belongsTo(Form::class, 'target_form_id');
    }
}
