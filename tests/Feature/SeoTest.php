<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Lo que leen los buscadores.
 *
 * Nada de esto se ve en pantalla, así que se rompe en silencio: una canónica
 * que falta, un catálogo despublicado que sigue ofreciéndose en el mapa del
 * sitio o un precio en los datos estructurados que ya no es el que se cobra.
 * Por eso se comprueba aquí y no a ojo.
 */
class SeoTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(string $usuario, bool $publicado = true, array $atributos = []): User
    {
        $comercio = User::create([
            'name' => 'Dueño',
            'business_name' => 'Comercio ' . $usuario,
            'username' => $usuario,
            'email' => $usuario . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            ...$atributos,
        ]);

        app(CatalogProvisioner::class)->provision($comercio);

        CatalogTheme::withoutGlobalScope('tenant')
            ->where('user_id', $comercio->id)
            ->update(['is_published' => $publicado]);

        return $comercio;
    }

    /* ── robots.txt ─────────────────────────────────────────────────────── */

    public function test_el_panel_del_comercio_no_se_rastrea(): void
    {
        $respuesta = $this->get('/robots.txt');

        $respuesta->assertOk();
        $respuesta->assertHeader('Content-Type', 'text/plain; charset=UTF-8');

        $texto = $respuesta->getContent();

        // Sus números y sus clientes no son contenido para un buscador
        $this->assertStringContainsString('Disallow: /dashboard', $texto);
        $this->assertStringContainsString('Disallow: /facturas', $texto);
        $this->assertStringContainsString('Disallow: /ganancias', $texto);
        $this->assertStringContainsString('Disallow: /admin', $texto);
        $this->assertStringContainsString('Allow: /', $texto);
        $this->assertStringContainsString('Sitemap: ' . route('sitemap'), $texto);
    }

    /* ── sitemap.xml ────────────────────────────────────────────────────── */

    public function test_el_mapa_del_sitio_lista_los_catalogos_publicados(): void
    {
        $abierto = $this->comercio('panaderia');
        $cerrado = $this->comercio('ferreteria', publicado: false);

        $respuesta = $this->get('/sitemap.xml');

        $respuesta->assertOk();
        $respuesta->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

        $xml = $respuesta->getContent();

        $this->assertStringContainsString('<loc>' . route('home') . '</loc>', $xml);
        $this->assertStringContainsString('<loc>' . $abierto->catalogUrl() . '</loc>', $xml);
        // Un catálogo sin publicar devuelve 404: ofrecerlo acumula errores
        $this->assertStringNotContainsString($cerrado->catalogUrl(), $xml);
    }

    public function test_una_cuenta_suspendida_sale_del_mapa(): void
    {
        $comercio = $this->comercio('suspendido');

        $comercio->forceFill(['status' => User::STATUS_SUSPENDED])->save();

        $this->assertStringNotContainsString($comercio->catalogUrl(), $this->get('/sitemap.xml')->getContent());
    }

    public function test_el_mapa_es_xml_valido(): void
    {
        $this->comercio('valida');

        $xml = simplexml_load_string($this->get('/sitemap.xml')->getContent());

        $this->assertNotFalse($xml, 'el mapa del sitio no es XML válido');
        $this->assertGreaterThanOrEqual(2, $xml->count());
    }

    /* ── La bienvenida ──────────────────────────────────────────────────── */

    public function test_la_bienvenida_se_presenta_sola_ante_un_buscador(): void
    {
        $html = $this->get('/')->getContent();

        // El primer rastreo lee esta respuesta, sin ejecutar JavaScript
        $this->assertStringContainsString('<title inertia>Catálogo, inventario y facturas para tu negocio - Despashop</title>', $html);
        $this->assertStringContainsString('<link rel="canonical" href="' . route('home') . '">', $html);
        $this->assertStringContainsString('application/ld+json', $html);

        // Una sola descripción: dos se contradicen entre ellas
        $this->assertSame(1, substr_count($html, '<meta name="description"'));
    }

    public function test_los_datos_estructurados_dicen_lo_que_cuesta(): void
    {
        Plan::create([
            'name' => 'Negocio',
            'slug' => 'negocio',
            'price_usd' => 19,
            'is_active' => true,
            'is_public' => true,
        ]);

        $datos = $this->jsonLdDe($this->get('/')->getContent());
        $aplicacion = collect($datos['@graph'])->firstWhere('@type', 'SoftwareApplication');

        $this->assertSame('SoftwareApplication', $aplicacion['@type']);
        $this->assertSame('19.00', $aplicacion['offers'][0]['price']);
        $this->assertSame('USD', $aplicacion['offers'][0]['priceCurrency']);
    }

    /**
     * Si el plan está de oferta, lo que se anuncia es lo que se cobra. Un
     * precio tachado en la página y el de lista en los datos estructurados
     * es justo lo que Google llama precio engañoso.
     */
    public function test_el_precio_anunciado_es_el_que_se_paga(): void
    {
        Plan::create([
            'name' => 'Negocio',
            'slug' => 'negocio',
            'price_usd' => 20,
            'discount_percent' => 25,
            'is_active' => true,
            'is_public' => true,
        ]);

        $datos = $this->jsonLdDe($this->get('/')->getContent());
        $aplicacion = collect($datos['@graph'])->firstWhere('@type', 'SoftwareApplication');

        $this->assertSame('15.00', $aplicacion['offers'][0]['price']);
    }

    /* ── El catálogo de un comercio ─────────────────────────────────────── */

    public function test_el_catalogo_se_describe_como_una_tienda(): void
    {
        $comercio = $this->comercio('dulces');

        app(Tenancy::class)->forTenant($comercio->id, fn () => Product::create([
            'name' => 'Torta tres leches',
            'description' => 'Para doce personas.',
            'price_usdt' => 12,
            'cost_price' => 5,
            'stock' => 3,
        ]));

        $tienda = $this->jsonLdDe($this->get('/dulces')->getContent());

        $this->assertSame('Store', $tienda['@type']);
        $this->assertSame('Comercio dulces', $tienda['name']);
        $this->assertSame($comercio->catalogUrl(), $tienda['url']);
        $this->assertSame('12.00', $tienda['hasOfferCatalog']['itemListElement'][0]['price']);
        $this->assertSame('Torta tres leches', $tienda['hasOfferCatalog']['itemListElement'][0]['itemOffered']['name']);
    }

    /**
     * Lo que no sale en la página tampoco sale aquí: los datos estructurados
     * son otra forma de publicar, y el costo de un producto es del comercio.
     */
    public function test_los_datos_estructurados_no_filtran_el_costo(): void
    {
        $comercio = $this->comercio('ferre');

        app(Tenancy::class)->forTenant($comercio->id, fn () => Product::create([
            'name' => 'Martillo',
            'price_usdt' => 10,
            'price_mayor_usdt' => 8,
            'cost_price' => 4.25,
            'notes' => 'Lo trae Pedro los jueves',
            'stock' => 6,
        ]));

        $crudo = json_encode($this->jsonLdDe($this->get('/ferre')->getContent()));

        $this->assertStringNotContainsString('4.25', $crudo);
        $this->assertStringNotContainsString('Pedro', $crudo);
        $this->assertStringNotContainsString('cost', $crudo);
    }

    public function test_cada_catalogo_apunta_a_su_propia_direccion(): void
    {
        $comercio = $this->comercio('boutique');

        $this->get('/boutique')->assertSee(
            '<link rel="canonical" href="' . $comercio->catalogUrl() . '">',
            false,
        );
    }

    /** @return array<string, mixed> */
    private function jsonLdDe(string $html): array
    {
        $encontrado = preg_match('~<script type="application/ld\+json">(.*?)</script>~s', $html, $partes);

        $this->assertSame(1, $encontrado, 'la página no trae datos estructurados');

        return json_decode($partes[1], true);
    }
}
