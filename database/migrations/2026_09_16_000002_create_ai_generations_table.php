<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registro de cada uso del asistente de IA.
 *
 * Sirve para tres cosas: contar el uso diario de cada comercio, dejar
 * constancia de lo que se pidió (el admin puede revisar abusos) y guardar
 * la propuesta, para que el inventario de ejemplo se cree a partir de lo que
 * generó el servidor y no de lo que mande el navegador.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Quién la pidió: el comercio o el admin que inspecciona su cuenta
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('kind')->default('catalogo');
            $table->text('prompt');
            $table->json('options')->nullable();

            // completada | rechazada | bloqueada | fallida
            $table->string('status');
            $table->string('reason')->nullable();

            $table->string('model')->nullable();
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->json('result')->nullable();
            $table->timestamp('inventory_applied_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::table('plans', function (Blueprint $table) {
            // Creaciones con IA por día. 0 desactiva la función para ese plan.
            $table->unsignedSmallInteger('ai_daily_limit')->default(3)->after('max_invoices_per_month');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('ai_daily_limit');
        });

        Schema::dropIfExists('ai_generations');
    }
};
