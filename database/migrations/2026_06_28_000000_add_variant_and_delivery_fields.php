<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('show_variants_in_store')->default(true)->after('por_llegar');
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->onDelete('set null');
        });

        Schema::table('facturas', function (Blueprint $table) {
            $table->boolean('show_variants_in_receipt')->default(true)->after('has_delivery');
            $table->boolean('has_delivery_fee')->default(false)->after('show_variants_in_receipt');
            $table->decimal('delivery_bs', 12, 2)->default(0)->after('has_delivery_fee');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('show_variants_in_store');
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn('product_variant_id');
        });

        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn(['show_variants_in_receipt', 'has_delivery_fee', 'delivery_bs']);
        });
    }
};
