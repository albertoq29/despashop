<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cómo se abre un producto: ventana flotante o página propia.
 *
 * La página solo existe cuando el comercio la eligió. Con la ventana no
 * hay nada que enlazar, y dejar la dirección viva daría dos sitios
 * distintos para lo mismo.
 */
class PaginaDeProductoTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;
    private CatalogTheme $tema;

    protected function setUp(): void
    {
        parent::setUp();

        $this->comercio = User::create([
            'name' => 'Dueña',
            'business_name' => 'Dulces Mariana',
            'username' => 'dulces',
            'email' => 'duena@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
            'whatsapp' => '+58 412 0000000',
        ]);

        $this->tema = CatalogTheme::withoutGlobalScopes()->create([
            'user_id' => $this->comercio->id,
            'is_published' => true,
            'product_view' => 'pagina',
            'sections' => [['id' => 'header', 'type' => 'header', 'visible' => true]],
        ]);
    }

    private function producto(array $atributos = []): Product
    {
        return app(Tenancy::class)->forTenant($this->comercio->id, fn () => Product::create([
            'user_id' => $this->comercio->id,
            'name' => 'Torta de chocolate',
            'price_usdt' => 25,
            'stock' => 4,
            ...$atributos,
        ]));
    }

    // ── La página existe, o no ────────────────────────────────────────────────

    public function test_con_pagina_propia_el_producto_tiene_su_direccion(): void
    {
        $producto = $this->producto();

        $this->get("/dulces/p/{$producto->id}")
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('Catalogo/Producto')
                ->where('articulo.name', 'Torta de chocolate')
                ->where('comercio.username', 'dulces'));
    }

    public function test_con_ventana_flotante_no_hay_pagina_que_abrir(): void
    {
        $this->tema->update(['product_view' => 'modal']);
        $producto = $this->producto();

        $this->get("/dulces/p/{$producto->id}")->assertNotFound();
    }

    public function test_un_producto_de_otro_comercio_no_se_cuela(): void
    {
        $otro = User::create([
            'name' => 'Otro',
            'username' => 'otra-tienda',
            'email' => 'otro@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        $ajeno = app(Tenancy::class)->forTenant($otro->id, fn () => Product::create([
            'user_id' => $otro->id,
            'name' => 'Ajeno',
            'price_usdt' => 10,
        ]));

        $this->get("/dulces/p/{$ajeno->id}")->assertNotFound();
    }

    public function test_un_producto_escondido_no_tiene_pagina(): void
    {
        $producto = $this->producto(['is_hidden' => true]);

        $this->get("/dulces/p/{$producto->id}")->assertNotFound();
    }

    public function test_un_catalogo_sin_publicar_tampoco_abre_sus_productos(): void
    {
        $this->tema->update(['is_published' => false]);
        $producto = $this->producto();

        $this->get("/dulces/p/{$producto->id}")->assertNotFound();

        // Su dueño sí puede verlo, para comprobar cómo quedó
        $this->actingAs($this->comercio)->get("/dulces/p/{$producto->id}")->assertOk();
    }

    public function test_la_direccion_de_un_producto_no_choca_con_un_catalogo(): void
    {
        $this->producto();

        // Un solo segmento sigue siendo el catálogo del comercio
        $this->get('/dulces')->assertOk()->assertInertia(fn ($p) => $p->component('Catalogo/Publico'));
    }

    // ── Lo que lleva la página ────────────────────────────────────────────────

    public function test_trae_relacionados_sin_repetir_el_que_se_mira(): void
    {
        $producto = $this->producto();
        $this->producto(['name' => 'Torta de vainilla']);
        $this->producto(['name' => 'Galletas']);

        $this->get("/dulces/p/{$producto->id}")
            ->assertInertia(fn ($pagina) => $pagina
                ->has('relacionados', 2)
                ->where('articulo.id', $producto->id));
    }

    public function test_el_costo_no_viaja_a_la_pagina_publica(): void
    {
        $producto = $this->producto(['cost_price' => 9.5, 'notes' => 'Proveedor del centro']);

        $this->get("/dulces/p/{$producto->id}")
            ->assertInertia(fn ($pagina) => $pagina
                ->missing('articulo.cost_price')
                ->missing('articulo.notes'));
    }

    public function test_la_vista_previa_del_enlace_habla_del_producto(): void
    {
        $producto = $this->producto(['description' => 'Bizcocho húmedo con ganache.']);

        $respuesta = $this->get("/dulces/p/{$producto->id}");

        $respuesta->assertSee('Torta de chocolate · Dulces Mariana', false);
        $respuesta->assertSee('Bizcocho húmedo con ganache.', false);
    }

    // ── El ajuste del comercio ────────────────────────────────────────────────

    /** El formulario del editor manda el tema entero; aquí se imita. */
    private function formularioDelTema(array $cambios): array
    {
        return [...$this->tema->fresh()->toArray(), ...$cambios];
    }

    public function test_el_comercio_elige_como_se_abren(): void
    {
        $this->actingAs($this->comercio)
            ->put(route('catalogo.personalizar.update'), $this->formularioDelTema([
                'product_view' => 'ninguna',
                'multi_select' => false,
            ]))
            ->assertSessionHasNoErrors();

        $this->tema->refresh();

        $this->assertSame('ninguna', $this->tema->product_view);
        $this->assertFalse($this->tema->multi_select);
    }

    public function test_no_se_acepta_una_manera_inventada(): void
    {
        $this->actingAs($this->comercio)
            ->put(route('catalogo.personalizar.update'), $this->formularioDelTema(['product_view' => 'carrusel']))
            ->assertSessionHasErrors('product_view');

        $this->assertSame('pagina', $this->tema->fresh()->product_view);
    }

    public function test_un_catalogo_nuevo_nace_con_ventana_y_seleccion(): void
    {
        $otro = User::create([
            'name' => 'Nuevo',
            'username' => 'nuevo',
            'email' => 'nuevo@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        $tema = CatalogTheme::withoutGlobalScopes()->create(['user_id' => $otro->id]);

        $this->assertSame('modal', $tema->fresh()->product_view);
        $this->assertTrue($tema->fresh()->multi_select);
    }
}
