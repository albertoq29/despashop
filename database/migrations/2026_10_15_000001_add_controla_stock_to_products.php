<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Productos que no se cuentan.
 *
 * Un servicio nunca llevó existencias, pero hay productos que tampoco: el pan
 * que se hornea cada mañana, las bolsas, lo que se arma por encargo. Llevarles
 * la cuenta no dice nada y lo único que logra es que el catálogo los muestre
 * agotados y la factura se niegue a venderlos.
 *
 * Nace encendido: todo lo que ya existe se sigue contando como hasta ahora.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('controla_stock')->default(true)->after('unidad');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('controla_stock');
        });
    }
};
