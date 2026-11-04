<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ujian_kelas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ujian_id')
                ->constrained('ujians')
                ->cascadeOnDelete();

            $table->foreignId('class_id')
                ->constrained('kelas')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(['ujian_id', 'class_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ujian_kelas');
    }
};
