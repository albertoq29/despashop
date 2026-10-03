<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Factura;
use App\Models\FacturaItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Servicios en el catálogo, y que el catálogo pese y consulte lo justo.
 */
class ServiciosYCatalogoRapidoTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Dueña',
            'business_name' => 'Barbería Central',
            'username' => 'barberia-' . uniqid(),
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

    // ── Servicios ──────────────────────────────────────────────────────────────

    public function test_un_servicio_se_crea_sin_existencias(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('productos.store'), [
                'name' => 'Corte de cabello',
                'item_type' => 'servicio',
                'service_duration' => '45 min',
                'service_mode' => 'local',
                'price_usdt' => 8,
            ])
            ->assertSessionHasNoErrors();

        $servicio = Product::withoutGlobalScope('tenant')->sole();

        $this->assertTrue($servicio->esServicio());
        $this->assertSame(0, (int) $servicio->stock);
        $this->assertSame('45 min · En nuestro local', $servicio->detalleDelServicio());
    }

    public function test_un_producto_sigue_exigiendo_existencias(): void
    {
        $this->actingAs($this->comercio())
            ->post(route('productos.store'), ['name' => 'Cera para barba', 'item_type' => 'producto'])
            ->assertSessionHasErrors('stock');
    }

    public function test_pasar_de_servicio_a_producto_limpia_lo_que_no_aplica(): void
    {
        $comercio = $this->comercio();
        $servicio = $this->comoTenant($comercio, fn () => Product::create([
            'name' => 'Afeitado clásico',
            'item_type' => Product::SERVICIO,
            'service_duration' => '30 min',
            'service_mode' => 'local',
        ]));

        $this->actingAs($comercio)
            ->patch(route('productos.update', $servicio->id), [
                'name' => 'Afeitado clásico',
                'item_type' => 'producto',
                'stock' => 5,
            ])
            ->assertSessionHasNoErrors();

        $servicio->refresh();

        $this->assertFalse($servicio->esServicio());
        $this->assertNull($servicio->service_duration);
        $this->assertNull($servicio->service_mode);
        $this->assertSame(5, (int) $servicio->stock);
    }

    public function test_el_catalogo_separa_servicios_de_productos(): void
    {
        $comercio = $this->comercio();

        $this->comoTenant($comercio, function () {
            Product::create(['name' => 'Cera para barba', 'price_usdt' => 6, 'stock' => 10]);
            Product::create([
                'name' => 'Corte de cabello',
                'item_type' => Product::SERVICIO,
                'service_duration' => '45 min',
                'service_mode' => 'local',
                'price_usdt' => 8,
            ]);
        });

        $this->get('/' . $comercio->username)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('productos', 1)
                ->where('productos.0.name', 'Cera para barba')
                ->has('servicios', 1)
                ->where('servicios.0.name', 'Corte de cabello')
                ->where('servicios.0.esServicio', true)
                ->where('servicios.0.detalle', '45 min · En nuestro local')
                // Un servicio no se agota
                ->where('servicios.0.stock', null));
    }

    public function test_buscar_encuentra_tambien_los_servicios(): void
    {
        $comercio = $this->comercio();

        $this->comoTenant($comercio, fn () => Product::create([
            'name' => 'Corte de cabello',
            'item_type' => Product::SERVICIO,
            'price_usdt' => 8,
        ]));

        $this->get('/' . $comercio->username . '?search=corte')
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('productos', 1)
                ->where('productos.0.name', 'Corte de cabello'));
    }

    public function test_confirmar_una_factura_no_descuenta_existencias_de_un_servicio(): void
    {
        $comercio = $this->comercio();

        [$servicio, $producto, $factura] = $this->comoTenant($comercio, function () {
            $servicio = Product::create(['name' => 'Corte', 'item_type' => Product::SERVICIO, 'price_usdt' => 8]);
            $producto = Product::create(['name' => 'Cera', 'price_usdt' => 6, 'stock' => 10]);

            $factura = Factura::create([
                'client_name' => 'Cliente',
                'status' => 'draft',
                'subtotal_usd' => 14,
                'total_usd' => 14,
                'bcv_rate' => 39,
            ]);

            foreach ([[$servicio, 8], [$producto, 6]] as [$articulo, $precio]) {
                FacturaItem::create([
                    'factura_id' => $factura->id,
                    'product_id' => $articulo->id,
                    'product_name' => $articulo->name,
                    'price_type' => 'detal',
                    'unit_price_usd' => $precio,
                    'qty' => 2,
                    'subtotal_usd' => $precio * 2,
                ]);
            }

            return [$servicio, $producto, $factura];
        });

        $this->actingAs($comercio)
            ->post(route('facturas.confirmar', $factura->id))
            ->assertSessionHasNoErrors();

        $this->assertSame('confirmed', $factura->fresh()->status);
        $this->assertSame(0, (int) $servicio->fresh()->stock);   // sigue en cero, no en -2
        $this->assertSame(8, (int) $producto->fresh()->stock);   // el producto sí descuenta
    }

    // ── El catálogo trae solo lo necesario ─────────────────────────────────────

    public function test_la_rejilla_llega_por_tandas(): void
    {
        $comercio = $this->comercio();

        $this->comoTenant($comercio, function () {
            foreach (range(1, 30) as $numero) {
                Product::create(['name' => "Producto {$numero}", 'price_usdt' => 5, 'stock' => 3]);
            }
        });

        $this->get('/' . $comercio->username)
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('productos', 24)
                ->where('productosTotal', 30));

        $this->get('/' . $comercio->username . '?ver=48')
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->has('productos', 30));
    }

    public function test_un_bloque_apagado_no_se_consulta(): void
    {
        $comercio = $this->comercio();

        $this->comoTenant($comercio, function () {
            Product::create(['name' => 'Cera', 'price_usdt' => 6, 'stock' => 4]);

            $tema = CatalogTheme::first();
            $tema->sections = collect($tema->sections)
                ->map(fn ($seccion) => in_array($seccion['type'], ['products', 'featured', 'services'], true)
                    ? [...$seccion, 'visible' => false]
                    : $seccion)
                ->all();
            $tema->save();
        });

        $this->get('/' . $comercio->username)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('productos', 0)
                ->has('novedades', 0)
                ->has('servicios', 0)
                ->where('productosTotal', 0));
    }

    public function test_el_catalogo_no_dispara_una_consulta_por_producto(): void
    {
        $comercio = $this->comercio();

        $this->comoTenant($comercio, function () {
            $categoria = Category::create(['name' => 'Cuidado']);

            foreach (range(1, 20) as $numero) {
                $producto = Product::create(['name' => "Producto {$numero}", 'price_usdt' => 5, 'stock' => 3]);
                $producto->categories()->sync([$categoria->id]);
                ProductImage::create(['product_id' => $producto->id, 'image_path' => "products/p{$numero}.jpg"]);
            }
        });

        DB::enableQueryLog();

        $this->get('/' . $comercio->username)->assertOk();

        $consultas = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Con 20 productos, 20 imágenes y sus categorías: si esto se dispara,
        // alguien volvió a consultar dentro de un bucle.
        $this->assertLessThan(25, $consultas, "El catálogo hizo {$consultas} consultas");
    }

    public function test_el_catalogo_manda_la_miniatura_y_nunca_el_costo(): void
    {
        $comercio = $this->comercio();

        $this->comoTenant($comercio, fn () => Product::create([
            'name' => 'Cera',
            'price_usdt' => 6,
            'cost_price' => 2.5,
            'notes' => 'Proveedor: no mostrar',
            'stock' => 4,
            'image_path' => 'products/cera-abc123.jpg',
        ]));

        $respuesta = $this->get('/' . $comercio->username)->assertOk();

        $respuesta->assertInertia(fn (AssertableInertia $pagina) => $pagina
            ->where('productos.0.thumb_url', fn ($url) => str_contains((string) $url, 'products/mini/cera-abc123.webp'))
            ->missing('productos.0.cost_price')
            ->missing('productos.0.notes'));
    }

    // ── Imágenes livianas ──────────────────────────────────────────────────────

    public function test_al_subir_una_imagen_se_crea_su_version_liviana(): void
    {
        Storage::fake(Archivos::DISCO);

        $ruta = Archivos::guardar(UploadedFile::fake()->image('foto.jpg', 2400, 1600), 'products');
        $miniatura = Archivos::rutaMiniatura($ruta);

        Storage::disk(Archivos::DISCO)->assertExists($ruta);
        Storage::disk(Archivos::DISCO)->assertExists($miniatura);

        $this->assertStringContainsString('/mini/', $miniatura);
        $this->assertStringEndsWith('.webp', $miniatura);

        // La liviana pesa menos que la completa
        $disco = Storage::disk(Archivos::DISCO);
        $this->assertLessThan($disco->size($ruta), $disco->size($miniatura));

        // Y al borrar el original se va con él
        Archivos::eliminar($ruta);
        $disco->assertMissing($ruta);
        $disco->assertMissing($miniatura);
    }

    public function test_una_imagen_enorme_se_acota_al_guardarla(): void
    {
        Storage::fake(Archivos::DISCO);

        $ruta = Archivos::guardar(UploadedFile::fake()->image('enorme.jpg', 4000, 3000), 'products');

        [$ancho] = getimagesizefromstring(Storage::disk(Archivos::DISCO)->get($ruta));

        $this->assertSame(Archivos::LADO_MAXIMO, $ancho);
    }
}
