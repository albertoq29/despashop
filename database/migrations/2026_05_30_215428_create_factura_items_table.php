<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factura_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');
            $table->string('product_name');                          // snapshot o nombre manual
            $table->string('product_image_path')->nullable();        // snapshot de imagen
            $table->enum('price_type', ['detal', 'mayor', 'distribuidor', 'custom'])->default('detal');
            $table->decimal('unit_price_usd', 10, 2);
            $table->integer('qty')->default(1);
            $table->decimal('subtotal_usd', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factura_items');
    }
};
