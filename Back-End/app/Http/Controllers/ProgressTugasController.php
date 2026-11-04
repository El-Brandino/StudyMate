<?php

namespace App\Http\Controllers;

use App\Models\ProgressTugas;
use App\Models\Tugas;
use Illuminate\Http\Request;

class ProgressTugasController extends Controller
{
    public function index(Request $request, $taskId)
    {
        $user = $request->user();

        if ($user->isTeacher()) {

            // Guru hanya boleh melihat progress
            // dari tugas yang dia buat
            $progress = ProgressTugas::with('student')
                ->where('task_id', $taskId)
                ->whereHas('task', function ($query) use ($user) {
                    $query->where('teacher_id', $user->id)
                        ->where('mode', 'individu');
                })
                ->get();

        } else {

            // Siswa hanya boleh melihat
            // progress miliknya sendiri
            $progress = ProgressTugas::with('student')
                ->where('task_id', $taskId)
                ->where('student_id', $user->id)
                ->whereHas('task', function ($query) use ($user) {
                    $query->where('mode', 'individu')
                        ->whereHas('kelas', function ($kelasQuery) use ($user) {
                            $kelasQuery->where('kelas.id', $user->class_id);
                        });
                })
                ->get();
        }

        return response()->json($progress);
    }

    public function myProgress(Request $request)
    {
        $user = $request->user();

        $total = ProgressTugas::where('student_id', $user->id)
            ->whereHas('task', fn ($query) => $query->where('mode', 'individu'))
            ->count();

        $selesai = ProgressTugas::where('student_id', $user->id)
            ->whereHas('task', fn ($query) => $query->where('mode', 'individu'))
            ->where('status', 'selesai')
            ->count();

        $persentase = $total > 0
            ? round(($selesai / $total) * 100)
            : 0;

        return response()->json([
            'total' => $total,
            'selesai' => $selesai,
            'belum' => $total - $selesai,
            'persentase' => $persentase,
        ]);
    }

    public function update(Request $request, $taskId)
    {
        $user = $request->user();

        $request->validate([
            'status' => 'required|in:belum,selesai',
        ]);

        // Siswa hanya boleh mengubah progress tugas
        // yang menyasar kelasnya sendiri.
        Tugas::where('id', $taskId)
            ->where('mode', 'individu')
            ->whereHas('kelas', function ($query) use ($user) {
                $query->where('kelas.id', $user->class_id);
            })
            ->firstOrFail();

        // Baris progress dibuat saat tugas dibuat. Jika siswa bergabung
        // ke kelas belakangan, barisnya dibuat saat pertama kali dicentang.
        $progress = ProgressTugas::updateOrCreate(
            [
                'task_id' => $taskId,
                'student_id' => $user->id,
            ],
            [
                'status' => $request->status,
                'completed_at' => $request->status === 'selesai'
                    ? now()
                    : null,
            ]
        );

        return response()->json([
            'message' => $request->status === 'selesai'
                ? 'Tugas berhasil diselesaikan'
                : 'Status tugas dikembalikan',
            'progress' => $progress,
        ]);
    }

    public function teacherProgress(Request $request)
{
    $user = $request->user();

    $request->validate([
        'grade' => 'nullable|string',
        'major_id' => 'nullable|integer|exists:majors,id',
        'class_number' => 'nullable|integer|min:1',
    ]);

    // Progress dari tugas milik guru ini, lalu disaring berdasarkan
    // kelas tempat siswa tersebut belajar (hanya jika filter dipilih).
    $query = ProgressTugas::whereHas('task', function ($query) use ($user) {
        $query->where('teacher_id', $user->id)
            ->where('mode', 'individu');
    });

    if (
        $request->filled('grade')
        || $request->filled('major_id')
        || $request->filled('class_number')
    ) {
        $query->whereHas('student.kelas', function ($query) use ($request) {
            if ($request->filled('grade')) {
                $query->where('grade', $request->grade);
            }

            if ($request->filled('major_id')) {
                $query->where('major_id', $request->major_id);
            }

            if ($request->filled('class_number')) {
                $query->where('class_number', $request->class_number);
            }
        });
    }

    $total = (clone $query)->count();

    $selesai = (clone $query)
        ->where('status', 'selesai')
        ->count();

    $belum = $total - $selesai;

    $persentase = $total > 0
        ? round(($selesai / $total) * 100)
        : 0;

    return response()->json([
        'total' => $total,
        'selesai' => $selesai,
        'belum' => $belum,
        'persentase' => $persentase,
    ]);
}
}