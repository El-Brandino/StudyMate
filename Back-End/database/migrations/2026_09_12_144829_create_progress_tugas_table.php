<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('progress_tugas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('task_id')
                ->constrained('tugas')
                ->cascadeOnDelete();

            $table->foreignId('student_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->enum('status', [
                'belum',
                'selesai'
            ])->default('belum');

            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->unique([
                'task_id',
                'student_id'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('progress_tugas');
    }
};
