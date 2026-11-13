<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

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
        : $this->tasks()->get(['id', 'form_id', 'status', 'assigned_user_id', 'due_date']);

    if ($tasks->isEmpty()) {
        return 'UNASSIGNED'; 
    }

    $task = $tasks->first();

    // 1. Cek UPCOMING
    if ($task->status === 'UPCOMING') {
        return 'UPCOMING';
    }

    // 2. Cek COMPLETED
    if ($task->status === 'COMPLETED') {
        return 'COMPLETED';
    }

    // 3. PRIORITAS UTAMA: Jika sudah ada teknisi, LANGSUNG IN_PROGRESS (meskipun telat)
    if (!is_null($task->assigned_user_id)) {
        return 'IN_PROGRESS';
    }

    if ($task->due_date) {
        $today = Carbon::today(); // Tanggal hari ini jam 00:00
        $dueDate = Carbon::parse($task->due_date)->startOfDay(); // Tanggal due date jam 00:00
        
        // Cek jika hari ini BUKAN hari yang sama dengan due_date DAN hari ini sudah melewatinya
        if (!$today->isSameDay($dueDate) && $today->isAfter($dueDate)) {
            return 'OVERDUE'; 
        }
    }

    // 5. Jika belum telat dan belum ada teknisi
    return 'DUE';
}

public function getIsEditableAttribute(): bool
{
    return $this->status !== 'COMPLETED';
}
}