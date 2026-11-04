<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    // Semua mapel yang tersedia
    public function index()
    {
        return response()->json(Subject::all());
    }

    // Mapel milik guru yang sedang login
    public function mySubjects(Request $request)
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json([
                'message' => 'Hanya guru yang dapat mengakses fitur ini.',
            ], 403);
        }

        return response()->json(
            $user->subjects()->get()
        );
    }
}