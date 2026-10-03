<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retira el módulo de pedidos.
 *
 * Los pedidos eran el antecesor de la factura: un carrito que el visitante
 * enviaba desde el catálogo. La factura cubre lo mismo y además descuenta
 * inventario, calcula ganancias y deja documento, así que mantener las dos
 * vías solo duplicaba el registro de una venta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }

    public function down(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('tracking_id')->unique();
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->decimal('total_usd', 10, 2);
            $table->decimal('total_bs', 10, 2);
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');
            $table->integer('quantity')->default(1);
            $table->decimal('price_usd', 10, 2);
            $table->timestamps();
        });
    }
};
