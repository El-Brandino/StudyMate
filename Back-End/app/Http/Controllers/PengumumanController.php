<?php

namespace App\Http\Controllers;

use App\Models\Pengumuman;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PengumumanController extends Controller
{
    // Menampilkan pengumuman sesuai hak akses dan waktu
    
public function index(Request $request)
{
    $user = $request->user();
    $now = now();

    $query = Pengumuman::with([
        'teacher:id,name',
        'kelas:id,major_id,grade,class_number',
        'kelas.major:id,name',
    ])->latest();

    if ($user->isTeacher()) {
        $query->where('teacher_id', $user->id);
    } else {
        // Tampilkan pengumuman umum atau khusus kelas siswa.
        $query->where(function ($q) use ($user) {
            $q->where('target', 'semua');

            if ($user->class_id) {
                $q->orWhere(function ($subQuery) use ($user) {
                    $subQuery->where('target', 'kelas')
                        ->whereHas('kelas', function ($kelasQuery) use ($user) {
                            $kelasQuery->where('kelas.id', $user->class_id);
                        });
                });
            }
        });

        // Sembunyikan pengumuman yang sudah melewati tanggal akhir.
        // Pengumuman yang akan datang tetap boleh ditampilkan.
        $query->where(function ($q) use ($now) {
            $q->whereNull('end_at')
                ->orWhere('end_at', '>=', $now);
        });
    }

    return response()->json($query->get());
}


    // Membuat pengumuman baru
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json([
                'message' => 'Hanya guru yang bisa membuat pengumuman.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'target' => ['required', 'in:semua,kelas'],
            'class_ids' => ['nullable', 'array'],
            'class_ids.*' => ['integer', 'exists:kelas,id'],
            'start_at' => ['nullable', 'date'],
            'end_at' => [
                'nullable',
                'date',
                'after_or_equal:start_at',
            ],
            'attachment' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx,jpg,jpeg,png',
                'max:5120',
            ],
        ]);

        $classIds = $validated['target'] === 'kelas'
            ? array_values($validated['class_ids'] ?? [])
            : [];

        if ($validated['target'] === 'kelas' && count($classIds) === 0) {
            throw ValidationException::withMessages([
                'class_ids' => ['Pilih minimal satu kelas.'],
            ]);
        }

        unset($validated['class_ids']);

        $attachmentPath = null;

        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')
                ->store('pengumuman', 'public');
        }

        $pengumuman = Pengumuman::create([
            'teacher_id' => $user->id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'target' => $validated['target'],
            'start_at' => $validated['start_at'] ?? null,
            'end_at' => $validated['end_at'] ?? null,
            'attachment' => $attachmentPath,
        ]);

        $pengumuman->kelas()->sync($classIds);

        return response()->json([
            'message' => 'Pengumuman berhasil dibuat.',
            'pengumuman' => $pengumuman->load([
                'teacher:id,name',
                'kelas:id,major_id,grade,class_number',
                'kelas.major:id,name',
            ]),
        ], 201);
    }

    // Mengedit pengumuman milik guru yang login
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json([
                'message' => 'Hanya guru yang bisa mengedit pengumuman.',
            ], 403);
        }

        $pengumuman = Pengumuman::where('teacher_id', $user->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'content' => ['sometimes', 'required', 'string'],
            'target' => ['sometimes', 'required', 'in:semua,kelas'],
            'class_ids' => ['nullable', 'array'],
            'class_ids.*' => ['integer', 'exists:kelas,id'],
            'start_at' => ['sometimes', 'nullable', 'date'],
            'end_at' => [
                'sometimes',
                'nullable',
                'date',
                'after_or_equal:start_at',
            ],
            'attachment' => [
                'sometimes',
                'nullable',
                'file',
                'mimes:pdf,doc,docx,jpg,jpeg,png',
                'max:5120',
            ],
        ]);

        $target = $validated['target'] ?? $pengumuman->target;

        if ($target === 'semua') {
            // Target diubah menjadi semua kelas: hapus pilihan kelas.
            $classIds = [];
        } elseif (array_key_exists('class_ids', $validated)) {
            $classIds = array_values($validated['class_ids'] ?? []);

            if (count($classIds) === 0) {
                throw ValidationException::withMessages([
                    'class_ids' => ['Pilih minimal satu kelas.'],
                ]);
            }
        } else {
            // class_ids tidak dikirim: biarkan pilihan kelas sebelumnya.
            $classIds = null;
        }

        unset($validated['class_ids']);

        if (
            isset($validated['start_at'], $validated['end_at']) &&
            $validated['end_at'] < $validated['start_at']
        ) {
            throw ValidationException::withMessages([
                'end_at' => [
                    'Tanggal berakhir harus setelah atau sama dengan tanggal mulai.',
                ],
            ]);
        }

        if ($request->hasFile('attachment')) {
            if ($pengumuman->attachment) {
                Storage::disk('public')->delete($pengumuman->attachment);
            }

            $validated['attachment'] = $request->file('attachment')
                ->store('pengumuman', 'public');
        }

        $pengumuman->update($validated);

        if ($classIds !== null) {
            $pengumuman->kelas()->sync($classIds);
        }

        return response()->json([
            'message' => 'Pengumuman berhasil diperbarui.',
            'pengumuman' => $pengumuman->fresh()->load([
                'teacher:id,name',
                'kelas:id,major_id,grade,class_number',
                'kelas.major:id,name',
            ]),
        ]);
    }

    // Menghapus pengumuman milik guru yang login
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json([
                'message' => 'Hanya guru yang bisa menghapus pengumuman.',
            ], 403);
        }

        $pengumuman = Pengumuman::where('teacher_id', $user->id)
            ->findOrFail($id);

        if ($pengumuman->attachment) {
            Storage::disk('public')->delete($pengumuman->attachment);
        }

        $pengumuman->delete();

        return response()->json([
            'message' => 'Pengumuman berhasil dihapus.',
        ]);
    }
}
