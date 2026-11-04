<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@studymate.com'],
            [
                'name' => 'Admin StudyMate',
                'gender' => 'Male',
                'password' => Hash::make('admin12345'),
                'role' => 'admin',
                'class_id' => null,
            ]
        );
    }
}
