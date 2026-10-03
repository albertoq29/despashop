<?php

namespace Database\Seeders;

use App\Models\CatalogBanner;
use App\Models\CatalogModal;
use App\Models\Category;
use App\Models\ExchangeRate;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Comercio de ejemplo con catálogo publicado, para probar la plataforma
 * de punta a punta sin cargar datos a mano.
 *
 *   php artisan db:seed --class=DemoTenantSeeder
 */
class DemoTenantSeeder extends Seeder
{
    public function run(): void
    {
        $plan = Plan::where('slug', 'emprendedor')->first();

        $comercio = User::updateOrCreate(
            ['email' => 'demo@despashop.local'],
            [
                'name' => 'Comercio Demo',
                'username' => 'demo',
                'business_name' => 'Tienda Demo',
                'role' => User::ROLE_TENANT,
                'status' => User::STATUS_APPROVED,
                'password' => Hash::make('Demo.2026'),
                'email_verified_at' => now(),
                'phone' => '+58 412 0000000',
                'whatsapp' => '+58 412 0000000',
                'plan_id' => $plan?->id,
                'plan_started_at' => now(),
                'reviewed_at' => now(),
            ]
        );

        app(CatalogProvisioner::class)->provision($comercio);

        app(Tenancy::class)->forTenant($comercio->id, function () use ($comercio) {
            $this->seedCatalog($comercio);
        });

        $this->command?->info('Comercio demo listo en /demo (demo@despashop.local / Demo.2026)');
    }

    private function seedCatalog(User $comercio): void
    {
        foreach ([
            'global_discount' => '0',
            'force_wholesale' => 'false',
            'force_distributor' => 'false',
        ] as $key => $value) {
            Setting::put($key, $value, $comercio->id);
        }

        if (! ExchangeRate::where('user_id', $comercio->id)->exists()) {
            ExchangeRate::create(['bcv' => 36.5]);
        }

        $categorias = collect(['Papelería', 'Hogar', 'Tecnología', 'Accesorios'])
            ->mapWithKeys(fn ($nombre) => [
                $nombre => Category::firstOrCreate(['name' => $nombre]),
            ]);

        $productos = [
            ['Cuaderno cosido 100 hojas', 5.50, 4.50, 3.80, 2.00, 50, 'Papelería', 'Tapa dura, hojas rayadas y costura reforzada que aguanta el uso diario.'],
            ['Termo de acero 750 ml', 12.00, 10.00, 8.50, 3.50, 20, 'Hogar', 'Mantiene la bebida fría doce horas y caliente seis. Tapa a prueba de derrames.'],
            ['Audífonos inalámbricos', 8.00, 6.50, 5.50, 3.00, 30, 'Tecnología', 'Cinco horas de uso por carga, con estuche que suma tres cargas más.'],
            ['Taza de cerámica 350 ml', 4.00, 3.20, 2.80, 1.50, 15, 'Hogar', 'Apta para microondas y lavavajillas. Disponible en varios colores.'],
            ['Mochila antirrobo', 6.00, 5.00, 4.20, 2.20, 25, 'Accesorios', 'Cierre oculto, puerto USB y compartimiento acolchado para laptop de 15 pulgadas.'],
            ['Set de bolígrafos 12 colores', 14.00, 11.50, 9.80, 5.00, 12, 'Papelería', 'Tinta de gel de secado rápido, trazo de 0,7 mm.'],
        ];

        foreach ($productos as $index => [$nombre, $detal, $mayor, $dist, $costo, $stock, $categoria, $descripcion]) {
            $producto = Product::firstOrCreate(
                ['name' => $nombre],
                [
                    'price_usdt' => $detal,
                    'price_mayor_usdt' => $mayor,
                    'price_distribuidor_usdt' => $dist,
                    'cost_price' => $costo,
                    'stock' => $stock,
                    'description' => $descripcion,
                    'is_hidden' => false,
                    'display_order' => $index,
                ]
            );

            $producto->categories()->sync([$categorias[$categoria]->id]);
        }

        if (CatalogBanner::count() === 0) {
            CatalogBanner::create([
                'title' => 'Envíos a todo el país',
                'subtitle' => 'Pide hoy y recibe en 48 horas',
                'cta_text' => 'Ver catálogo',
                'text_position' => 'center',
                'overlay' => 'gradient',
                'display_order' => 0,
            ]);
        }

        if (CatalogModal::count() === 0) {
            CatalogModal::create([
                'title' => '10% en tu primera compra',
                'body' => 'Escríbenos por WhatsApp y menciona el código BIENVENIDA para aplicar tu descuento.',
                'cta_text' => 'Escribir por WhatsApp',
                'trigger' => 'delay',
                'delay_seconds' => 4,
                'frequency' => 'once_session',
                'animation' => 'zoom',
            ]);
        }
    }
}
