<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Entrega personal y delivery son dos cosas distintas.
 *
 * Una la lleva el propio comercio y se acuerda con el cliente: «paso el
 * jueves por la tarde». La otra la manda con alguien, tiene un recorrido
 * de un punto a otro y a veces un costo aparte. Se agendan las dos, pero
 * quien sale a repartir no mira la misma lista que quien entrega en mano.
 *
 * Lo que ya existe es entrega personal: era lo único que se podía agendar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('type', 20)->default('personal')->after('factura_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
