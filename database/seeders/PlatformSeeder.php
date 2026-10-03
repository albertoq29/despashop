<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Administrador de la plataforma y textos por defecto de la bienvenida.
 */
class PlatformSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@despashop.local'],
            [
                'name' => 'Administrador',
                'username' => null,
                'role' => User::ROLE_ADMIN,
                'status' => User::STATUS_APPROVED,
                'password' => Hash::make('Admin.2026'),
                'email_verified_at' => now(),
            ]
        );

        $ajustes = [
            'brand_name' => 'Despashop',
            'landing_headline' => 'Tu catálogo, tu inventario y tus facturas en un solo lugar',
            'landing_subheadline' => 'Carga tus productos una vez y compártelos con una dirección propia. Personaliza el diseño, factura a tus clientes y controla tu stock desde el mismo panel.',
            'landing_cta_primary' => 'Crear mi catálogo',
            'landing_cta_secondary' => 'Ya tengo cuenta',
            'plans_title' => 'Planes',
            'plans_subtitle' => 'Elige el que se ajuste a tu negocio. Puedes cambiarlo cuando quieras.',
            'registrations_open' => '1',
            'support_email' => '',
            'support_whatsapp' => '',
            'terms_url' => '',
            'privacy_url' => '',
        ];

        foreach ($ajustes as $key => $value) {
            Setting::putPlatform($key, $value);
        }
    }
}
