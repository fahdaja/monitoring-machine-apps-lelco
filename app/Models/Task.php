<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Task extends Model {

    protected $table = 'tasks';
    protected $primayKey = 'id';
    protected $fillable = [
        'task_code',
        'machine_id',
        'form_id',
        'assigned_user_id',
        'status',
        'due_date',
        'completed_date',
        'source_type',
        'escalation_ticket_id',
    ];
    
    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'id');
    }

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'assigned_user_id', 'id');
    }

    public function breakdownticket()
    {
        return $this->belongsTo(BreakdownTicket::class, 'escalation_ticket_id', 'id');
    }
}