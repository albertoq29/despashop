<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registro de seguridad de la plataforma: todo lo que parece un intento de
 * abuso queda aquí, agrupado por repeticiones, para que el admin lo revise.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->string('type', 60);              // login.fallido, acceso.ajeno, sondeo.rutas...
            $table->string('severity', 10);          // baja | media | alta
            $table->string('description');

            // Quién lo hizo, si estaba autenticado, y a qué comercio afecta
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('users')->nullOnDelete();

            $table->json('properties')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('method', 10)->nullable();
            $table->string('path', 255)->nullable();

            // Repeticiones del mismo hecho: una ráfaga es una fila, no cien
            $table->unsignedInteger('hits')->default(1);
            $table->timestamp('last_seen_at')->nullable();

            $table->timestamp('notified_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('review_note', 500)->nullable();

            $table->timestamps();

            $table->index(['reviewed_at', 'severity']);
            $table->index(['type', 'created_at']);
            $table->index(['ip_address', 'created_at']);
            $table->index('created_at');
        });

        Schema::table('users', function (Blueprint $table) {
            // Permite avisar cuando una cuenta entra desde una IP nueva
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('last_login_ip');
        });

        Schema::dropIfExists('security_events');
    }
};
