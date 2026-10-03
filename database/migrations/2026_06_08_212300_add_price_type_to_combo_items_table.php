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
        Schema::table('combo_items', function (Blueprint $table) {
            $table->string('price_type')->default('detal')->after('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('combo_items', function (Blueprint $table) {
            $table->dropColumn('price_type');
        });
    }
};
