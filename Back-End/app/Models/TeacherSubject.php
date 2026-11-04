<?php

namespace App\Models;
use App\Models\User;
use App\Models\Subject;

use Illuminate\Database\Eloquent\Model;

class TeacherSubject extends Model
{
    protected $fillable = [
        'teacher_id',
        'subject_id',
    ];

    public function teacher()
    {
        return $this->belongsTo(
            User::class,
            'teacher_id'
        );
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}