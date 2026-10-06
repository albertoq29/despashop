<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avisos flotantes de la página de bienvenida.
 *
 * Son de la plataforma, no de un comercio: por eso no llevan user_id ni
 * pasan por el aislamiento por tenant. Sirven para anunciar una promoción,
 * una fecha límite o un cambio del servicio a quien entra por primera vez.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_notices', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('image_path')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('cta_link')->nullable();
            $table->string('tone')->default('promo');        // promo | info | aviso
            $table->string('position')->default('centro');   // centro | esquina
            $table->unsignedInteger('delay_seconds')->default(2);
            // Cada cuánto vuelve a salirle al mismo visitante
            $table->string('frequency')->default('una_vez_dia'); // siempre | una_vez_sesion | una_vez_dia
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_notices');
    }
};
