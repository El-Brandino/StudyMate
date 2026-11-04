<?php

namespace App\Http\Controllers;

use App\Models\KelompokAnggota;
use App\Models\KelompokTugas;
use App\Models\ProgressTugas;
use App\Models\Tugas;
use App\Models\UndanganKelompok;
use App\Models\User;
use App\Support\KelompokTugasPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TugasController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isTeacher()) {
            return response()->json($this->teacherIndex($user));
        }

        if (!$user->isStudent() || !$user->class_id) {
            return response()->json([
                'message' => 'Kamu tidak memiliki kelas yang terdaftar.',
            ], 403);
        }

        return response()->json($this->studentIndex($user));
    }

    private function teacherIndex(User $user)
    {
        $tasks = Tugas::with($this->assignmentRelations())
            ->where('teacher_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        $groupTasks = $tasks->where('mode', 'kelompok');

        if ($groupTasks->isNotEmpty()) {
            $groupTasks->each->load([
                'kelompok.tugas',
                'kelompok.anggota',
                'kelompok.pekerjaan',
                'kelompok.undangan',
            ]);
        }

        $tasks->each(function (Tugas $task) {
            $this->applyTeacherSummary($task);
            $task->unsetRelation('kelompok');
        });

        return $tasks;
    }

    private function studentIndex(User $user)
    {
        $query = Tugas::with([
            'teacher:id,name,profile_photo',
            'subject:id,name',
            'kelas.major:id,name',
            'documents',
            'progressTugas' => function ($query) use ($user) {
                $query->where('student_id', $user->id);
            },
        ])
            ->whereHas('kelas', function ($query) use ($user) {
                $query->where('kelas.id', $user->class_id);
            })
            ->orderBy('deadline');

        $individualTaskIds = (clone $query)
            ->where('mode', 'individu')
            ->pluck('id');

        $this->lengkapiProgressSiswa($individualTaskIds, $user);

        $tasks = $query->get();
        $taskIds = $tasks->pluck('id');

        $memberships = KelompokAnggota::with([
            'kelompok.tugas:id,min_members,max_members,mode',
            'kelompok.anggota',
            'kelompok.pekerjaan',
            'kelompok.undangan',
        ])
            ->where('student_id', $user->id)
            ->whereIn('tugas_id', $taskIds)
            ->get()
            ->keyBy('tugas_id');

        $invitations = UndanganKelompok::with([
            'kelompok:id,name,class_id,created_by',
            'kelompok.pembuat:id,name',
            'pengundang:id,name',
        ])
            ->where('student_id', $user->id)
            ->where('status', 'menunggu')
            ->whereIn('tugas_id', $taskIds)
            ->get()
            ->groupBy('tugas_id');

        foreach ($tasks as $task) {
            $membership = $memberships->get($task->id);

            $task->setAttribute(
                'my_group',
                $membership ? KelompokTugasPresenter::groupSummary($membership->kelompok) : null
            );
            $task->setAttribute(
                'pending_invitation_count',
                ($invitations->get($task->id) ?? collect())->count()
            );
        }

        return $tasks;
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();

        if ($user->isTeacher()) {
            $task = $this->teacherAssignment($user, $id);
            $task->load($this->assignmentRelations());
            $this->loadGroupSummaryData($task);
            $this->applyTeacherSummary($task);

            return response()->json($task);
        }

        if (!$user->isStudent() || !$user->class_id) {
            return response()->json([
                'message' => 'Kamu tidak memiliki kelas yang terdaftar.',
            ], 403);
        }

        $task = $this->studentAssignment($user, $id);
        $task->load($this->assignmentRelations());

        if ($task->mode === 'individu') {
            $this->lengkapiProgressSiswa(collect([$task->id]), $user);
            $task->load([
                'progressTugas' => function ($query) use ($user) {
                    $query->where('student_id', $user->id);
                },
            ]);
        }

        $membership = KelompokAnggota::with([
            'kelompok.tugas:id,min_members,max_members,mode',
            'kelompok.anggota',
            'kelompok.pekerjaan',
            'kelompok.undangan',
        ])
            ->where('tugas_id', $task->id)
            ->where('student_id', $user->id)
            ->first();

        $invitations = UndanganKelompok::with([
            'kelompok:id,name,class_id,created_by',
            'kelompok.pembuat:id,name',
            'pengundang:id,name',
        ])
            ->where('tugas_id', $task->id)
            ->where('student_id', $user->id)
            ->where('status', 'menunggu')
            ->get();

        $task->setAttribute(
            'my_group',
            $membership ? KelompokTugasPresenter::groupSummary($membership->kelompok) : null
        );
        $task->setAttribute('undangan_saya', $invitations);

        return response()->json($task);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $this->validateTask($request);

        $this->ensureTeacherOwnsSubject($user, (int) $validated['subject_id']);

        $mode = $validated['mode'];
        $minMembers = $mode === 'kelompok' ? ($validated['min_members'] ?? null) : null;
        $maxMembers = $mode === 'kelompok' ? ($validated['max_members'] ?? null) : null;

        $this->validateMemberLimits($minMembers, $maxMembers);

        $task = DB::transaction(function () use ($request, $validated, $user, $mode, $minMembers, $maxMembers) {
            $task = Tugas::create([
                'teacher_id' => $user->id,
                'mode' => $mode,
                'subject_id' => $validated['subject_id'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'instructions' => $validated['instructions'] ?? null,
                'min_members' => $minMembers,
                'max_members' => $maxMembers,
                'deadline' => $validated['deadline'],
            ]);

            $task->kelas()->sync($validated['class_ids']);
            $this->storeDocuments($request, $task);

            if ($mode === 'individu') {
                $this->createIndividualProgress($task, $validated['class_ids']);
            }

            return $task;
        });

        return response()->json([
            'message' => $mode === 'kelompok'
                ? 'Tugas kelompok berhasil dibuat.'
                : 'Tugas berhasil dibuat.',
            'tugas' => $this->teacherPayload($task->fresh()),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $task = $this->teacherAssignment($user, $id);
        $validated = $this->validateTask($request);

        $this->ensureTeacherOwnsSubject($user, (int) $validated['subject_id']);

        $mode = $validated['mode'];
        $modeChanged = $task->mode !== $mode;
        $existingGroups = $task->kelompok()->count();

        if ($modeChanged && $existingGroups > 0) {
            throw ValidationException::withMessages([
                'mode' => 'Mode tugas tidak dapat diubah karena sudah ada kelompok.',
            ]);
        }

        $oldClassIds = $task->kelas()->pluck('kelas.id')->map(fn ($value) => (int) $value)->all();
        $newClassIds = collect($validated['class_ids'])->map(fn ($value) => (int) $value)->all();
        $removedClassIds = array_values(array_diff($oldClassIds, $newClassIds));

        if ($removedClassIds && $task->kelompok()->whereIn('class_id', $removedClassIds)->exists()) {
            throw ValidationException::withMessages([
                'class_ids' => 'Kelas yang sudah memiliki kelompok tidak dapat dihapus dari tugas ini.',
            ]);
        }

        $minMembers = $mode === 'kelompok' ? ($validated['min_members'] ?? null) : null;
        $maxMembers = $mode === 'kelompok' ? ($validated['max_members'] ?? null) : null;
        $this->validateMemberLimits($minMembers, $maxMembers);

        $largestGroup = $task->kelompok()
            ->withCount('anggota')
            ->orderByDesc('anggota_count')
            ->first();

        if ($maxMembers && $largestGroup && $largestGroup->anggota_count > $maxMembers) {
            throw ValidationException::withMessages([
                'max_members' => 'Batas maksimal anggota tidak boleh lebih kecil dari jumlah anggota kelompok yang sudah ada.',
            ]);
        }

        DB::transaction(function () use ($request, $task, $validated, $mode, $modeChanged, $minMembers, $maxMembers) {
            $task->update([
                'mode' => $mode,
                'subject_id' => $validated['subject_id'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'instructions' => $validated['instructions'] ?? null,
                'min_members' => $minMembers,
                'max_members' => $maxMembers,
                'deadline' => $validated['deadline'],
            ]);

            $task->kelas()->sync($validated['class_ids']);

            $removeIds = $validated['remove_document_ids'] ?? [];

            if ($removeIds) {
                $documents = $task->documents()->whereIn('id', $removeIds)->get();

                foreach ($documents as $document) {
                    Storage::disk('public')->delete($document->file_path);
                    $document->delete();
                }
            }

            $this->storeDocuments($request, $task);

            if ($modeChanged) {
                $task->progressTugas()->delete();
            }

            if ($mode === 'individu') {
                $this->createIndividualProgress($task, $validated['class_ids']);
            }
        });

        return response()->json([
            'message' => 'Tugas berhasil diperbarui.',
            'tugas' => $this->teacherPayload($task->fresh()),
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $task = Tugas::with('documents')
            ->where('teacher_id', $request->user()->id)
            ->findOrFail($id);

        foreach ($task->documents as $document) {
            Storage::disk('public')->delete($document->file_path);
        }

        $task->delete();

        return response()->json([
            'message' => 'Tugas berhasil dihapus.',
        ]);
    }

    public function destroyDocument(Request $request, string $id, string $documentId)
    {
        $task = $this->teacherAssignment($request->user(), $id);
        $document = $task->documents()->findOrFail($documentId);

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return response()->json([
            'message' => 'Lampiran berhasil dihapus.',
        ]);
    }

    public function monitoring(Request $request, string $id)
    {
        $user = $request->user();
        $task = $this->teacherAssignment($user, $id);

        if ($task->mode !== 'kelompok') {
            return response()->json([
                'message' => 'Pemantauan kelompok hanya tersedia untuk tugas kelompok.',
            ], 422);
        }

        $task->load($this->assignmentRelations());
        $classIds = $task->kelas->pluck('id');

        $request->validate([
            'class_id' => [
                'nullable',
                'integer',
                Rule::in($classIds->map(fn ($classId) => (string) $classId)->all()),
            ],
            'status' => ['nullable', Rule::in(['belum_ada_pembagian', 'berjalan', 'selesai'])],
        ]);

        $query = KelompokTugas::with([
            'tugas:id,min_members,max_members,mode',
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
            'aktivitas.actor:id,name',
        ])
            ->where('tugas_id', $task->id)
            ->orderBy('name');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        $kelompok = $query->get();

        if ($request->filled('status')) {
            $kelompok = $kelompok->filter(function (KelompokTugas $item) use ($request) {
                $progress = $item->progress;

                return match ($request->status) {
                    'belum_ada_pembagian' => $progress['total'] === 0,
                    'selesai' => $progress['total'] > 0
                        && $progress['selesai'] === $progress['total'],
                    'berjalan' => $progress['total'] === 0
                        || $progress['selesai'] < $progress['total'],
                };
            })->values();
        }

        $ringkasan = [
            'total_kelompok' => $kelompok->count(),
            'total_anggota' => $kelompok->sum(fn ($item) => $item->jumlah_anggota),
            'total_pekerjaan' => $kelompok->sum(fn ($item) => $item->progress['total']),
            'pekerjaan_selesai' => $kelompok->sum(fn ($item) => $item->progress['selesai']),
            'persentase' => null,
            'label' => 'Belum Ada Pembagian Tugas',
            'kelompok_belum_lengkap' => $kelompok
                ->filter(fn ($item) => $item->status_kelompok === 'belum_lengkap')
                ->count(),
            'pekerjaan_terlambat' => $kelompok->sum(
                fn ($item) => $item->pekerjaan
                    ->filter(fn ($pekerjaan) => $pekerjaan->is_overdue)
                    ->count()
            ),
            'menunggu_review' => $kelompok->sum(
                fn ($item) => $item->pekerjaan->where('status', 'menunggu_review')->count()
            ),
            'belum_dikerjakan' => $kelompok->sum(
                fn ($item) => $item->pekerjaan->where('status', 'belum_dikerjakan')->count()
            ),
        ];

        if ($ringkasan['total_pekerjaan'] > 0) {
            $ringkasan['persentase'] = (int) round(
                ($ringkasan['pekerjaan_selesai'] / $ringkasan['total_pekerjaan']) * 100
            );
            $ringkasan['label'] = $ringkasan['persentase'] . '%';
        }

        return response()->json([
            'tugas' => $task,
            'ringkasan' => $ringkasan,
            'kelompok' => $kelompok,
        ]);
    }

    private function validateTask(Request $request): array
    {
        return $request->validate([
            'mode' => ['required', Rule::in(['individu', 'kelompok'])],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'instructions' => ['nullable', 'string'],
            'deadline' => ['required', 'date'],
            'min_members' => ['nullable', 'integer', 'min:1', 'max:100'],
            'max_members' => ['nullable', 'integer', 'min:1', 'max:100'],
            'class_ids' => ['required', 'array', 'min:1'],
            'class_ids.*' => ['required', 'integer', 'distinct', 'exists:kelas,id'],
            'documents' => ['nullable', 'array', 'max:10'],
            'documents.*' => ['file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,zip', 'max:10240'],
            'remove_document_ids' => ['nullable', 'array'],
            'remove_document_ids.*' => ['integer', 'exists:tugas_documents,id'],
        ]);
    }

    private function teacherPayload(Tugas $task): Tugas
    {
        $task->load($this->assignmentRelations());
        $this->loadGroupSummaryData($task);
        $this->applyTeacherSummary($task);
        $task->unsetRelation('kelompok');

        return $task;
    }

    private function loadGroupSummaryData(Tugas $task): void
    {
        if ($task->mode !== 'kelompok') {
            return;
        }

        $task->load([
            'kelompok.tugas',
            'kelompok.anggota',
            'kelompok.pekerjaan',
        ]);
    }

    private function applyTeacherSummary(Tugas $task): void
    {
        if ($task->mode === 'kelompok') {
            $task->setAttribute(
                'kelompok_count',
                $task->relationLoaded('kelompok')
                    ? $task->kelompok->count()
                    : $task->kelompok()->count()
            );
            $task->setAttribute(
                'group_summary',
                KelompokTugasPresenter::assignmentSummary($task)
            );
        } else {
            $task->setAttribute('kelompok_count', 0);
            $task->setAttribute('group_summary', null);
        }
    }

    private function assignmentRelations(): array
    {
        return [
            'teacher:id,name,profile_photo',
            'subject:id,name',
            'kelas.major:id,name',
            'documents',
        ];
    }

    private function teacherAssignment(User $user, string $id): Tugas
    {
        if (!$user->isTeacher()) {
            abort(403, 'Hanya guru yang dapat mengakses tugas ini.');
        }

        return Tugas::where('teacher_id', $user->id)->findOrFail($id);
    }

    private function studentAssignment(User $user, string $id): Tugas
    {
        return Tugas::where('id', $id)
            ->whereHas('kelas', function ($query) use ($user) {
                $query->where('kelas.id', $user->class_id);
            })
            ->firstOrFail();
    }

    private function ensureTeacherOwnsSubject(User $user, int $subjectId): void
    {
        if (!$user->subjects()->where('subjects.id', $subjectId)->exists()) {
            abort(403, 'Mata pelajaran tersebut bukan pengkhususan Anda.');
        }
    }

    private function validateMemberLimits(?int $min, ?int $max): void
    {
        if ($min !== null && $max !== null && $max < $min) {
            throw ValidationException::withMessages([
                'max_members' => 'Batas maksimal anggota harus lebih besar atau sama dengan batas minimal.',
            ]);
        }
    }

    private function createIndividualProgress(Tugas $task, array $classIds): void
    {
        $students = User::whereIn('class_id', $classIds)
            ->where('role', 'siswa')
            ->get();

        foreach ($students as $student) {
            ProgressTugas::firstOrCreate(
                [
                    'task_id' => $task->id,
                    'student_id' => $student->id,
                ],
                ['status' => 'belum']
            );
        }

        // Saat kelas dihapus dari tugas, progres siswa kelas tersebut juga dibersihkan.
        $task->progressTugas()
            ->whereNotIn('student_id', $students->pluck('id'))
            ->delete();
    }

    private function lengkapiProgressSiswa($taskIds, $user): void
    {
        if ($taskIds->isEmpty()) {
            return;
        }

        $sudahAda = ProgressTugas::where('student_id', $user->id)
            ->whereIn('task_id', $taskIds)
            ->pluck('task_id')
            ->all();

        $barus = $taskIds
            ->reject(fn ($id) => in_array($id, $sudahAda))
            ->map(fn ($id) => [
                'task_id' => $id,
                'student_id' => $user->id,
                'status' => 'belum',
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->all();

        if ($barus) {
            ProgressTugas::insert($barus);
        }
    }

    private function storeDocuments(Request $request, Tugas $task): void
    {
        if (!$request->hasFile('documents')) {
            return;
        }

        foreach ($request->file('documents') as $file) {
            $path = $file->store('tugas', 'public');

            $task->documents()->create([
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
            ]);
        }
    }
}
