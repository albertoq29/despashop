<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('client_name')->nullable();
            $table->string('client_phone')->nullable();
            $table->enum('status', ['draft', 'confirmed'])->default('draft');
            $table->decimal('subtotal_usd', 10, 2)->default(0);
            $table->decimal('discount_usd', 10, 2)->default(0);
            $table->decimal('total_usd', 10, 2)->default(0);
            $table->decimal('total_bs', 12, 2)->default(0);
            $table->decimal('bcv_rate', 10, 4)->default(1);
            $table->text('notes')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facturas');
    }
};
