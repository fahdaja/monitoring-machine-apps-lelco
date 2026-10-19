<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\MachineStatus;
use App\Enums\CriticalityStatus;

class Machine extends Model
{
    use HasFactory;

    protected $table = 'machines';
    protected $primaryKey = 'machine_id';
    public $incrementing = false;

    protected $fillable = [
        // nama dan tipe
        'machine_id',
        'qr_id',
        'machine_code',
        'machine_name',
        'machine_type',
        'sub_type',
        'category',

        // spesifikasi mesin
        'specifications',

        // informasi penting
        'department',
        'area',
        'location',
        'pic_department',
        'criticality',
        'machine_status',
        'active_status',
        'commission_date',

        // audit
        'notes',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
    ];

    protected $casts = [
        'specifications' => 'array',
        'commission_date' => 'date',
        'machine_status' => MachineStatus::class,
        'criticality' => CriticalityStatus::class,
        'active_status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relasi ke user
     */

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by', 'user_id');
    }

    /**
     * relasi one to one dengan qr code
     */
    public function machineQr(): HasOne {
        return $this->hasOne(MachineQr::class, 'qr_id', 'qr_id');
    }
}