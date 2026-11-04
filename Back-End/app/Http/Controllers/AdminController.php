<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Subject;
use App\Models\Kelas;
use App\Models\JadwalMapel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function dashboard()
    {
        return response()->json([
            'message' => 'Admin Dashboard',
        ]);
    }

    // === MANAJEMEN AKUN GURU ===
    public function createGuru(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'gender' => 'required|in:Male,Female',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'class_id' => 'nullable|integer|exists:kelas,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'gender' => $validated['gender'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'guru',
            'class_id' => $validated['class_id'] ?? null,
        ]);

        return response()->json([
            'message' => 'Akun guru berhasil dibuat.',
            'user' => $user,
        ], 201);
    }

    public function getTeachers()
    {
        $teachers = User::where('role', 'guru')
            ->with(['kelas.major', 'subjects'])
            ->orderBy('name')
            ->get();

        return response()->json($teachers);
    }

    public function getStudents()
    {
        $students = User::where('role', 'siswa')
            ->with(['kelas.major'])
            ->orderBy('name')
            ->get();

        return response()->json($students);
    }

    public function deleteUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'Tidak dapat menghapus akun admin.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Akun berhasil dihapus.',
        ]);
    }

    public function assignSubjectToTeacher(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => 'required|integer|exists:users,id',
            'subject_id' => 'required|integer|exists:subjects,id',
        ]);

        $teacher = User::findOrFail($validated['teacher_id']);
        if (!$teacher->isTeacher()) {
            return response()->json(['message' => 'User bukan guru.'], 422);
        }

        if ($teacher->subjects()->where('subjects.id', $validated['subject_id'])->exists()) {
            return response()->json([
                'message' => 'Guru sudah memiliki mapel ini.',
            ], 422);
        }

        $teacher->subjects()->attach($validated['subject_id']);

        return response()->json([
            'message' => 'Mapel berhasil ditambahkan ke guru.',
            'subjects' => $teacher->subjects()->get(),
        ], 201);
    }

    public function removeSubjectFromTeacher(Request $request, $teacher_id, $subject_id)
    {
        $teacher = User::findOrFail($teacher_id);
        if (!$teacher->isTeacher()) {
            return response()->json(['message' => 'User bukan guru.'], 422);
        }

        $teacher->subjects()->detach($subject_id);

        return response()->json([
            'message' => 'Mapel berhasil dihapus dari guru.',
        ]);
    }

    // === MANAJEMEN MAPEL ===
    public function createSubject(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:subjects,name',
        ]);

        $subject = Subject::create([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Mapel berhasil ditambahkan.',
            'subject' => $subject,
        ], 201);
    }

    public function deleteSubject(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);
        $subject->delete();

        return response()->json([
            'message' => 'Mapel berhasil dihapus.',
        ]);
    }

    // === MANAJEMEN JADWAL MAPEL ===
    public function createJadwal(Request $request)
    {
        $validated = $request->validate([
            'class_id' => 'required|integer|exists:kelas,id',
            'subject_id' => 'required|integer|exists:subjects,id',
            'teacher_id' => 'required|integer|exists:users,id',
            'hari' => 'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu',
            'jam_mulai' => 'required|date_format:H:i',
            'jam_selesai' => 'required|date_format:H:i',
            'urutan' => 'nullable|integer',
        ]);

        $teacher = User::findOrFail($validated['teacher_id']);
        if (!$teacher->isTeacher()) {
            return response()->json(['message' => 'Guru tidak valid.'], 422);
        }

        $jadwal = JadwalMapel::create($validated);

        return response()->json([
            'message' => 'Jadwal mapel berhasil ditambahkan.',
            'jadwal' => $jadwal->load(['kelas.major', 'subject', 'teacher']),
        ], 201);
    }

    public function getJadwal(Request $request)
    {
        $user = $request->user();

        $query = JadwalMapel::with(['kelas.major', 'subject', 'teacher:id,name'])
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->orderBy('urutan');

        if ($user->isAdmin()) {
            // Admin dapat memfilter berdasarkan kelas dan/atau guru.
            if ($request->filled('class_id')) {
                $query->where('class_id', $request->class_id);
            }
            if ($request->filled('teacher_id')) {
                $query->where('teacher_id', $request->teacher_id);
            }
        } elseif ($user->isTeacher()) {
            // Guru hanya melihat jadwal mengajarnya sendiri.
            $query->where('teacher_id', $user->id);
        } else {
            // Siswa hanya melihat jadwal kelasnya sendiri.
            $query->where('class_id', $user->class_id);
        }

        return response()->json($query->get());
    }

    public function updateJadwal(Request $request, $id)
    {
        $jadwal = JadwalMapel::findOrFail($id);

        $validated = $request->validate([
            'class_id' => 'required|integer|exists:kelas,id',
            'subject_id' => 'required|integer|exists:subjects,id',
            'teacher_id' => 'required|integer|exists:users,id',
            'hari' => 'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu',
            'jam_mulai' => 'required|date_format:H:i',
            'jam_selesai' => 'required|date_format:H:i',
            'urutan' => 'nullable|integer',
        ]);

        $jadwal->update($validated);

        return response()->json([
            'message' => 'Jadwal mapel berhasil diperbarui.',
            'jadwal' => $jadwal->load(['kelas.major', 'subject', 'teacher']),
        ]);
    }

    public function deleteJadwal(Request $request, $id)
    {
        $jadwal = JadwalMapel::findOrFail($id);
        $jadwal->delete();

        return response()->json([
            'message' => 'Jadwal mapel berhasil dihapus.',
        ]);
    }

    public function getAllAccounts()
    {
        $accounts = User::with(['kelas.major'])
            ->orderBy('role')
            ->orderBy('name')
            ->get();

        return response()->json($accounts);
    }
}
