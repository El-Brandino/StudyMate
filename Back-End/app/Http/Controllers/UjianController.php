<?php

namespace App\Http\Controllers;

use App\Models\Ujian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UjianController extends Controller
{
    // Menampilkan jadwal sesuai role pengguna.
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Ujian::with([
            'teacher:id,name',
            'subject:id,name',
            'kelas.major:id,name',
        ])->orderBy('exam_date')->orderBy('start_time');

        if ($user->isTeacher()) {
            $query->where('teacher_id', $user->id);
        } else {
            $query->whereHas('kelas', function ($q) use ($user) {
                $q->where('kelas.id', $user->class_id);
            });
        }

        return response()->json($query->get());
    }

    // Menampilkan detail ujian sesuai akses pengguna.
    public function show(Request $request, string $id)
    {
        $ujian = $this->accessibleUjian($request, $id);

        return response()->json(
            $ujian->load([
                'teacher:id,name',
                'subject:id,name',
                'kelas.major:id,name',
            ])
        );
    }

    // Membuat jadwal ujian.
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'exam_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration' => ['required', 'integer', 'min:1', 'max:600'],
            'class_ids' => ['required', 'array', 'min:1'],
            'class_ids.*' => [
                'required',
                'integer',
                'distinct',
                'exists:kelas,id',
            ],
            'document' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240',
            ],
        ]);

        $this->ensureTeacherOwnsSubject($user, $validated['subject_id']);

        $documentPath = null;

        try {
            if ($request->hasFile('document')) {
                $documentPath = $request->file('document')
                    ->store('ujian-documents', 'local');
            }

            $ujian = DB::transaction(function () use (
                $validated,
                $user,
                $documentPath
            ) {
                $ujian = Ujian::create([
                    'teacher_id' => $user->id,
                    'subject_id' => $validated['subject_id'],
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'exam_date' => $validated['exam_date'],
                    'start_time' => $validated['start_time'],
                    'duration' => $validated['duration'],
                    'document_path' => $documentPath,
                ]);

                $ujian->kelas()->sync($validated['class_ids']);

                return $ujian;
            });
        } catch (\Throwable $e) {
            if ($documentPath) {
                Storage::disk('local')->delete($documentPath);
            }

            throw $e;
        }

        return response()->json([
            'message' => 'Jadwal ujian berhasil dibuat.',
            'ujian' => $ujian->load([
                'teacher:id,name',
                'subject:id,name',
                'kelas.major:id,name',
            ]),
        ], 201);
    }

    // Memperbarui jadwal dan, bila ada, dokumennya.
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $ujian = Ujian::where('teacher_id', $user->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'exam_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration' => ['required', 'integer', 'min:1', 'max:600'],
            'class_ids' => ['required', 'array', 'min:1'],
            'class_ids.*' => [
                'required',
                'integer',
                'distinct',
                'exists:kelas,id',
            ],
            'document' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240',
            ],
            'remove_document' => ['nullable', 'boolean'],
        ]);

        $this->ensureTeacherOwnsSubject($user, $validated['subject_id']);

        $oldDocumentPath = $ujian->document_path;
        $newDocumentPath = null;
        $removeDocument = $request->boolean('remove_document');

        try {
            if ($request->hasFile('document')) {
                $newDocumentPath = $request->file('document')
                    ->store('ujian-documents', 'local');
            }

            DB::transaction(function () use (
                $ujian,
                $validated,
                $newDocumentPath,
                $removeDocument
            ) {
                $changes = [
                    'subject_id' => $validated['subject_id'],
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'exam_date' => $validated['exam_date'],
                    'start_time' => $validated['start_time'],
                    'duration' => $validated['duration'],
                ];

                if ($newDocumentPath) {
                    $changes['document_path'] = $newDocumentPath;
                } elseif ($removeDocument) {
                    $changes['document_path'] = null;
                }

                $ujian->update($changes);
                $ujian->kelas()->sync($validated['class_ids']);
            });
        } catch (\Throwable $e) {
            if ($newDocumentPath) {
                Storage::disk('local')->delete($newDocumentPath);
            }

            throw $e;
        }

        // Hapus dokumen lama hanya setelah pembaruan database berhasil.
        if (
            $oldDocumentPath &&
            ($newDocumentPath || $removeDocument)
        ) {
            Storage::disk('local')->delete($oldDocumentPath);
        }

        return response()->json([
            'message' => 'Jadwal ujian berhasil diperbarui.',
            'ujian' => $ujian->fresh()->load([
                'teacher:id,name',
                'subject:id,name',
                'kelas.major:id,name',
            ]),
        ]);
    }

    // Mengunduh dokumen hanya jika pengguna berhak melihat ujian.
    public function downloadDocument(Request $request, string $id)
    {
        $ujian = $this->accessibleUjian($request, $id);

        if (
            !$ujian->document_path ||
            !Storage::disk('local')->exists($ujian->document_path)
        ) {
            return response()->json([
                'message' => 'Dokumen kisi-kisi belum tersedia.',
            ], 404);
        }

        return Storage::disk('local')->download(
            $ujian->document_path
        );
    }

    // Menghapus jadwal dan dokumen terkait.
    public function destroy(Request $request, string $id)
    {
        $ujian = Ujian::where('teacher_id', $request->user()->id)
            ->findOrFail($id);

        $documentPath = $ujian->document_path;

        DB::transaction(function () use ($ujian) {
            $ujian->kelas()->detach();
            $ujian->delete();
        });

        if ($documentPath) {
            Storage::disk('local')->delete($documentPath);
        }

        return response()->json([
            'message' => 'Jadwal ujian berhasil dihapus.',
        ]);
    }

    // Membatasi akses ke guru pemilik jadwal atau siswa di kelas tujuan.
    private function accessibleUjian(Request $request, string $id): Ujian
    {
        $user = $request->user();

        $query = Ujian::where('id', $id);

        if ($user->isTeacher()) {
            $query->where('teacher_id', $user->id);
        } else {
            $query->whereHas('kelas', function ($q) use ($user) {
                $q->where('kelas.id', $user->class_id);
            });
        }

        return $query->firstOrFail();
    }

    private function ensureTeacherOwnsSubject($user, int $subjectId): void
    {
        $hasSubject = $user->subjects()
            ->where('subjects.id', $subjectId)
            ->exists();

        if (!$hasSubject) {
            abort(403, 'Mata pelajaran tersebut bukan pengkhususan Anda.');
        }
    }

    
}
