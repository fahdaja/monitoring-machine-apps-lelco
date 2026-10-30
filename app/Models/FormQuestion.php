<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $table = 'form_questions';
    protected $primaryKey = 'id';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'form_id',
        'form_section_id',
        'question_code',
        'question_text',
        'question_image',
        'question_url',
        'help_text',
        'standard_text',
        'input_type',
        'validation_rules',
        'media_url',
        'media_type',
        'media_title',
        'is_required',
        'question_order'
    ];

    protected $casts = [
        'input_type' => 'enum',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'form_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'form_section_id', 'section_id');
    }

    public function options()
    {
        return $this->hasMany(Option::class, 'form_question_id', 'question_id');
    }
}