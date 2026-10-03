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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_id')->unique();
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->decimal('total_usd', 10, 2);
            $table->decimal('total_bs', 10, 2);
            $table->string('status')->default('pending'); // pending, completed, cancelled
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
