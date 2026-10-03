<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AiGeneration;
use App\Models\CatalogVisit;
use App\Models\Factura;
use App\Models\Plan;
use App\Models\Product;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\Seguridad\RegistroDeSeguridad;
use App\Support\Tenancy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Vista general de la plataforma para el administrador.
 */
class DashboardController extends Controller
{
    public function __construct(private Tenancy $tenancy)
    {
    }

    public function index(Request $request): Response
    {
        // El admin consulta por encima del aislamiento por comercio
        $data = $this->tenancy->withoutTenancy(function () {
            $desde = now()->subDays(30);

            return [
                'resumen' => [
                    'solicitudes_pendientes' => User::tenants()->pending()->count(),
                    'comercios_activos' => User::tenants()->approved()->count(),
                    'comercios_suspendidos' => User::tenants()->where('status', User::STATUS_SUSPENDED)->count(),
                    'productos_totales' => Product::count(),
                    'facturas_30d' => Factura::where('created_at', '>=', $desde)->count(),
                    'ventas_30d_usd' => round((float) Factura::where('status', 'confirmed')
                        ->where('confirmed_at', '>=', $desde)
                        ->sum('total_usd'), 2),
                    'visitas_30d' => (int) CatalogVisit::where('visited_on', '>=', $desde->toDateString())->sum('visits'),
                    'planes_activos' => Plan::where('is_active', true)->count(),
                ],
                'solicitudes' => User::tenants()->pending()
                    ->with('requestedPlan:id,name,price_usd')
                    ->latest()
                    ->limit(8)
                    ->get(['id', 'name', 'business_name', 'username', 'email', 'phone', 'requested_plan_id', 'created_at']),
                'topComercios' => User::tenants()->approved()
                    ->withCount(['products', 'facturas'])
                    ->withSum(['visits as visitas' => fn ($q) => $q->where('visited_on', '>=', $desde->toDateString())], 'visits')
                    ->orderByDesc('visitas')
                    ->limit(8)
                    ->get(['id', 'name', 'business_name', 'username', 'plan_id']),
                'actividad' => ActivityLog::with('user:id,name,business_name,username')
                    ->latest()
                    ->limit(20)
                    ->get(),
                // Uso de la clave de IA compartida y los pedidos frenados, para detectar abusos
                'ia' => [
                    'hoy' => AiGeneration::deHoy()->queCuentan()->count(),
                    'limite_global' => (int) config('ia.limite_global_diario'),
                    'frenadas_hoy' => AiGeneration::deHoy()
                        ->whereIn('status', [AiGeneration::RECHAZADA, AiGeneration::BLOQUEADA])
                        ->count(),
                    'tokens_hoy' => (int) AiGeneration::deHoy()->sum(DB::raw('prompt_tokens + completion_tokens')),
                    'frenadas' => AiGeneration::with('user:id,name,business_name')
                        ->whereIn('status', [AiGeneration::RECHAZADA, AiGeneration::BLOQUEADA])
                        ->latest('id')
                        ->limit(6)
                        ->get(['id', 'user_id', 'prompt', 'status', 'reason', 'created_at']),
                ],
                // Registro de seguridad: lo pendiente de revisar, con lo último arriba
                'seguridad' => [
                    'conteos' => app(RegistroDeSeguridad::class)->conteos(),
                    'etiquetas' => collect(SecurityEvent::TIPOS)->map(fn ($tipo) => $tipo['etiqueta']),
                    'recientes' => SecurityEvent::with('user:id,name,business_name')
                        ->sinRevisar()
                        ->latest('id')
                        ->limit(6)
                        ->get(['id', 'type', 'severity', 'description', 'ip_address', 'hits', 'user_id', 'created_at']),
                ],
                'ingresosPorPlan' => Plan::withCount(['subscribers as suscriptores' => fn ($q) => $q->where('status', User::STATUS_APPROVED)])
                    ->orderBy('display_order')
                    ->get(['id', 'name', 'price_usd', 'color']),
            ];
        });

        return Inertia::render('Admin/Dashboard', $data);
    }
}
