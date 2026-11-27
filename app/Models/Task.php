<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Form;
use App\Models\FormSection;
use App\Models\FormQuestion;
use App\Models\FormOption;
use App\Models\Machine;
use App\Models\User;

class Task extends Model {

    protected $table = 'tasks';
    protected $primaryKey = 'id';
    public $incrementing = true;

    protected $fillable = [
        'id',
        'task_code',
        'idempotency_key',
        'machine_id',
        'form_id',
        'schedule_id',
        'assigned_user_id',
        'status',
        'origin_type',
        'source_task_id',
        'source_condition_id',
        'source_submission_id',
        'due_date',
        'end_date',
        'started_at',
        'completed_at',
        'is_late',
        'late_days',
    ];

    protected $casts = [
        'due_date'    => 'date',
        'end_date'    => 'date',
        'started_at'  => 'datetime',
        'completed_at' => 'datetime',
        'is_late'     => 'boolean',
        'late_days'   => 'integer',
        // Origin task ini: SCHEDULE (dijadwalkan rutin) atau CONDITION (lanjutan lvl 2).
        'origin_type' => 'string',
    ];


    
    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'id');
    }

    public function section()
    {
        return $this->hasMany(FormSection::class)->orderBy('section_order', 'asc');
    }

    public function question()
    {
        return $this->hasMany(FormQuestion::class)->orderBy('question_order', 'asc');
    }

    public function option()
    {
        return $this->hasMany(FormOption::class)->orderBy('option_order', 'asc');
    }

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'assigned_user_id', 'id');
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class, 'schedule_id', 'id');
    }

    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'task_assigned_users', 'task_id', 'user_id')
            ->withTimestamps();
    }

    // ===== Provenance: dari mana task ini lahir =====

    public function sourceTask()
    {
        return $this->belongsTo(Task::class, 'source_task_id', 'id');
    }

    public function triggerCondition()
    {
        return $this->belongsTo(ScheduleCondition::class, 'source_condition_id', 'id');
    }

    public function sourceSubmission()
    {
        return $this->belongsTo(TaskSubmission::class, 'source_submission_id', 'id');
    }

    public function isFollowUp(): bool
    {
        return $this->origin_type === 'CONDITION';
    }
}