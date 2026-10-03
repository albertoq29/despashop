<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo armado por secciones.
 *
 * Hasta ahora el orden de la página estaba escrito en el código: cabecera,
 * banners, portada y productos, siempre igual. Con `sections` el comercio
 * decide qué bloques aparecen y en qué orden, y puede sumar bloques propios
 * de texto, beneficios o una categoría destacada.
 *
 * El resto de columnas amplía lo que se puede cambiar de cada bloque sin
 * tocar código: variantes de cabecera y portada, estilo de las categorías,
 * nivel de animación y cómo se ordenan los productos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            // Orden y contenido de los bloques de la página
            $table->json('sections')->nullable()->after('price_style');

            // Cabecera
            $table->string('header_style')->default('glass')->after('logo_size'); // glass | solid | brand | minimal
            $table->boolean('header_nav')->default(true)->after('header_style');

            // Portada
            $table->string('hero_layout')->default('centered')->after('hero_style'); // centered | split | left | minimal
            $table->string('hero_height')->default('md')->after('hero_layout');      // sm | md | lg

            // Productos
            $table->string('category_style')->default('pills')->after('card_style'); // pills | underline | boxes
            $table->string('product_sort')->default('manual')->after('category_style'); // manual | newest | price_asc | price_desc | name
            $table->boolean('show_sort')->default(true)->after('product_sort');
            $table->boolean('quick_view')->default(true)->after('show_sort');

            // Movimiento
            $table->string('animation_level')->default('subtle')->after('sections'); // none | subtle | lively
        });
    }

    public function down(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            $table->dropColumn([
                'sections', 'header_style', 'header_nav', 'hero_layout', 'hero_height',
                'category_style', 'product_sort', 'show_sort', 'quick_view', 'animation_level',
            ]);
        });
    }
};
