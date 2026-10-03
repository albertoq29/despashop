<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('category_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        // Data migration: move existing category_id to pivot table
        $products = \Illuminate\Support\Facades\DB::table('products')
            ->whereNotNull('category_id')
            ->get();
            
        foreach ($products as $product) {
            \Illuminate\Support\Facades\DB::table('category_product')->insert([
                'product_id' => $product->id,
                'category_id' => $product->category_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('category_product');
    }
};
