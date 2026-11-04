<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KelompokAnggota extends Model
{
    protected $table = 'kelompok_anggota';

    protected $fillable = [
        'tugas_id',
        'kelompok_tugas_id',
        'student_id',
        'role',
        'joined_at',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
    ];

    public function tugas()
    {
        return $this->belongsTo(Tugas::class, 'tugas_id');
    }

    public function kelompok()
    {
        return $this->belongsTo(KelompokTugas::class, 'kelompok_tugas_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
