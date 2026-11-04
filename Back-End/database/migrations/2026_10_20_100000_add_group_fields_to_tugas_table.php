<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tugas', function (Blueprint $table) {
            $table->enum('mode', ['individu', 'kelompok'])
                ->default('individu')
                ->after('teacher_id')
                ->index();
            $table->text('instructions')->nullable()->after('description');
            $table->unsignedSmallInteger('min_members')->nullable()->after('instructions');
            $table->unsignedSmallInteger('max_members')->nullable()->after('min_members');
        });
    }

    public function down(): void
    {
        Schema::table('tugas', function (Blueprint $table) {
            $table->dropIndex(['mode']);
            $table->dropColumn(['mode', 'instructions', 'min_members', 'max_members']);
        });
    }
};
