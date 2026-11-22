<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleMachine extends Model
{
    use HasFactory;

    protected $table = 'schedule_machines';

    protected $fillable = [
        'schedule_id',
        'machine_id',
        'assigned_user_ids',
    ];

    protected $casts = [
        'assigned_user_ids' => 'array',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }

    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class, 'machine_id');
    }
}
