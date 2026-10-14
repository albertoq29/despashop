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
    /** Lo que se lee en la pestaña y en el resultado de Google. */
    private const TITULO = 'Catálogo, inventario y facturas para tu negocio';

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
            'showcase_title' => 'Hecho por negocios como el tuyo',
            'showcase_subtitle' => 'Catálogos reales, cada uno con su propio diseño. Entra y míralos por dentro.',
        ], Setting::allPlatform());

        // Lo que dura una prueba gratis cuando el plan no pide otra cosa.
        // Sale de los ajustes ya cargados, sin otra consulta.
        $diasDePrueba = (int) $ajustes['trial_days'] ?: (int) config('planes.dias_de_prueba');

        // Se consultan una vez: los usan la página y los datos estructurados
        $planes = Plan::public()->get();

        return Inertia::render('Bienvenida', [
            'ajustes' => $ajustes,
            'planes' => $planes,
            'diasDePrueba' => $diasDePrueba,
            // Solo el primero vigente: varias ventanas al entrar no se leen,
            // se cierran
            'aviso' => LandingNotice::vigentes()->first(),
            'registroAbierto' => $ajustes['registrations_open'] === '1',
            'catalogosDestacados' => $this->featuredCatalogs(),
            // La vitrina elegida a mano: lo que se puede lograr, no cuántos hay
            'vitrina' => $this->showcase(),
            'auth' => [
                'user' => $request->user()?->only(['id', 'name', 'username', 'role', 'status']),
            ],
        ])->withViewData([
            'og' => $this->vistaPreviaDelEnlace($ajustes),
            'jsonld' => $this->datosEstructurados($ajustes, $planes),
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

    /**
     * Los catálogos que el administrador ancló por su diseño.
     *
     * Van sus colores además del logo: el punto de la sección es mostrar lo
     * distinto que puede verse cada catálogo, y para eso la tarjeta tiene
     * que pintarse con la paleta de cada comercio y no con la nuestra.
     *
     * @return \Illuminate\Support\Collection<int, array>
     */
    private function showcase()
    {
        return User::enLaVitrina()
            ->with('catalogTheme')
            ->limit(9)
            ->get()
            ->map(fn (User $user) => [
                'username' => $user->username,
                'name' => $user->business_name ?: $user->name,
                'nota' => $user->showcase_note,
                'url' => $user->catalogUrl(),
                'logo_url' => $user->catalogTheme?->logo_url,
                'cover_url' => $user->catalogTheme?->cover_url,
                'colores' => [
                    'primario' => $user->catalogTheme?->color_primary,
                    'fondo' => $user->catalogTheme?->color_bg,
                    'superficie' => $user->catalogTheme?->color_surface,
                    'texto' => $user->catalogTheme?->color_text,
                    'acento' => $user->catalogTheme?->color_accent,
                ],
                'titulo' => $user->catalogTheme?->hero_title,
            ]);
    }

    /**
     * Lo que lee un buscador antes de que corra una sola línea de JavaScript.
     *
     * Googlebot pinta la pagina, pero el primer rastreo se queda con esta
     * respuesta: con el nombre de la plataforma a secas no hay de qué
     * agarrarse. El título lleva la misma plantilla que app.jsx para que no
     * cambie al navegar.
     *
     * @return array{titulo: string, descripcion: string, imagen: string, canonica: string}
     */
    private function vistaPreviaDelEnlace(array $ajustes): array
    {
        $marca = $ajustes['brand_name'] ?: config('app.name');

        return [
            'titulo' => self::TITULO . ' - ' . $marca,
            'descripcion' => $ajustes['landing_meta_description']
                ?: 'Publica tu catálogo en línea con tu propia dirección, lleva tu inventario '
                    . 'y emite facturas con tu marca. Los pedidos te llegan por WhatsApp.',
            'imagen' => url('/marca/enlace.png'),
            'canonica' => url('/'),
        ];
    }

    /**
     * Datos estructurados de la plataforma.
     *
     * Es lo que convierte un resultado en una ficha con nombre, descripción y
     * precio, en vez de un enlace azul. Los precios salen de los planes
     * publicados: si mañana cambian, el buscador los lee cambiados.
     *
     * @return array<string, mixed>
     */
    private function datosEstructurados(array $ajustes, $planes): array
    {
        $marca = $ajustes['brand_name'] ?: config('app.name');
        $vista = $this->vistaPreviaDelEnlace($ajustes);

        // El precio que se anuncia es el que se paga: `precio_final` ya trae
        // el descuento vigente, que es lo que el visitante va a ver en pantalla
        $ofertas = $planes
            ->filter(fn ($plan) => $plan->precio_final !== null)
            ->map(fn ($plan) => [
                '@type' => 'Offer',
                'name' => $plan->name,
                'price' => number_format((float) $plan->precio_final, 2, '.', ''),
                'priceCurrency' => 'USD',
                'url' => url('/') . '#planes',
                'availability' => 'https://schema.org/InStock',
            ])
            ->values()
            ->all();

        $aplicacion = [
            '@type' => 'SoftwareApplication',
            'name' => $marca,
            'applicationCategory' => 'BusinessApplication',
            'operatingSystem' => 'Web',
            'description' => $vista['descripcion'],
            'url' => url('/'),
            'inLanguage' => 'es-VE',
            'featureList' => [
                'Catálogo en línea con dirección propia',
                'Pedidos por WhatsApp',
                'Inventario con precios al detal, al mayor y de distribuidor',
                'Facturación con la marca del comercio',
                'Precios en dólares y en bolívares',
            ],
        ];

        if ($ofertas !== []) {
            $aplicacion['offers'] = $ofertas;
        }

        return [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'Organization',
                    '@id' => url('/') . '#organizacion',
                    'name' => $marca,
                    'url' => url('/'),
                    'logo' => url('/marca/icono-512.png'),
                    'sameAs' => array_values(array_filter([
                        $ajustes['social_instagram'] ?: null,
                        $ajustes['social_facebook'] ?: null,
                        $ajustes['social_tiktok'] ?: null,
                    ])),
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => url('/') . '#sitio',
                    'name' => $marca,
                    'url' => url('/'),
                    'inLanguage' => 'es-VE',
                    'publisher' => ['@id' => url('/') . '#organizacion'],
                ],
                $aplicacion,
            ],
        ];
    }
}
