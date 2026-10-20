<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $table = 'sections';
    protected $primaryKey = 'section_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'section_id',
        'form_id',
        'section_code',
        'section_title',
        'section_description',
        'section_order'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'form_id');
    }

    public function questions()
    {
        return $this->hasMany(Question::class, 'section_id', 'section_id');
    }
}