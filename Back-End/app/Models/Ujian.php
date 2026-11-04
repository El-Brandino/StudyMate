<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Ujian extends Model
{
    protected $table = 'ujians';

    protected $fillable = [
        'teacher_id',
        'subject_id',
        'title',
        'description',
        'exam_date',
        'start_time',
        'duration',
        'document_path',
    ];

    protected function casts(): array
    {
        return [
            // Serialisasi sebagai "YYYY-MM-DD" agar mudah dipakai frontend.
            'exam_date' => 'date:Y-m-d',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function kelas(): BelongsToMany
    {
        return $this->belongsToMany(
            Kelas::class,
            'ujian_kelas',
            'ujian_id',
            'class_id'
        )->withTimestamps();
    }
}
