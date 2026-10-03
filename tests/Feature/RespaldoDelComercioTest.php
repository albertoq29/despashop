<?php

namespace Tests\Feature;

use App\Models\CatalogBanner;
use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Combo;
use App\Models\Factura;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Services\Respaldos\RespaldoDelComercio;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

/**
 * Respaldo del catálogo: descargarlo, volver a subirlo y que lo restaurado
 * sea de verdad lo que había, sin confiar en el archivo que llega.
 */
class RespaldoDelComercioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(Archivos::DISCO);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/respaldos-comercio'));

        parent::tearDown();
    }

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Mariana',
            'business_name' => 'Dulces Mariana',
            'username' => 'dulces-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            ...$atributos,
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    /** @param  callable():mixed  $trabajo */
    private function comoTenant(User $comercio, callable $trabajo): mixed
    {
        return app(Tenancy::class)->forTenant($comercio->id, $trabajo);
    }

    /** Un catálogo pequeño pero completo: producto con foto, variante, combo y banner. */
    private function cargarCatalogo(User $comercio): void
    {
        $this->comoTenant($comercio, function () {
            $categoria = Category::create(['name' => 'Tortas']);

            $producto = Product::create([
                'name' => 'Torta de chocolate',
                'description' => 'Tres capas con ganache.',
                'price_usdt' => 28,
                'cost_price' => 13,
                'stock' => 4,
                'image_path' => Archivos::guardar(UploadedFile::fake()->image('torta.jpg', 600, 400), 'products'),
            ]);
            $producto->categories()->sync([$categoria->id]);

            ProductImage::create([
                'product_id' => $producto->id,
                'image_path' => Archivos::guardar(UploadedFile::fake()->image('torta-2.jpg', 400, 300), 'products'),
            ]);

            ProductVariant::create(['product_id' => $producto->id, 'label' => 'Grande', 'type' => 'tipo', 'stock' => 2]);

            Product::create([
                'name' => 'Clase de repostería',
                'item_type' => Product::SERVICIO,
                'service_duration' => '3 horas',
                'service_mode' => 'local',
                'price_usdt' => 30,
            ]);

            $combo = Combo::create(['name' => 'Combo merienda', 'price_usdt' => 40, 'stock' => 3]);
            $combo->products()->sync([$producto->id => ['price_type' => 'detal']]);

            CatalogBanner::create(['title' => 'Encarga tu torta', 'display_order' => 0]);

            CatalogTheme::first()->update([
                'color_primary' => '#7c2d5a',
                'hero_title' => 'Dulces Mariana',
                'seo_description' => 'Repostería por encargo.',
            ]);
        });
    }

    // ── Descargar ──────────────────────────────────────────────────────────────

    public function test_el_respaldo_trae_el_catalogo_el_diseno_y_las_imagenes(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);

        $ruta = $this->comoTenant($comercio, fn () => app(RespaldoDelComercio::class)->exportar($comercio));

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($ruta) === true);

        $datos = json_decode($zip->getFromName('respaldo.json'), true);

        $this->assertSame(RespaldoDelComercio::FORMATO, $datos['formato']);
        $this->assertSame('Dulces Mariana', $datos['comercio']['negocio']);
        $this->assertCount(2, $datos['productos']);
        $this->assertSame(['Tortas'], $datos['productos'][0]['categorias']);
        $this->assertCount(1, $datos['productos'][0]['variantes']);
        $this->assertCount(1, $datos['combos']);
        $this->assertSame('#7c2d5a', $datos['tema']['color_primary']);
        // El dueño y las fechas no viajan: al restaurar los pone la cuenta destino
        $this->assertArrayNotHasKey('user_id', $datos['tema']);

        // Las imágenes van dentro, con su ruta original
        $imagen = $datos['productos'][0]['imagen'];
        $this->assertNotFalse($zip->getFromName('imagenes/' . $imagen));

        $zip->close();
    }

    public function test_el_comercio_descarga_su_respaldo_desde_el_panel(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);

        $respuesta = $this->actingAs($comercio)->get(route('respaldo.descargar'))->assertOk();

        $this->assertStringContainsString('respaldo-', $respuesta->headers->get('content-disposition'));
    }

    // ── Restaurar ──────────────────────────────────────────────────────────────

    public function test_restaurar_en_una_cuenta_vacia_deja_todo_como_estaba(): void
    {
        $origen = $this->comercio();
        $this->cargarCatalogo($origen);
        $ruta = $this->comoTenant($origen, fn () => app(RespaldoDelComercio::class)->exportar($origen));

        $destino = $this->comercio();

        $hechos = $this->comoTenant(
            $destino,
            fn () => app(RespaldoDelComercio::class)->restaurar($destino, $ruta, RespaldoDelComercio::MODO_REEMPLAZAR)
        );

        $this->assertSame(2, $hechos['productos']);
        $this->assertSame(1, $hechos['combos']);

        $this->comoTenant($destino, function () {
            $torta = Product::where('name', 'Torta de chocolate')->sole();

            $this->assertEquals(28, $torta->price_usdt);
            $this->assertSame(['Tortas'], $torta->categories->pluck('name')->all());
            $this->assertCount(1, $torta->variants);
            $this->assertCount(1, $torta->images);

            // La imagen se guardó de nuevo, con un nombre propio de esta cuenta
            $this->assertStringContainsString('restaurado-', $torta->image_path);
            Storage::disk(Archivos::DISCO)->assertExists($torta->image_path);

            $servicio = Product::where('name', 'Clase de repostería')->sole();
            $this->assertTrue($servicio->esServicio());
            $this->assertSame('3 horas', $servicio->service_duration);

            $combo = Combo::where('name', 'Combo merienda')->sole();
            $this->assertSame(['Torta de chocolate'], $combo->products->pluck('name')->all());

            $this->assertSame('#7c2d5a', CatalogTheme::first()->color_primary);
            $this->assertSame(1, CatalogBanner::count());
        });
    }

    public function test_agregar_no_pisa_lo_que_ya_existe(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);
        $ruta = $this->comoTenant($comercio, fn () => app(RespaldoDelComercio::class)->exportar($comercio));

        // Cambia el precio y el diseño después de hacer el respaldo
        $this->comoTenant($comercio, function () {
            Product::where('name', 'Torta de chocolate')->update(['price_usdt' => 35]);
            CatalogTheme::first()->update(['color_primary' => '#000000']);
        });

        $hechos = $this->comoTenant(
            $comercio,
            fn () => app(RespaldoDelComercio::class)->restaurar($comercio, $ruta, RespaldoDelComercio::MODO_AGREGAR)
        );

        $this->comoTenant($comercio, function () {
            // Ni duplicó el producto ni le devolvió el precio viejo
            $this->assertSame(1, Product::where('name', 'Torta de chocolate')->count());
            $this->assertEquals(35, Product::where('name', 'Torta de chocolate')->value('price_usdt'));
            // Y no tocó el diseño
            $this->assertSame('#000000', CatalogTheme::first()->color_primary);
        });

        $this->assertSame(0, $hechos['productos']);
        $this->assertSame(2, $hechos['omitidos']);
    }

    public function test_reemplazar_borra_lo_anterior_y_respeta_las_facturas(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);
        $ruta = $this->comoTenant($comercio, fn () => app(RespaldoDelComercio::class)->exportar($comercio));

        $this->comoTenant($comercio, function () {
            Product::create(['name' => 'Producto que sobra', 'price_usdt' => 5, 'stock' => 1]);
            Factura::create(['client_name' => 'Carla', 'status' => 'confirmed', 'total_usd' => 28, 'bcv_rate' => 39]);
        });

        $this->comoTenant(
            $comercio,
            fn () => app(RespaldoDelComercio::class)->restaurar($comercio, $ruta, RespaldoDelComercio::MODO_REEMPLAZAR)
        );

        $this->comoTenant($comercio, function () {
            $this->assertSame(0, Product::where('name', 'Producto que sobra')->count());
            $this->assertSame(2, Product::count());
            // Las ventas no son parte del respaldo y siguen ahí
            $this->assertSame(1, Factura::count());
        });
    }

    public function test_la_restauracion_respeta_el_limite_de_productos_del_plan(): void
    {
        $origen = $this->comercio();
        $this->cargarCatalogo($origen);
        $ruta = $this->comoTenant($origen, fn () => app(RespaldoDelComercio::class)->exportar($origen));

        $plan = Plan::create(['name' => 'Inicial', 'price_usd' => 0, 'max_products' => 1]);
        $destino = $this->comercio(['plan_id' => $plan->id]);

        $hechos = $this->comoTenant(
            $destino,
            fn () => app(RespaldoDelComercio::class)->restaurar($destino->fresh(), $ruta, RespaldoDelComercio::MODO_REEMPLAZAR)
        );

        $this->assertSame(1, $hechos['productos']);
        $this->assertSame(1, $hechos['omitidos']);
    }

    // ── Lo que llega no es de fiar ─────────────────────────────────────────────

    public function test_un_zip_sin_respaldo_json_se_rechaza(): void
    {
        $ruta = storage_path('app/respaldos-comercio/falso.zip');
        File::ensureDirectoryExists(dirname($ruta));

        $zip = new ZipArchive();
        $zip->open($ruta, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('cualquier-cosa.txt', 'hola');
        $zip->close();

        $lectura = app(RespaldoDelComercio::class)->analizar($ruta);

        $this->assertFalse($lectura['ok']);
        $this->assertStringContainsString('respaldo.json', $lectura['error']);
    }

    public function test_un_respaldo_manipulado_no_escribe_fuera_de_su_sitio(): void
    {
        $comercio = $this->comercio();

        // Un respaldo escrito a mano, con campos que no existen y una ruta
        // de imagen que intenta salirse de la carpeta
        $datos = [
            'formato' => 1,
            'comercio' => ['negocio' => 'Intruso'],
            'categorias' => ['Tortas'],
            'productos' => [[
                'name' => 'Producto raro',
                'price_usdt' => 10,
                'stock' => 1,
                'user_id' => 999,                    // no debe colarse
                'is_hidden' => false,
                'imagen' => '../../../.env',         // no debe escribirse
                'categorias' => ['Tortas'],
            ]],
        ];

        $ruta = storage_path('app/respaldos-comercio/manipulado.zip');
        File::ensureDirectoryExists(dirname($ruta));

        $zip = new ZipArchive();
        $zip->open($ruta, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('respaldo.json', json_encode($datos));
        $zip->addFromString('imagenes/../../../.env', 'APP_KEY=robada');
        $zip->close();

        $hechos = $this->comoTenant(
            $comercio,
            fn () => app(RespaldoDelComercio::class)->restaurar($comercio, $ruta, RespaldoDelComercio::MODO_AGREGAR)
        );

        $this->assertSame(1, $hechos['productos']);

        $this->comoTenant($comercio, function () use ($comercio) {
            $producto = Product::sole();

            // El producto es suyo, no del id que venía en el archivo
            $this->assertSame($comercio->id, $producto->user_id);
            $this->assertNull($producto->image_path);
        });

        Storage::disk(Archivos::DISCO)->assertMissing('.env');
    }

    public function test_el_respaldo_de_otro_comercio_no_se_mezcla(): void
    {
        $ajeno = $this->comercio();
        $this->comoTenant($ajeno, fn () => Product::create(['name' => 'Producto ajeno', 'price_usdt' => 9, 'stock' => 1]));

        $mio = $this->comercio();
        $this->cargarCatalogo($mio);

        $ruta = $this->comoTenant($mio, fn () => app(RespaldoDelComercio::class)->exportar($mio));

        $zip = new ZipArchive();
        $zip->open($ruta);
        $datos = json_decode($zip->getFromName('respaldo.json'), true);
        $zip->close();

        $this->assertNotContains('Producto ajeno', collect($datos['productos'])->pluck('name')->all());
    }

    // ── El flujo de la pantalla ────────────────────────────────────────────────

    public function test_subir_no_cambia_nada_hasta_confirmar(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);
        $ruta = $this->comoTenant($comercio, fn () => app(RespaldoDelComercio::class)->exportar($comercio));

        $otro = $this->comercio();

        $this->actingAs($otro)
            ->post(route('respaldo.subir'), [
                'respaldo' => new UploadedFile($ruta, 'respaldo.zip', 'application/zip', null, true),
            ])
            ->assertSessionHasNoErrors();

        // Todavía no se creó nada: solo se leyó el archivo
        $this->comoTenant($otro, fn () => $this->assertSame(0, Product::count()));

        $this->actingAs($otro)
            ->get(route('respaldo.index'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('pendiente.negocio', 'Dulces Mariana')
                ->where('pendiente.productos', 2));

        // Y al confirmar, sí
        $this->actingAs($otro)
            ->post(route('respaldo.restaurar'), ['modo' => 'agregar'])
            ->assertSessionHasNoErrors();

        $this->comoTenant($otro, fn () => $this->assertSame(2, Product::count()));
    }

    public function test_reemplazar_exige_confirmacion_expresa(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);
        $ruta = $this->comoTenant($comercio, fn () => app(RespaldoDelComercio::class)->exportar($comercio));

        $this->actingAs($comercio)->post(route('respaldo.subir'), [
            'respaldo' => new UploadedFile($ruta, 'respaldo.zip', 'application/zip', null, true),
        ]);

        $this->actingAs($comercio)
            ->post(route('respaldo.restaurar'), ['modo' => 'reemplazar'])
            ->assertSessionHasErrors('entiendo');

        $this->comoTenant($comercio, fn () => $this->assertSame(2, Product::count()));
    }

    public function test_al_reemplazar_se_guarda_una_copia_de_lo_anterior(): void
    {
        $comercio = $this->comercio();
        $this->cargarCatalogo($comercio);
        $ruta = $this->comoTenant($comercio, fn () => app(RespaldoDelComercio::class)->exportar($comercio, storage_path('app/respaldos-comercio/temporales')));

        $this->actingAs($comercio)->post(route('respaldo.subir'), [
            'respaldo' => new UploadedFile($ruta, 'respaldo.zip', 'application/zip', null, true),
        ]);

        $this->actingAs($comercio)
            ->post(route('respaldo.restaurar'), ['modo' => 'reemplazar', 'entiendo' => true])
            ->assertSessionHasNoErrors();

        $this->actingAs($comercio)
            ->get(route('respaldo.index'))
            ->assertInertia(fn ($pagina) => $pagina->has('copias', 1));
    }

    public function test_un_archivo_que_no_es_zip_se_rechaza_con_palabras(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('respaldo.subir'), [
                'respaldo' => UploadedFile::fake()->create('mis-productos.pdf', 120, 'application/pdf'),
            ])
            ->assertSessionHasErrors('respaldo');
    }
}
