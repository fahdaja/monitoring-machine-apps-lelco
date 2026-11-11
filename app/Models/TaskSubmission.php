<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskSubmission extends Model{
    use HasFactory;
    
    protected $table = 'tasks_submissions';
    protected $primaryKey = 'id';
    public $incrementing = true;
    public $timestamps = false;
    
    protected $fillable = [
        'id',
        'submission_code',
        'escalation_ticket_id',
        'task_id',
        'user_id',
        'status',
        'answers_values',
        'submitted_at',
    ];

    protected $casts = [
        'answers_values' => 'array',
    ];

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'machine_id');
    }

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id', 'id');
    }

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'form_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
