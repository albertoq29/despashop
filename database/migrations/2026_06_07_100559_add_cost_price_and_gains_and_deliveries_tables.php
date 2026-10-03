<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable()->after('price_distribuidor_usdt');
        });

        Schema::table('facturas', function (Blueprint $table) {
            $table->decimal('profit_usd', 10, 2)->default(0.00)->after('total_bs');
            $table->boolean('has_delivery')->default(false)->after('profit_usd');
        });

        Schema::table('factura_items', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable()->after('unit_price_usd');
            $table->decimal('profit_usd', 10, 2)->default(0.00)->after('subtotal_usd');
        });

        Schema::create('product_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('type'); // 'loss', 'gain'
            $table->integer('qty')->default(1);
            $table->decimal('amount_usd', 10, 2);
            $table->string('reason');
            $table->timestamps();
        });

        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained('facturas')->onDelete('cascade');
            $table->dateTime('delivery_date');
            $table->string('status')->default('pending'); // 'pending', 'completed'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('product_adjustments');

        Schema::table('factura_items', function (Blueprint $table) {
            $table->dropColumn(['cost_price', 'profit_usd']);
        });

        Schema::table('facturas', function (Blueprint $table) {
            $table->dropColumn(['profit_usd', 'has_delivery']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('cost_price');
        });
    }
};
