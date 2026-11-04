<?php

namespace App\Support;

use App\Models\KelompokTugas;
use App\Models\Tugas;

class KelompokTugasPresenter
{
    public static function groupSummary(KelompokTugas $kelompok): array
    {
        return [
            'id' => $kelompok->id,
            'tugas_id' => $kelompok->tugas_id,
            'name' => $kelompok->name,
            'class_id' => $kelompok->class_id,
            'progress' => $kelompok->progress,
            'jumlah_anggota' => $kelompok->jumlah_anggota,
            'jumlah_undangan_pending' => $kelompok->jumlah_undangan_pending,
            'status_kelompok' => $kelompok->status_kelompok,
            'last_updated_at' => $kelompok->last_updated_at,
        ];
    }

    public static function assignmentSummary(Tugas $tugas): array
    {
        $kelompok = $tugas->relationLoaded('kelompok')
            ? $tugas->kelompok
            : $tugas->kelompok()->with(['anggota', 'pekerjaan'])->get();

        $totalPekerjaan = $kelompok->sum(fn ($item) => $item->progress['total']);
        $pekerjaanSelesai = $kelompok->sum(fn ($item) => $item->progress['selesai']);
        $persentase = $totalPekerjaan > 0
            ? (int) round(($pekerjaanSelesai / $totalPekerjaan) * 100)
            : null;

        return [
            'total_kelompok' => $kelompok->count(),
            'total_anggota' => $kelompok->sum(fn ($item) => $item->jumlah_anggota),
            'total_pekerjaan' => $totalPekerjaan,
            'pekerjaan_selesai' => $pekerjaanSelesai,
            'persentase' => $persentase,
            'label' => $persentase === null
                ? 'Belum Ada Pembagian Tugas'
                : $persentase . '%',
            'sudah_ada_pembagian' => $totalPekerjaan > 0,
            'kelompok_belum_lengkap' => $kelompok
                ->filter(fn ($item) => $item->status_kelompok === 'belum_lengkap')
                ->count(),
        ];
    }
}
