<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TugasDocument extends Model
{
    protected $fillable = [
        'tugas_id',
        'file_name',
        'file_path',
    ];

    public function tugas()
    {
        return $this->belongsTo(Tugas::class);
    }
}