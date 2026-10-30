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

    protected $fillable = [
        // nama dan tipe
        'id',
        'user_id',
        'machine_code',
        'machine_name',
        'machine_type',
        'sub_type',
        'category',
        'qr_image_path',
        'qr_value',

        // spesifikasi mesin
        'specifications',

        // informasi penting
        'department',
        'area',
        'location',
        'pic_department',
        'machine_status',
        'active_status',
        'commission_date',

        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'specifications'  => 'array',
        'commission_date' => 'date',
        'machine_status'  => MachineStatus::class,
        'active_status'   => 'boolean',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];
}