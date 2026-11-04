<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PekerjaanKelompok extends Model
{
    protected $table = 'pekerjaan_kelompok';

    protected $fillable = [
        'kelompok_tugas_id',
        'title',
        'description',
        'deadline',
        'status',
        'result_notes',
        'result_link',
        'created_by',
        'status_updated_by',
        'status_updated_at',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'status_updated_at' => 'datetime',
    ];

    protected $appends = [
        'status_label',
        'is_overdue',
    ];

    public function kelompok(): BelongsTo
    {
        return $this->belongsTo(KelompokTugas::class, 'kelompok_tugas_id');
    }

    public function penanggungJawab(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'pekerjaan_kelompok_anggota',
            'pekerjaan_kelompok_id',
            'student_id'
        )
            ->withPivot('assigned_by')
            ->withTimestamps();
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function statusUpdater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'status_updated_by');
    }

    public function umpanBalik(): HasMany
    {
        return $this->hasMany(UmpanBalikKelompok::class, 'pekerjaan_kelompok_id')->latest();
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'belum_dikerjakan' => 'Belum Dikerjakan',
            'sedang_dikerjakan' => 'Sedang Dikerjakan',
            'menunggu_review' => 'Menunggu Review',
            'selesai' => 'Selesai',
            default => ucfirst((string) $this->status),
        };
    }

    public function getIsOverdueAttribute(): bool
    {
        if (!$this->deadline || $this->status === 'selesai') {
            return false;
        }

        return $this->deadline->isPast();
    }
}
