<?php

namespace App\Http\Controllers;

use App\Models\KelompokAnggota;
use App\Models\KelompokTugas;
use App\Models\PekerjaanKelompok;
use App\Support\KelompokActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PekerjaanKelompokController extends Controller
{
    public function store(Request $request, string $kelompokId)
    {
        $user = $request->user();
        $kelompok = $this->memberGroup($user, $kelompokId);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deadline' => ['nullable', 'date'],
            'result_notes' => ['nullable', 'string'],
            'result_link' => ['nullable', 'url', 'max:2048'],
            'assignee_ids' => ['required', 'array', 'min:1'],
            'assignee_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $assignees = $this->validateAssignees($kelompok, $validated['assignee_ids']);

        $pekerjaan = DB::transaction(function () use ($validated, $kelompok, $user, $assignees) {
            $pekerjaan = $kelompok->pekerjaan()->create([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'deadline' => $validated['deadline'] ?? null,
                'status' => 'belum_dikerjakan',
                'result_notes' => $validated['result_notes'] ?? null,
                'result_link' => $validated['result_link'] ?? null,
                'created_by' => $user->id,
            ]);

            $this->syncAssignees($pekerjaan, $assignees, $user);

            KelompokActivityLogger::log(
                $kelompok,
                $user,
                'pekerjaan_dibuat',
                'Menambahkan pekerjaan "' . $pekerjaan->title . '".',
                $pekerjaan,
                [
                    'title' => $pekerjaan->title,
                    'assignee_ids' => $assignees->pluck('id')->all(),
                ]
            );

            return $pekerjaan;
        });

        return $this->workResponse($kelompok, $pekerjaan, $user, 'Pekerjaan berhasil ditambahkan.', 201);
    }

    public function update(Request $request, string $kelompokId, string $pekerjaanId)
    {
        $user = $request->user();
        $kelompok = $this->memberGroup($user, $kelompokId);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deadline' => ['nullable', 'date'],
            'result_notes' => ['nullable', 'string'],
            'result_link' => ['nullable', 'url', 'max:2048'],
            'assignee_ids' => ['required', 'array', 'min:1'],
            'assignee_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $pekerjaan = $kelompok->pekerjaan()->with('penanggungJawab')->findOrFail($pekerjaanId);
        $assignees = $this->validateAssignees($kelompok, $validated['assignee_ids']);

        $oldAssignees = $pekerjaan->penanggungJawab->pluck('id')->sort()->values()->all();
        $old = [
            'title' => $pekerjaan->title,
            'description' => $pekerjaan->description,
            'deadline' => $pekerjaan->deadline?->toDateTimeString(),
            'result_notes' => $pekerjaan->result_notes,
            'result_link' => $pekerjaan->result_link,
        ];

        DB::transaction(function () use (
            $pekerjaan,
            $validated,
            $assignees,
            $user,
            $kelompok,
            $old,
            $oldAssignees
        ) {
            $pekerjaan->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'deadline' => $validated['deadline'] ?? null,
                'result_notes' => $validated['result_notes'] ?? null,
                'result_link' => $validated['result_link'] ?? null,
            ]);

            $this->syncAssignees($pekerjaan, $assignees, $user);

            $newAssignees = $assignees->pluck('id')->sort()->values()->all();

            KelompokActivityLogger::log(
                $kelompok,
                $user,
                'pekerjaan_diperbarui',
                'Memperbarui pekerjaan "' . $pekerjaan->title . '".',
                $pekerjaan,
                [
                    'old' => $old,
                    'new' => [
                        'title' => $pekerjaan->title,
                        'description' => $pekerjaan->description,
                        'deadline' => $pekerjaan->deadline?->toDateTimeString(),
                        'result_notes' => $pekerjaan->result_notes,
                        'result_link' => $pekerjaan->result_link,
                    ],
                    'old_assignee_ids' => $oldAssignees,
                    'new_assignee_ids' => $newAssignees,
                ]
            );
        });

        return $this->workResponse(
            $kelompok,
            $pekerjaan->fresh(),
            $user,
            'Pekerjaan berhasil diperbarui.'
        );
    }

    public function updateStatus(
        Request $request,
        string $kelompokId,
        string $pekerjaanId
    ) {
        $user = $request->user();
        $kelompok = $this->memberGroup($user, $kelompokId);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                'belum_dikerjakan',
                'sedang_dikerjakan',
                'menunggu_review',
                'selesai',
            ])],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $pekerjaan = $kelompok->pekerjaan()
            ->with('penanggungJawab')
            ->findOrFail($pekerjaanId);

        $statusBaru = $validated['status'];
        $statusLama = $pekerjaan->status;

        if ($statusBaru === $statusLama) {
            throw ValidationException::withMessages([
                'status' => 'Status pekerjaan sudah sama.',
            ]);
        }

        $transitions = [
            'belum_dikerjakan' => ['sedang_dikerjakan', 'menunggu_review'],
            'sedang_dikerjakan' => ['belum_dikerjakan', 'menunggu_review'],
            'menunggu_review' => ['sedang_dikerjakan', 'selesai'],
            'selesai' => ['sedang_dikerjakan'],
        ];

        if (!in_array($statusBaru, $transitions[$statusLama] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => 'Perubahan status tersebut tidak diizinkan.',
            ]);
        }

        $isAssignee = $pekerjaan->penanggungJawab
            ->contains(fn ($student) => $student->id === $user->id);

        $isReviewAction = $statusBaru === 'selesai'
            || (
                in_array($statusLama, ['menunggu_review', 'selesai'], true)
                && $statusBaru === 'sedang_dikerjakan'
            );

        if (!$isAssignee && !$isReviewAction) {
            return response()->json([
                'message' => 'Hanya penanggung jawab pekerjaan yang dapat memperbarui status ini.',
            ], 403);
        }

        $pekerjaan->update([
            'status' => $statusBaru,
            'status_updated_by' => $user->id,
            'status_updated_at' => now(),
        ]);

        $statusLabel = $pekerjaan->status_label;

        KelompokActivityLogger::log(
            $kelompok,
            $user,
            'status_pekerjaan_diubah',
            'Mengubah status "' . $pekerjaan->title . '" menjadi ' . $statusLabel . '.',
            $pekerjaan,
            [
                'old_status' => $statusLama,
                'new_status' => $statusBaru,
                'note' => $validated['note'] ?? null,
            ]
        );

        return $this->workResponse(
            $kelompok,
            $pekerjaan->fresh(),
            $user,
            'Status pekerjaan berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, string $kelompokId, string $pekerjaanId)
    {
        $user = $request->user();
        $kelompok = $this->memberGroup($user, $kelompokId);
        $pekerjaan = $kelompok->pekerjaan()->findOrFail($pekerjaanId);

        $membership = $kelompok->anggota()
            ->where('student_id', $user->id)
            ->first();

        if (
            $membership?->role !== 'ketua'
            && (int) $pekerjaan->created_by !== (int) $user->id
        ) {
            return response()->json([
                'message' => 'Hanya ketua kelompok atau pembuat pekerjaan yang dapat menghapusnya.',
            ], 403);
        }

        $judul = $pekerjaan->title;

        DB::transaction(function () use ($kelompok, $pekerjaan, $user, $judul) {
            KelompokActivityLogger::log(
                $kelompok,
                $user,
                'pekerjaan_dihapus',
                'Menghapus pekerjaan "' . $judul . '".',
                $pekerjaan,
                ['title' => $judul]
            );

            $pekerjaan->delete();
        });

        return response()->json([
            'message' => 'Pekerjaan berhasil dihapus.',
            'progress' => $this->groupProgress($kelompok),
        ]);
    }

    public function teacherCorrection(
        Request $request,
        string $kelompokId,
        string $pekerjaanId
    ) {
        $user = $request->user();
        $kelompok = $this->teacherGroup($user, $kelompokId);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
            'status' => ['nullable', Rule::in([
                'belum_dikerjakan',
                'sedang_dikerjakan',
                'menunggu_review',
                'selesai',
            ])],
            'assignee_ids' => ['nullable', 'array', 'min:1'],
            'assignee_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        if (empty($validated['status']) && empty($validated['assignee_ids'])) {
            throw ValidationException::withMessages([
                'reason' => 'Isi status atau penanggung jawab yang ingin dikoreksi.',
            ]);
        }

        $pekerjaan = $kelompok->pekerjaan()
            ->with('penanggungJawab')
            ->findOrFail($pekerjaanId);

        $oldStatus = $pekerjaan->status;
        $oldAssignees = $pekerjaan->penanggungJawab->pluck('id')->sort()->values()->all();

        $changes = [];

        if (!empty($validated['status'])) {
            $changes['status'] = $validated['status'];
            $changes['status_updated_by'] = $user->id;
            $changes['status_updated_at'] = now();
        }

        $assignees = null;

        if (!empty($validated['assignee_ids'])) {
            $assignees = $this->validateAssignees($kelompok, $validated['assignee_ids']);
        }

        DB::transaction(function () use (
            $pekerjaan,
            $changes,
            $assignees,
            $user,
            $kelompok,
            $validated,
            $oldStatus,
            $oldAssignees
        ) {
            if ($changes) {
                $pekerjaan->update($changes);
            }

            if ($assignees) {
                $this->syncAssignees($pekerjaan, $assignees, $user);
            }

            $newStatus = $pekerjaan->fresh()->status;
            $newAssignees = $assignees
                ? $assignees->pluck('id')->sort()->values()->all()
                : $oldAssignees;

            KelompokActivityLogger::log(
                $kelompok,
                $user,
                'koreksi_guru',
                'Guru melakukan koreksi pada pekerjaan "' . $pekerjaan->title . '".',
                $pekerjaan,
                [
                    'reason' => $validated['reason'],
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'old_assignee_ids' => $oldAssignees,
                    'new_assignee_ids' => $newAssignees,
                ]
            );
        });

        return $this->workResponse(
            $kelompok,
            $pekerjaan->fresh(),
            $user,
            'Koreksi pekerjaan berhasil disimpan.'
        );
    }

    private function memberGroup($user, string $kelompokId): KelompokTugas
    {
        if (!$user->isStudent()) {
            abort(403, 'Hanya siswa anggota kelompok yang dapat mengelola pekerjaan.');
        }

        return KelompokTugas::with('tugas')
            ->whereHas('anggota', function ($q) use ($user) {
                $q->where('student_id', $user->id);
            })
            ->findOrFail($kelompokId);
    }

    private function teacherGroup($user, string $kelompokId): KelompokTugas
    {
        if (!$user->isTeacher()) {
            abort(403, 'Hanya guru yang dapat melakukan koreksi.');
        }

        return KelompokTugas::with('tugas')
            ->whereHas('tugas', function ($q) use ($user) {
                $q->where('teacher_id', $user->id);
            })
            ->findOrFail($kelompokId);
    }

    private function validateAssignees(KelompokTugas $kelompok, array $assigneeIds)
    {
        $assignees = KelompokAnggota::with('student:id,name,profile_photo')
            ->where('kelompok_tugas_id', $kelompok->id)
            ->whereIn('student_id', $assigneeIds)
            ->get();

        if ($assignees->count() !== count($assigneeIds)) {
            throw ValidationException::withMessages([
                'assignee_ids' => 'Penanggung jawab harus anggota aktif kelompok ini.',
            ]);
        }

        return $assignees;
    }

    private function syncAssignees(
        PekerjaanKelompok $pekerjaan,
        $assignees,
        $actor
    ): void {
        $payload = $assignees->mapWithKeys(function ($anggota) use ($actor) {
            return [
                $anggota->student_id => [
                    'assigned_by' => $actor->id,
                ],
            ];
        })->all();

        $pekerjaan->penanggungJawab()->sync($payload);
    }

    private function workResponse(
        KelompokTugas $kelompok,
        PekerjaanKelompok $pekerjaan,
        $user,
        string $message,
        int $status = 200
    ) {
        $pekerjaan = $pekerjaan->fresh()->load([
            'penanggungJawab:id,name,profile_photo',
            'pembuat:id,name',
            'statusUpdater:id,name',
            'umpanBalik.teacher:id,name',
        ]);

        $membership = $kelompok->anggota()
            ->where('student_id', $user->id)
            ->first();

        $isMember = $user->isStudent() && $membership !== null;
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

        return response()->json([
            'message' => $message,
            'pekerjaan' => $pekerjaan,
            'progress' => $this->groupProgress($kelompok),
        ], $status);
    }

    private function groupProgress(KelompokTugas $kelompok): array
    {
        $kelompok->load('pekerjaan', 'tugas');

        return $kelompok->progress;
    }
}
