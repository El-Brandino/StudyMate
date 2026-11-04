<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AktivitasKelompok extends Model
{
    protected $table = 'aktivitas_kelompok';

    protected $fillable = [
        'tugas_id',
        'kelompok_tugas_id',
        'pekerjaan_kelompok_id',
        'actor_id',
        'action',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
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

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
