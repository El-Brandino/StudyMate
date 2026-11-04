<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tugas extends Model
{
    protected $fillable = [
        'teacher_id',
        'mode',
        'subject_id',
        'title',
        'description',
        'instructions',
        'min_members',
        'max_members',
        'deadline',
        'document',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'min_members' => 'integer',
        'max_members' => 'integer',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function kelas()
    {
        return $this->belongsToMany(
            Kelas::class,
            'tugas_kelas',
            'tugas_id',
            'class_id'
        );
    }

    public function progressTugas()
    {
        return $this->hasMany(
            ProgressTugas::class,
            'task_id'
        );
    }

    public function documents()
    {
        return $this->hasMany(TugasDocument::class);
    }

    public function kelompok(): HasMany
    {
        return $this->hasMany(KelompokTugas::class, 'tugas_id');
    }

    public function isGroupTask(): bool
    {
        return $this->mode === 'kelompok';
    }
}
