<?php

namespace Tests\Feature;

use App\Models\KelompokAnggota;
use App\Models\KelompokTugas;
use App\Models\Kelas;
use App\Models\Major;
use App\Models\ProgressTugas;
use App\Models\Subject;
use App\Models\Tugas;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TugasTerpaduTest extends TestCase
{
    use RefreshDatabase;

    private Major $major;
    private Kelas $kelas;
    private Kelas $kelasLain;
    private Subject $subject;
    private User $guru;
    private User $guruLain;
    private User $siswa1;
    private User $siswa2;
    private User $siswa3;
    private User $siswaLainKelas;

    protected function setUp(): void
    {
        parent::setUp();

        $this->major = Major::create(['name' => 'RPL']);
        $this->kelas = Kelas::create([
            'major_id' => $this->major->id,
            'grade' => 'XI',
            'class_number' => 1,
        ]);
        $this->kelasLain = Kelas::create([
            'major_id' => $this->major->id,
            'grade' => 'XI',
            'class_number' => 2,
        ]);

        $this->subject = Subject::create(['name' => 'Matematika']);

        $this->guru = $this->buatUser('Guru Satu', 'guru1@test.local', 'guru');
        $this->guruLain = $this->buatUser('Guru Dua', 'guru2@test.local', 'guru');
        $this->guru->subjects()->attach($this->subject->id);
        $this->guruLain->subjects()->attach($this->subject->id);

        $this->siswa1 = $this->buatUser('Siswa Satu', 'siswa1@test.local', 'siswa', $this->kelas->id);
        $this->siswa2 = $this->buatUser('Siswa Dua', 'siswa2@test.local', 'siswa', $this->kelas->id);
        $this->siswa3 = $this->buatUser('Siswa Tiga', 'siswa3@test.local', 'siswa', $this->kelas->id);
        $this->siswaLainKelas = $this->buatUser('Siswa Lain', 'siswa4@test.local', 'siswa', $this->kelasLain->id);
    }

    public function test_guru_membuat_tugas_individu_dan_kelompok_yang_terlihat_di_halaman_tugas_yang_sama(): void
    {
        Sanctum::actingAs($this->guru);

        $individu = $this->postJson('/api/tugas', $this->payloadTugas([
            'mode' => 'individu',
            'title' => 'Latihan Individu',
        ]))
            ->assertCreated()
            ->assertJsonPath('tugas.mode', 'individu')
            ->assertJsonPath('tugas.group_summary', null);

        $kelompok = $this->postJson('/api/tugas', $this->payloadTugas([
            'mode' => 'kelompok',
            'title' => 'Proyek Kelompok',
            'min_members' => 2,
            'max_members' => 4,
            'instructions' => 'Bagi pekerjaan di dalam kelompok.',
        ]))
            ->assertCreated()
            ->assertJsonPath('tugas.mode', 'kelompok')
            ->assertJsonPath('tugas.group_summary.total_kelompok', 0)
            ->assertJsonPath('tugas.group_summary.label', 'Belum Ada Pembagian Tugas');

        $this->assertDatabaseHas('tugas', [
            'id' => $individu->json('tugas.id'),
            'mode' => 'individu',
        ]);
        $this->assertDatabaseHas('tugas', [
            'id' => $kelompok->json('tugas.id'),
            'mode' => 'kelompok',
            'min_members' => 2,
            'max_members' => 4,
        ]);

        $this->assertDatabaseHas('progress_tugas', [
            'task_id' => $individu->json('tugas.id'),
            'student_id' => $this->siswa1->id,
        ]);
        $this->assertDatabaseMissing('progress_tugas', [
            'task_id' => $kelompok->json('tugas.id'),
        ]);

        Sanctum::actingAs($this->siswa1);
        $daftar = $this->getJson('/api/tugas')
            ->assertOk()
            ->assertJsonCount(2);

        $this->assertTrue(
            collect($daftar->json())->contains(fn ($item) => $item['mode'] === 'kelompok')
        );
        $this->assertTrue(
            collect($daftar->json())->contains(fn ($item) => $item['mode'] === 'individu')
        );

        $tugasKelompok = collect($daftar->json())->firstWhere('mode', 'kelompok');
        $this->assertNull($tugasKelompok['my_group']);
        $this->assertSame(0, $tugasKelompok['pending_invitation_count']);

        Sanctum::actingAs($this->siswaLainKelas);
        $this->getJson('/api/tugas')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/tugas/' . $kelompok->json('tugas.id'))->assertNotFound();

        Sanctum::actingAs($this->guruLain);
        $this->getJson('/api/tugas/' . $kelompok->json('tugas.id'))->assertNotFound();
        $this->getJson('/api/tugas/' . $kelompok->json('tugas.id') . '/pemantauan')->assertNotFound();
    }

    public function test_siswa_membentuk_kelompok_mengundang_teman_dan_tidak_bisa_masuk_dua_kelompok(): void
    {
        $tugas = $this->buatTugas(['min_members' => 2, 'max_members' => 2]);
        $tugasIndividu = $this->buatTugas([
            'mode' => 'individu',
            'title' => 'Tugas Individu Uji',
        ]);

        Sanctum::actingAs($this->siswa1);

        $this->postJson("/api/tugas/{$tugasIndividu->id}/kelompok", [
            'name' => 'Kelompok Tidak Sah',
        ])->assertStatus(422);

        $response = $this->postJson("/api/tugas/{$tugas->id}/kelompok", [
            'name' => 'Kelompok Alpha',
        ])
            ->assertCreated()
            ->assertJsonPath('kelompok.name', 'Kelompok Alpha')
            ->assertJsonPath('kelompok.tugas_id', $tugas->id)
            ->assertJsonPath('kelompok.status_kelompok', 'belum_lengkap');

        $kelompok = KelompokTugas::firstOrFail();

        $this->postJson("/api/tugas/{$tugas->id}/kelompok", [
            'name' => 'Kelompok Lain',
        ])->assertStatus(422);

        $this->postJson("/api/kelompok-tugas/{$kelompok->id}/undangan", [
            'student_ids' => [$this->siswaLainKelas->id],
        ])->assertStatus(422);

        $this->postJson("/api/kelompok-tugas/{$kelompok->id}/undangan", [
            'student_ids' => [$this->siswa2->id],
        ])->assertOk();

        Sanctum::actingAs($this->siswa2);
        $undangan = $this->getJson('/api/undangan-kelompok')
            ->assertOk()
            ->assertJsonPath('0.tugas.title', 'Tugas Kelompok Uji')
            ->json('0');

        $this->patchJson("/api/undangan-kelompok/{$undangan['id']}", [
            'status' => 'diterima',
        ])->assertOk();

        $this->assertDatabaseHas('kelompok_anggota', [
            'tugas_id' => $tugas->id,
            'kelompok_tugas_id' => $kelompok->id,
            'student_id' => $this->siswa2->id,
        ]);

        $this->getJson("/api/kelompok-tugas/{$kelompok->id}")
            ->assertOk()
            ->assertJsonPath('jumlah_anggota', 2)
            ->assertJsonPath('status_kelompok', 'lengkap')
            ->assertJsonPath('tugas.id', $tugas->id);

        // Undangan tidak boleh membuat jumlah anggota melewati batas maksimal.
        $this->postJson("/api/kelompok-tugas/{$kelompok->id}/undangan", [
            'student_ids' => [$this->siswa3->id],
        ])->assertStatus(422);

        // Siswa yang sudah bergabung tidak boleh direkrut kelompok lain.
        Sanctum::actingAs($this->siswa3);
        $kelompokLain = $this->postJson("/api/tugas/{$tugas->id}/kelompok", [
            'name' => 'Kelompok Beta',
        ])->assertCreated()->json('kelompok');

        $this->postJson("/api/kelompok-tugas/{$kelompokLain['id']}/undangan", [
            'student_ids' => [$this->siswa2->id],
        ])->assertStatus(422);
    }

    public function test_pembagian_kerja_progres_status_dan_data_tetap_setelah_reload(): void
    {
        $tugas = $this->buatTugas();
        $kelompok = $this->buatKelompok($tugas, $this->siswa1, [$this->siswa2]);

        Sanctum::actingAs($this->siswa1);
        $this->getJson("/api/kelompok-tugas/{$kelompok->id}")
            ->assertOk()
            ->assertJsonPath('progress.total', 0)
            ->assertJsonPath('progress.persentase', null)
            ->assertJsonPath('progress.label', 'Belum Ada Pembagian Tugas');

        $pekerjaanIds = [];

        for ($i = 1; $i <= 5; $i++) {
            $pekerjaanIds[] = $this->postJson("/api/kelompok-tugas/{$kelompok->id}/pekerjaan", [
                'title' => 'Pekerjaan ' . $i,
                'description' => 'Deskripsi ' . $i,
                'assignee_ids' => $i === 1
                    ? [$this->siswa1->id, $this->siswa2->id]
                    : [$this->siswa1->id],
            ])->assertCreated()->json('pekerjaan.id');
        }

        $this->getJson("/api/kelompok-tugas/{$kelompok->id}")
            ->assertOk()
            ->assertJsonPath('progress.total', 5)
            ->assertJsonPath('progress.selesai', 0)
            ->assertJsonPath('progress.persentase', 0);

        // Dua PIC pada satu pekerjaan tidak boleh dihitung sebagai kontribusi individu.
        $this->assertDatabaseHas('pekerjaan_kelompok_anggota', [
            'pekerjaan_kelompok_id' => $pekerjaanIds[0],
            'student_id' => $this->siswa1->id,
        ]);
        $this->assertDatabaseHas('pekerjaan_kelompok_anggota', [
            'pekerjaan_kelompok_id' => $pekerjaanIds[0],
            'student_id' => $this->siswa2->id,
        ]);

        foreach (array_slice($pekerjaanIds, 0, 3) as $pekerjaanId) {
            $this->patchJson(
                "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanId}/status",
                ['status' => 'sedang_dikerjakan']
            )->assertOk();
            $this->patchJson(
                "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanId}/status",
                ['status' => 'menunggu_review']
            )->assertOk();
        }

        // Anggota lain boleh menyelesaikan review meskipun bukan PIC.
        Sanctum::actingAs($this->siswa2);
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanIds[0]}/status",
            ['status' => 'selesai']
        )->assertOk();

        $this->getJson("/api/kelompok-tugas/{$kelompok->id}")
            ->assertOk()
            ->assertJsonPath('progress.selesai', 1)
            ->assertJsonPath('progress.persentase', 20);

        Sanctum::actingAs($this->siswa1);
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanIds[1]}/status",
            ['status' => 'selesai']
        )->assertOk();
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanIds[2]}/status",
            ['status' => 'selesai']
        )->assertOk();

        $this->getJson("/api/kelompok-tugas/{$kelompok->id}")
            ->assertOk()
            ->assertJsonPath('progress.selesai', 3)
            ->assertJsonPath('progress.persentase', 60);

        // Pekerjaan selesai boleh dibuka kembali dan progres ikut turun.
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanIds[0]}/status",
            ['status' => 'sedang_dikerjakan']
        )->assertOk();

        $this->getJson("/api/kelompok-tugas/{$kelompok->id}")
            ->assertOk()
            ->assertJsonPath('progress.selesai', 2)
            ->assertJsonPath('progress.persentase', 40);

        // Data yang sama juga terlihat dari endpoint tugas terpadu.
        $this->getJson("/api/tugas/{$tugas->id}")
            ->assertOk()
            ->assertJsonPath('mode', 'kelompok')
            ->assertJsonPath('my_group.progress.total', 5)
            ->assertJsonPath('my_group.progress.persentase', 40);

        $this->assertDatabaseHas('aktivitas_kelompok', [
            'tugas_id' => $tugas->id,
            'kelompok_tugas_id' => $kelompok->id,
            'action' => 'status_pekerjaan_diubah',
        ]);
        $this->assertDatabaseMissing('progress_tugas', ['task_id' => $tugas->id]);
    }

    public function test_guru_memantau_memberi_feedback_dan_koreksi_dengan_alasan(): void
    {
        $tugas = $this->buatTugas(['min_members' => 3]);
        $kelompok = $this->buatKelompok($tugas, $this->siswa1, [$this->siswa2]);

        Sanctum::actingAs($this->siswa1);
        $pekerjaanId = $this->postJson("/api/kelompok-tugas/{$kelompok->id}/pekerjaan", [
            'title' => 'Menyusun laporan',
            'deadline' => now()->subDay()->toDateTimeString(),
            'assignee_ids' => [$this->siswa1->id],
        ])->assertCreated()->json('pekerjaan.id');

        Sanctum::actingAs($this->guru);
        $this->getJson(
            "/api/tugas/{$tugas->id}/pemantauan?class_id={$this->kelas->id}&status=berjalan"
        )
            ->assertOk()
            ->assertJsonPath('tugas.mode', 'kelompok')
            ->assertJsonPath('ringkasan.total_kelompok', 1)
            ->assertJsonPath('ringkasan.total_anggota', 2)
            ->assertJsonPath('ringkasan.total_pekerjaan', 1)
            ->assertJsonPath('ringkasan.belum_dikerjakan', 1)
            ->assertJsonPath('ringkasan.pekerjaan_terlambat', 1)
            ->assertJsonPath('ringkasan.kelompok_belum_lengkap', 1)
            ->assertJsonPath('kelompok.0.progress.total', 1)
            ->assertJsonPath('kelompok.0.tugas_id', $tugas->id);

        $this->postJson("/api/kelompok-tugas/{$kelompok->id}/umpan-balik", [
            'message' => 'Pembagian tugas sudah jelas.',
            'pekerjaan_id' => $pekerjaanId,
        ])->assertCreated();

        $this->patchJson(
            "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanId}/koreksi",
            [
                'reason' => 'Penanggung jawab perlu disesuaikan dengan hasil diskusi kelas.',
                'status' => 'sedang_dikerjakan',
                'assignee_ids' => [$this->siswa2->id],
            ]
        )->assertOk()
            ->assertJsonPath('pekerjaan.status', 'sedang_dikerjakan');

        $this->assertDatabaseHas('umpan_balik_kelompok', [
            'tugas_id' => $tugas->id,
            'kelompok_tugas_id' => $kelompok->id,
            'pekerjaan_kelompok_id' => $pekerjaanId,
            'teacher_id' => $this->guru->id,
        ]);
        $this->assertDatabaseHas('aktivitas_kelompok', [
            'tugas_id' => $tugas->id,
            'kelompok_tugas_id' => $kelompok->id,
            'action' => 'koreksi_guru',
        ]);
        $this->assertDatabaseHas('pekerjaan_kelompok_anggota', [
            'pekerjaan_kelompok_id' => $pekerjaanId,
            'student_id' => $this->siswa2->id,
            'assigned_by' => $this->guru->id,
        ]);

        $aktivitas = \App\Models\AktivitasKelompok::where('action', 'koreksi_guru')->firstOrFail();
        $this->assertSame(
            'Penanggung jawab perlu disesuaikan dengan hasil diskusi kelas.',
            $aktivitas->metadata['reason']
        );

        // Guru hanya membaca pekerjaan; koreksi harus melalui endpoint khusus.
        $this->postJson("/api/kelompok-tugas/{$kelompok->id}/pekerjaan", [
            'title' => 'Tidak boleh',
            'assignee_ids' => [$this->siswa1->id],
        ])->assertForbidden();
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompok->id}/pekerjaan/{$pekerjaanId}/status",
            ['status' => 'menunggu_review']
        )->assertForbidden();
    }

    public function test_backend_menolak_akses_lintas_kelas_lintas_guru_dan_anggota_lain(): void
    {
        $tugas = $this->buatTugas();
        $kelompokA = $this->buatKelompok($tugas, $this->siswa1, [$this->siswa2]);
        $kelompokB = $this->buatKelompok($tugas, $this->siswa3);

        Sanctum::actingAs($this->siswa1);
        $pekerjaanId = $this->postJson(
            "/api/kelompok-tugas/{$kelompokA->id}/pekerjaan",
            [
                'title' => 'Pekerjaan dengan PIC',
                'assignee_ids' => [$this->siswa1->id],
            ]
        )->assertCreated()->json('pekerjaan.id');

        Sanctum::actingAs($this->siswa2);
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompokA->id}/pekerjaan/{$pekerjaanId}/status",
            ['status' => 'sedang_dikerjakan']
        )->assertForbidden();

        $this->getJson("/api/kelompok-tugas/{$kelompokB->id}")->assertNotFound();
        $this->getJson("/api/kelompok-tugas/{$kelompokB->id}/aktivitas")->assertNotFound();
        $this->postJson("/api/kelompok-tugas/{$kelompokA->id}/umpan-balik", [
            'message' => 'Siswa tidak boleh memberi umpan balik guru.',
        ])->assertForbidden();
        $this->patchJson(
            "/api/kelompok-tugas/{$kelompokA->id}/pekerjaan/{$pekerjaanId}/koreksi",
            ['reason' => 'Siswa tidak boleh mengoreksi.']
        )->assertForbidden();

        Sanctum::actingAs($this->guru);
        $this->postJson("/api/tugas/{$tugas->id}/kelompok", [
            'name' => 'Kelompok Guru',
        ])->assertForbidden();

        Sanctum::actingAs($this->guruLain);
        $this->postJson("/api/kelompok-tugas/{$kelompokA->id}/umpan-balik", [
            'message' => 'Guru lain tidak boleh memberi umpan balik.',
        ])->assertNotFound();
        $this->getJson("/api/tugas/{$tugas->id}/pemantauan")->assertNotFound();

        Sanctum::actingAs($this->siswaLainKelas);
        $this->getJson("/api/kelompok-tugas/{$kelompokA->id}")->assertNotFound();
    }

    public function test_mode_kelompok_tidak_bisa_diubah_dan_kelas_dengan_kelompok_tidak_bisa_dihapus(): void
    {
        $tugas = $this->buatTugas();
        $this->buatKelompok($tugas, $this->siswa1);

        Sanctum::actingAs($this->guru);
        $payload = $this->payloadTugas(['mode' => 'individu']);
        $payload['class_ids'] = [$this->kelas->id];

        $this->putJson("/api/tugas/{$tugas->id}", $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('mode');

        $payloadKelompok = $this->payloadTugas(['mode' => 'kelompok']);
        $payloadKelompok['class_ids'] = [$this->kelasLain->id];

        $this->putJson("/api/tugas/{$tugas->id}", $payloadKelompok)
            ->assertStatus(422)
            ->assertJsonValidationErrors('class_ids');
    }

    public function test_edit_tugas_individu_tidak_mereset_progres_dan_membuat_progres_kelas_baru(): void
    {
        Sanctum::actingAs($this->guru);

        $tugasId = $this->postJson('/api/tugas', $this->payloadTugas([
            'mode' => 'individu',
            'title' => 'Latihan Pertemuan 1',
        ]))->assertCreated()->json('tugas.id');

        Sanctum::actingAs($this->siswa1);
        $this->patchJson("/api/tugas/{$tugasId}/progress", [
            'status' => 'selesai',
        ])->assertOk();

        $this->assertDatabaseHas('progress_tugas', [
            'task_id' => $tugasId,
            'student_id' => $this->siswa1->id,
            'status' => 'selesai',
        ]);

        Sanctum::actingAs($this->guru);
        $this->putJson("/api/tugas/{$tugasId}", $this->payloadTugas([
            'mode' => 'individu',
            'title' => 'Latihan Pertemuan 1 (revisi)',
            'class_ids' => [$this->kelas->id, $this->kelasLain->id],
        ]))->assertOk();

        // Status siswa lama tetap, siswa dari kelas baru mendapat baris progres awal.
        $this->assertDatabaseHas('progress_tugas', [
            'task_id' => $tugasId,
            'student_id' => $this->siswa1->id,
            'status' => 'selesai',
        ]);
        $this->assertDatabaseHas('progress_tugas', [
            'task_id' => $tugasId,
            'student_id' => $this->siswaLainKelas->id,
            'status' => 'belum',
        ]);

        $this->putJson("/api/tugas/{$tugasId}", $this->payloadTugas([
            'mode' => 'individu',
            'title' => 'Latihan Pertemuan 1 (revisi akhir)',
            'class_ids' => [$this->kelas->id],
        ]))->assertOk();

        $this->assertDatabaseHas('progress_tugas', [
            'task_id' => $tugasId,
            'student_id' => $this->siswa1->id,
            'status' => 'selesai',
        ]);
        $this->assertDatabaseMissing('progress_tugas', [
            'task_id' => $tugasId,
            'student_id' => $this->siswaLainKelas->id,
        ]);
    }

    public function test_guru_tidak_bisa_membuat_tugas_dengan_mapel_yang_bukan_miliknya(): void
    {
        $mapelLain = Subject::create(['name' => 'Fisika']);

        Sanctum::actingAs($this->guru);
        $this->postJson('/api/tugas', $this->payloadTugas([
            'mode' => 'individu',
            'subject_id' => $mapelLain->id,
        ]))->assertForbidden();
    }

    public function test_guru_tidak_bisa_mengubah_tugas_ke_mapel_yang_bukan_miliknya(): void
    {
        $tugas = $this->buatTugas();
        $mapelLain = Subject::create(['name' => 'Fisika']);

        Sanctum::actingAs($this->guru);
        $this->putJson("/api/tugas/{$tugas->id}", $this->payloadTugas([
            'mode' => 'kelompok',
            'subject_id' => $mapelLain->id,
        ]))->assertForbidden();
    }

    public function test_guru_tidak_bisa_mengubah_pengkhususan_mapel_sendiri(): void
    {
        $mapelLain = Subject::create(['name' => 'Fisika']);

        Sanctum::actingAs($this->guru);
        $this->postJson('/api/subjects', [
            'subject_id' => $mapelLain->id,
        ])->assertStatus(405);
        $this->deleteJson("/api/subjects/{$this->subject->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('teacher_subjects', [
            'teacher_id' => $this->guru->id,
            'subject_id' => $this->subject->id,
        ]);
        $this->assertDatabaseMissing('teacher_subjects', [
            'teacher_id' => $this->guru->id,
            'subject_id' => $mapelLain->id,
        ]);
    }

    public function test_admin_bisa_assign_dan_mencabut_pengkhususan_mapel_guru(): void
    {
        $admin = $this->buatUser('Admin Uji', 'admin-uji@test.local', 'admin');
        $mapelBaru = Subject::create(['name' => 'Fisika']);

        Sanctum::actingAs($admin);
        $this->postJson('/api/admin/assign-subject', [
            'teacher_id' => $this->guru->id,
            'subject_id' => $mapelBaru->id,
        ])->assertCreated();

        $this->assertDatabaseHas('teacher_subjects', [
            'teacher_id' => $this->guru->id,
            'subject_id' => $mapelBaru->id,
        ]);

        $this->deleteJson(
            "/api/admin/teacher/{$this->guru->id}/subject/{$mapelBaru->id}"
        )->assertOk();

        $this->assertDatabaseMissing('teacher_subjects', [
            'teacher_id' => $this->guru->id,
            'subject_id' => $mapelBaru->id,
        ]);
    }

    public function test_lampiran_tugas_kelompok_dapat_diunggah_dan_dihapus(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->guru);

        $payload = $this->payloadTugas([
            'mode' => 'kelompok',
            'title' => 'Tugas dengan Lampiran',
        ]);
        $payload['documents'] = [
            UploadedFile::fake()->create('petunjuk.pdf', 100, 'application/pdf'),
        ];

        $tugasId = $this->post('/api/tugas', $payload)
            ->assertCreated()
            ->json('tugas.id');

        $document = DB::table('tugas_documents')
            ->where('tugas_id', $tugasId)
            ->where('file_name', 'petunjuk.pdf')
            ->firstOrFail();

        Storage::disk('public')->assertExists($document->file_path);

        $update = $this->payloadTugas([
            'mode' => 'kelompok',
            'title' => 'Tugas dengan Lampiran (revisi)',
        ]);
        $update['remove_document_ids'] = [$document->id];

        $this->putJson("/api/tugas/{$tugasId}", $update)->assertOk();

        $this->assertDatabaseMissing('tugas_documents', ['id' => $document->id]);
        Storage::disk('public')->assertMissing($document->file_path);
    }

    private function payloadTugas(array $overrides = []): array
    {
        return array_merge([
            'mode' => 'kelompok',
            'subject_id' => $this->subject->id,
            'title' => 'Tugas Uji',
            'description' => 'Deskripsi tugas uji.',
            'instructions' => 'Instruksi tugas uji.',
            'deadline' => now()->addWeek()->toDateTimeString(),
            'min_members' => 1,
            'max_members' => 6,
            'class_ids' => [$this->kelas->id],
        ], $overrides);
    }

    private function buatUser(
        string $name,
        string $email,
        string $role,
        ?int $classId = null
    ): User {
        return User::create([
            'name' => $name,
            'gender' => 'Male',
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => $role,
            'class_id' => $classId,
        ]);
    }

    private function buatTugas(array $overrides = []): Tugas
    {
        $tugas = Tugas::create(array_merge([
            'teacher_id' => $this->guru->id,
            'mode' => 'kelompok',
            'subject_id' => $this->subject->id,
            'title' => 'Tugas Kelompok Uji',
            'description' => 'Deskripsi tugas kelompok.',
            'instructions' => 'Instruksi tugas kelompok.',
            'deadline' => now()->addDays(7),
            'min_members' => 1,
            'max_members' => 6,
        ], $overrides));

        $tugas->kelas()->sync([$this->kelas->id]);

        return $tugas;
    }

    private function buatKelompok(
        Tugas $tugas,
        User $ketua,
        array $anggotaLain = []
    ): KelompokTugas {
        $kelompok = KelompokTugas::create([
            'tugas_id' => $tugas->id,
            'class_id' => $this->kelas->id,
            'created_by' => $ketua->id,
            'name' => 'Kelompok ' . $ketua->name,
        ]);

        KelompokAnggota::create([
            'tugas_id' => $tugas->id,
            'kelompok_tugas_id' => $kelompok->id,
            'student_id' => $ketua->id,
            'role' => 'ketua',
            'joined_at' => now(),
        ]);

        foreach ($anggotaLain as $anggota) {
            KelompokAnggota::create([
                'tugas_id' => $tugas->id,
                'kelompok_tugas_id' => $kelompok->id,
                'student_id' => $anggota->id,
                'role' => 'anggota',
                'joined_at' => now(),
            ]);
        }

        return $kelompok->load('tugas');
    }
}
