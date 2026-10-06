<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cómo se abre un producto, y la selección múltiple.
 *
 * Hasta ahora había un interruptor de «vista rápida» con dos estados: se
 * abre una ventana o no pasa nada. Ahora son tres caminos —ventana, página
 * propia o nada— así que el interruptor se convierte en una elección, y lo
 * que había se traslada tal cual: encendido era ventana, apagado era nada.
 *
 * La selección múltiple nace encendida: agrega un botón al catálogo, no
 * quita nada, y es justo lo que pide un cliente que quiere varias cosas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            $table->string('product_view')->default('modal')->after('quick_view');
            $table->boolean('multi_select')->default(true)->after('product_view');
        });

        DB::table('catalog_themes')->where('quick_view', false)->update(['product_view' => 'ninguna']);
    }

    public function down(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            $table->dropColumn(['product_view', 'multi_select']);
        });
    }
};
