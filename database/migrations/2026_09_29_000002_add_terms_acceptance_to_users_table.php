<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Queda constancia de qué versión de los términos aceptó cada comercio y
 * cuándo: si el texto cambia, se sabe quién falta por aceptar el nuevo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('terms_accepted_at')->nullable()->after('last_login_ip');
            $table->string('terms_version', 20)->nullable()->after('terms_accepted_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['terms_accepted_at', 'terms_version']);
        });
    }
};
