<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogos que el administrador ancla en la bienvenida.
 *
 * La tira de «negocios que ya publicaron» se llena sola por fecha, y eso
 * sirve para mostrar que la plataforma se usa, no para mostrar lo que se
 * puede lograr con ella. Un catálogo bien armado vende mejor que cualquier
 * texto, pero hay que elegirlo a mano: ni el más nuevo ni el que tiene más
 * productos es el más bonito.
 *
 * `showcase_at` hace de interruptor y de orden a la vez: el último anclado
 * va primero, así que volver a anclar uno lo manda al frente sin necesidad
 * de una pantalla para ordenarlos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('showcase_at')->nullable()->after('plan_note')->index();
            $table->string('showcase_note', 120)->nullable()->after('showcase_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['showcase_at', 'showcase_note']);
        });
    }
};
