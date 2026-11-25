<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\InputType;

class FormQuestion extends Model
{
    use HasFactory;

    protected $table = 'form_questions';
    protected $primaryKey = 'id';
    public $incrementing = true;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'form_id',
        'form_section_id',
        'question_code',
        'question_text',
        'question_image',
        'question_file',
        'question_date',
        'question_time',
        'help_text',
        'standard_text',
        'input_type',
        'validation_rules',
        'is_required',
        'question_order'
    ];

    protected $casts = [
        'validation_rules' => 'array',
        'is_required' => 'boolean',
        'input_type' => InputType::class,
    ];

    protected $appends = [
        'question_images',
    ];

    /**
     * Mengembalikan daftar path gambar soal sebagai array (mendukung format lama string tunggal & JSON array).
     *
     * @return array<int, string>
     */
    public function getQuestionImagesAttribute(): array
    {
        $raw = $this->attributes['question_image'] ?? null;
        if (! is_string($raw) || trim($raw) === '') {
            return [];
        }

        $trimmed = trim($raw);
        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded, fn ($item) => is_string($item) && trim($item) !== ''));
            }
        }

        return [$trimmed];
    }

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'id');
    }

    public function section()
    {
        return $this->belongsTo(FormSection::class, 'form_section_id', 'id');
    }

    public function options()
    {
        return $this->hasMany(FormOption::class, 'form_question_id', 'id')
            ->orderBy('option_order', 'asc');
    }
}