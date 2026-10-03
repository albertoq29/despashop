<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('inversion_historica', 12, 2)->default(0.00)->after('cost_price');
        });

        // Initialize existing products' inversion_historica
        $products = DB::table('products')->get();
        foreach ($products as $product) {
            $qtySold = DB::table('factura_items')
                ->join('facturas', 'factura_items.factura_id', '=', 'facturas.id')
                ->where('facturas.status', 'confirmed')
                ->where('factura_items.product_id', $product->id)
                ->sum('qty');

            $qtyLost = DB::table('product_adjustments')
                ->where('type', 'loss')
                ->where('product_id', $product->id)
                ->sum('qty');

            $historicalUnits = $product->stock + $qtySold + $qtyLost;
            $inversionHistorica = ($product->cost_price ?? 0) * $historicalUnits;

            DB::table('products')->where('id', $product->id)->update([
                'inversion_historica' => $inversionHistorica
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('inversion_historica');
        });
    }
};
