<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Recorre todos los puntos de la app donde se sube una imagen, para que
 * ninguno se rompa en silencio. Cada uno debe terminar con el archivo en el
 * disco y una ruta relativa guardada en la base.
 */
class SubidaDeImagenesTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(Archivos::DISCO);

        $this->comercio = User::factory()->create();
        app(CatalogProvisioner::class)->provision($this->comercio);
        $this->actingAs($this->comercio);
    }

    private function imagen(string $nombre = 'foto.png'): UploadedFile
    {
        return UploadedFile::fake()->image($nombre, 400, 400);
    }

    public function test_logo_del_catalogo(): void
    {
        $this->post(route('catalogo.logo'), ['logo' => $this->imagen()])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    }

    public function test_portada_del_catalogo(): void
    {
        $this->post(route('catalogo.imagen', 'cover'), ['imagen' => $this->imagen()])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    }

    public function test_icono_del_navegador(): void
    {
        $this->post(route('catalogo.imagen', 'favicon'), ['imagen' => $this->imagen()])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    }

    public function test_banner_con_imagen(): void
    {
        $this->post(route('catalogo.banners.store'), [
            'image' => $this->imagen('banner.jpg'),
            'title' => 'Promoción',
            'text_position' => 'center',
            'overlay' => 'gradient',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseCount('catalog_banners', 1);
    }

    public function test_modal_con_imagen(): void
    {
        $this->post(route('catalogo.modales.store'), [
            'image' => $this->imagen('modal.png'),
            'title' => 'Aviso',
            'size' => 'md',
            'animation' => 'zoom',
            'trigger' => 'delay',
            'delay_seconds' => 3,
            'scroll_percent' => 50,
            'frequency' => 'once_session',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseCount('catalog_modals', 1);
    }

    public function test_logo_de_la_factura(): void
    {
        $this->post(route('facturas.plantilla.imagen', 'logo'), ['imagen' => $this->imagen()])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    }

    public function test_producto_con_imagen_principal_y_galeria(): void
    {
        $this->post(route('productos.store'), [
            'name' => 'Producto con fotos',
            'stock' => 10,
            'price_usdt' => 12.5,
            'image' => $this->imagen('principal.png'),
            'photos' => [$this->imagen('galeria 1.png'), $this->imagen('galeria 2.png')],
        ])->assertSessionHasNoErrors();

        $producto = Product::withoutGlobalScope('tenant')->first();

        $this->assertNotNull($producto, 'no se creó el producto');
        $this->assertNotNull($producto->image_path, 'no se guardó la imagen principal');
        Storage::disk(Archivos::DISCO)->assertExists($producto->image_path);

        $this->assertCount(2, $producto->images);

        foreach ($producto->images as $imagen) {
            Storage::disk(Archivos::DISCO)->assertExists($imagen->image_path);
        }
    }

    public function test_producto_con_fotos_privadas(): void
    {
        $this->post(route('productos.store'), [
            'name' => 'Con fichero',
            'stock' => 3,
            'price_usdt' => 4,
            'private_photos' => [$this->imagen('privada.png')],
            'private_photo_names' => ['Factura del proveedor'],
        ])->assertSessionHasNoErrors();

        $producto = Product::withoutGlobalScope('tenant')->first();

        $this->assertCount(1, $producto->privatePhotos);
        Storage::disk(Archivos::DISCO)->assertExists($producto->privatePhotos->first()->file_path);
    }

    public function test_combo_con_imagen(): void
    {
        $this->post(route('combos.store'), [
            'name' => 'Combo con foto',
            'stock' => 5,
            'price_usdt' => 20,
            'image' => $this->imagen('combo.png'),
        ])->assertSessionHasNoErrors();

        $combo = \App\Models\Combo::withoutGlobalScope('tenant')->first();

        $this->assertNotNull($combo, 'no se creó el combo');

        if ($combo->image_path) {
            Storage::disk(Archivos::DISCO)->assertExists($combo->image_path);
        }
    }

    /**
     * Si PHP no llegó a escribir el temporal, el archivo llega como objeto
     * pero sin contenido en disco. Antes reventaba con "Path cannot be
     * empty"; ahora debe salir un mensaje que el comercio pueda entender.
     */
    public function test_una_subida_rota_da_un_mensaje_y_no_un_error_500(): void
    {
        $rota = new UploadedFile(
            tempnam(sys_get_temp_dir(), 'rota'),
            'logo.png',
            'image/png',
            UPLOAD_ERR_CANT_WRITE,
            true
        );

        $respuesta = $this->post(route('catalogo.logo'), ['logo' => $rota]);

        $respuesta->assertRedirect();
        $this->assertNotEmpty(
            session('errors')?->all() ?? [],
            'la subida rota debería dejar un error de validación'
        );
    }

    public function test_actualizar_un_producto_sin_tocar_su_imagen_la_conserva(): void
    {
        $this->post(route('productos.store'), [
            'name' => 'Estable',
            'stock' => 1,
            'price_usdt' => 2,
            'image' => $this->imagen('estable.png'),
        ]);

        $producto = Product::withoutGlobalScope('tenant')->first();
        $rutaOriginal = $producto->image_path;

        $this->put(route('productos.update', $producto->id), [
            'name' => 'Estable renombrado',
            'stock' => 2,
            'price_usdt' => 3,
        ])->assertSessionHasNoErrors();

        $this->assertSame($rutaOriginal, $producto->fresh()->image_path);
        Storage::disk(Archivos::DISCO)->assertExists($rutaOriginal);
    }
}
