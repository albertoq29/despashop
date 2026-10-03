<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Se retira la tasa paralela.
 *
 * La plataforma trabaja solo con la tasa oficial del BCV: el paralelo ya no
 * se registraba en las tasas nuevas y mostrarlo junto al oficial confundía
 * sobre cuál se usa para calcular los precios en bolívares.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->dropColumn('binance');
        });
    }

    public function down(): void
    {
        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->decimal('binance', 14, 4)->nullable()->after('bcv');
        });
    }
};
