<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * La página propia por producto se retira.
 *
 * Quedan dos maneras de abrir un producto: una ventana encima del catálogo
 * o nada. Un catálogo que había elegido página vuelve a la ventana, que es
 * lo más parecido a lo que estaba viendo.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('catalog_themes')->where('product_view', 'pagina')->update(['product_view' => 'modal']);
    }

    public function down(): void
    {
        // No hay vuelta atrás: el valor viejo no se puede adivinar
    }
};
