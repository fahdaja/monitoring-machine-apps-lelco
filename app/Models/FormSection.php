<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSection extends Model
{
    use HasFactory;

    protected $table = 'form_sections';
    protected $primaryKey = 'id';
    public $incrementing = true;
    public $timestamps = false;
    
    protected $fillable = [
        'id',
        'form_id',
        'section_code',
        'section_title',
        'section_description',
        'section_order'
    ];

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'id');
    }

    public function questions()
    {
        return $this->hasMany(FormQuestion::class, 'form_section_id', 'id');
    }
}