<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\FormQuestion;
use App\Models\FormSection;

class FormOption extends Model
{
    protected $table = 'form_options';
    public $incrementing = true;
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $fillable = [
        'form_question_id',
        'option_code',
        'option_text',
        'is_normal',
        'option_order',
        'goto_form_section_id'
    ];

    protected $casts = [
        'is_normal' => 'boolean',
        'goto_form_section_id' => 'integer',
        'option_order' => 'integer',
    ];

    /**
     * Relasi ke FormQuestion (Pemilik opsi pertanyaan ini)
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(FormQuestion::class, 'form_question_id', 'id');
    }

    /**
     * Relasi ke FormSection untuk fitur Jump Logic (goto section)
     */
    public function gotoSection(): BelongsTo
    {
        return $this->belongsTo(FormSection::class, 'goto_form_section_id', 'id');
    }
}