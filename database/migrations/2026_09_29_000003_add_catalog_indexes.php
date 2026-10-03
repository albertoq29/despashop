<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices para las consultas que corre el catálogo público en cada visita.
 *
 * Son siempre la misma forma: los artículos visibles de un comercio,
 * ordenados como él los acomodó. Sin índice, la base recorre toda la tabla
 * de productos de la plataforma para pintar una sola tienda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index(['user_id', 'is_hidden', 'item_type', 'display_order'], 'products_catalogo_index');
        });

        Schema::table('combos', function (Blueprint $table) {
            $table->index(['user_id', 'is_hidden'], 'combos_catalogo_index');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_catalogo_index');
        });

        Schema::table('combos', function (Blueprint $table) {
            $table->dropIndex('combos_catalogo_index');
        });
    }
};
