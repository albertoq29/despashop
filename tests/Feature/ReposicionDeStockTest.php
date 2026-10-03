<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductPurchase;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Services\Ganancias\LibroDeCompras;
use App\Services\Ganancias\Reposicion;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Reposición de inventario.
 *
 * Reponer escribiendo un stock más grande valoraba la mercancía nueva al
 * costo de hoy: si subió de precio, la inversión quedaba mal y la ganancia
 * de las ventas siguientes también. Registrar la reposición guarda el costo
 * de esa entrada, y aquí quedan fijadas las reglas de qué pasa con el costo
 * del producto en cada caso.
 */
class ReposicionDeStockTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2027-05-15 10:00:00');

        $this->comercio = $this->comercio();

        app(CatalogProvisioner::class)->provision($this->comercio);
        app(Tenancy::class)->set($this->comercio->id);
    }

    protected function tearDown(): void
    {
        app(Tenancy::class)->reset();
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function comercio(string $negocio = 'Dulces Mariana'): User
    {
        return User::create([
            'name' => 'Dueña',
            'business_name' => $negocio,
            'username' => 'comercio-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);
    }

    private function producto(array $atributos = []): Product
    {
        $producto = Product::create(['name' => 'Torta', 'price_usdt' => 25, 'cost_price' => 10, 'stock' => 10, ...$atributos]);

        if ((int) $producto->stock > 0 && (float) $producto->cost_price > 0) {
            app(LibroDeCompras::class)->registrar(
                $producto,
                (int) $producto->stock,
                (float) $producto->cost_price,
                ProductPurchase::ALTA,
            );
        }

        return $producto->refresh();
    }

    /** @param array<string, mixed> $campos */
    private function reponer(Product $producto, array $campos = [])
    {
        return $this->actingAs($this->comercio)->post(route('productos.reponer', $producto->id), [
            'cantidad' => 20,
            'costo_unitario' => 11,
            'politica' => Reposicion::PROMEDIO,
            ...$campos,
        ]);
    }

    // ── Lo que anota el libro ─────────────────────────────────────────────────

    public function test_registrar_una_reposicion_anota_la_compra_y_sube_el_stock(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        $this->reponer($producto, ['nota' => 'Proveedor Ramírez'])->assertSessionHasNoErrors();

        $compra = ProductPurchase::where('origin', ProductPurchase::REPOSICION)->sole();

        $this->assertSame(20, $compra->qty);
        $this->assertSame(11.0, $compra->unit_cost);
        $this->assertSame(220.0, $compra->total_cost);
        $this->assertSame('Proveedor Ramírez', $compra->note);

        // 10×10 de la carga inicial + 20×11 de esta entrada
        $this->assertSame(320.0, (float) $producto->fresh()->inversion_historica);
        $this->assertSame(30, (int) $producto->fresh()->stock);
    }

    public function test_el_costo_viejo_no_se_reescribe_al_reponer_mas_caro(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        $this->reponer($producto, ['cantidad' => 10, 'costo_unitario' => 20]);

        $entradas = ProductPurchase::orderBy('id')->pluck('unit_cost')->all();

        // Cada lote conserva lo que costó: 10 y 20, no dos veces 20
        $this->assertSame([10.0, 20.0], array_map('floatval', $entradas));
        $this->assertSame(300.0, (float) $producto->fresh()->inversion_historica);
    }

    public function test_la_reposicion_guarda_la_fecha_de_la_compra(): void
    {
        $producto = $this->producto();

        $this->reponer($producto, ['fecha' => '2027-05-02'])->assertSessionHasNoErrors();

        $compra = ProductPurchase::where('origin', ProductPurchase::REPOSICION)->sole();

        $this->assertSame('2027-05-02', $compra->purchased_at->toDateString());
    }

    public function test_la_reposicion_aparece_en_el_libro_de_compras_del_producto(): void
    {
        $producto = $this->producto();

        $this->reponer($producto);

        $this->actingAs($this->comercio)
            ->get(route('profits.compras', $producto->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('compras.0.cantidad', 20)
                ->where('compras.0.costo_unitario', 11)
                ->where('compras.0.origen', 'Reposición registrada'));
    }

    // ── Qué pasa con el costo unitario ────────────────────────────────────────

    public function test_el_costo_queda_en_el_promedio_ponderado(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        // (10×10 + 20×11) / 30 = 10,67
        $this->reponer($producto, ['cantidad' => 20, 'costo_unitario' => 11]);

        $this->assertSame(10.67, (float) $producto->fresh()->cost_price);
    }

    public function test_se_puede_pedir_el_costo_nuevo_sin_promediar(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        $this->reponer($producto, ['costo_unitario' => 11, 'politica' => Reposicion::NUEVO]);

        $this->assertSame(11.0, (float) $producto->fresh()->cost_price);
    }

    public function test_se_puede_dejar_el_costo_intacto(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        $this->reponer($producto, ['costo_unitario' => 11, 'politica' => Reposicion::MANTENER]);

        $this->assertSame(10.0, (float) $producto->fresh()->cost_price);
        // Pero la inversión sí subió: la compra se hizo
        $this->assertSame(320.0, (float) $producto->fresh()->inversion_historica);
    }

    public function test_sin_stock_previo_el_promedio_es_el_costo_nuevo(): void
    {
        $producto = $this->producto(['stock' => 0, 'cost_price' => 10]);

        $this->reponer($producto, ['cantidad' => 5, 'costo_unitario' => 18]);

        $this->assertSame(18.0, (float) $producto->fresh()->cost_price);
    }

    public function test_sin_costo_anterior_el_promedio_es_el_costo_nuevo(): void
    {
        $producto = $this->producto(['stock' => 7, 'cost_price' => 0]);

        $this->reponer($producto, ['cantidad' => 3, 'costo_unitario' => 9]);

        $this->assertSame(9.0, (float) $producto->fresh()->cost_price);
    }

    public function test_las_ventas_ya_emitidas_conservan_el_costo_que_tenian(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        $this->reponer($producto, ['cantidad' => 10, 'costo_unitario' => 20]);

        // La primera entrada sigue valiendo 10: reponer no reescribe el pasado
        $this->assertSame(10.0, (float) ProductPurchase::orderBy('id')->first()->unit_cost);
        $this->assertSame(15.0, (float) $producto->fresh()->cost_price);
    }

    // ── Variantes ─────────────────────────────────────────────────────────────

    public function test_con_variantes_las_unidades_entran_a_la_variante_elegida(): void
    {
        $producto = $this->producto(['stock' => 8, 'cost_price' => 10]);

        $roja = ProductVariant::create(['product_id' => $producto->id, 'label' => 'Roja', 'type' => 'color', 'stock' => 5]);
        $azul = ProductVariant::create(['product_id' => $producto->id, 'label' => 'Azul', 'type' => 'color', 'stock' => 3]);

        $this->reponer($producto, ['cantidad' => 6, 'costo_unitario' => 12, 'variant_id' => $azul->id])
            ->assertSessionHasNoErrors();

        $this->assertSame(5, (int) $roja->fresh()->stock);
        $this->assertSame(9, (int) $azul->fresh()->stock);
        // El stock del producto es la suma de sus variantes
        $this->assertSame(14, (int) $producto->fresh()->stock);
    }

    public function test_con_variantes_hay_que_decir_a_cual_entraron(): void
    {
        $producto = $this->producto();
        ProductVariant::create(['product_id' => $producto->id, 'label' => 'Roja', 'type' => 'color', 'stock' => 10]);

        $this->reponer($producto)->assertSessionHasErrors('variant_id');

        $this->assertSame(0, ProductPurchase::where('origin', ProductPurchase::REPOSICION)->count());
    }

    public function test_no_se_puede_mandar_la_variante_de_otro_producto(): void
    {
        $producto = $this->producto();
        $otro = $this->producto(['name' => 'Galleta']);
        $ajena = ProductVariant::create(['product_id' => $otro->id, 'label' => 'Grande', 'type' => 'talla', 'stock' => 4]);

        $this->reponer($producto, ['variant_id' => $ajena->id])->assertSessionHasErrors('variant_id');
    }

    // ── Lo que no se permite ──────────────────────────────────────────────────

    public function test_no_se_puede_reponer_con_fecha_futura(): void
    {
        $producto = $this->producto();

        $this->reponer($producto, ['fecha' => '2027-06-01'])->assertSessionHasErrors('fecha');

        $this->assertSame(0, ProductPurchase::where('origin', ProductPurchase::REPOSICION)->count());
    }

    public function test_la_reposicion_exige_cantidad_y_costo(): void
    {
        $producto = $this->producto();

        $this->reponer($producto, ['cantidad' => 0, 'costo_unitario' => 0])
            ->assertSessionHasErrors(['cantidad', 'costo_unitario']);
    }

    public function test_un_servicio_no_se_repone(): void
    {
        $servicio = Product::create([
            'name' => 'Decoración de torta',
            'item_type' => Product::SERVICIO,
            'price_usdt' => 30,
            'cost_price' => 5,
            'stock' => 0,
        ]);

        $this->reponer($servicio)->assertSessionHasErrors('cantidad');

        $this->assertSame(0, ProductPurchase::count());
    }

    public function test_no_se_puede_reponer_el_producto_de_otro_comercio(): void
    {
        $vecino = $this->comercio('Boutique Alma');
        app(CatalogProvisioner::class)->provision($vecino);

        app(Tenancy::class)->set($vecino->id);
        $ajeno = Product::create(['name' => 'Bolso', 'price_usdt' => 40, 'cost_price' => 20, 'stock' => 5]);
        app(Tenancy::class)->set($this->comercio->id);

        // El ámbito global del comercio lo esconde: para este comercio no existe
        $this->reponer($ajeno)->assertNotFound();

        $this->assertSame(0, ProductPurchase::withoutGlobalScope('tenant')->count());
    }

    // ── El camino viejo sigue disponible, pero se llama por su nombre ─────────

    public function test_subir_el_stock_a_mano_queda_como_ajuste_no_como_reposicion(): void
    {
        $producto = $this->producto(['stock' => 10, 'cost_price' => 10]);

        $this->actingAs($this->comercio)
            ->patch(route('productos.update', $producto->id), [
                'name' => $producto->name,
                'item_type' => 'producto',
                'stock' => 13,
                'cost_price' => 10,
            ])
            ->assertSessionHasNoErrors();

        $ajuste = ProductPurchase::where('origin', ProductPurchase::AJUSTE)->sole();

        $this->assertSame(3, $ajuste->qty);
        $this->assertSame(10.0, $ajuste->unit_cost);
        $this->assertSame(0, ProductPurchase::where('origin', ProductPurchase::REPOSICION)->count());
    }

    public function test_el_promedio_ponderado_se_calcula_igual_en_el_servicio(): void
    {
        $servicio = app(Reposicion::class);

        // 8 a 10 + 12 a 15 → (80 + 180) / 20 = 13
        $this->assertSame(13.0, $servicio->costoResultante(Reposicion::PROMEDIO, 8, 10, 12, 15));
        $this->assertSame(15.0, $servicio->costoResultante(Reposicion::NUEVO, 8, 10, 12, 15));
        $this->assertNull($servicio->costoResultante(Reposicion::MANTENER, 8, 10, 12, 15));
        $this->assertSame(15.0, $servicio->costoResultante(Reposicion::PROMEDIO, 0, 10, 12, 15));
    }
}
