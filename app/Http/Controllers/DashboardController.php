<?php

namespace App\Http\Controllers;

use App\Models\CatalogTheme;
use App\Models\CatalogVisit;
use App\Models\ExchangeRate;
use App\Models\Factura;
use App\Models\Product;
use App\Models\Setting;
use App\Services\Ia\LimitesDeIa;
use App\Services\PlanDelComercio;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel del comercio. Todas las consultas quedan acotadas a su propio
 * inventario por el contexto de tenant (ver App\Support\Tenancy).
 *
 * Las ventas se cuentan solo desde las facturas confirmadas: es el único
 * documento que descuenta inventario y deja registro.
 */
class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $desde = Carbon::now()->subDays(30);

        // Las sumas las hace la base: traer un mes de facturas a memoria para
        // sumarlas en PHP no escala cuando el comercio factura de verdad.
        $ventasPorDia = Factura::where('status', 'confirmed')
            ->where('confirmed_at', '>=', $desde)
            ->selectRaw('DATE(confirmed_at) as dia')
            ->selectRaw('SUM(total_usd) as total_usd, SUM(total_bs) as total_bs, COUNT(*) as orders_count')
            ->groupBy('dia')
            ->orderBy('dia')
            ->get()
            ->map(fn ($fila) => [
                'dateRaw' => $fila->dia,
                'date' => Carbon::parse($fila->dia)->format('d/m'),
                'total_usd' => round((float) $fila->total_usd, 2),
                'total_bs' => round((float) $fila->total_bs, 2),
                'orders_count' => (int) $fila->orders_count,
            ])
            ->values();

        $totales = $this->totales(Factura::where('status', 'confirmed')->where('confirmed_at', '>=', $desde));

        $customStats = null;

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $inicio = Carbon::parse($request->start_date)->startOfDay();
            $fin = Carbon::parse($request->end_date)->endOfDay();

            $customStats = $this->totales(
                Factura::where('status', 'confirmed')->whereBetween('confirmed_at', [$inicio, $fin])
            );
        }

        // Con el admin inspeccionando una cuenta, el panel debe hablar del
        // comercio observado, no del administrador.
        $tenantId = app(\App\Support\Tenancy::class)->id();
        $user = $tenantId === $request->user()->id
            ? $request->user()
            : \App\Models\User::find($tenantId) ?? $request->user();

        $theme = CatalogTheme::first();

        return Inertia::render('Dashboard', [
            'latest' => ExchangeRate::current(),
            'dailySales' => $ventasPorDia,
            'totalSalesUsd' => $totales['total_usd'],
            'totalSalesBs' => $totales['total_bs'],
            'totalOrders' => $totales['orders_count'],
            'filters' => $request->only(['start_date', 'end_date']),
            'customStats' => $customStats,
            'plan' => app(PlanDelComercio::class)->resumen($user),
            // A quién escribir para renovar o cambiar de plan
            'soporte' => [
                'whatsapp' => Setting::platform('support_whatsapp'),
                'email' => Setting::platform('support_email'),
            ],
            'catalogo' => [
                'url' => $user->catalogUrl(),
                'username' => $user->username,
                'publicado' => (bool) ($theme?->is_published),
                'tiene_logo' => (bool) ($theme?->logo_path),
                'productos' => Product::count(),
                'ia_disponible' => app(LimitesDeIa::class)->estado($user)['disponible'],
                'visitas_30d' => (int) CatalogVisit::where('user_id', $user->id)
                    ->where('visited_on', '>=', $desde->toDateString())
                    ->sum('visits'),
            ],
        ]);
    }

    /**
     * Totales de un conjunto de facturas, sumados por la base en una consulta.
     *
     * @return array{total_usd: float, total_bs: float, orders_count: int}
     */
    private function totales(\Illuminate\Database\Eloquent\Builder $consulta): array
    {
        $fila = $consulta
            ->selectRaw('COALESCE(SUM(total_usd), 0) as usd, COALESCE(SUM(total_bs), 0) as bs, COUNT(*) as cuantas')
            ->first();

        return [
            'total_usd' => round((float) $fila->usd, 2),
            'total_bs' => round((float) $fila->bs, 2),
            'orders_count' => (int) $fila->cuantas,
        ];
    }
}
