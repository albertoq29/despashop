<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un comercio también puede ofrecer servicios.
 *
 * Se resuelve con una columna en `products` en vez de una tabla aparte: un
 * servicio se cobra, se factura y se muestra en el catálogo igual que un
 * producto, y solo cambia qué datos tienen sentido (duración y modalidad
 * en lugar de existencias).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('item_type', 20)->default('producto')->after('name'); // producto | servicio
            $table->string('service_duration', 40)->nullable()->after('item_type');
            $table->string('service_mode', 20)->nullable()->after('service_duration'); // local | domicilio | remoto | acordar

            $table->index(['user_id', 'item_type']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'item_type']);
            $table->dropColumn(['item_type', 'service_duration', 'service_mode']);
        });
    }
};
