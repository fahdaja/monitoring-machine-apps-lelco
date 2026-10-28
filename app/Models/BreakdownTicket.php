<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class BreakdownTicket extends Model
{
    use HasFactory;

    protected $table = 'breakdown_tickets';
    protected $primaryKey = 'id';
    public $incrementing = false;


    protected $fillable = [ 
        // ticket information
        'id',
        'machine_id',
        'problem_category',
        'problem_description',
        'priority',
        'current_level',
        'status',
        'reported_at',
        'reported_by',

        // teknisi yang menangani
        'assigned_to',
        'started_at',
        'closed_at',

        // permasalahan dan aksi untuk menyelesaikan permasalahan
        'root_cause',
        'corrective_action',
        
        // task di verifikasi oleh siapa
        'source_task_id',
        'verified_by',
        'verified_at',
        'verification_notes',
    ];

    protected $casts = [


        // untuk enum
        'status' => 'enum',
        'priority' => 'enum',
        'current_level' => 'enum',

        // untuk tanggal 
        'reported_at' => 'datetime',
        'started_at' => 'datetime',
        'closed_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    /**
     * Relasi ke Machine
     */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'machine_id');
    }

    /**
     * Relasi ke task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'source_task_id', 'task_id');
    }

    /**
     * Relasi ke pelapor 
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by', 'user_id');
    }
    /**
     * Relasi ke teknisi 
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to', 'user_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by', 'user_id');
    }
}