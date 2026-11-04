<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Pengumuman extends Model
{
    protected $table = 'pengumuman';

    protected $fillable = [
        'teacher_id',
        'title',
        'content',
        'target',
        'start_at',
        'end_at',
        'attachment',
    ];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    // Pengumuman bisa menyasar lebih dari satu kelas.
    public function kelas(): BelongsToMany
    {
        return $this->belongsToMany(
            Kelas::class,
            'pengumuman_kelas',
            'pengumuman_id',
            'class_id'
        )->withTimestamps();
    }
}
