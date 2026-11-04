<?php

namespace App\Http\Controllers;

use App\Models\Kelas;
use Illuminate\Http\Request;

class KelasController extends Controller
{
    public function index(Request $request)
    {
        $kelas = Kelas::with('major')
            ->orderBy('grade')
            ->orderBy('class_number')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'grade' => $item->grade,
                    'class_number' => $item->class_number,
                    'major_id' => $item->major_id,
                    'major_name' => $item->major?->name,
                    'name' => $item->grade
                        . ' '
                        . ($item->major?->name ?? 'Jurusan')
                        . ' '
                        . $item->class_number,
                ];
            });

        return response()->json($kelas);
    }
}
