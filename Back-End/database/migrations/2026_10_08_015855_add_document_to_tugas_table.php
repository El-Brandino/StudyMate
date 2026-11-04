<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('tugas', 'document')) {
            return;
        }

        Schema::table('tugas', function (Blueprint $table) {
            $table->string('document')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('tugas', 'document')) {
            return;
        }

        Schema::table('tugas', function (Blueprint $table) {
            $table->dropColumn('document');
        });
    }
};