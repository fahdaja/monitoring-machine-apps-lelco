<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Enums\FormType;
use App\Enums\InputType;
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
        'form_type',
        'form_level',
        'form_title',
        'form_description',
    ];

    protected $casts = [
        'form_type' => FormType::class,
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

    // ============ SCOPE ============

    public function scopeOfType(Builder $query, FormType|string $type): Builder
    {
        $value = $type instanceof FormType ? $type->value : $type;

        return $query->where('form_type', $value);
    }

    /**
     * Cari template untuk sebuah kategori. Form bertipe transisi berlaku global,
     * sedangkan form per mesin diprioritaskan bila mesinnya cocok.
     */
    public static function findTemplate(FormType $type, ?int $machineId = null): ?self
    {
        return static::query()
            ->ofType($type)
            ->when($type->requiresMachine(), fn (Builder $q) => $q->where('machine_id', $machineId))
            ->orderByRaw('machine_id IS NULL')
            ->latest('id')
            ->first();
    }

    /**
     * Payload form untuk modal pertanyaan datar (tanpa navigasi section).
     * Section di-flatten, urutan tetap mengikuti section_order -> question_order -> option_order.
     */
    public function modalPayload(): array
    {
        $this->loadMissing([
            'sections' => fn ($q) => $q->orderBy('section_order', 'asc'),
            'sections.questions' => fn ($q) => $q->orderBy('question_order', 'asc'),
            'sections.questions.options' => fn ($q) => $q->orderBy('option_order', 'asc'),
        ]);

        $questions = $this->sections
            ->flatMap->questions
            ->values()
            ->map(function ($question) {
                $image = (string) ($question->question_image ?? '');

                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'question_image_url' => $image === ''
                        ? null
                        : (str_starts_with($image, 'http') ? $image : '/storage/'.$image),
                    'help_text' => $question->help_text,
                    'standard_text' => $question->standard_text,
                    'input_type' => $question->input_type instanceof InputType
                        ? $question->input_type->value
                        : strtoupper((string) $question->input_type),
                    'is_required' => (bool) $question->is_required,
                    'options' => $question->options
                        ->map(fn ($opt) => [
                            'id' => $opt->id,
                            'option_text' => $opt->option_text,
                            'is_normal' => (bool) $opt->is_normal,
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->all();

        return [
            'id' => $this->id,
            'form_code' => $this->form_code,
            'form_title' => $this->form_title,
            'form_description' => $this->form_description,
            'questions' => $questions,
        ];
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