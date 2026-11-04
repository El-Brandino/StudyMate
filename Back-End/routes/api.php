<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\TugasController;
use App\Http\Controllers\KelompokTugasController;
use App\Http\Controllers\PekerjaanKelompokController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\KelasController;
use App\Http\Controllers\ProgressTugasController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PengumumanController;
use App\Http\Controllers\UjianController;
use App\Http\Controllers\AdminController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/kelas', [KelasController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin
    Route::middleware('admin')->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/teachers', [AdminController::class, 'getTeachers']);
        Route::get('/admin/students', [AdminController::class, 'getStudents']);
        Route::get('/admin/accounts', [AdminController::class, 'getAllAccounts']);
        Route::post('/admin/create-guru', [AdminController::class, 'createGuru']);
        Route::post('/admin/create-subject', [AdminController::class, 'createSubject']);
        Route::delete('/admin/subject/{id}', [AdminController::class, 'deleteSubject']);
        Route::delete('/admin/user/{id}', [AdminController::class, 'deleteUser']);
        Route::post('/admin/assign-subject', [AdminController::class, 'assignSubjectToTeacher']);
        Route::delete('/admin/teacher/{teacher_id}/subject/{subject_id}', [AdminController::class, 'removeSubjectFromTeacher']);
        Route::post('/admin/jadwal', [AdminController::class, 'createJadwal']);
        Route::get('/admin/jadwal', [AdminController::class, 'getJadwal']);
        Route::put('/admin/jadwal/{id}', [AdminController::class, 'updateJadwal']);
        Route::delete('/admin/jadwal/{id}', [AdminController::class, 'deleteJadwal']);
    });

    // Jadwal mapel untuk guru & murid
    Route::get('/jadwal-mapel', [AdminController::class, 'getJadwal']);

    // Subject (kelas sudah didefinisikan sebagai route publik di atas)
    Route::get('/subjects', [SubjectController::class, 'index']);

    // Profile
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put(
        '/profile/password',
        [ProfileController::class, 'changePassword']
    );

    // READ tugas
    Route::get('/tugas', [TugasController::class, 'index']);
    Route::get('/tugas/{id}', [TugasController::class, 'show']);

    // Progress
    Route::get(
        '/tugas/{taskId}/progress',
        [ProgressTugasController::class, 'index']
    );

    // Kelompok untuk tugas mode kelompok.
    Route::get('/undangan-kelompok', [KelompokTugasController::class, 'invitations']);
    Route::patch('/undangan-kelompok/{id}', [KelompokTugasController::class, 'respondInvitation']);
    Route::get('/kelompok-tugas/{id}', [KelompokTugasController::class, 'show']);
    Route::get('/kelompok-tugas/{id}/aktivitas', [KelompokTugasController::class, 'activity']);
    Route::get(
        '/kelompok-tugas/{id}/siswa-tersedia',
        [KelompokTugasController::class, 'availableStudents']
    );
    Route::post('/tugas/{id}/kelompok', [KelompokTugasController::class, 'store']);
    Route::post('/kelompok-tugas/{id}/undangan', [KelompokTugasController::class, 'invite']);
    Route::delete(
        '/kelompok-tugas/{id}/undangan/{undanganId}',
        [KelompokTugasController::class, 'cancelInvitation']
    );
    Route::post('/kelompok-tugas/{id}/pekerjaan', [PekerjaanKelompokController::class, 'store']);
    Route::put(
        '/kelompok-tugas/{id}/pekerjaan/{pekerjaanId}',
        [PekerjaanKelompokController::class, 'update']
    );
    Route::patch(
        '/kelompok-tugas/{id}/pekerjaan/{pekerjaanId}',
        [PekerjaanKelompokController::class, 'update']
    );
    Route::delete(
        '/kelompok-tugas/{id}/pekerjaan/{pekerjaanId}',
        [PekerjaanKelompokController::class, 'destroy']
    );
    Route::patch(
        '/kelompok-tugas/{id}/pekerjaan/{pekerjaanId}/status',
        [PekerjaanKelompokController::class, 'updateStatus']
    );

    // Guru
    Route::middleware('teacher')->group(function () {

        Route::get(
            '/tugas/{id}/pemantauan',
            [TugasController::class, 'monitoring']
        );
        Route::delete(
            '/tugas/{id}/dokumen/{documentId}',
            [TugasController::class, 'destroyDocument']
        );
        Route::post(
            '/kelompok-tugas/{id}/umpan-balik',
            [KelompokTugasController::class, 'feedback']
        );
        Route::patch(
            '/kelompok-tugas/{id}/pekerjaan/{pekerjaanId}/koreksi',
            [PekerjaanKelompokController::class, 'teacherCorrection']
        );

        Route::post('/tugas', [TugasController::class, 'store']);
        Route::put('/tugas/{id}', [TugasController::class, 'update']);
        Route::patch('/tugas/{id}', [TugasController::class, 'update']);
        Route::delete('/tugas/{id}', [TugasController::class, 'destroy']);
        Route::get(
            '/teacher/progress',
            [ProgressTugasController::class, 'teacherProgress']
        );

    });

    // Ujian: guru dan siswa yang sudah login dapat melihat jadwal
    Route::get('/ujian', [UjianController::class, 'index']);
    Route::get('/ujian/{id}', [UjianController::class, 'show']);
    Route::get(
        '/ujian/{id}/document',
        [UjianController::class, 'downloadDocument']
    );

    // Ujian: hanya guru
    Route::middleware('teacher')->group(function () {
        Route::post('/ujian', [UjianController::class, 'store']);
        Route::put('/ujian/{id}', [UjianController::class, 'update']);
        Route::delete('/ujian/{id}', [UjianController::class, 'destroy']);
    });

    // Pengumuman
    Route::get('/pengumuman', [PengumumanController::class, 'index']);

        Route::middleware('teacher')->group(function () {
        Route::post('/pengumuman', [PengumumanController::class, 'store']);
        Route::put('/pengumuman/{id}', [PengumumanController::class, 'update']);
        Route::delete('/pengumuman/{id}', [PengumumanController::class, 'destroy']);
    });

    Route::get(
        '/progress',
        [ProgressTugasController::class, 'myProgress']
    );

    Route::patch(
        '/tugas/{taskId}/progress',
        [ProgressTugasController::class, 'update']
    );

    Route::get(
        '/my-subjects',
        [SubjectController::class, 'mySubjects']
    );
});