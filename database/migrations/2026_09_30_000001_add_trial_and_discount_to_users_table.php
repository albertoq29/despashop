<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pruebas gratis y descuentos que el admin da a mano, y el rastro de los
 * avisos de vencimiento para no repetirlos todos los días.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 0 a 100. Sin sistema de cobro, el descuento es informativo:
            // se muestra al comercio y al admin, no cobra nada.
            $table->unsignedTinyInteger('plan_discount_percent')->nullable()->after('plan_expires_at');
            $table->boolean('plan_is_trial')->default(false)->after('plan_discount_percent');
            $table->string('plan_note', 160)->nullable()->after('plan_is_trial');

            // Último aviso enviado sobre el vencimiento y el borrado
            $table->timestamp('expiry_notified_at')->nullable()->after('plan_note');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['plan_discount_percent', 'plan_is_trial', 'plan_note', 'expiry_notified_at']);
        });
    }
};
