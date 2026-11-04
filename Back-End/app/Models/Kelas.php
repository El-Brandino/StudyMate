<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\Ujian;

class Kelas extends Model
{
    protected $table = 'kelas';

    protected $fillable = [
        'major_id',
        'grade',
        'class_number',
    ];

    protected $appends = [
        'name',
    ];

    // Nama kelas yang sudah diformat, contoh: "XI RPL 1".
    public function getNameAttribute(): string
    {
        $major = $this->major?->name ?? '';

        return trim(
            $this->grade . ' ' . $major . ' ' . $this->class_number
        );
    }

    public function major()
    {
        return $this->belongsTo(Major::class);
    }

    public function students()
    {
        return $this->hasMany(User::class, 'class_id');
    }

    public function tugas()
    {
        return $this->belongsToMany(
            Tugas::class,
            'tugas_kelas',
            'class_id',
            'tugas_id'
        );
    }

    public function ujians(): BelongsToMany
    {
        return $this->belongsToMany(
            Ujian::class,
            'ujian_kelas',
            'class_id',
            'ujian_id'
        )->withTimestamps();
    }

    public function kelompokTugas()
    {
        return $this->hasMany(KelompokTugas::class, 'class_id');
    }
}
