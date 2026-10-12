<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Servicios que se cobran por suscripción.
 *
 * Un hosting, un plan de mantenimiento o una asesoría mensual no se
 * facturan una vez: se renuevan. El comercio necesita saber a quién le
 * toca pagar y cuándo, y eso hoy vive en la cabeza o en un cuaderno.
 *
 * El producto guarda su período; la factura guarda la fecha concreta de
 * la próxima renovación, porque dos clientes del mismo servicio no
 * renuevan el mismo día. Al marcar una como renovada, la fecha salta al
 * siguiente período sin tener que facturar de nuevo: facturar es otra
 * decisión y a veces se cobra por adelantado o con retraso.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('es_suscripcion')->default(false)->after('service_mode');
            // mensual | trimestral | semestral | anual
            $table->string('periodo_suscripcion', 20)->nullable()->after('es_suscripcion');
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->date('renueva_el')->nullable()->after('subtotal_usd')->index();
            // Cuántas veces se renovó: el historial de un cliente al que se
            // le cobra desde hace un año no debería perderse
            $table->unsignedSmallInteger('renovaciones')->default(0)->after('renueva_el');
            $table->timestamp('renovado_el')->nullable()->after('renovaciones');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['es_suscripcion', 'periodo_suscripcion']);
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->dropColumn(['renueva_el', 'renovaciones', 'renovado_el']);
        });
    }
};
