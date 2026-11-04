<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSubmission extends Model{
    use HasFactory;
    
    protected $table = 'submissions';
    protected $primaryKey = 'id';
    public $incrementing = true;
    
    protected $fillable = [
        'id',
        'task_submission_code',
        'escalation_ticket_id',
        'task_id',
        'user_id',
        'status',
        'answers_values',
        'submitted_at',
    ];

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'machine_id');
    }

    public function task()
    {
        
    }

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'form_id');
    }
}
