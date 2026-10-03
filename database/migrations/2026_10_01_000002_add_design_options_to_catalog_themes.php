<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Más control sobre el diseño del catálogo.
 *
 * Hasta ahora el movimiento era un solo interruptor de tres posiciones:
 * el comercio podía decir «poco» o «mucho», pero no *qué* animación. Ahora
 * elige la entrada (de dónde aparecen los bloques), la velocidad y si la
 * cascada está encendida, además del estilo de los títulos y la proporción
 * de las fotos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            // Animación de entrada: qué hace un bloque al aparecer
            $table->string('animation_entrance', 20)->default('up')->after('animation_level');
            $table->string('animation_speed', 10)->default('normal')->after('animation_entrance');
            $table->boolean('animation_stagger')->default(true)->after('animation_speed');

            // Cómo se ven los títulos de sección
            $table->string('heading_style', 20)->default('normal')->after('font_body');

            // Proporción del recuadro de las fotos de producto
            $table->string('image_ratio', 12)->default('square')->after('image_fit');

            // Barra delgada arriba que muestra cuánto se ha recorrido
            $table->boolean('scroll_progress')->default(false)->after('header_nav');
        });
    }

    public function down(): void
    {
        Schema::table('catalog_themes', function (Blueprint $table) {
            $table->dropColumn([
                'animation_entrance',
                'animation_speed',
                'animation_stagger',
                'heading_style',
                'image_ratio',
                'scroll_progress',
            ]);
        });
    }
};
