<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Form;
use App\Models\FormSection;
use App\Models\FormQuestion;
use App\Models\FormOption;
use App\Models\Machine;

class Task extends Model {

    protected $table = 'tasks';
    protected $primayKey = 'id';
    public $incrementing = true;

    protected $fillable = [
        'id',
        'task_code',
        'machine_id',
        'form_id',
        'assigned_user_id',
        'status',
        'due_date',
        'completed_date',
        'source_type',
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
}