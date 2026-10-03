<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Libro de compras: cada vez que entra mercancía, con el costo de ese día.
 *
 * Hasta ahora la inversión de un producto era una sola columna que unos
 * caminos del código actualizaban y otros no: reponer stock no la subía, y
 * vender un producto con variantes la bajaba. Con un libro de entradas la
 * inversión deja de ser un número que alguien tiene que acordarse de
 * mantener y pasa a ser la suma de lo que realmente se compró.
 *
 * Guardar el costo de cada entrada también arregla el otro problema: hasta
 * hoy el historial completo se valoraba al costo de hoy, así que subir el
 * costo de un producto reescribía lo que te costó el año pasado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            // Negativa cuando es una corrección a la baja
            $table->integer('qty');
            $table->decimal('unit_cost', 12, 4)->default(0);
            $table->decimal('total_cost', 12, 2)->default(0);

            // alta | reposicion | correccion | manual | restaurado
            $table->string('origin', 20)->default('manual');
            $table->string('note', 160)->nullable();
            $table->timestamp('purchased_at');

            $table->timestamps();

            $table->index(['user_id', 'purchased_at']);
            $table->index(['product_id', 'purchased_at']);
        });

        // Lo que ya existe se asienta como una entrada inicial: las unidades
        // que pasaron por el inventario (lo que queda, lo vendido y lo
        // perdido) al único costo que conocemos, el que tiene hoy el producto.
        foreach (DB::table('products')->get() as $producto) {
            $vendidas = (int) DB::table('factura_items')
                ->join('facturas', 'factura_items.factura_id', '=', 'facturas.id')
                ->where('facturas.status', 'confirmed')
                ->where('factura_items.product_id', $producto->id)
                ->sum('factura_items.qty');

            $perdidas = (int) DB::table('product_adjustments')
                ->where('type', 'loss')
                ->where('product_id', $producto->id)
                ->sum('qty');

            $unidades = (int) $producto->stock + $vendidas + $perdidas;
            $costo = (float) ($producto->cost_price ?? 0);

            if ($unidades <= 0 || $costo <= 0) {
                continue;
            }

            DB::table('product_purchases')->insert([
                'user_id' => $producto->user_id,
                'product_id' => $producto->id,
                'qty' => $unidades,
                'unit_cost' => $costo,
                'total_cost' => round($unidades * $costo, 2),
                'origin' => 'inicial',
                'note' => 'Inventario que ya estaba cargado',
                'purchased_at' => $producto->created_at ?? now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // La columna sigue existiendo como total en caché del libro.
        // Sin alias de tabla: así la sentencia vale igual en MySQL y en sqlite.
        DB::statement('UPDATE products SET inversion_historica = COALESCE((
            SELECT SUM(total_cost) FROM product_purchases WHERE product_purchases.product_id = products.id
        ), 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('product_purchases');
    }
};
