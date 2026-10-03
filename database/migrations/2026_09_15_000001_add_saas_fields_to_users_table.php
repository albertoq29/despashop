<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Identidad pública del tenant: define la URL /{username}
            $table->string('username')->nullable()->unique()->after('name');
            $table->string('role')->default('tenant')->after('username'); // admin | tenant
            $table->string('status')->default('pending')->after('role');  // pending | approved | rejected | suspended

            // Datos del comercio
            $table->string('business_name')->nullable()->after('status');
            $table->string('phone')->nullable()->after('business_name');
            $table->string('whatsapp')->nullable()->after('phone');

            // Solicitud de registro (revisión manual del admin)
            $table->foreignId('requested_plan_id')->nullable()->after('whatsapp');
            $table->text('request_message')->nullable()->after('requested_plan_id');
            $table->timestamp('reviewed_at')->nullable()->after('request_message');
            $table->foreignId('reviewed_by')->nullable()->after('reviewed_at');
            $table->text('rejection_reason')->nullable()->after('reviewed_by');

            // Suscripción
            $table->foreignId('plan_id')->nullable()->after('rejection_reason');
            $table->timestamp('plan_started_at')->nullable()->after('plan_id');
            $table->timestamp('plan_expires_at')->nullable()->after('plan_started_at');

            $table->timestamp('last_login_at')->nullable()->after('plan_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn([
                'username', 'role', 'status', 'business_name', 'phone', 'whatsapp',
                'requested_plan_id', 'request_message', 'reviewed_at', 'reviewed_by',
                'rejection_reason', 'plan_id', 'plan_started_at', 'plan_expires_at',
                'last_login_at',
            ]);
        });
    }
};
