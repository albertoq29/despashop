<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Factura;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Productos a los que no se les lleva la cuenta.
 *
 * El pan que se hornea cada mañana, las bolsas, lo que se arma por encargo:
 * contarlos no dice nada y lo único que logra es que el catálogo los muestre
 * agotados y la factura se niegue a venderlos.
 */
class ProductosSinStockTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;

    protected function setUp(): void
    {
        parent::setUp();

        $this->comercio = User::create([
            'name' => 'Dueño',
            'business_name' => 'Panadería',
            'username' => 'panaderia',
            'email' => 'pan@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($this->comercio);

        CatalogTheme::withoutGlobalScope('tenant')
            ->where('user_id', $this->comercio->id)
            ->update(['is_published' => true]);
    }

    private function comoTenant(callable $callback): mixed
    {
        return app(Tenancy::class)->forTenant($this->comercio->id, $callback);
    }

    private function sinCuenta(array $atributos = []): Product
    {
        return $this->comoTenant(fn () => Product::create([
            'name' => 'Pan canilla',
            'price_usdt' => 1,
            'cost_price' => 0.4,
            'stock' => 0,
            'controla_stock' => false,
            ...$atributos,
        ]));
    }

    public function test_un_producto_nace_contandose(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), ['name' => 'Taza', 'item_type' => 'producto', 'stock' => 4])
            ->assertSessionHasNoErrors();

        $producto = $this->comoTenant(fn () => Product::sole());

        $this->assertTrue($producto->controla_stock);
        $this->assertTrue($producto->llevaExistencias());
    }

    public function test_el_comercio_puede_apagar_la_cuenta(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Pan canilla',
                'item_type' => 'producto',
                'stock' => 0,
                'controla_stock' => '0',
            ])
            ->assertSessionHasNoErrors();

        $this->assertFalse($this->comoTenant(fn () => Product::sole())->llevaExistencias());
    }

    /** Un servicio nunca lleva cuenta, diga lo que diga el formulario. */
    public function test_un_servicio_no_depende_del_interruptor(): void
    {
        $producto = $this->sinCuenta(['item_type' => Product::SERVICIO, 'controla_stock' => true]);

        $this->assertFalse($producto->llevaExistencias());
    }

    /* ── En el catálogo ─────────────────────────────────────────────────── */

    public function test_en_el_catalogo_no_sale_agotado(): void
    {
        $this->sinCuenta();

        $this->get(route('catalogo.publico', $this->comercio->username))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                // Sin existencias que mostrar, la tarjeta no puede marcarlo agotado
                ->where('productos.0.stock', null));
    }

    public function test_el_que_si_se_cuenta_sigue_saliendo_agotado(): void
    {
        $this->sinCuenta(['name' => 'Taza', 'controla_stock' => true, 'stock' => 0]);

        $this->get(route('catalogo.publico', $this->comercio->username))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->where('productos.0.stock', 0));
    }

    /* ── Al facturar ────────────────────────────────────────────────────── */

    private function facturar(Product $producto, string $cantidad): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->comercio)->post(route('facturas.store'), [
            'client_name' => 'Cliente',
            'status' => 'draft',
            'items' => [[
                'product_id' => $producto->id,
                'product_name' => $producto->name,
                'price_type' => 'detal',
                'unit_price_usd' => 1,
                'qty' => $cantidad,
            ]],
        ]);
    }

    /**
     * Lo que motivó todo esto: en cero, la factura se negaba a confirmarse
     * aunque el pan estuviera ahí mismo, sobre el mostrador.
     */
    public function test_se_factura_aunque_este_en_cero(): void
    {
        $producto = $this->sinCuenta();

        $this->facturar($producto, '20')->assertSessionHasNoErrors();

        $factura = $this->comoTenant(fn () => Factura::sole());

        $this->actingAs($this->comercio)
            ->post(route('facturas.confirmar', $factura->id))
            ->assertSessionHasNoErrors();

        $this->assertSame('confirmed', $factura->fresh()->status);
        // Y no se le descuenta nada, porque no hay nada que descontar
        $this->assertSame(0.0, $producto->fresh()->stock);
    }

    public function test_al_que_si_se_cuenta_se_le_sigue_exigiendo(): void
    {
        $producto = $this->sinCuenta(['name' => 'Taza', 'controla_stock' => true, 'stock' => 2]);

        $this->facturar($producto, '5')->assertSessionHasNoErrors();

        $this->actingAs($this->comercio)
            ->post(route('facturas.confirmar', $this->comoTenant(fn () => Factura::sole())->id))
            ->assertSessionHas('error');

        $this->assertSame(2.0, $producto->fresh()->stock);
    }

    public function test_la_pantalla_de_facturas_sabe_cuales_no_se_cuentan(): void
    {
        $this->sinCuenta();

        $this->actingAs($this->comercio)
            ->get(route('facturas.create'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('productos.0.lleva_existencias', false));
    }
}
