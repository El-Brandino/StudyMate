<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pengumuman kini bisa menyasar lebih dari satu kelas,
     * sehingga target kelas disimpan di tabel pivot.
     */
    public function up(): void
    {
        Schema::create('pengumuman_kelas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pengumuman_id')
                ->constrained('pengumuman')
                ->cascadeOnDelete();

            $table->foreignId('class_id')
                ->constrained('kelas')
                ->cascadeOnDelete();

            $table->unique(['pengumuman_id', 'class_id']);

            $table->timestamps();
        });

        // Pindahkan data lama (kolom class_id) ke tabel pivot,
        // lalu hapus kolomnya agar tidak ada dua sumber data.
        if (Schema::hasColumn('pengumuman', 'class_id')) {
            $pengumuman = DB::table('pengumuman')
                ->whereNotNull('class_id')
                ->get(['id', 'class_id']);

            foreach ($pengumuman as $item) {
                DB::table('pengumuman_kelas')->insertOrIgnore([
                    'pengumuman_id' => $item->id,
                    'class_id' => $item->class_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('pengumuman', function (Blueprint $table) {
                $table->dropForeign(['class_id']);
                $table->dropColumn('class_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('pengumuman', 'class_id')) {
            Schema::table('pengumuman', function (Blueprint $table) {
                $table->foreignId('class_id')
                    ->nullable()
                    ->constrained('kelas')
                    ->nullOnDelete();
            });

            // Kembalikan satu kelas per pengumuman.
            $rows = DB::table('pengumuman_kelas')
                ->get(['pengumuman_id', 'class_id']);

            foreach ($rows as $row) {
                DB::table('pengumuman')
                    ->where('id', $row->pengumuman_id)
                    ->whereNull('class_id')
                    ->update(['class_id' => $row->class_id]);
            }
        }

        Schema::dropIfExists('pengumuman_kelas');
    }
};
