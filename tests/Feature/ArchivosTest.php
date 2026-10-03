<?php

namespace Tests\Feature;

use App\Models\CatalogBanner;
use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Las imágenes se guardan en storage/app/public y se sirven por el enlace
 * public/storage. Al borrar un registro, su archivo tiene que desaparecer
 * del disco: si no, la carpeta crece sin control con huérfanos.
 */
class ArchivosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(Archivos::DISCO);
    }

    private function comercio(array $atributos = []): User
    {
        $usuario = User::factory()->create($atributos);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    private function comoTenant(User $usuario, callable $callback): mixed
    {
        return app(Tenancy::class)->forTenant($usuario->id, $callback);
    }

    // ── Guardado ──────────────────────────────────────────────────────────

    public function test_sube_el_logo_del_catalogo_y_lo_deja_en_el_disco(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('catalogo.logo'), [
                'logo' => UploadedFile::fake()->image('mi logo.png', 200, 200),
            ])
            ->assertRedirect();

        $ruta = CatalogTheme::withoutGlobalScope('tenant')
            ->where('user_id', $comercio->id)
            ->value('logo_path');

        $this->assertNotNull($ruta, 'no se guardó la ruta del logo');
        Storage::disk(Archivos::DISCO)->assertExists($ruta);
    }

    public function test_el_nombre_del_archivo_queda_limpio_para_una_url(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)->post(route('catalogo.logo'), [
            'logo' => UploadedFile::fake()->image('Captura de pantalla, 20 ago 2026 #2.png'),
        ]);

        $ruta = CatalogTheme::withoutGlobalScope('tenant')
            ->where('user_id', $comercio->id)
            ->value('logo_path');

        $nombre = basename($ruta);

        $this->assertDoesNotMatchRegularExpression(
            '/[\s#?&%,]/',
            $nombre,
            "el nombre guardado conserva caracteres que rompen la URL: {$nombre}"
        );
        $this->assertSame($nombre, rawurlencode($nombre), 'el nombre necesita escaparse en una URL');
    }

    public function test_cada_comercio_guarda_en_su_propia_carpeta(): void
    {
        $uno = $this->comercio();
        $dos = $this->comercio();

        foreach ([$uno, $dos] as $comercio) {
            $this->actingAs($comercio)->post(route('catalogo.logo'), [
                'logo' => UploadedFile::fake()->image('logo.png'),
            ]);
        }

        $rutaUno = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $uno->id)->value('logo_path');
        $rutaDos = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $dos->id)->value('logo_path');

        $this->assertStringStartsWith("catalogo/{$uno->id}/", $rutaUno);
        $this->assertStringStartsWith("catalogo/{$dos->id}/", $rutaDos);
    }

    public function test_al_reemplazar_el_logo_se_borra_el_anterior(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)->post(route('catalogo.logo'), [
            'logo' => UploadedFile::fake()->image('primero.png'),
        ]);
        $primera = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->value('logo_path');

        $this->actingAs($comercio)->post(route('catalogo.logo'), [
            'logo' => UploadedFile::fake()->image('segundo.png'),
        ]);
        $segunda = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->value('logo_path');

        $this->assertNotSame($primera, $segunda);
        Storage::disk(Archivos::DISCO)->assertMissing($primera);
        Storage::disk(Archivos::DISCO)->assertExists($segunda);
    }

    // ── Borrado ───────────────────────────────────────────────────────────

    public function test_al_borrar_un_producto_desaparecen_sus_imagenes_del_disco(): void
    {
        $comercio = $this->comercio();

        [$producto, $rutaPrincipal, $rutaGaleria] = $this->comoTenant($comercio, function () {
            $principal = Archivos::guardar(UploadedFile::fake()->image('principal.png'), 'products');
            $galeria = Archivos::guardar(UploadedFile::fake()->image('galeria.png'), 'products');

            $producto = Product::create(['name' => 'Con fotos', 'price_usdt' => 5, 'image_path' => $principal]);
            ProductImage::create(['product_id' => $producto->id, 'image_path' => $galeria]);

            return [$producto, $principal, $galeria];
        });

        Storage::disk(Archivos::DISCO)->assertExists($rutaPrincipal);
        Storage::disk(Archivos::DISCO)->assertExists($rutaGaleria);

        $this->comoTenant($comercio, fn () => $producto->delete());

        Storage::disk(Archivos::DISCO)->assertMissing($rutaPrincipal);
        Storage::disk(Archivos::DISCO)->assertMissing($rutaGaleria);
    }

    public function test_al_borrar_un_banner_desaparece_su_imagen(): void
    {
        $comercio = $this->comercio();

        $banner = $this->comoTenant($comercio, function () use ($comercio) {
            $ruta = Archivos::guardar(UploadedFile::fake()->image('banner.png'), 'catalogo/' . $comercio->id);

            return CatalogBanner::create(['title' => 'Promo', 'image_path' => $ruta]);
        });

        Storage::disk(Archivos::DISCO)->assertExists($banner->image_path);

        $this->actingAs($comercio)
            ->delete(route('catalogo.banners.destroy', $banner->id))
            ->assertRedirect();

        Storage::disk(Archivos::DISCO)->assertMissing($banner->image_path);
    }

    public function test_al_eliminar_la_cuenta_se_borra_toda_su_carpeta(): void
    {
        $comercio = $this->comercio();

        $rutas = $this->comoTenant($comercio, function () use ($comercio) {
            return [
                Archivos::guardar(UploadedFile::fake()->image('logo.png'), 'catalogo/' . $comercio->id),
                Archivos::guardar(UploadedFile::fake()->image('firma.png'), 'facturas/' . $comercio->id),
                Archivos::guardar(UploadedFile::fake()->image('producto.png'), 'products'),
            ];
        });

        $this->comoTenant($comercio, function () use ($rutas) {
            Product::create(['name' => 'Suyo', 'price_usdt' => 3, 'image_path' => $rutas[2]]);
        });

        $comercio->delete();

        foreach ($rutas as $ruta) {
            Storage::disk(Archivos::DISCO)->assertMissing($ruta);
        }
    }

    public function test_no_se_borra_una_imagen_que_una_factura_emitida_todavia_usa(): void
    {
        $comercio = $this->comercio();

        $producto = $this->comoTenant($comercio, function () {
            $ruta = Archivos::guardar(UploadedFile::fake()->image('vendido.png'), 'products');

            return Product::create(['name' => 'Vendido', 'price_usdt' => 9, 'image_path' => $ruta]);
        });

        // Una factura ya emitida guarda una copia de la ruta de la imagen
        $this->comoTenant($comercio, function () use ($producto) {
            $factura = \App\Models\Factura::create([
                'client_name' => 'Cliente', 'status' => 'confirmed',
                'subtotal_usd' => 9, 'total_usd' => 9, 'total_bs' => 328, 'bcv_rate' => 36.5,
            ]);

            $factura->items()->create([
                'product_id' => $producto->id,
                'product_name' => $producto->name,
                'product_image_path' => $producto->image_path,
                'unit_price_usd' => 9, 'qty' => 1, 'subtotal_usd' => 9,
            ]);
        });

        $ruta = $producto->image_path;
        $this->comoTenant($comercio, fn () => $producto->delete());

        Storage::disk(Archivos::DISCO)->assertExists($ruta);
    }

    // ── Guardas del helper ────────────────────────────────────────────────

    public function test_eliminar_una_ruta_vacia_no_revienta(): void
    {
        $this->assertFalse(Archivos::eliminar(null));
        $this->assertFalse(Archivos::eliminar(''));
        $this->assertFalse(Archivos::eliminar('   '));
        $this->assertFalse(Archivos::eliminar('no/existe.png'));
    }
}
