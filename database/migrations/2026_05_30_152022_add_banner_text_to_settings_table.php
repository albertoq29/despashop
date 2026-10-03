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
        // Insert default banner_text if not exists
        \DB::table('settings')->insertOrIgnore([
            ['key' => 'banner_text', 'value' => '¡Bienvenidos a Every Beauty! Cosméticos de calidad a los mejores precios. Escríbenos para más info.', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \DB::table('settings')->where('key', 'banner_text')->delete();
    }
};
