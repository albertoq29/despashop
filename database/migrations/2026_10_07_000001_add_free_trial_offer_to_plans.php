<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prueba gratis ofrecida desde el plan.
 *
 * Es el descuento programado llevado al extremo: 100% de rebaja. Lo que
 * cambia es cómo se cierra la oferta. Por tiempo ya se podía —las fechas
 * que ya existen—, pero una promoción de lanzamiento casi siempre se
 * limita por cupos: «los primeros diez comercios». Sin tope, un plan
 * regalado se regala para siempre y nadie se acuerda de apagarlo.
 *
 * El cupo se gasta al aprobar la cuenta, no al registrarse: es el momento
 * en que el comercio de verdad recibe el plan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            // Cuánto dura el período gratis de cada uno. Vacío usa los días
            // de prueba de la plataforma, que es lo normal.
            $table->unsignedSmallInteger('trial_days')->nullable()->after('discount_ends_at');

            // Cupos de la oferta y cuántos van tomados. Vacío es sin tope.
            $table->unsignedSmallInteger('discount_limit')->nullable()->after('trial_days');
            $table->unsignedSmallInteger('discount_claimed')->default(0)->after('discount_limit');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['trial_days', 'discount_limit', 'discount_claimed']);
        });
    }
};
