<?php

namespace App\Http\Controllers;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\Ia\LimitesDeIa;
use App\Services\PlanDelComercio;
use App\Support\PrimerosPasos;
use App\Support\Tenancy;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel del comercio: la primera pantalla después de entrar.
 *
 * No es un tablero de cifras. Quien abre la app casi siempre viene a hacer
 * una cosa —cargar un producto, mandar su enlace, facturar— y lo que le sirve
 * es tener eso a la mano, no un gráfico. Las ventas y las visitas se mudaron
 * a Estadísticas, donde se las busca cuando se las quiere.
 *
 * Lo que sí vive aquí: dónde está su catálogo, qué le falta para que luzca
 * terminado y cómo agregar algo sin dar vueltas.
 *
 * Todas las consultas quedan acotadas a su propio inventario por el contexto
 * de tenant (ver App\Support\Tenancy).
 */
class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        // Con el admin inspeccionando una cuenta, el panel debe hablar del
        // comercio observado, no del administrador.
        $tenantId = app(Tenancy::class)->id();
        $user = $tenantId === $request->user()->id
            ? $request->user()
            : User::find($tenantId) ?? $request->user();

        $theme = CatalogTheme::first();

        return Inertia::render('Dashboard', [
            'nombre' => $user->business_name ?: $user->name,
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
                'productos' => Product::count(),
                'ia_disponible' => app(LimitesDeIa::class)->estado($user)['disponible'],
            ],
            'primerosPasos' => PrimerosPasos::de($user, $theme),
        ]);
    }
}
