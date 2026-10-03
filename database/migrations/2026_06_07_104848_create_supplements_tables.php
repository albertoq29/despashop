<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->enum('type', ['unit', 'meters'])->default('unit'); // unit o metros
            $table->decimal('stock', 10, 2)->default(0.00);
            $table->decimal('cost_price', 10, 2)->nullable();
            $table->decimal('total_purchased', 10, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('factura_supplements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained()->onDelete('cascade');
            $table->foreignId('supplement_id')->constrained()->onDelete('cascade');
            $table->decimal('qty', 10, 2)->default(1.00);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factura_supplements');
        Schema::dropIfExists('supplements');
    }
};
