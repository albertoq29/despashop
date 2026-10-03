<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_themes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Identidad visual
            $table->string('logo_path')->nullable();
            $table->string('favicon_path')->nullable();
            $table->string('cover_path')->nullable();
            $table->boolean('palette_from_logo')->default(true);
            $table->json('logo_palette')->nullable();   // colores extraídos automáticamente del logo

            // Paleta efectiva del catálogo (el comercio puede sobrescribir la automática)
            $table->string('color_primary')->default('#292524');
            $table->string('color_secondary')->default('#57534e');
            $table->string('color_accent')->default('#b45309');
            $table->string('color_bg')->default('#ffffff');
            $table->string('color_surface')->default('#fafaf9');
            $table->string('color_text')->default('#1c1917');
            $table->string('color_muted')->default('#78716c');

            // Tipografía y forma
            $table->string('font_heading')->default('Poppins');
            $table->string('font_body')->default('Inter');
            $table->string('radius')->default('lg');        // none | sm | md | lg | xl | full
            $table->string('shadow')->default('md');        // none | sm | md | lg
            $table->boolean('dark_mode')->default(false);

            // Estructura del catálogo
            $table->string('layout')->default('grid');      // grid | list | masonry
            $table->unsignedTinyInteger('columns_desktop')->default(4);
            $table->unsignedTinyInteger('columns_mobile')->default(2);
            $table->string('card_style')->default('elevated'); // elevated | flat | bordered | overlay
            $table->boolean('show_prices')->default(true);
            $table->boolean('show_stock')->default(true);
            $table->boolean('show_categories')->default(true);
            $table->boolean('show_search')->default(true);
            $table->boolean('show_bs_prices')->default(true);

            // Hero / portada
            $table->boolean('hero_enabled')->default(true);
            $table->string('hero_style')->default('image');  // image | gradient | solid | video
            $table->string('hero_title')->nullable();
            $table->string('hero_subtitle')->nullable();
            $table->string('hero_cta_text')->nullable();
            $table->string('hero_cta_link')->nullable();

            // Carrusel de banners
            $table->boolean('banners_enabled')->default(true);
            $table->boolean('banners_autoplay')->default(true);
            $table->unsignedInteger('banners_interval')->default(5000); // ms
            $table->string('banners_effect')->default('slide');          // slide | fade | zoom
            $table->boolean('banners_arrows')->default(true);
            $table->boolean('banners_dots')->default(true);

            // Cinta de anuncios en movimiento (marquee)
            $table->boolean('marquee_enabled')->default(false);
            $table->text('marquee_text')->nullable();
            $table->unsignedInteger('marquee_speed')->default(20); // segundos por vuelta
            $table->string('marquee_bg')->nullable();
            $table->string('marquee_color')->nullable();

            // Contacto y redes
            $table->string('whatsapp_number')->nullable();
            $table->text('whatsapp_message')->nullable();
            $table->json('social_links')->nullable();

            // SEO y publicación
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->text('announcement')->nullable();
            $table->text('custom_css')->nullable();
            $table->boolean('is_published')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_themes');
    }
};
