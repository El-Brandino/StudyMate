<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Ujian;
use App\Models\User;

class Subject extends Model
{
    protected $fillable = [
        'name',
    ];

    public function teacherSubjects()
    {
        return $this->hasMany(TeacherSubject::class);
    }

    public function teachers()
    {
        return $this->belongsToMany(
            User::class,
            'teacher_subjects',
            'subject_id',
            'teacher_id'
        )->withTimestamps();
    }

    public function ujians(): HasMany
    {
        return $this->hasMany(Ujian::class, 'subject_id');
    }

    public function tugas(): HasMany
    {
        return $this->hasMany(Tugas::class, 'subject_id');
    }
}