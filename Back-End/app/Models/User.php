<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Subject;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    protected $hidden = [
    'password',
    'remember_token',
    ];

    protected $fillable = [
        'name',
        'gender',
        'email',
        'password',
        'role',
        'class_id',
        'profile_photo',
    ];

    public function kelas()
    {
        return $this->belongsTo(Kelas::class, 'class_id');
    }

    public function teacherSubjects()
    {
        return $this->hasMany(
            TeacherSubject::class,
            'teacher_id'
        );
    }

    
    public function subjects()
    {
        return $this->belongsToMany(
            Subject::class,
            'teacher_subjects',
            'teacher_id',
            'subject_id'
        )->withTimestamps();
    }


    public function progressTugas()
    {
        return $this->hasMany(
            ProgressTugas::class,
            'student_id'
        );
    }

    public function kelompokAnggota()
    {
        return $this->hasMany(KelompokAnggota::class, 'student_id');
    }

    public function undanganKelompok()
    {
        return $this->hasMany(UndanganKelompok::class, 'student_id');
    }

    public function pekerjaanKelompok()
    {
        return $this->belongsToMany(
            PekerjaanKelompok::class,
            'pekerjaan_kelompok_anggota',
            'student_id',
            'pekerjaan_kelompok_id'
        )->withPivot('assigned_by')->withTimestamps();
    }

    public function isTeacher()
    {
        return $this->role === 'guru';
    }

    public function isStudent()
    {
        return $this->role === 'siswa';
    }

    public function isAdmin()
    {
        return $this->role === 'admin';
    }
}
