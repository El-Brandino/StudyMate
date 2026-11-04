<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tugas_kelas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tugas_id')
                ->constrained('tugas')
                ->cascadeOnDelete();

            $table->foreignId('class_id')
                ->constrained('kelas')
                ->cascadeOnDelete();

            $table->unique(['tugas_id', 'class_id']);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tugas_kelas');
    }
};