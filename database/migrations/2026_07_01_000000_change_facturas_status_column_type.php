<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->string('status', 50)->default('draft')->change();
        });
    }

    public function down(): void
    {
        Schema::table('facturas', function (Blueprint $table) {
            $table->enum('status', ['draft', 'confirmed'])->default('draft')->change();
        });
    }
};
