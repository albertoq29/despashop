<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            
            // Tasas con 4 decimales de precisión
            $table->decimal('bcv', 12, 4)->comment('Tasa del Banco Central');
            $table->decimal('binance', 12, 4)->comment('Tasa paralela o Binance');
            
            // Fecha y hora específica del registro (puede ser diferente al created_at)
            $table->timestamp('recorded_at')->useCurrent();
            
            $table->timestamps(); // created_at y updated_at automáticos
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};