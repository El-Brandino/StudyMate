<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UmpanBalikKelompok extends Model
{
    protected $table = 'umpan_balik_kelompok';

    protected $fillable = [
        'tugas_id',
        'kelompok_tugas_id',
        'pekerjaan_kelompok_id',
        'teacher_id',
        'message',
    ];

    public function tugas(): BelongsTo
    {
        return $this->belongsTo(Tugas::class, 'tugas_id');
    }

    public function kelompok(): BelongsTo
    {
        return $this->belongsTo(KelompokTugas::class, 'kelompok_tugas_id');
    }

    public function pekerjaan(): BelongsTo
    {
        return $this->belongsTo(PekerjaanKelompok::class, 'pekerjaan_kelompok_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
