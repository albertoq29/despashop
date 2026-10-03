<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Factura;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

/**
 * Confirmar el correo y llevarse los datos: las dos cosas que el comercio
 * necesita para confiar en la plataforma.
 */
class CuentaYDatosTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Mariana Rivas',
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

    // ── Verificación de correo ─────────────────────────────────────────────────

    public function test_al_registrarse_se_manda_el_correo_de_confirmacion(): void
    {
        Notification::fake();

        $this->post(route('register'), [
            'name' => 'Ana',
            'business_name' => 'Flores Ana',
            'username' => 'flores-ana',
            'email' => 'ana@ejemplo.test',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'acepta_terminos' => true,
        ])->assertSessionHasNoErrors();

        $usuario = User::where('email', 'ana@ejemplo.test')->sole();

        $this->assertNull($usuario->email_verified_at);
        Notification::assertSentTo($usuario, VerifyEmail::class);
    }

    public function test_sin_confirmar_el_correo_no_se_entra_al_panel(): void
    {
        $comercio = $this->comercio(['email_verified_at' => null]);

        $this->actingAs($comercio)->get(route('dashboard'))->assertRedirect(route('verification.notice'));
        $this->actingAs($comercio)->get(route('verification.notice'))->assertOk();
    }

    public function test_el_admin_puede_dar_por_verificado_un_correo(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);

        $comercio = $this->comercio(['email_verified_at' => null]);

        $this->actingAs($admin)
            ->post(route('admin.comercios.verificar-correo', $comercio->id))
            ->assertSessionHasNoErrors();

        $this->assertNotNull($comercio->fresh()->email_verified_at);
    }

    // ── Exportación ────────────────────────────────────────────────────────────

    public function test_el_comercio_descarga_una_copia_de_todo_lo_suyo(): void
    {
        Storage::fake(Archivos::DISCO);

        $comercio = $this->comercio();

        $imagen = app(Tenancy::class)->forTenant($comercio->id, function () {
            $ruta = Archivos::guardar(UploadedFile::fake()->image('torta.jpg', 800, 600), 'products');

            $categoria = Category::create(['name' => 'Tortas']);
            $producto = Product::create(['name' => 'Torta de chocolate', 'price_usdt' => 25, 'stock' => 3, 'cost_price' => 12, 'image_path' => $ruta]);
            $producto->categories()->sync([$categoria->id]);

            Product::create([
                'name' => 'Clase de repostería',
                'item_type' => Product::SERVICIO,
                'service_duration' => '3 horas',
                'service_mode' => 'local',
                'price_usdt' => 30,
            ]);

            Factura::create([
                'client_name' => 'Carla Peñaloza',
                'client_phone' => '+58 424 5512098',
                'status' => 'confirmed',
                'total_usd' => 25,
                'bcv_rate' => 39,
                'confirmed_at' => now(),
            ]);

            return $ruta;
        });

        $respuesta = $this->actingAs($comercio)->get(route('datos.descargar'));
        $respuesta->assertOk();
        $respuesta->assertHeader('content-type', 'application/zip');

        // El archivo se arma de verdad: se abre y se mira por dentro
        $descarga = $respuesta->baseResponse->getFile()->getPathname();

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($descarga) === true);

        $dentro = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $dentro[] = $zip->getNameIndex($i);
        }

        $this->assertContains('datos/productos-y-servicios.csv', $dentro);
        $this->assertContains('datos/facturas.csv', $dentro);
        $this->assertContains('datos/clientes.csv', $dentro);
        $this->assertContains('imagenes/' . $imagen, $dentro);

        $productos = $zip->getFromName('datos/productos-y-servicios.csv');
        $this->assertStringContainsString('Torta de chocolate', $productos);
        $this->assertStringContainsString('Clase de repostería', $productos);
        $this->assertStringContainsString('Servicio', $productos);

        $this->assertStringContainsString('Carla Peñaloza', $zip->getFromName('datos/clientes.csv'));

        $zip->close();
    }

    public function test_la_descarga_solo_trae_lo_del_comercio_que_la_pide(): void
    {
        Storage::fake(Archivos::DISCO);

        $ajeno = $this->comercio();
        app(Tenancy::class)->forTenant($ajeno->id, fn () => Product::create(['name' => 'Producto del otro', 'stock' => 1]));

        $mio = $this->comercio();
        app(Tenancy::class)->forTenant($mio->id, fn () => Product::create(['name' => 'Producto mío', 'stock' => 1]));

        $respuesta = $this->actingAs($mio)->get(route('datos.descargar'))->assertOk();

        $zip = new ZipArchive();
        $zip->open($respuesta->baseResponse->getFile()->getPathname());
        $productos = $zip->getFromName('datos/productos-y-servicios.csv');
        $zip->close();

        $this->assertStringContainsString('Producto mío', $productos);
        $this->assertStringNotContainsString('Producto del otro', $productos);
    }

    // ── Páginas de error ───────────────────────────────────────────────────────

    public function test_la_pagina_404_lleva_la_marca(): void
    {
        $respuesta = $this->get('/esta-direccion-no-existe')->assertNotFound();

        $respuesta->assertSee('Esta página no existe');
        $respuesta->assertSee('/marca/logo-verde.svg', false);
    }

    public function test_el_catalogo_dice_quien_es_al_compartirlo(): void
    {
        $comercio = $this->comercio();

        $this->get('/' . $comercio->username)
            ->assertOk()
            ->assertSee('<meta property="og:title" content="Dulces Mariana">', false)
            ->assertSee('<meta property="og:image"', false);
    }
}
