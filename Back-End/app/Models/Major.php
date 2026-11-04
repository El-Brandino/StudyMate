<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Major extends Model
{
    protected $fillable = [
        'name',
    ];

    public function kelas()
    {
        return $this->hasMany(Kelas::class);
    }
}