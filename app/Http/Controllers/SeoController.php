<?php

namespace App\Http\Controllers;

use App\Models\CatalogTheme;
use App\Models\User;
use Illuminate\Http\Response;

/**
 * Lo que leen los buscadores antes de rastrear: qué pueden mirar y dónde
 * está todo.
 *
 * Los dos archivos se arman aquí y no se dejan escritos en `public/` porque
 * dependen del dominio desde el que se sirva la plataforma y de qué
 * comercios tengan su catálogo publicado hoy. Un `sitemap.xml` escrito a
 * mano envejece el mismo día en que entra el siguiente comercio.
 */
class SeoController extends Controller
{
    /**
     * Zonas que no tiene sentido rastrear.
     *
     * El panel de un comercio no es contenido: son sus números, sus clientes
     * y sus facturas. Además exige iniciar sesión, así que el rastreador solo
     * gastaría ahí las visitas que le dedica al sitio.
     */
    private const PRIVADO = [
        '/dashboard', '/admin', '/productos', '/categorias', '/combos', '/suplementos',
        '/facturas', '/entregas', '/renovaciones', '/ganancias', '/promociones', '/tasas',
        '/mi-plan', '/mis-datos', '/profile', '/catalogo/', '/cuenta/',
        '/login', '/register', '/forgot-password', '/reset-password', '/confirm-password',
        '/verify-email',
    ];

    public function robots(): Response
    {
        $lineas = ['User-agent: *'];

        foreach (self::PRIVADO as $ruta) {
            $lineas[] = 'Disallow: ' . $ruta;
        }

        // Lo que sí se rastrea: la bienvenida y el catálogo de cada comercio
        $lineas[] = 'Allow: /';
        $lineas[] = '';
        $lineas[] = 'Sitemap: ' . route('sitemap');

        return response(implode("\n", $lineas) . "\n", 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }

    /**
     * El mapa del sitio: la bienvenida y los catálogos publicados.
     *
     * Un catálogo sin publicar no entra, y uno de una cuenta suspendida
     * tampoco: lo que se le ofrece a Google tiene que existir cuando lo
     * visite, o el sitio acumula errores a su nombre.
     */
    public function sitemap(): Response
    {
        $catalogos = User::query()
            ->tenants()
            ->approved()
            ->whereHas('catalogTheme', fn ($q) => $q->where('is_published', true))
            ->with('catalogTheme:id,user_id,updated_at')
            ->get(['id', 'username', 'updated_at']);

        $urls = [[
            'loc' => route('home'),
            'lastmod' => $this->fecha($catalogos->max('updated_at')),
            'changefreq' => 'weekly',
            'priority' => '1.0',
        ]];

        foreach ($catalogos as $comercio) {
            $urls[] = [
                'loc' => $comercio->catalogUrl(),
                'lastmod' => $this->fecha($comercio->catalogTheme?->updated_at),
                'changefreq' => 'weekly',
                'priority' => '0.8',
            ];
        }

        return response($this->xml($urls), 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }

    /** @param  list<array<string, string>>  $urls */
    private function xml(array $urls): string
    {
        $lineas = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

        foreach ($urls as $url) {
            $lineas[] = '    <url>';

            foreach ($url as $clave => $valor) {
                if ($valor !== null && $valor !== '') {
                    $lineas[] = "        <{$clave}>" . htmlspecialchars($valor, ENT_XML1) . "</{$clave}>";
                }
            }

            $lineas[] = '    </url>';
        }

        $lineas[] = '</urlset>';

        return implode("\n", $lineas) . "\n";
    }

    private function fecha(mixed $fecha): ?string
    {
        return $fecha?->toAtomString();
    }
}
