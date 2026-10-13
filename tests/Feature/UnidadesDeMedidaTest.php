<?php

namespace Tests\Feature;

use App\Models\Factura;
use App\Models\Product;
use App\Models\ProductPurchase;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use App\Support\UnidadesDeMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Vender al peso, por volumen o por medida.
 *
 * Todo se contaba en unidades enteras, así que un queso de 2,5 kg o 350 ml de
 * esencia no se podían registrar. La unidad es del producto y la arrastra
 * todo lo que lo nombre: su existencia, su precio, lo que se factura y lo
 * que entra al libro de compras.
 */
class UnidadesDeMedidaTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;

    protected function setUp(): void
    {
        parent::setUp();

        $this->comercio = User::create([
            'name' => 'Dueño',
            'business_name' => 'Charcutería',
            'username' => 'charcuteria',
            'email' => 'charcu@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($this->comercio);
    }

    private function comoTenant(callable $callback): mixed
    {
        return app(Tenancy::class)->forTenant($this->comercio->id, $callback);
    }

    /* ── La unidad del producto ─────────────────────────────────────────── */

    public function test_un_producto_se_crea_con_su_unidad_y_sus_decimales(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Queso llanero',
                'item_type' => 'producto',
                'unidad' => 'kg',
                'stock' => '12.5',
                'cost_price' => 6,
                'price_usdt' => 9,
            ])
            ->assertSessionHasNoErrors();

        $producto = $this->comoTenant(fn () => Product::sole());

        $this->assertSame('kg', $producto->unidad);
        $this->assertSame(12.5, $producto->stock);
        $this->assertSame('kg', $producto->unidad_corta);
        $this->assertTrue($producto->admite_fraccion);
        $this->assertSame('12,5 kg', $producto->existenciaLegible());
    }

    public function test_sin_decir_nada_se_vende_por_unidad(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Taza',
                'item_type' => 'producto',
                'stock' => 4,
            ])
            ->assertSessionHasNoErrors();

        $producto = $this->comoTenant(fn () => Product::sole());

        $this->assertSame('unidad', $producto->unidad);
        $this->assertTrue($producto->sePorUnidad());
        $this->assertFalse($producto->admite_fraccion);
    }

    public function test_una_unidad_inventada_se_rechaza(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Queso',
                'item_type' => 'producto',
                'unidad' => 'cuartico',
                'stock' => 1,
            ])
            ->assertSessionHasErrors('unidad');
    }

    /**
     * Medio kilo existe; media caja no. Quien escribe 2,5 cajas está
     * escribiendo mal, y el servidor no puede guardar una caja partida.
     */
    public function test_lo_que_no_se_parte_se_redondea(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Caja de cerveza',
                'item_type' => 'producto',
                'unidad' => 'caja',
                'stock' => '2.6',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(3.0, $this->comoTenant(fn () => Product::sole())->stock);
    }

    public function test_cambiar_de_unidad_al_editar_arrastra_las_existencias(): void
    {
        $producto = $this->comoTenant(fn () => Product::create([
            'name' => 'Jamón',
            'unidad' => 'kg',
            'stock' => 3.25,
            'price_usdt' => 12,
        ]));

        $this->actingAs($this->comercio)
            ->patch(route('productos.update', $producto->id), [
                'name' => 'Jamón',
                'item_type' => 'producto',
                'unidad' => 'g',
                'stock' => '850.4',
            ])
            ->assertSessionHasNoErrors();

        // Los gramos no se parten: 850,4 g no significa nada
        $this->assertSame(850.0, $producto->fresh()->stock);
        $this->assertSame('g', $producto->fresh()->unidad);
    }

    public function test_un_servicio_no_lleva_existencias_ni_unidad_util(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Corte al vacío',
                'item_type' => 'servicio',
                'unidad' => 'kg',
                'price_usdt' => 3,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(0.0, $this->comoTenant(fn () => Product::sole())->stock);
    }

    /* ── Al facturar ────────────────────────────────────────────────────── */

    private function productoAlPeso(array $atributos = []): Product
    {
        return $this->comoTenant(fn () => Product::create([
            'name' => 'Queso llanero',
            'unidad' => 'kg',
            'stock' => 10,
            'price_usdt' => 9,
            'cost_price' => 6,
            ...$atributos,
        ]));
    }

    private function facturar(Product $producto, string $cantidad): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->comercio)->post(route('facturas.store'), [
            'client_name' => 'Cliente',
            'status' => 'draft',
            'items' => [[
                'product_id' => $producto->id,
                'product_name' => $producto->name,
                'price_type' => 'detal',
                'unit_price_usd' => 9,
                'qty' => $cantidad,
            ]],
        ]);
    }

    public function test_se_factura_una_fraccion_de_lo_que_se_vende_al_peso(): void
    {
        $producto = $this->productoAlPeso();

        $this->facturar($producto, '2.35')->assertSessionHasNoErrors();

        $item = $this->comoTenant(fn () => Factura::sole()->items->sole());

        $this->assertSame(2.35, $item->qty);
        $this->assertSame(21.15, (float) $item->subtotal_usd);
    }

    public function test_una_caja_partida_no_se_factura(): void
    {
        $producto = $this->productoAlPeso(['unidad' => 'caja', 'name' => 'Cerveza']);

        $this->facturar($producto, '2.4')->assertSessionHasNoErrors();

        $this->assertSame(2.0, $this->comoTenant(fn () => Factura::sole()->items->sole())->qty);
    }

    /**
     * Lo reporto el comercio: al facturar kilos salía «la cantidad debe ser
     * al menos 1». Menos de un kilo es una venta normal.
     */
    public function test_menos_de_una_unidad_se_factura_si_la_unidad_se_parte(): void
    {
        $producto = $this->productoAlPeso();

        $this->facturar($producto, '0.35')->assertSessionHasNoErrors();

        $item = $this->comoTenant(fn () => Factura::sole()->items->sole());

        $this->assertSame(0.35, $item->qty);
        $this->assertSame(3.15, (float) $item->subtotal_usd);
    }

    /**
     * Y al contrario: 0,4 cajas se redondeaba a 0 y el renglón quedaba en
     * nada, cobrando cero por algo que sí se entregó.
     */
    public function test_una_cantidad_menor_que_una_pieza_no_queda_en_cero(): void
    {
        $producto = $this->productoAlPeso(['unidad' => 'caja', 'name' => 'Cerveza']);

        $this->facturar($producto, '0.4')->assertSessionHasNoErrors();

        $this->assertSame(1.0, $this->comoTenant(fn () => Factura::sole()->items->sole())->qty);
    }

    public function test_confirmar_descuenta_las_existencias_con_decimales(): void
    {
        $producto = $this->productoAlPeso();

        $this->facturar($producto, '2.5')->assertSessionHasNoErrors();

        $factura = $this->comoTenant(fn () => Factura::sole());

        $this->actingAs($this->comercio)
            ->post(route('facturas.confirmar', $factura->id))
            ->assertSessionHasNoErrors();

        $this->assertSame(7.5, $producto->fresh()->stock);
    }

    public function test_no_se_puede_facturar_mas_de_lo_que_hay(): void
    {
        $producto = $this->productoAlPeso(['stock' => 2]);

        $this->facturar($producto, '2.5')->assertSessionHasNoErrors();

        $factura = $this->comoTenant(fn () => Factura::sole());

        $respuesta = $this->actingAs($this->comercio)->post(route('facturas.confirmar', $factura->id));

        $respuesta->assertSessionHas('error');
        // El aviso se lee: dice los kilos, no un número suelto
        $this->assertStringContainsString('2 kg', session('error'));
        $this->assertSame(2.0, $producto->fresh()->stock);
    }

    /* ── Al comprar ─────────────────────────────────────────────────────── */

    public function test_se_compra_al_peso_y_entra_al_libro(): void
    {
        $producto = $this->productoAlPeso(['stock' => 0]);

        $this->actingAs($this->comercio)
            ->post(route('profits.compras.store'), [
                'product_id' => $producto->id,
                'qty' => '12.5',
                'unit_cost' => 6,
                'sumar_stock' => true,
            ])
            ->assertSessionHasNoErrors();

        $compra = $this->comoTenant(fn () => ProductPurchase::sole());

        $this->assertSame(12.5, $compra->qty);
        $this->assertSame(75.0, $compra->total_cost);
        $this->assertSame(12.5, $producto->fresh()->stock);
    }

    public function test_la_reposicion_tambien_cuenta_en_kilos(): void
    {
        $producto = $this->productoAlPeso(['stock' => 1.5]);

        $this->actingAs($this->comercio)
            ->post(route('productos.reponer', $producto->id), [
                'cantidad' => '3.25',
                'costo_unitario' => 7,
                'politica' => 'promedio',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(4.75, $producto->fresh()->stock);
    }

    /* ── Lo que se lee ──────────────────────────────────────────────────── */

    public function test_una_cantidad_se_escribe_como_se_lee(): void
    {
        $this->assertSame('2,5 kg', UnidadesDeMedida::formatear(2.5, 'kg'));
        // Sin ceros de relleno: 2,500 kg no dice nada que no diga 2,5 kg
        $this->assertSame('2,5 kg', UnidadesDeMedida::formatear(2.500, 'kg'));
        $this->assertSame('3 u', UnidadesDeMedida::formatear(3, 'unidad'));
        $this->assertSame('1.200 ml', UnidadesDeMedida::formatear(1200, 'ml'));
        // Una unidad que no conocemos cae en la de siempre
        $this->assertSame('5 u', UnidadesDeMedida::formatear(5, 'cuartico'));
    }

    public function test_el_catalogo_publico_dice_en_que_se_mide(): void
    {
        $producto = $this->productoAlPeso();
        $this->comoTenant(fn () => $producto->update(['is_hidden' => false]));

        $this->get(route('catalogo.publico', $this->comercio->username))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('productos.0.unidad', 'kg')
                ->where('productos.0.unidadCorta', 'kg'));
    }

    public function test_el_formulario_recibe_las_unidades_agrupadas(): void
    {
        $this->actingAs($this->comercio)
            ->get(route('productos.index'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('unidades.Por peso')
                ->has('unidades.Por volumen')
                ->where('unidades.Por peso.0.valor', 'kg'));
    }
}
