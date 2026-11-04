<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const GROUP_TABLES = [
        'kelompok_tugas',
        'kelompok_anggota',
        'undangan_kelompok',
        'aktivitas_kelompok',
        'umpan_balik_kelompok',
    ];

    public function up(): void
    {
        if (!Schema::hasTable('tugas_kelompok')) {
            return;
        }

        foreach (self::GROUP_TABLES as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'tugas_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->unsignedBigInteger('tugas_id')->nullable()->after('id');
                });
            }
        }

        $mapping = [];

        DB::table('tugas_kelompok')
            ->orderBy('id')
            ->get()
            ->each(function ($legacy) use (&$mapping) {
                $tugasId = DB::table('tugas')->insertGetId([
                    'teacher_id' => $legacy->teacher_id,
                    'mode' => 'kelompok',
                    'subject_id' => $legacy->subject_id,
                    'title' => $legacy->title,
                    'description' => $legacy->description,
                    'instructions' => $legacy->instructions,
                    'min_members' => $legacy->min_members,
                    'max_members' => $legacy->max_members,
                    'deadline' => $legacy->deadline,
                    'created_at' => $legacy->created_at,
                    'updated_at' => $legacy->updated_at,
                ]);

                $mapping[(int) $legacy->id] = $tugasId;

                if (Schema::hasTable('tugas_kelompok_kelas')) {
                    DB::table('tugas_kelompok_kelas')
                        ->where('tugas_kelompok_id', $legacy->id)
                        ->get()
                        ->each(function ($class) use ($tugasId) {
                            DB::table('tugas_kelas')->updateOrInsert(
                                ['tugas_id' => $tugasId, 'class_id' => $class->class_id],
                                [
                                    'created_at' => $class->created_at ?? now(),
                                    'updated_at' => $class->updated_at ?? now(),
                                ]
                            );
                        });
                }

                if (Schema::hasTable('tugas_kelompok_documents')) {
                    DB::table('tugas_kelompok_documents')
                        ->where('tugas_kelompok_id', $legacy->id)
                        ->get()
                        ->each(function ($document) use ($tugasId) {
                            DB::table('tugas_documents')->insert([
                                'tugas_id' => $tugasId,
                                'file_name' => $document->file_name,
                                'file_path' => $document->file_path,
                                'created_at' => $document->created_at,
                                'updated_at' => $document->updated_at,
                            ]);
                        });
                }
            });

        foreach ($mapping as $legacyId => $tugasId) {
            foreach (self::GROUP_TABLES as $tableName) {
                if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'tugas_id')) {
                    DB::table($tableName)
                        ->where('tugas_kelompok_id', $legacyId)
                        ->update(['tugas_id' => $tugasId]);
                }
            }
        }

        $this->dropLegacyColumns();

        foreach (self::GROUP_TABLES as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('tugas_id')->references('id')->on('tugas')->cascadeOnDelete();
            });
        }

        Schema::table('kelompok_tugas', function (Blueprint $table) {
            $table->unique(['tugas_id', 'class_id', 'name']);
        });

        Schema::table('kelompok_anggota', function (Blueprint $table) {
            $table->unique(['tugas_id', 'student_id']);
        });

        Schema::table('undangan_kelompok', function (Blueprint $table) {
            $table->index(['tugas_id', 'status']);
        });

        Schema::table('aktivitas_kelompok', function (Blueprint $table) {
            $table->index(['tugas_id', 'created_at']);
        });

        Schema::table('umpan_balik_kelompok', function (Blueprint $table) {
            $table->index(['tugas_id', 'created_at']);
        });

        Schema::dropIfExists('tugas_kelompok_documents');
        Schema::dropIfExists('tugas_kelompok_kelas');
        Schema::dropIfExists('tugas_kelompok');
    }

    private function dropLegacyColumns(): void
    {
        if (Schema::hasTable('kelompok_tugas')) {
            Schema::table('kelompok_tugas', function (Blueprint $table) {
                $table->dropForeign(['tugas_kelompok_id']);
            });
            Schema::table('kelompok_tugas', function (Blueprint $table) {
                $table->dropUnique('kelompok_tugas_tugas_kelompok_id_class_id_name_unique');
            });
            Schema::table('kelompok_tugas', function (Blueprint $table) {
                $table->dropColumn('tugas_kelompok_id');
            });
        }

        if (Schema::hasTable('kelompok_anggota')) {
            Schema::table('kelompok_anggota', function (Blueprint $table) {
                $table->dropForeign(['tugas_kelompok_id']);
            });
            Schema::table('kelompok_anggota', function (Blueprint $table) {
                $table->dropUnique('kelompok_anggota_tugas_kelompok_id_student_id_unique');
            });
            Schema::table('kelompok_anggota', function (Blueprint $table) {
                $table->dropColumn('tugas_kelompok_id');
            });
        }

        foreach (['undangan_kelompok', 'aktivitas_kelompok', 'umpan_balik_kelompok'] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['tugas_kelompok_id']);
            });
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('tugas_kelompok_id');
            });
        }
    }

    public function down(): void
    {
        // Migrasi ini menggabungkan dua model data. Rollback otomatis tidak
        // dilakukan agar riwayat kelompok dan pekerjaan tidak hilang.
    }
};
