<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Form extends Model
{
    use HasFactory;

    protected $table = 'forms';
    protected $primaryKey = 'id';
    public $incrementing = true;

    // ✅ Perbaiki: hapus id/created_at/updated_at, tambah is_active
    protected $fillable = [
        'machine_id',
        'form_code',
        'form_title',
        'form_description',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ✅ Tambah $appends di sini (lebih rapi, dikelompokkan)
    protected $appends = ['status', 'is_editable'];

    // ============ RELASI ============

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'form_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(FormSection::class, 'form_id', 'id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(FormQuestion::class, 'form_id', 'id');
    }

    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'id');
    }

public function getStatusAttribute(): string
{
    $tasks = $this->relationLoaded('tasks')
        ? $this->tasks
        : $this->tasks()->get(['id', 'form_id', 'status', 'assigned_user_id']);

    if ($tasks->isEmpty()) {
        return 'UNASSIGNED'; // Belum ada task
    }

    if ($tasks->every(fn ($t) => $t->status === 'COMPLETED')) {
        return 'COMPLETED'; // Semua task selesai
    }

    // Jika ada minimal 1 task yang sudah di-assign ke user, berarti sudah mulai dikerjakan
    if ($tasks->contains(fn ($t) => !is_null($t->assigned_user_id))) {
        return 'IN_PROGRESS';
    }

    // Jika ada task tapi belum ada yang assign, tetap dianggap belum dikerjakan
    return 'UNASSIGNED';
}

public function getIsEditableAttribute(): bool
{
    return $this->status !== 'COMPLETED';
}
}