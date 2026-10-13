<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Existencias por peso, volumen o medida.
 *
 * Hasta ahora todo se contaba en unidades enteras, así que un queso de 2,5 kg
 * o 350 ml de esencia no se podían registrar. La unidad es del producto, y el
 * stock y la cantidad facturada pasan a decimales con tres cifras: alcanza
 * para gramos dentro de un kilo y para mililitros dentro de un litro.
 *
 * Los enteros que ya existen caben en un decimal sin perder nada, así que no
 * hay que tocar ningún dato.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('unidad', 12)->default('unidad')->after('stock');
            $table->decimal('stock', 12, 3)->default(0)->change();
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->decimal('qty', 12, 3)->default(1)->change();
        });

        // El libro de compras también: quien vende queso por kilo lo compra
        // por kilo, y con la columna entera 12,5 kg entraban como 12.
        Schema::table('product_purchases', function (Blueprint $table) {
            $table->decimal('qty', 12, 3)->change();
        });
    }

    public function down(): void
    {
        Schema::table('product_purchases', function (Blueprint $table) {
            $table->integer('qty')->change();
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->integer('qty')->default(1)->change();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('unidad');
            $table->integer('stock')->default(0)->change();
        });
    }
};
