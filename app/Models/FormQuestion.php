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

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'form_section_id', 'id');
    }

    public function options()
    {
        return $this->hasMany(FormOption::class, 'form_question_id', 'id');
    }
}