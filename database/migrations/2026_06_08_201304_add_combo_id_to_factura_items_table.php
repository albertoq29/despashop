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
        Schema::table('factura_items', function (Blueprint $table) {
            $table->foreignId('combo_id')->nullable()->after('product_id')->constrained('combos')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('factura_items', function (Blueprint $table) {
            $table->dropForeign(['combo_id']);
            $table->dropColumn('combo_id');
        });
    }
};
