<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketSubmission extends Model
{
    use HasFactory;

    protected $table = 'ticket_submissions';

    protected $fillable = [
        'ticket_id',
        'form_id',
        'submitted_by',
        'context',
        'answers_values',
    ];

    protected $casts = [
        'answers_values' => 'array',
    ];

    /**
     * Tiket breakdown tempat submission ini berasal.
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(BreakdownTicket::class, 'ticket_id', 'id');
    }

    /**
     * Form yang dipakai saat mengisi.
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class, 'form_id', 'id');
    }

    /**
     * Pengisi submission.
     */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by', 'id');
    }
}
