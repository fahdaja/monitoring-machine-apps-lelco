<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Submission extends Model{
    use HasFactory;
    
    protected $table = 'submissions';
    protected $primaryKey = 'submission_id';
    public $incrementing = false;
    
    protected $fillable = [
        'submission_id',
        'machine_id',
        'form_id',
        'answers_json',
    ];

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'machine_id');
    }

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'form_id');
    }
}
