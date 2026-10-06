<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * De dónde sale y a dónde va una entrega.
 *
 * Son dos textos libres a propósito: un punto de entrega en Venezuela se
 * dice «frente a la panadería, casa de rejas verdes», no con una dirección
 * postal ni con coordenadas. Quien reparte necesita leerlo, no geocodificarlo.
 *
 * Opcionales los dos: una entrega agendada sigue valiendo sin puntos, que
 * es como funcionan las que se acuerdan por teléfono.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('point_a', 255)->nullable()->after('factura_id');
            $table->string('point_b', 255)->nullable()->after('point_a');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['point_a', 'point_b']);
        });
    }
};
