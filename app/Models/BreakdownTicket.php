<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\TicketStatus;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BreakdownTicket extends Model
{
    use HasFactory;

    protected $table = 'breakdown_tickets';
    protected $primaryKey = 'id';
    public $incrementing = true;
    public $timestamps = false;


    protected $fillable = [ 
        'ticket_code',
        'problem_category',
        'problems', 
        'status',
        'source_type',
        'pipeline_stage', // Jika kolom ini ada di database atau virtual
        'reported_at',
        'reported_by',
        'assigned_to',
        'started_at',
        'closed_at',
        'root_cause',
        'corrective_action',
        'breakdown_minutes', // Pastikan kolom ini sudah ada di migration jika dipakai
        'verified_by',
        'verified_at',
        'verification_notes',
        'machine_id',
    ];

    protected $casts = [


        // untuk enum
        'status' => TicketStatus::class,
        'problems' => 'array',
        'reported_at' => 'datetime',
        'started_at' => 'datetime',
        'closed_at' => 'datetime',
        'verified_at' => 'datetime',
    ];


    public function getCalculatedDowntimeAttribute()
    {
        if (isset($this->attributes['breakdown_minutes']) && $this->attributes['breakdown_minutes']) {
            return $this->breakdown_minutes;
        }

        if ($this->reported_at) {
            $endTime = $this->closed_at ?? now();
            return $this->reported_at->diffInMinutes($endTime);
        }

        return 0;
    }

    /**
     * Relasi ke Machine
     */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'id');
    }

    /**
     * Relasi ke task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id', 'id');
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
        return $this->belongsTo(User::class, 'assigned_to', 'id'); // Ubah 'user_id' jadi 'id'
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by', 'id'); // Ubah 'user_id' jadi 'id'
    }
}