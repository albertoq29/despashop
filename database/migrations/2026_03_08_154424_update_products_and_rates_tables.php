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
            $table->decimal('price_mayor_usdt', 10, 2)->nullable()->after('price_usdt');
            $table->decimal('price_distribuidor_usdt', 10, 2)->nullable()->after('price_mayor_usdt');
        });

        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->decimal('binance', 12, 4)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['price_mayor_usdt', 'price_distribuidor_usdt']);
        });

        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->decimal('binance', 12, 4)->nullable(false)->change();
        });
    }
};
