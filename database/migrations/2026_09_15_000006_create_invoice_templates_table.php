<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Marca del comercio en la factura
            $table->string('logo_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->boolean('show_logo')->default(true);
            $table->boolean('use_catalog_logo')->default(true);
            $table->string('logo_size')->default('md');   // sm | md | lg

            // Estilo guardado
            $table->string('layout')->default('classic'); // classic | modern | minimal | compact
            $table->string('color_primary')->default('#0f172a');
            $table->string('color_accent')->default('#6366f1');
            $table->string('color_text')->default('#111827');
            $table->string('color_bg')->default('#ffffff');
            $table->string('font')->default('Inter');
            $table->string('paper_size')->default('a4');  // a4 | letter | ticket80
            $table->boolean('zebra_rows')->default(true);
            $table->string('radius')->default('md');

            // Contenido fijo
            $table->string('business_name')->nullable();
            $table->string('tax_id')->nullable();         // RIF / CI
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('header_note')->nullable();
            $table->text('footer_note')->nullable();
            $table->text('terms')->nullable();
            $table->string('invoice_prefix')->nullable();

            // Marca de agua y columnas visibles
            $table->boolean('watermark_enabled')->default(false);
            $table->string('watermark_text')->nullable();
            $table->unsignedTinyInteger('watermark_opacity')->default(8);
            $table->json('visible_columns')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_templates');
    }
};
