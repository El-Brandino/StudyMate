<?php

namespace App\Console\Commands;

use App\Models\Pengumuman;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class HapusEventKedaluwarsa extends Command
{
    protected $signature = 'event:hapus-kedaluwarsa';

    protected $description = 'Menghapus event yang sudah berakhir lebih dari 1 hari';

    public function handle(): int
    {
        $batasWaktu = now()->subDay();

        $events = Pengumuman::whereNotNull('end_at')
            ->where('end_at', '<=', $batasWaktu)
            ->get();

        foreach ($events as $event) {
            if ($event->attachment) {
                Storage::disk('public')->delete($event->attachment);
            }

            $event->delete();
        }

        $this->info("Berhasil menghapus {$events->count()} event kedaluwarsa.");

        return self::SUCCESS;
    }
}
