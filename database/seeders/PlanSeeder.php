<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * Planes de arranque. Los precios son un punto de partida: el administrador
 * los edita desde su panel sin tocar código.
 */
class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $planes = [
            [
                'slug' => 'gratis',
                'name' => 'Inicial',
                // Fuera de la web por ahora: no se ofrece al registrarse.
                // Se conserva para las cuentas que ya lo tienen y para las
                // pruebas gratis que dé el administrador.
                'is_public' => false,
                'tagline' => 'Para empezar a mostrar tus productos',
                'description' => 'Publica tu catálogo con tu propia dirección y lleva el control básico de tu inventario.',
                'price_usd' => 0,
                'billing_period' => 'free',
                'max_products' => 25,
                'max_images_per_product' => 3,
                'max_banners' => 1,
                'max_invoices_per_month' => 20,
                'ai_daily_limit' => 3,
                'allows_custom_domain' => false,
                'allows_invoice_branding' => false,
                'allows_catalog_branding' => true,
                'features' => [
                    'Catálogo público en tu dirección',
                    'Hasta 25 productos',
                    'Control de inventario',
                    '20 facturas al mes',
                ],
                'color' => '#64748b',
                'display_order' => 0,
            ],
            [
                'slug' => 'emprendedor',
                'name' => 'Emprendedor',
                'tagline' => 'El plan de la mayoría',
                'description' => 'Personaliza el aspecto de tu catálogo, agrega banners y factura con tu marca.',
                'price_usd' => 9,
                'billing_period' => 'monthly',
                'max_products' => 300,
                'max_images_per_product' => 8,
                'max_banners' => 5,
                'max_invoices_per_month' => null,
                'ai_daily_limit' => 5,
                'allows_custom_domain' => false,
                'allows_invoice_branding' => true,
                'allows_catalog_branding' => true,
                'features' => [
                    'Hasta 300 productos',
                    'Personalización completa del catálogo',
                    'Banners y modales promocionales',
                    'Facturas con tu logo y tus colores',
                    'Facturación ilimitada',
                ],
                'badge' => 'Más elegido',
                'color' => '#6366f1',
                'is_featured' => true,
                'display_order' => 1,
            ],
            [
                'slug' => 'negocio',
                'name' => 'Negocio',
                'tagline' => 'Para catálogos grandes',
                'description' => 'Sin límites de inventario, con reportes de ganancias y control de entregas.',
                'price_usd' => 19,
                'billing_period' => 'monthly',
                'max_products' => null,
                'max_images_per_product' => 15,
                'max_banners' => 12,
                'max_invoices_per_month' => null,
                'ai_daily_limit' => 10,
                'allows_custom_domain' => true,
                'allows_invoice_branding' => true,
                'allows_catalog_branding' => true,
                'features' => [
                    'Productos ilimitados',
                    'Dominio propio',
                    'Reporte de ganancias y pérdidas',
                    'Entregas agendadas',
                    'Combos y promociones',
                    'Soporte prioritario',
                ],
                'color' => '#0ea5e9',
                'display_order' => 2,
            ],
        ];

        foreach ($planes as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
