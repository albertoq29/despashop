<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Solicitudes de cambio de plan.
 *
 * No hay cobro automático, así que un cambio de plan es una conversación:
 * el comercio pide, el administrador acepta y el cambio entra en la
 * próxima renovación, no de inmediato. Queda escrito quién pidió qué,
 * cuándo y con qué respuesta, que es justo lo que después nadie recuerda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // El plan de origen se guarda tal cual estaba: si después cambia
            // de plan por otra vía, la solicitud sigue contando su historia.
            $table->foreignId('from_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->foreignId('to_plan_id')->constrained('plans')->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->string('status')->default('pendiente');
            $table->text('admin_note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('status');
        });

        Schema::table('users', function (Blueprint $table) {
            // Lo aceptado pero todavía no aplicado: entra al renovar
            $table->foreignId('pending_plan_id')->nullable()->after('plan_id')
                ->constrained('plans')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pending_plan_id');
        });

        Schema::dropIfExists('plan_change_requests');
    }
};
