<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $table = 'questions';
    protected $primaryKey = 'question_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'question_id',
        'form_id',
        'section_id',
        'question_code',
        'question_text',
        'help_text',
        'standard_text',
        'input_type',
        'media_url',
        'media_type',
        'media_title',
        'is_required',
        'sort_order'
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
        return $this->belongsTo(Section::class, 'section_id', 'section_id');
    }

    public function options()
    {
        return $this->hasMany(Option::class, 'question_id', 'question_id');
    }
}