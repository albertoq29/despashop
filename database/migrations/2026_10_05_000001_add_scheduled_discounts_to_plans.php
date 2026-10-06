<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Descuentos con fecha en los planes.
 *
 * El precio del plan no se toca: el descuento vive aparte y se aplica solo
 * mientras corre su ventana. Así una promoción de temporada se deja
 * programada y se apaga sola, sin que nadie tenga que acordarse de volver
 * a subir el precio el lunes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedTinyInteger('discount_percent')->nullable()->after('price_bs');
            $table->string('discount_label', 40)->nullable()->after('discount_percent');
            $table->timestamp('discount_starts_at')->nullable()->after('discount_label');
            $table->timestamp('discount_ends_at')->nullable()->after('discount_starts_at');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'discount_percent',
                'discount_label',
                'discount_starts_at',
                'discount_ends_at',
            ]);
        });
    }
};
