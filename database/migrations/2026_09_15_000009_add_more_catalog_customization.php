<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Más control visual del catálogo.
 *
 * Con solo colores y tipografías, dos comercios distintos terminaban con
 * catálogos casi idénticos. Estos campos gobiernan el fondo, la forma de
 * los botones, el comportamiento de las tarjetas y el aire entre elementos,
 * que es lo que de verdad hace que un catálogo se sienta propio.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            // Fondo de la página
            $table->string('background_style')->default('solid')->after('color_muted');   // solid | gradient | pattern
            $table->string('background_pattern')->default('dots')->after('background_style'); // dots | grid | diagonal | waves
            $table->unsignedTinyInteger('background_intensity')->default(6)->after('background_pattern');

            // Cabecera
            $table->string('header_align')->default('left')->after('background_intensity'); // left | center
            $table->boolean('header_sticky')->default(true)->after('header_align');
            $table->string('logo_size')->default('md')->after('header_sticky');             // sm | md | lg

            // Botones y tarjetas
            $table->string('button_style')->default('solid')->after('logo_size');           // solid | outline | soft | pill
            $table->string('card_hover')->default('lift')->after('button_style');           // none | lift | zoom | border
            $table->string('image_fit')->default('cover')->after('card_hover');             // cover | contain
            $table->string('density')->default('normal')->after('image_fit');               // compact | normal | airy

            // Detalles
            $table->boolean('show_product_badges')->default(true)->after('density');
            $table->string('price_style')->default('normal')->after('show_product_badges'); // normal | destacado | discreto
        });
    }

    public function down(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            $table->dropColumn([
                'background_style', 'background_pattern', 'background_intensity',
                'header_align', 'header_sticky', 'logo_size',
                'button_style', 'card_hover', 'image_fit', 'density',
                'show_product_badges', 'price_style',
            ]);
        });
    }
};
