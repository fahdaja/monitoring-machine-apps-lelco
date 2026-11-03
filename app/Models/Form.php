<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // <-- 1. Tambahkan import ini

class Form extends Model
{
    use HasFactory;

    protected $table = 'forms';
    protected $primaryKey = 'id';
    public $incrementing = true;

    protected $fillable = [
        'id',
        'machine_id',
        'form_code',
        'form_title',
        'form_description',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

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
}
