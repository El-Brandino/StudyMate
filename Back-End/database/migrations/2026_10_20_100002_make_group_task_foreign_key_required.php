<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            'kelompok_tugas',
            'kelompok_anggota',
            'undangan_kelompok',
            'aktivitas_kelompok',
            'umpan_balik_kelompok',
        ] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('tugas_id')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'kelompok_tugas',
            'kelompok_anggota',
            'undangan_kelompok',
            'aktivitas_kelompok',
            'umpan_balik_kelompok',
        ] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('tugas_id')->nullable()->change();
            });
        }
    }
};
