<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormOption extends Model
{
    protected $table = 'form_options';

    // Karena di migrasi tabel form_options tidak ada kolom created_at & updated_at
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'is_normal' => 'boolean',
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