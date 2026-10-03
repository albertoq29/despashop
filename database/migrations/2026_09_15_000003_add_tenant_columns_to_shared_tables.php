<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El tenant es el usuario dueño del catálogo. Estas tablas eran globales
     * en la versión mono-comercio y ahora deben quedar aisladas por tenant.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index(['user_id', 'name']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index(['user_id', 'status']);
        });

        // user_id NULL = tasa del sistema (BCV global); con valor = tasa propia del comercio
        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index(['user_id', 'recorded_at']);
        });

        // user_id NULL = ajuste de plataforma; con valor = preferencia del comercio
        Schema::table('settings', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique('settings_key_unique');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->unique(['user_id', 'key'], 'settings_user_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique('settings_user_key_unique');
            $table->dropConstrainedForeignId('user_id');
            $table->unique('key');
        });

        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'recorded_at']);
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'name']);
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
