<?php

namespace App\Http\Controllers;

use App\Models\LandingNotice;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Módulo de bienvenida: presenta el servicio, muestra los planes que el
 * administrador haya publicado y ofrece entrar o solicitar una cuenta.
 */
class LandingController extends Controller
{
    public function index(Request $request): Response
    {
        $ajustes = array_merge([
            'brand_name' => config('app.name'),
            'landing_headline' => 'Tu catálogo, tu inventario y tus facturas en un solo lugar',
            'landing_subheadline' => 'Carga tus productos una vez y compártelos con una dirección propia.',
            'landing_cta_primary' => 'Crear mi catálogo',
            'landing_cta_secondary' => 'Ya tengo cuenta',
            'plans_title' => 'Planes',
            'plans_subtitle' => 'Elige el que se ajuste a tu negocio.',
            'registrations_open' => '1',
            'landing_announcement' => '',
            'landing_announcement_link' => '',
            'landing_meta_description' => '',
            'social_instagram' => '',
            'social_facebook' => '',
            'social_tiktok' => '',
            'support_email' => '',
            'support_whatsapp' => '',
            'terms_url' => '',
            'privacy_url' => '',
            'trial_days' => '',
        ], Setting::allPlatform());

        // Lo que dura una prueba gratis cuando el plan no pide otra cosa.
        // Sale de los ajustes ya cargados, sin otra consulta.
        $diasDePrueba = (int) $ajustes['trial_days'] ?: (int) config('planes.dias_de_prueba');

        return Inertia::render('Bienvenida', [
            'ajustes' => $ajustes,
            'planes' => Plan::public()->get(),
            'diasDePrueba' => $diasDePrueba,
            // Solo el primero vigente: varias ventanas al entrar no se leen,
            // se cierran
            'aviso' => LandingNotice::vigentes()->first(),
            'registroAbierto' => $ajustes['registrations_open'] === '1',
            'catalogosDestacados' => $this->featuredCatalogs(),
            'auth' => [
                'user' => $request->user()?->only(['id', 'name', 'username', 'role', 'status']),
            ],
        ]);
    }

    /**
     * Vitrina de catálogos publicados, para que un visitante vea ejemplos reales.
     *
     * @return \Illuminate\Support\Collection<int, array>
     */
    private function featuredCatalogs()
    {
        return User::tenants()
            ->approved()
            ->whereHas('catalogTheme', fn ($q) => $q->where('is_published', true))
            ->with('catalogTheme')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (User $user) => [
                'username' => $user->username,
                'name' => $user->business_name ?: $user->name,
                'logo_url' => $user->catalogTheme?->logo_url,
                'color' => $user->catalogTheme?->color_primary,
                'url' => $user->catalogUrl(),
            ]);
    }
}
