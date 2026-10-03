<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\Factura;
use App\Models\FacturaItem;
use App\Models\Product;
use App\Models\ProductAdjustment;
use App\Models\ProductPurchase;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Services\Ganancias\LibroDeCompras;
use App\Services\Ganancias\ResumenDeGanancias;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Control de ganancias.
 *
 * Es el módulo donde un número mal calculado le hace tomar una decisión
 * equivocada a un comercio, así que cada regla queda fijada aquí: qué suma
 * a la inversión, qué no, y que la pantalla muestre un solo total.
 */
class GananciasTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2027-05-15 10:00:00');

        $this->comercio = User::create([
            'name' => 'Dueña',
            'business_name' => 'Dulces Mariana',
            'username' => 'dulces-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($this->comercio);
        app(Tenancy::class)->set($this->comercio->id);
    }

    protected function tearDown(): void
    {
        app(Tenancy::class)->reset();
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function producto(array $atributos = []): Product
    {
        return Product::create(['name' => 'Torta', 'price_usdt' => 25, 'cost_price' => 10, 'stock' => 0, ...$atributos]);
    }

    /** Una venta confirmada con un renglón. */
    private function vender(Product $producto, int $cantidad, float $precio, ?Carbon $cuando = null): Factura
    {
        $cuando ??= now();
        $costo = (float) $producto->cost_price;

        $factura = Factura::create([
            'client_name' => 'Cliente',
            'status' => 'confirmed',
            'subtotal_usd' => $precio * $cantidad,
            'total_usd' => $precio * $cantidad,
            'bcv_rate' => 39,
            'profit_usd' => ($precio - $costo) * $cantidad,
            'confirmed_at' => $cuando,
        ]);

        FacturaItem::create([
            'factura_id' => $factura->id,
            'product_id' => $producto->id,
            'product_name' => $producto->name,
            'price_type' => 'detal',
            'unit_price_usd' => $precio,
            'cost_price' => $costo,
            'qty' => $cantidad,
            'subtotal_usd' => $precio * $cantidad,
            'profit_usd' => ($precio - $costo) * $cantidad,
        ]);

        return $factura;
    }

    private function resumen(array $filtros = []): array
    {
        return app(ResumenDeGanancias::class)->para($this->comercio->id, $filtros);
    }

    // ── El libro de compras ────────────────────────────────────────────────────

    public function test_crear_un_producto_con_stock_registra_su_primera_compra(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('productos.store'), [
                'name' => 'Torta de chocolate',
                'item_type' => 'producto',
                'stock' => 10,
                'cost_price' => 12,
                'price_usdt' => 25,
            ])
            ->assertSessionHasNoErrors();

        $producto = Product::sole();
        $compra = ProductPurchase::sole();

        $this->assertSame(10, $compra->qty);
        $this->assertSame(12.0, $compra->unit_cost);
        $this->assertSame(120.0, $compra->total_cost);
        $this->assertSame(ProductPurchase::ALTA, $compra->origin);
        $this->assertSame(120.0, (float) $producto->inversion_historica);
    }

    /**
     * Escribir el stock a mano sigue sumando a la inversión, pero al costo
     * del momento. Para registrar la entrada con su costo real está
     * la reposición, con sus propias pruebas en ReposicionDeStockTest.
     */
    public function test_subir_el_stock_a_mano_suma_a_la_inversion(): void
    {
        $producto = $this->producto(['stock' => 10]);
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA);

        // Llegan 20 unidades más, ahora a 11 dólares
        $this->actingAs($this->comercio)
            ->patch(route('productos.update', $producto->id), [
                'name' => $producto->name,
                'item_type' => 'producto',
                'stock' => 30,
                'cost_price' => 11,
            ])
            ->assertSessionHasNoErrors();

        $producto->refresh();

        $this->assertSame(2, ProductPurchase::count());
        $this->assertSame(320.0, (float) $producto->inversion_historica); // 10×10 + 20×11
        // El costo viejo no se reescribe: la compra anterior sigue a 10
        $this->assertSame(10.0, ProductPurchase::orderBy('id')->first()->unit_cost);
        $this->assertSame(ProductPurchase::AJUSTE, ProductPurchase::orderByDesc('id')->first()->origin);
    }

    public function test_vender_no_cambia_la_inversion(): void
    {
        $producto = $this->producto(['stock' => 10]);
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA);

        $this->vender($producto, 4, 25);
        $producto->forceFill(['stock' => 6])->save();

        app(LibroDeCompras::class)->recalcular($producto->refresh());

        $this->assertSame(100.0, (float) $producto->fresh()->inversion_historica);
        $this->assertSame(1, ProductPurchase::count());
    }

    public function test_bajar_el_stock_a_mano_queda_como_correccion(): void
    {
        $producto = $this->producto(['stock' => 10]);
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA);

        app(LibroDeCompras::class)->ajustarPorStock($producto, 10, 7);

        $correccion = ProductPurchase::where('origin', ProductPurchase::CORRECCION)->sole();

        $this->assertSame(-3, $correccion->qty);
        $this->assertSame(70.0, (float) $producto->fresh()->inversion_historica);
    }

    public function test_el_comercio_registra_una_compra_desde_la_pantalla(): void
    {
        $producto = $this->producto(['stock' => 2]);

        $this->actingAs($this->comercio)
            ->post(route('profits.compras.store'), [
                'product_id' => $producto->id,
                'qty' => 15,
                'unit_cost' => 9.5,
                'purchased_at' => '2027-05-10',
                'note' => 'Proveedor Delgado',
                'sumar_stock' => true,
            ])
            ->assertSessionHasNoErrors();

        $producto->refresh();

        $this->assertSame(142.5, (float) $producto->inversion_historica);
        $this->assertSame(17, $producto->stock);
        $this->assertSame('2027-05-10', ProductPurchase::sole()->purchased_at->toDateString());
    }

    public function test_no_se_puede_registrar_una_compra_de_otro_comercio(): void
    {
        $ajeno = User::create([
            'name' => 'Otro', 'business_name' => 'Otro', 'username' => 'otro-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test', 'password' => 'Clave.Segura9',
            'email_verified_at' => now(), 'role' => User::ROLE_TENANT, 'status' => User::STATUS_APPROVED,
        ]);

        $suyo = app(Tenancy::class)->forTenant($ajeno->id, fn () => Product::create(['name' => 'Ajeno', 'stock' => 5, 'cost_price' => 3]));

        $this->actingAs($this->comercio)
            ->post(route('profits.compras.store'), ['product_id' => $suyo->id, 'qty' => 1, 'unit_cost' => 5])
            ->assertSessionHasErrors('product_id');
    }

    // ── Los números de la pantalla ─────────────────────────────────────────────

    public function test_la_inversion_sale_del_libro_y_no_de_una_columna_suelta(): void
    {
        $producto = $this->producto(['stock' => 10]);
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA);
        app(LibroDeCompras::class)->registrar($producto, 5, 12, ProductPurchase::REPOSICION);

        $fila = collect($this->resumen()['productos'])->firstWhere('id', $producto->id);

        $this->assertSame(160.0, $fila['inversion_historica']);  // 100 + 60
        $this->assertSame(15, $fila['unidades_compradas']);
    }

    public function test_el_total_de_arriba_incluye_la_ganancia_de_los_combos(): void
    {
        $producto = $this->producto(['stock' => 10]);
        $this->vender($producto, 2, 25);   // ganancia 30

        $combo = Combo::create(['name' => 'Combo', 'price_usdt' => 40, 'cost_price' => 22, 'stock' => 5]);

        $factura = Factura::create([
            'client_name' => 'Cliente combo', 'status' => 'confirmed',
            'subtotal_usd' => 40, 'total_usd' => 40, 'bcv_rate' => 39,
            'profit_usd' => 18, 'confirmed_at' => now(),
        ]);

        FacturaItem::create([
            'factura_id' => $factura->id, 'combo_id' => $combo->id, 'product_name' => 'Combo',
            'price_type' => 'detal', 'unit_price_usd' => 40, 'cost_price' => 22, 'qty' => 1,
            'subtotal_usd' => 40, 'profit_usd' => 18,
        ]);

        $resumen = $this->resumen();

        // 30 del producto + 18 del combo: antes el combo se perdía
        $this->assertSame(48.0, $resumen['periodo']['ganancia_bruta']);
        $this->assertSame(18.0, $resumen['periodo']['ganancia_combos']);
        $this->assertSame(48.0, $resumen['periodo']['neto']);
    }

    public function test_el_envio_no_se_cuenta_como_ganancia(): void
    {
        $producto = $this->producto(['stock' => 5]);
        $factura = $this->vender($producto, 1, 25);
        $factura->update(['shipping_usd' => 5, 'total_usd' => 30]);

        $resumen = $this->resumen();

        $this->assertSame(15.0, $resumen['periodo']['ganancia_bruta']);
        $this->assertSame(5.0, $resumen['periodo']['envios']);
        // El margen se mide sobre la mercancía, no sobre el total con envío
        $this->assertSame(60.0, $resumen['sales']->items()[0]['margin']);
    }

    public function test_las_perdidas_y_los_ingresos_extra_mueven_el_neto(): void
    {
        $producto = $this->producto(['stock' => 10]);
        $this->vender($producto, 2, 25);   // +30

        ProductAdjustment::create([
            'user_id' => $this->comercio->id, 'product_id' => $producto->id, 'type' => 'loss',
            'qty' => 1, 'amount_usd' => 10, 'reason' => 'Se dañó', 'adjusts_stock' => true,
        ]);

        ProductAdjustment::create([
            'user_id' => $this->comercio->id, 'type' => 'gain',
            'qty' => 1, 'amount_usd' => 4, 'reason' => 'Propina',
        ]);

        $resumen = $this->resumen();

        $this->assertSame(30.0, $resumen['periodo']['ganancia_bruta']);
        $this->assertSame(10.0, $resumen['periodo']['perdidas']);
        $this->assertSame(4.0, $resumen['periodo']['ganancias_adicionales']);
        $this->assertSame(24.0, $resumen['periodo']['neto']);
    }

    public function test_filtrar_por_mes_usa_el_ano_en_curso(): void
    {
        $producto = $this->producto(['stock' => 20]);

        $this->vender($producto, 1, 25, Carbon::parse('2026-03-10 12:00'));  // año pasado
        $this->vender($producto, 2, 25, Carbon::parse('2027-03-10 12:00'));  // este año

        $resumen = $this->resumen(['month' => 3]);

        // Antes, marzo sin año traía todos los marzos de la historia
        $this->assertSame(30.0, $resumen['periodo']['ganancia_bruta']);
        $this->assertSame(2027, $resumen['periodo']['ano']);
    }

    public function test_el_periodo_pasado_muestra_el_stock_que_habia_entonces(): void
    {
        // El producto existe desde enero: la pantalla no muestra en un mes
        // productos que todavía no existían.
        $producto = $this->producto(['stock' => 0]);
        $producto->forceFill(['created_at' => Carbon::parse('2027-01-02')])->save();

        // En enero entraron 10 y se vendieron 2
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA, null, Carbon::parse('2027-01-05'));
        $this->vender($producto, 2, 25, Carbon::parse('2027-01-20 12:00'));

        // En mayo entraron 30 más
        app(LibroDeCompras::class)->registrar($producto, 30, 10, ProductPurchase::REPOSICION, null, Carbon::parse('2027-05-02'));
        $producto->forceFill(['stock' => 38])->save();

        $enero = collect($this->resumen(['month' => 1, 'year' => 2027])['productos'])->firstWhere('id', $producto->id);

        // 38 de hoy − 30 que entraron después = 8 al cierre de enero
        $this->assertSame(8, $enero['stock']);
        $this->assertSame(100.0, $enero['inversion_historica']);
    }

    public function test_la_pantalla_entrega_un_solo_juego_de_numeros(): void
    {
        $producto = $this->producto(['stock' => 10]);
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA);
        $this->vender($producto, 3, 25);

        $this->actingAs($this->comercio)
            ->get(route('profits.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Profits/Index')
                ->where('periodo.ganancia_bruta', 45)
                ->where('inversion.historica', 100)
                ->where('inversion.recaudado', 75)
                ->where('inversion.restante_por_recaudar', 25)
                ->has('sales.data', 1)
                ->has('productos', 1));
    }

    public function test_la_pantalla_no_consulta_una_vez_por_producto(): void
    {
        foreach (range(1, 25) as $numero) {
            $producto = $this->producto(['name' => "Producto {$numero}", 'stock' => 5]);
            app(LibroDeCompras::class)->registrar($producto, 5, 4, ProductPurchase::ALTA);
            $this->vender($producto, 1, 10);
        }

        DB::enableQueryLog();
        $this->actingAs($this->comercio)->get(route('profits.index'))->assertOk();
        $consultas = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Antes eran unas cuatro consultas por producto; ahora el costo no
        // depende de cuántos productos tenga el comercio.
        $this->assertLessThan(30, $consultas, "La pantalla hizo {$consultas} consultas");
    }

    public function test_el_libro_de_un_producto_se_puede_revisar(): void
    {
        $producto = $this->producto(['stock' => 10]);
        app(LibroDeCompras::class)->registrar($producto, 10, 10, ProductPurchase::ALTA, 'Primera carga');

        $this->actingAs($this->comercio)
            ->get(route('profits.compras', $producto->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Profits/Compras')
                ->where('producto.inversion', 100)
                ->has('compras', 1)
                ->where('compras.0.nota', 'Primera carga'));
    }
}
