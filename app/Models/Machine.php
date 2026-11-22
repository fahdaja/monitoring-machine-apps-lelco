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

    /**
     * PIC mesin = banyak orang (dulu cuma teks satu kolom), dan daftar inilah
     * yang jadi gerbang siapa boleh mengerjakan task pada mesin ini.
     */
    public function pics()
    {
        return $this->belongsToMany(User::class, 'machine_pics', 'machine_id', 'user_id')
            ->withPivot('created_at')
            ->orderBy('users.full_name');
    }

    /** Mesin tanpa satu PIC pun berarti aturan belum dipasang, jadi masih terbuka. */
    public function hasPicGate(): bool
    {
        return $this->pics->isNotEmpty();
    }

    public function isPic(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $this->pics
            ->contains(fn ($pic) => (int) $pic->id === (int) $user->id);
    }

    /** Boleh membuka/mengerjakan task mesin ini? Admin boleh masuk untuk verifikasi. */
    public function canBeWorkedBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if (! $this->hasPicGate()) {
            return true;
        }

        return $this->isPic($user) || $user->hasRole(User::ROLE_ADMIN);
    }

    /**
     * Claim otomatis saat task dibuka hanya untuk PIC asli; admin yang sekadar
     * lewat tidak boleh meramput penugasan sehingga task terkunci untuk operator.
     */
    public function mayOwnTask(?User $user): bool
    {
        if (! $this->hasPicGate()) {
            return true;
        }

        return $this->isPic($user);
    }

    /** Ringkasan nama PIC untuk tampilan dan pesan penolakan. */
    public function picNamesText(): string
    {
        $names = $this->pics->pluck('full_name')->filter()->implode(', ');

        return $names !== '' ? $names : (string) ($this->pic_department ?? '');
    }
}