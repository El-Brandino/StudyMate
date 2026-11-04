<?php

namespace App\Support;

use App\Models\AktivitasKelompok;
use App\Models\KelompokTugas;
use App\Models\PekerjaanKelompok;
use App\Models\User;

class KelompokActivityLogger
{
    public static function log(
        KelompokTugas $kelompok,
        ?User $actor,
        string $action,
        string $description,
        ?PekerjaanKelompok $pekerjaan = null,
        array $metadata = []
    ): AktivitasKelompok {
        $activity = AktivitasKelompok::create([
            'tugas_id' => $kelompok->tugas_id,
            'kelompok_tugas_id' => $kelompok->id,
            'pekerjaan_kelompok_id' => $pekerjaan?->id,
            'actor_id' => $actor?->id,
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata ?: null,
        ]);

        // Pastikan monitoring menampilkan waktu aktivitas terbaru.
        $kelompok->touch();

        return $activity;
    }
}
