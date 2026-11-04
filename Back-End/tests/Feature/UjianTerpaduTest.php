<?php

namespace Tests\Feature;

use App\Models\Kelas;
use App\Models\Major;
use App\Models\Subject;
use App\Models\Ujian;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UjianTerpaduTest extends TestCase
{
    use RefreshDatabase;

    private Major $major;
    private Kelas $kelas;
    private Subject $subject;
    private User $guru;

    protected function setUp(): void
    {
        parent::setUp();

        $this->major = Major::create(['name' => 'RPL']);
        $this->kelas = Kelas::create([
            'major_id' => $this->major->id,
            'grade' => 'XI',
            'class_number' => 1,
        ]);
        $this->subject = Subject::create(['name' => 'Matematika']);

        $this->guru = User::create([
            'name' => 'Guru Ujian',
            'gender' => 'Male',
            'email' => 'guru-ujian@test.local',
            'password' => Hash::make('password123'),
            'role' => 'guru',
            'class_id' => null,
        ]);
        $this->guru->subjects()->attach($this->subject->id);
    }

    public function test_guru_bisa_membuat_ujian_untuk_mapel_yang_diampu(): void
    {
        Sanctum::actingAs($this->guru);

        $this->postJson('/api/ujian', $this->payloadUjian())
            ->assertCreated()
            ->assertJsonPath('ujian.subject_id', $this->subject->id);
    }

    public function test_guru_tidak_bisa_membuat_ujian_dengan_mapel_yang_bukan_miliknya(): void
    {
        $mapelLain = Subject::create(['name' => 'Fisika']);

        Sanctum::actingAs($this->guru);
        $this->postJson('/api/ujian', $this->payloadUjian([
            'subject_id' => $mapelLain->id,
        ]))->assertForbidden();
    }

    public function test_guru_tidak_bisa_mengubah_ujian_ke_mapel_yang_bukan_miliknya(): void
    {
        $ujian = Ujian::create([
            'teacher_id' => $this->guru->id,
            'subject_id' => $this->subject->id,
            'title' => 'Ujian Awal',
            'exam_date' => now()->addWeek()->format('Y-m-d'),
            'start_time' => '08:00',
            'duration' => 90,
        ]);
        $ujian->kelas()->sync([$this->kelas->id]);

        $mapelLain = Subject::create(['name' => 'Fisika']);

        Sanctum::actingAs($this->guru);
        $this->putJson("/api/ujian/{$ujian->id}", $this->payloadUjian([
            'subject_id' => $mapelLain->id,
        ]))->assertForbidden();
    }

    private function payloadUjian(array $overrides = []): array
    {
        return array_merge([
            'subject_id' => $this->subject->id,
            'title' => 'Ujian Uji',
            'description' => 'Deskripsi ujian uji.',
            'exam_date' => now()->addWeek()->format('Y-m-d'),
            'start_time' => '08:00',
            'duration' => 90,
            'class_ids' => [$this->kelas->id],
        ], $overrides);
    }
}
