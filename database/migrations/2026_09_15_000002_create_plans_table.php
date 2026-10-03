<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();

            // El admin edita estos precios desde su panel
            $table->decimal('price_usd', 10, 2)->default(0);
            $table->decimal('price_bs', 14, 2)->nullable();
            $table->string('billing_period')->default('monthly'); // monthly | yearly | lifetime | free

            // Límites del plan (null = ilimitado)
            $table->unsignedInteger('max_products')->nullable();
            $table->unsignedInteger('max_images_per_product')->nullable();
            $table->unsignedInteger('max_banners')->nullable();
            $table->unsignedInteger('max_invoices_per_month')->nullable();
            $table->boolean('allows_custom_domain')->default(false);
            $table->boolean('allows_invoice_branding')->default(true);
            $table->boolean('allows_catalog_branding')->default(true);

            // Presentación en la landing (slots de planes)
            $table->json('features')->nullable();
            $table->string('badge')->nullable();
            $table->string('color')->default('#6366f1');
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);
            $table->unsignedInteger('display_order')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
