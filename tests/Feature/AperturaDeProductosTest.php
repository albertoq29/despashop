<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cómo se abre un producto y la selección múltiple.
 *
 * Al tocar una tarjeta se abre una ventana encima del catálogo, o no pasa
 * nada; lo elige el comercio. La selección viene encendida: agrega un
 * botón, no quita nada.
 */
class AperturaDeProductosTest extends TestCase
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
            'product_view' => 'modal',
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

    public function test_la_pagina_propia_ya_no_es_una_opcion(): void
    {
        $this->actingAs($this->comercio)
            ->put(route('catalogo.personalizar.update'), $this->formularioDelTema(['product_view' => 'pagina']))
            ->assertSessionHasErrors('product_view');
    }

    public function test_no_se_acepta_una_manera_inventada(): void
    {
        $this->actingAs($this->comercio)
            ->put(route('catalogo.personalizar.update'), $this->formularioDelTema(['product_view' => 'carrusel']))
            ->assertSessionHasErrors('product_view');

        $this->assertSame('modal', $this->tema->fresh()->product_view);
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
