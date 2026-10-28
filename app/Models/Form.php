<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $table = 'forms';
    protected $primaryKey = 'id';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'form_code',
        'machine_id',
        'form_name',
        'description',
        'machine_type',
        'process_type',
        'category',
        'level',
        'version',
        'auto_save',
        'allow_back',
        'department',
        'priority',
        'is_active',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function questions()
    {
        return $this->hasMany(Question::class, 'form_id', 'form_id');
    }

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'machine_id');
    }
}