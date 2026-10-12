<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Precio especial para quien paga en divisas.
 *
 * No es el precio en dólares convertido a bolívares al BCV: es otro
 * precio, normalmente más bajo, que el comercio ofrece a quien paga en
 * efectivo en divisas. Aquí es práctica corriente y hasta ahora había que
 * acordarlo por WhatsApp caso por caso.
 *
 * Va uno por cada nivel, porque quien compra al mayor y paga en divisas
 * tampoco paga lo mismo que quien compra al mayor y paga en bolívares.
 * Todos opcionales: sin valor, ese nivel no tiene promo y se cobra normal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price_divisa_usdt', 10, 2)->nullable()->after('price_distribuidor_usdt');
            $table->decimal('price_mayor_divisa_usdt', 10, 2)->nullable()->after('price_divisa_usdt');
            $table->decimal('price_distribuidor_divisa_usdt', 10, 2)->nullable()->after('price_mayor_divisa_usdt');
        });

        // Pagar en divisas es una decisión de la factura entera, no de cada
        // renglón: el cliente paga todo en efectivo o no. Queda guardado
        // para que el recibo lo diga y las ganancias cuadren después.
        Schema::table('facturas', function (Blueprint $table) {
            $table->boolean('en_divisas')->default(false)->after('bcv_rate');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'price_divisa_usdt',
                'price_mayor_divisa_usdt',
                'price_distribuidor_divisa_usdt',
            ]);
        });

        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn('en_divisas');
        });
    }
};
