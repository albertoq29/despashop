<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');                 // producto.creado, factura.confirmada, catalogo.publicado...
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('description')->nullable();
            $table->json('properties')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });

        Schema::create('catalog_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('visited_on');
            $table->unsignedInteger('visits')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'visited_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_visits');
        Schema::dropIfExists('activity_logs');
    }
};
