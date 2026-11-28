<?php

namespace App\Models;

use App\Enums\FormType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pola form per mesin: rantai Laporan Breakdown -> Mulai Repair -> Tutup Tiket.
 */
class MachineFormPattern extends Model
{
    protected $fillable = [
        'machine_id',
        'manual_report_form_id',
        'start_repair_form_id',
        'close_ticket_form_id',
    ];

    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class);
    }

    public function manualReportForm(): BelongsTo
    {
        return $this->belongsTo(Form::class, 'manual_report_form_id');
    }

    public function startRepairForm(): BelongsTo
    {
        return $this->belongsTo(Form::class, 'start_repair_form_id');
    }

    public function closeTicketForm(): BelongsTo
    {
        return $this->belongsTo(Form::class, 'close_ticket_form_id');
    }

    public function formIdFor(FormType $type): ?int
    {
        return match ($type) {
            FormType::MANUAL_REPORT => $this->manual_report_form_id,
            FormType::START_REPAIR => $this->start_repair_form_id,
            FormType::CLOSE_TICKET => $this->close_ticket_form_id,
            default => null,
        };
    }
}
