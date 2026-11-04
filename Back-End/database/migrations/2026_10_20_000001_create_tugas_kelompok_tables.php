<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tugas_kelompok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->dateTime('deadline');
            $table->unsignedSmallInteger('min_members')->nullable();
            $table->unsignedSmallInteger('max_members')->nullable();
            $table->timestamps();
        });

        Schema::create('tugas_kelompok_kelas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('kelas')->cascadeOnDelete();
            $table->unique(['tugas_kelompok_id', 'class_id']);
            $table->timestamps();
        });

        Schema::create('tugas_kelompok_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->timestamps();
        });

        Schema::create('kelompok_tugas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('kelas')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->unique(['tugas_kelompok_id', 'class_id', 'name']);
        });

        Schema::create('kelompok_anggota', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->foreignId('kelompok_tugas_id')->constrained('kelompok_tugas')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['ketua', 'anggota'])->default('anggota');
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->unique(['tugas_kelompok_id', 'student_id']);
            $table->unique(['kelompok_tugas_id', 'student_id']);
        });

        Schema::create('undangan_kelompok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->foreignId('kelompok_tugas_id')->constrained('kelompok_tugas')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['menunggu', 'diterima', 'ditolak', 'dibatalkan'])->default('menunggu');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['kelompok_tugas_id', 'student_id']);
            $table->index(['student_id', 'status']);
        });

        Schema::create('pekerjaan_kelompok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kelompok_tugas_id')->constrained('kelompok_tugas')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('deadline')->nullable();
            $table->enum('status', [
                'belum_dikerjakan',
                'sedang_dikerjakan',
                'menunggu_review',
                'selesai',
            ])->default('belum_dikerjakan');
            $table->text('result_notes')->nullable();
            $table->string('result_link', 2048)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('status_updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('status_updated_at')->nullable();
            $table->timestamps();

            $table->index(['kelompok_tugas_id', 'status']);
            $table->index('deadline');
        });

        Schema::create('pekerjaan_kelompok_anggota', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pekerjaan_kelompok_id')->constrained('pekerjaan_kelompok')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['pekerjaan_kelompok_id', 'student_id'],
                'pekerjaan_kelompok_anggota_unique'
            );
        });

        Schema::create('aktivitas_kelompok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->foreignId('kelompok_tugas_id')->constrained('kelompok_tugas')->cascadeOnDelete();
            $table->foreignId('pekerjaan_kelompok_id')->nullable()->constrained('pekerjaan_kelompok')->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['kelompok_tugas_id', 'created_at']);
        });

        Schema::create('umpan_balik_kelompok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_kelompok_id')->constrained('tugas_kelompok')->cascadeOnDelete();
            $table->foreignId('kelompok_tugas_id')->constrained('kelompok_tugas')->cascadeOnDelete();
            $table->foreignId('pekerjaan_kelompok_id')->nullable()->constrained('pekerjaan_kelompok')->nullOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('message');
            $table->timestamps();

            $table->index(['kelompok_tugas_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('umpan_balik_kelompok');
        Schema::dropIfExists('aktivitas_kelompok');
        Schema::dropIfExists('pekerjaan_kelompok_anggota');
        Schema::dropIfExists('pekerjaan_kelompok');
        Schema::dropIfExists('undangan_kelompok');
        Schema::dropIfExists('kelompok_anggota');
        Schema::dropIfExists('kelompok_tugas');
        Schema::dropIfExists('tugas_kelompok_documents');
        Schema::dropIfExists('tugas_kelompok_kelas');
        Schema::dropIfExists('tugas_kelompok');
    }
};
