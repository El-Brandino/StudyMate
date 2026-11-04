<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // REGISTER
    
public function register(Request $request)
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'gender' => 'required|in:Male,Female',
        'email' => 'required|email|max:255|unique:users,email',
        'password' => 'required|string|min:8|confirmed',
        'class_id' => 'required|integer|exists:kelas,id',
    ]);

    $user = User::create([
        'name' => $validated['name'],
        'gender' => $validated['gender'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']),
        'role' => 'siswa',
        'class_id' => $validated['class_id'],
    ]);

    $token = $user->createToken('studymate')->plainTextToken;

    return response()->json([
        'message' => 'Registrasi berhasil.',
        'user' => $user->load('kelas.major'),
        'token' => $token,
    ], 201);
}



    // LOGIN
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Email atau password salah'
            ], 401);
        }

        $user = Auth::user();

        $token = $user->createToken('studymate')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'user' => $user,
            'token' => $token,
        ]);
    }


    // USER YANG SEDANG LOGIN
    public function me(Request $request)
    {
        $user = $request->user()->load([
            'kelas',
            'kelas.major',
        ]);

        return response()->json([
            'user' => $user,
        ]);
    }


    // LOGOUT
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil'
        ]);
    }
}