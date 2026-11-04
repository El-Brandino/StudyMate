<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KelompokTugas extends Model
{
    protected $table = 'kelompok_tugas';

    protected $fillable = [
        'tugas_id',
        'class_id',
        'created_by',
        'name',
    ];

    protected $appends = [
        'progress',
        'jumlah_anggota',
        'jumlah_undangan_pending',
        'status_kelompok',
        'last_updated_at',
    ];

    public function tugas(): BelongsTo
    {
        return $this->belongsTo(Tugas::class, 'tugas_id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class, 'class_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function anggota(): HasMany
    {
        return $this->hasMany(KelompokAnggota::class, 'kelompok_tugas_id');
    }

    public function undangan(): HasMany
    {
        return $this->hasMany(UndanganKelompok::class, 'kelompok_tugas_id');
    }

    public function pekerjaan(): HasMany
    {
        return $this->hasMany(PekerjaanKelompok::class, 'kelompok_tugas_id');
    }

    public function umpanBalik(): HasMany
    {
        return $this->hasMany(UmpanBalikKelompok::class, 'kelompok_tugas_id');
    }

    public function aktivitas(): HasMany
    {
        return $this->hasMany(AktivitasKelompok::class, 'kelompok_tugas_id')->latest();
    }

    public function getProgressAttribute(): array
    {
        $total = $this->relationLoaded('pekerjaan')
            ? $this->pekerjaan->count()
            : $this->pekerjaan()->count();

        $selesai = $this->relationLoaded('pekerjaan')
            ? $this->pekerjaan->where('status', 'selesai')->count()
            : $this->pekerjaan()->where('status', 'selesai')->count();

        $persentase = $total > 0
            ? (int) round(($selesai / $total) * 100)
            : null;

        return [
            'total' => $total,
            'selesai' => $selesai,
            'persentase' => $persentase,
            'label' => $persentase === null
                ? 'Belum Ada Pembagian Tugas'
                : $persentase . '%',
            'sudah_ada_pembagian' => $total > 0,
        ];
    }

    public function getJumlahAnggotaAttribute(): int
    {
        return $this->relationLoaded('anggota')
            ? $this->anggota->count()
            : $this->anggota()->count();
    }

    public function getJumlahUndanganPendingAttribute(): int
    {
        return $this->relationLoaded('undangan')
            ? $this->undangan->where('status', 'menunggu')->count()
            : $this->undangan()->where('status', 'menunggu')->count();
    }

    public function getStatusKelompokAttribute(): string
    {
        $minimal = $this->tugas?->min_members;

        if (!$minimal || $this->jumlah_anggota >= $minimal) {
            return 'lengkap';
        }

        return 'belum_lengkap';
    }

    public function getLastUpdatedAtAttribute()
    {
        $latest = $this->updated_at;

        if ($this->relationLoaded('pekerjaan')) {
            foreach ($this->pekerjaan as $pekerjaan) {
                if ($pekerjaan->updated_at && $pekerjaan->updated_at > $latest) {
                    $latest = $pekerjaan->updated_at;
                }
            }
        }

        return $latest;
    }
}
