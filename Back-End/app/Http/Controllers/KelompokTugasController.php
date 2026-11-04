<?php

namespace App\Http\Controllers;

use App\Models\KelompokAnggota;
use App\Models\KelompokTugas;
use App\Models\PekerjaanKelompok;
use App\Models\Tugas;
use App\Models\UndanganKelompok;
use App\Models\UmpanBalikKelompok;
use App\Models\User;
use App\Support\KelompokActivityLogger;
use App\Support\KelompokTugasPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class KelompokTugasController extends Controller
{
    public function store(Request $request, string $tugasId)
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json([
                'message' => 'Hanya siswa yang dapat membuat kelompok.',
            ], 403);
        }

        $tugas = $this->studentAssignment($user, $tugasId);

        if ($tugas->mode !== 'kelompok') {
            return response()->json([
                'message' => 'Kelompok hanya dapat dibentuk untuk tugas kelompok.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:80',
                Rule::unique('kelompok_tugas', 'name')
                    ->where('tugas_id', $tugas->id)
                    ->where('class_id', $user->class_id),
            ],
        ]);

        if (KelompokAnggota::where('tugas_id', $tugas->id)
            ->where('student_id', $user->id)
            ->exists()) {
            return response()->json([
                'message' => 'Kamu sudah tergabung dalam kelompok untuk tugas ini.',
            ], 422);
        }

        $kelompok = DB::transaction(function () use ($validated, $tugas, $user) {
            $kelompok = KelompokTugas::create([
                'tugas_id' => $tugas->id,
                'class_id' => $user->class_id,
                'created_by' => $user->id,
                'name' => $validated['name'],
            ]);

            KelompokAnggota::create([
                'tugas_id' => $tugas->id,
                'kelompok_tugas_id' => $kelompok->id,
                'student_id' => $user->id,
                'role' => 'ketua',
                'joined_at' => now(),
            ]);

            KelompokActivityLogger::log(
                $kelompok,
                $user,
                'kelompok_dibuat',
                'Membuat kelompok "' . $kelompok->name . '".',
                null,
                ['name' => $kelompok->name]
            );

            return $kelompok;
        });

        return $this->groupResponse($kelompok, $user, 201, 'Kelompok berhasil dibuat.');
    }

    public function show(Request $request, string $kelompokId)
    {
        $user = $request->user();
        $kelompok = $this->accessibleGroup($user, $kelompokId);

        return response()->json($this->loadGroup($kelompok, $user));
    }

    public function availableStudents(Request $request, string $kelompokId)
    {
        $user = $request->user();
        $kelompok = $this->accessibleGroup($user, $kelompokId, memberOnly: true);

        $anggotaIds = KelompokAnggota::where('tugas_id', $kelompok->tugas_id)
            ->pluck('student_id');

        $terundang = UndanganKelompok::where('kelompok_tugas_id', $kelompok->id)
            ->where('status', 'menunggu')
            ->pluck('student_id');

        $students = User::where('role', 'siswa')
            ->where('class_id', $kelompok->class_id)
            ->whereNotIn('id', $anggotaIds)
            ->where('id', '!=', $user->id)
            ->orderBy('name')
            ->get(['id', 'name', 'profile_photo'])
            ->map(function ($student) use ($terundang) {
                $student->setAttribute('sudah_diundang', $terundang->contains($student->id));

                return $student;
            });

        return response()->json($students);
    }

    public function invitations(Request $request)
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json([
                'message' => 'Hanya siswa yang memiliki undangan kelompok.',
            ], 403);
        }

        $invitations = UndanganKelompok::with([
            'kelompok:id,name,class_id,created_by',
            'kelompok.kelas.major',
            'kelompok.pembuat:id,name',
            'pengundang:id,name',
            'tugas:id,teacher_id,subject_id,title,deadline,mode',
            'tugas.subject:id,name',
            'tugas.teacher:id,name',
        ])
            ->where('student_id', $user->id)
            ->where('status', 'menunggu')
            ->latest()
            ->get();

        return response()->json($invitations);
    }

    public function respondInvitation(Request $request, string $undanganId)
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json([
                'message' => 'Hanya siswa yang dapat menjawab undangan.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['diterima', 'ditolak'])],
        ]);

        $result = DB::transaction(function () use ($undanganId, $user, $validated) {
            $undangan = UndanganKelompok::where('id', $undanganId)
                ->where('student_id', $user->id)
                ->where('status', 'menunggu')
                ->lockForUpdate()
                ->firstOrFail();

            $kelompok = KelompokTugas::with('tugas')
                ->lockForUpdate()
                ->findOrFail($undangan->kelompok_tugas_id);

            if ($validated['status'] === 'ditolak') {
                $undangan->update([
                    'status' => 'ditolak',
                    'responded_at' => now(),
                ]);

                KelompokActivityLogger::log(
                    $kelompok,
                    $user,
                    'undangan_ditolak',
                    $user->name . ' menolak undangan kelompok.',
                    null,
                    ['student_id' => $user->id]
                );

                return $undangan;
            }

            if ((int) $user->class_id !== (int) $kelompok->class_id) {
                throw ValidationException::withMessages([
                    'status' => 'Undangan ini bukan untuk kelasmu.',
                ]);
            }

            if (!$kelompok->tugas?->kelas()
                ->where('kelas.id', $user->class_id)
                ->exists()) {
                throw ValidationException::withMessages([
                    'status' => 'Kelasmu tidak termasuk dalam tugas kelompok ini.',
                ]);
            }

            $sudahAnggota = KelompokAnggota::where('tugas_id', $kelompok->tugas_id)
                ->where('student_id', $user->id)
                ->exists();

            if ($sudahAnggota) {
                throw ValidationException::withMessages([
                    'status' => 'Kamu sudah tergabung dalam kelompok untuk tugas ini.',
                ]);
            }

            $max = $kelompok->tugas?->max_members;

            if ($max && $kelompok->anggota()->count() >= $max) {
                throw ValidationException::withMessages([
                    'status' => 'Kelompok ini sudah penuh.',
                ]);
            }

            KelompokAnggota::create([
                'tugas_id' => $kelompok->tugas_id,
                'kelompok_tugas_id' => $kelompok->id,
                'student_id' => $user->id,
                'role' => 'anggota',
                'joined_at' => now(),
            ]);

            $undangan->update([
                'status' => 'diterima',
                'responded_at' => now(),
            ]);

            KelompokActivityLogger::log(
                $kelompok,
                $user,
                'anggota_bergabung',
                $user->name . ' bergabung ke kelompok.',
                null,
                ['student_id' => $user->id]
            );

            return $undangan;
        });

        return response()->json([
            'message' => $validated['status'] === 'diterima'
                ? 'Undangan diterima. Kamu sekarang menjadi anggota kelompok.'
                : 'Undangan ditolak.',
            'undangan' => $result,
        ]);
    }

    public function invite(Request $request, string $kelompokId)
    {
        $user = $request->user();
        $kelompok = $this->accessibleGroup($user, $kelompokId, memberOnly: true);

        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
        ]);

        $tugas = $kelompok->tugas;
        $students = User::whereIn('id', $validated['student_ids'])
            ->where('role', 'siswa')
            ->get();

        if ($students->count() !== count($validated['student_ids'])) {
            throw ValidationException::withMessages([
                'student_ids' => 'Semua undangan harus ditujukan kepada siswa yang valid.',
            ]);
        }

        $studentIds = $students->pluck('id');

        if ($studentIds->contains($user->id)) {
            throw ValidationException::withMessages([
                'student_ids' => 'Kamu tidak perlu mengundang dirimu sendiri.',
            ]);
        }

        if ($students->contains(
            fn ($student) => (int) $student->class_id !== (int) $kelompok->class_id
        )) {
            throw ValidationException::withMessages([
                'student_ids' => 'Semua anggota harus berasal dari kelas yang sama dengan kelompok.',
            ]);
        }

        $sudahAnggota = KelompokAnggota::where('tugas_id', $tugas->id)
            ->whereIn('student_id', $studentIds)
            ->pluck('student_id');

        if ($sudahAnggota->isNotEmpty()) {
            throw ValidationException::withMessages([
                'student_ids' => 'Sebagian siswa sudah tergabung dalam kelompok lain untuk tugas ini.',
            ]);
        }

        $pendingIds = UndanganKelompok::where('kelompok_tugas_id', $kelompok->id)
            ->where('status', 'menunggu')
            ->whereIn('student_id', $studentIds)
            ->pluck('student_id');

        $newIds = $studentIds->diff($pendingIds)->values();

        if ($newIds->isEmpty()) {
            return response()->json([
                'message' => 'Semua siswa yang dipilih sudah diundang.',
                'undangan' => $kelompok->undangan()
                    ->with('student:id,name,profile_photo')
                    ->where('status', 'menunggu')
                    ->get(),
            ], 422);
        }

        $max = $tugas->max_members;

        if ($max) {
            $jumlahAktif = $kelompok->anggota()->count();
            $jumlahPending = $kelompok->undangan()->where('status', 'menunggu')->count();

            if ($jumlahAktif + $jumlahPending + $newIds->count() > $max) {
                throw ValidationException::withMessages([
                    'student_ids' => 'Jumlah anggota dan undangan akan melebihi batas maksimal kelompok.',
                ]);
            }
        }

        foreach ($newIds as $studentId) {
            UndanganKelompok::updateOrCreate(
                [
                    'kelompok_tugas_id' => $kelompok->id,
                    'student_id' => $studentId,
                ],
                [
                    'tugas_id' => $tugas->id,
                    'invited_by' => $user->id,
                    'status' => 'menunggu',
                    'responded_at' => null,
                ]
            );
        }

        $nama = $students->whereIn('id', $newIds)->pluck('name')->implode(', ');

        KelompokActivityLogger::log(
            $kelompok,
            $user,
            'undangan_dikirim',
            'Mengundang ' . $nama . ' ke kelompok.',
            null,
            ['student_ids' => $newIds->all()]
        );

        return response()->json([
            'message' => 'Undangan berhasil dikirim.',
            'undangan' => $kelompok->undangan()
                ->with('student:id,name,profile_photo')
                ->where('status', 'menunggu')
                ->get(),
        ]);
    }

    public function cancelInvitation(Request $request, string $kelompokId, string $undanganId)
    {
        $user = $request->user();
        $kelompok = $this->accessibleGroup($user, $kelompokId, memberOnly: true);

        $undangan = $kelompok->undangan()
            ->where('id', $undanganId)
            ->where('status', 'menunggu')
            ->firstOrFail();

        $undangan->update([
            'status' => 'dibatalkan',
            'responded_at' => now(),
        ]);

        KelompokActivityLogger::log(
            $kelompok,
            $user,
            'undangan_dibatalkan',
            'Membatalkan undangan untuk ' . ($undangan->student?->name ?? 'siswa') . '.',
            null,
            ['student_id' => $undangan->student_id]
        );

        return response()->json([
            'message' => 'Undangan dibatalkan.',
            'undangan' => $kelompok->undangan()
                ->with('student:id,name,profile_photo')
                ->where('status', 'menunggu')
                ->get(),
        ]);
    }

    public function activity(Request $request, string $kelompokId)
    {
        $user = $request->user();
        $kelompok = $this->accessibleGroup($user, $kelompokId);

        $activity = $kelompok->aktivitas()
            ->with('actor:id,name,profile_photo')
            ->limit(100)
            ->get();

        return response()->json($activity);
    }

    public function feedback(Request $request, string $kelompokId)
    {
        $user = $request->user();
        $kelompok = $this->teacherGroup($user, $kelompokId);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'pekerjaan_id' => ['nullable', 'integer'],
        ]);

        $pekerjaan = null;

        if (!empty($validated['pekerjaan_id'])) {
            $pekerjaan = $kelompok->pekerjaan()
                ->where('id', $validated['pekerjaan_id'])
                ->firstOrFail();
        }

        $feedback = UmpanBalikKelompok::create([
            'tugas_id' => $kelompok->tugas_id,
            'kelompok_tugas_id' => $kelompok->id,
            'pekerjaan_kelompok_id' => $pekerjaan?->id,
            'teacher_id' => $user->id,
            'message' => $validated['message'],
        ]);

        KelompokActivityLogger::log(
            $kelompok,
            $user,
            'umpan_balik_guru',
            $pekerjaan
                ? 'Guru memberi umpan balik pada pekerjaan "' . $pekerjaan->title . '".'
                : 'Guru memberi umpan balik pada kelompok.',
            $pekerjaan,
            ['message' => $validated['message']]
        );

        return response()->json([
            'message' => 'Umpan balik berhasil disimpan.',
            'umpan_balik' => $feedback->load('teacher:id,name', 'pekerjaan:id,title'),
        ], 201);
    }

    private function groupResponse(
        KelompokTugas $kelompok,
        User $user,
        int $status = 200,
        ?string $message = null
    ) {
        $payload = [
            'kelompok' => $this->loadGroup($kelompok->fresh(), $user),
        ];

        if ($message) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }

    private function loadGroup(KelompokTugas $kelompok, User $user): KelompokTugas
    {
        $kelompok->load([
            'tugas.teacher:id,name,profile_photo',
            'tugas.subject:id,name',
            'tugas.kelas.major:id,name',
            'tugas.documents',
            'kelas.major',
            'pembuat:id,name',
            'anggota.student:id,name,profile_photo,class_id',
            'undangan.student:id,name,profile_photo',
            'undangan.pengundang:id,name',
            'pekerjaan.penanggungJawab:id,name,profile_photo',
            'pekerjaan.pembuat:id,name',
            'pekerjaan.statusUpdater:id,name',
            'umpanBalik.teacher:id,name',
            'umpanBalik.pekerjaan:id,title',
            'aktivitas.actor:id,name,profile_photo',
        ]);

        $membership = $kelompok->anggota
            ->firstWhere('student_id', $user->id);

        $isMember = $user->isStudent() && $membership !== null;
        $isTeacher = $user->isTeacher()
            && (int) $kelompok->tugas?->teacher_id === (int) $user->id;

        $kelompok->setAttribute('permissions', [
            'can_manage_invitations' => $isMember,
            'can_create_work' => $isMember,
            'can_edit_work' => $isMember,
            'can_delete_work' => $isMember,
            'can_give_feedback' => $isTeacher,
            'can_correct' => $isTeacher,
        ]);

        $kelompok->setAttribute('current_membership', $membership ? [
            'id' => $membership->id,
            'role' => $membership->role,
            'joined_at' => $membership->joined_at,
        ] : null);

        $kelompok->pekerjaan->each(function (PekerjaanKelompok $pekerjaan) use ($user, $membership, $isMember) {
            $isAssignee = $pekerjaan->penanggungJawab
                ->contains(fn ($student) => $student->id === $user->id);

            $pekerjaan->setAttribute('permissions', [
                'can_edit' => $isMember,
                'can_delete' => $isMember && (
                    $membership?->role === 'ketua'
                    || (int) $pekerjaan->created_by === (int) $user->id
                ),
                'can_update_status' => $isMember && $isAssignee,
                'can_review' => $isMember && $pekerjaan->status === 'menunggu_review',
                'can_reopen' => $isMember && in_array(
                    $pekerjaan->status,
                    ['menunggu_review', 'selesai'],
                    true
                ),
            ]);
        });

        return $kelompok;
    }

    private function accessibleGroup(
        User $user,
        string $kelompokId,
        bool $memberOnly = false
    ): KelompokTugas {
        $query = KelompokTugas::with('tugas');

        if ($user->isTeacher()) {
            if ($memberOnly) {
                abort(403, 'Hanya anggota kelompok yang dapat melakukan tindakan ini.');
            }

            $query->whereHas('tugas', function ($q) use ($user) {
                $q->where('teacher_id', $user->id);
            });
        } elseif ($user->isStudent()) {
            $query->whereHas('anggota', function ($q) use ($user) {
                $q->where('student_id', $user->id);
            });
        } else {
            abort(403, 'Kamu tidak memiliki akses ke kelompok ini.');
        }

        return $query->findOrFail($kelompokId);
    }

    private function teacherGroup(User $user, string $kelompokId): KelompokTugas
    {
        if (!$user->isTeacher()) {
            abort(403, 'Hanya guru yang dapat melakukan tindakan ini.');
        }

        return KelompokTugas::with('tugas')
            ->whereHas('tugas', function ($q) use ($user) {
                $q->where('teacher_id', $user->id);
            })
            ->findOrFail($kelompokId);
    }

    private function studentAssignment(User $user, string $tugasId): Tugas
    {
        if (!$user->isStudent() || !$user->class_id) {
            abort(403, 'Kamu tidak memiliki kelas yang terdaftar.');
        }

        return Tugas::with('kelas')
            ->where('id', $tugasId)
            ->whereHas('kelas', function ($q) use ($user) {
                $q->where('kelas.id', $user->class_id);
            })
            ->firstOrFail();
    }

    private function groupSummary(KelompokTugas $kelompok): array
    {
        return KelompokTugasPresenter::groupSummary($kelompok);
    }
}
