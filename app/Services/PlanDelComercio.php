<?php

namespace App\Services;

use App\Models\CatalogBanner;
use App\Models\Factura;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Services\Ia\LimitesDeIa;

/**
 * Resumen del plan de un comercio: vigencia y cuánto usa de cada límite.
 *
 * Las cuentas se hacen con el id del comercio explícito y sin el alcance de
 * tenant, para que den lo mismo desde el panel del comercio que desde la
 * ficha que ve el admin.
 */
class PlanDelComercio
{
    public function __construct(private LimitesDeIa $limitesDeIa)
    {
    }

    /** Solo la vigencia: barato, se comparte en todas las páginas del panel. */
    public function vigencia(User $comercio): array
    {
        return [
            'estado' => $comercio->estadoDelPlan(),
            'inicio' => $comercio->plan_started_at?->toDateString(),
            'vence' => $comercio->plan_expires_at?->toDateString(),
            'dias_restantes' => $comercio->diasParaVencer(),
            'dias_aviso' => User::DIAS_AVISO_VENCIMIENTO,
            'es_prueba' => (bool) $comercio->plan_is_trial,
            'descuento' => $comercio->plan_discount_percent ? (int) $comercio->plan_discount_percent : null,
            'nota' => $comercio->plan_note,
            // Solo cuando ya venció: qué día se eliminan los datos
            'borrado' => $comercio->fechaDeBorrado()?->toDateString(),
            'dias_para_borrado' => $comercio->diasParaBorrado(),
        ];
    }

    public function resumen(User $comercio): array
    {
        $plan = $comercio->plan;
        $id = $comercio->id;

        $productos = Product::withoutGlobalScope('tenant')->where('user_id', $id);

        $masFotos = (int) ProductImage::query()
            ->join('products', 'products.id', '=', 'product_images.product_id')
            ->where('products.user_id', $id)
            ->selectRaw('COUNT(*) as fotos')
            ->groupBy('product_images.product_id')
            ->orderByDesc('fotos')
            ->value('fotos');

        $ia = $this->limitesDeIa->estado($comercio);

        return [
            'plan' => $plan ? [
                'nombre' => $plan->name,
                'precio_usd' => (float) $plan->price_usd,
                'precio_con_descuento' => $comercio->precioConDescuento(),
                'periodo' => $plan->billing_period,
                'color' => $plan->color,
            ] : null,
            ...$this->vigencia($comercio),
            'limites' => [
                [
                    'clave' => 'productos',
                    'nombre' => 'Productos',
                    'usados' => (clone $productos)->count(),
                    'maximo' => $plan?->max_products,
                ],
                [
                    'clave' => 'fotos',
                    'nombre' => 'Fotos por producto',
                    'usados' => $masFotos,
                    'maximo' => $plan?->max_images_per_product,
                    'detalle' => 'El producto con más fotos',
                ],
                [
                    'clave' => 'banners',
                    'nombre' => 'Banners del catálogo',
                    'usados' => CatalogBanner::withoutGlobalScope('tenant')->where('user_id', $id)->count(),
                    'maximo' => $plan?->max_banners,
                ],
                [
                    'clave' => 'facturas',
                    'nombre' => 'Facturas este mes',
                    'usados' => Factura::withoutGlobalScope('tenant')
                        ->where('user_id', $id)
                        ->where('created_at', '>=', now()->startOfMonth())
                        ->count(),
                    'maximo' => $plan?->max_invoices_per_month,
                    'detalle' => 'Se reinicia el 1 de cada mes',
                ],
                [
                    'clave' => 'ia',
                    'nombre' => 'Creaciones con IA hoy',
                    'usados' => $ia['usados'],
                    // Cero significa que el plan no la incluye, no que sea ilimitada
                    'maximo' => $ia['limite'],
                    'detalle' => 'Se reinicia cada día',
                ],
            ],
            'incluye' => [
                ['nombre' => 'Tu marca en el catálogo', 'activo' => (bool) ($plan?->allows_catalog_branding ?? true)],
                ['nombre' => 'Tu marca en las facturas', 'activo' => (bool) ($plan?->allows_invoice_branding ?? true)],
                ['nombre' => 'Dominio propio', 'activo' => (bool) ($plan?->allows_custom_domain ?? false)],
            ],
        ];
    }
}
