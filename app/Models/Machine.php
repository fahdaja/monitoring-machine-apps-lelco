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
    protected $primaryKey = 'id';
    public $incrementing = false;

    protected $fillable = [
        // nama dan tipe
        'id',
        'user_id',
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
        'machine_status',
        'commission_date',

        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'specifications' => 'array',
        'commission_date' => 'date',
        'machine_status' => MachineStatus::class,
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * relasi one to one dengan qr code
     */
    public function machineQr(): HasOne {
        return $this->hasOne(MachineQr::class, 'qr_id', 'qr_id');
    }
}