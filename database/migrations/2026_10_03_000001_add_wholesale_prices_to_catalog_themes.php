<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mostrar o no los precios al mayor y de distribuidor en el catálogo.
 *
 * Hasta ahora el catálogo público solo enseñaba el precio al detal: los
 * otros dos existían para facturar, no para mostrarse. Pero un comercio que
 * vende a revendedores los necesita a la vista, y otro que atiende solo al
 * público no quiere que se vean nunca.
 *
 * Tres posturas, no un interruptor: ocultos, solo al abrir el producto, o
 * también en la tarjeta de la rejilla. Por defecto `off`, que es como se
 * comportaba antes: un catálogo existente no cambia solo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            // off | modal | card
            $table->string('wholesale_prices', 10)->default('off')->after('show_bs_prices');
        });
    }

    public function down(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            $table->dropColumn('wholesale_prices');
        });
    }
};
