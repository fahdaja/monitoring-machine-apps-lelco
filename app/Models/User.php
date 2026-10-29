<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;


class User extends Authenticatable {
    use HasFactory;

    protected $table = 'users';
    protected $primaryKey = 'id';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_code',
        'username',
        'password',
        'full_name',
        'role',
        'department',
        'email',
        'phone_number',
        'is_active',
        'last_login_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'role' => 'string',
        'department' => 'string',
        'last_login_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    
    public function roles()
    {
        return $this->belongsTo(Role::class, 'id');
    }

    public function departments()
    {
        return $this->belongsTo(Department::class, 'id');
    }
}