<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Make price_usdt nullable so products can be "Consultar"
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price_usdt', 12, 2)->nullable()->change();
            $table->boolean('is_hidden')->default(false)->after('description');
        });

        // Combos table (completely separate from products)
        Schema::create('combos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('price_usdt', 12, 2)->nullable();
            $table->decimal('price_mayor_usdt', 12, 2)->nullable();
            $table->decimal('price_distribuidor_usdt', 12, 2)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->decimal('conditional_price', 12, 2)->nullable();
            $table->integer('conditional_min_quantity')->nullable();
            $table->integer('stock')->default(0);
            $table->string('image_path')->nullable();
            $table->boolean('is_hidden')->default(false);
            $table->timestamps();
        });

        // Pivot: combo ↔ product
        Schema::create('combo_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_id')->constrained('combos')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->timestamps();
        });

        // Gallery images for combos
        Schema::create('combo_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_id')->constrained('combos')->onDelete('cascade');
            $table->string('image_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combo_images');
        Schema::dropIfExists('combo_items');
        Schema::dropIfExists('combos');

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price_usdt', 12, 2)->nullable(false)->change();
            $table->dropColumn('is_hidden');
        });
    }
};
