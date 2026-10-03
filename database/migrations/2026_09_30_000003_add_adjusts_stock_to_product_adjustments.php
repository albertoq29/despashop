<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Deja constancia de si una pérdida descontó inventario.
 *
 * Sin este dato no se puede reconstruir el stock de un mes pasado: las
 * unidades de una pérdida que nunca tocó el inventario se contaban dos
 * veces, una en el stock y otra como perdidas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_adjustments', function (Blueprint $table) {
            $table->boolean('adjusts_stock')->default(false)->after('reason');
        });

        // De lo ya registrado no hay forma de saberlo con certeza. La mejor
        // pista es el concepto: la pantalla marcaba el descuento sola en
        // estos dos casos, que son los que mueven mercancía de verdad.
        DB::table('product_adjustments')
            ->where('type', 'loss')
            ->whereNotNull('product_id')
            ->whereIn('concept', ['Producto Dañado / Vencido', 'Pérdida de Inventario / Faltante'])
            ->update(['adjusts_stock' => true]);
    }

    public function down(): void
    {
        Schema::table('product_adjustments', function (Blueprint $table) {
            $table->dropColumn('adjusts_stock');
        });
    }
};
