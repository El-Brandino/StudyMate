<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UndanganKelompok extends Model
{
    protected $table = 'undangan_kelompok';

    protected $fillable = [
        'tugas_id',
        'kelompok_tugas_id',
        'student_id',
        'invited_by',
        'status',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    protected $appends = [
        'status_label',
    ];

    public function tugas(): BelongsTo
    {
        return $this->belongsTo(Tugas::class, 'tugas_id');
    }

    public function kelompok(): BelongsTo
    {
        return $this->belongsTo(KelompokTugas::class, 'kelompok_tugas_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function pengundang(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'menunggu' => 'Menunggu Jawaban',
            'diterima' => 'Diterima',
            'ditolak' => 'Ditolak',
            'dibatalkan' => 'Dibatalkan',
            default => ucfirst((string) $this->status),
        };
    }
}
