<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Factura;
use App\Models\FacturaItem;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Precio especial en divisas y servicios por suscripción.
 *
 * El precio en divisas no es el de dólares convertido al BCV: es otro
 * precio, más bajo, para quien paga en efectivo, y hay uno por nivel. Las
 * suscripciones no se vuelven a facturar solas: lo único que se adelanta
 * es la fecha que al comercio le toca mirar.
 */
class DivisasYSuscripcionesTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(): User
    {
        $usuario = User::create([
            'name' => 'Dueña',
            'business_name' => 'TecnoExpress',
            'username' => 'tecno-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    private function comoTenant(User $comercio, callable $trabajo): mixed
    {
        return app(Tenancy::class)->forTenant($comercio->id, $trabajo);
    }

    private function tema(User $usuario): CatalogTheme
    {
        return CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $usuario->id)->firstOrFail();
    }

    /* ── El precio por nivel y en divisas ───────────────────────────────── */

    public function test_cada_nivel_tiene_su_precio_en_divisas(): void
    {
        $producto = new Product([
            'price_usdt' => 10,
            'price_mayor_usdt' => 9,
            'price_distribuidor_usdt' => 8,
            'price_divisa_usdt' => 8,
            'price_mayor_divisa_usdt' => 7.5,
            'price_distribuidor_divisa_usdt' => 6.5,
        ]);

        $this->assertSame(10.0, $producto->precioDe('detal'));
        $this->assertSame(8.0, $producto->precioDe('detal', enDivisas: true));
        $this->assertSame(9.0, $producto->precioDe('mayor'));
        $this->assertSame(7.5, $producto->precioDe('mayor', enDivisas: true));
        $this->assertSame(8.0, $producto->precioDe('distribuidor'));
        $this->assertSame(6.5, $producto->precioDe('distribuidor', enDivisas: true));
    }

    /** La promo es por nivel: el que no la tenga se cobra normal. */
    public function test_un_nivel_sin_promo_se_cobra_normal(): void
    {
        $producto = new Product([
            'price_usdt' => 10,
            'price_mayor_usdt' => 9,
            'price_divisa_usdt' => 8,
        ]);

        $this->assertSame(8.0, $producto->precioDe('detal', enDivisas: true));
        // Al mayor no hay promo: pagar en efectivo no lo baja
        $this->assertSame(9.0, $producto->precioDe('mayor', enDivisas: true));
        $this->assertFalse($producto->tienePromoEnDivisas('mayor'));
        $this->assertTrue($producto->tienePromoEnDivisas('detal'));
    }

    public function test_el_comercio_guarda_sus_precios_en_divisas(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('productos.store'), [
                'name' => 'Audífonos',
                'price_usdt' => 20,
                'price_mayor_usdt' => 18,
                'price_divisa_usdt' => 16,
                'price_mayor_divisa_usdt' => 15,
                'stock' => 5,
            ])
            ->assertSessionHasNoErrors();

        $producto = Product::withoutGlobalScope('tenant')->sole();

        $this->assertSame(16.0, (float) $producto->price_divisa_usdt);
        $this->assertSame(15.0, (float) $producto->price_mayor_divisa_usdt);
        // El de distribuidor no se mandó: queda nulo y no en cero
        $this->assertNull($producto->price_distribuidor_divisa_usdt);
    }

    public function test_el_catalogo_anuncia_la_promo_en_divisas(): void
    {
        $comercio = $this->comercio();
        $this->comoTenant($comercio, fn () => Product::create([
            'name' => 'Audífonos',
            'price_usdt' => 20,
            'price_divisa_usdt' => 16,
            'stock' => 5,
        ]));

        $this->tema($comercio)->forceFill(['is_published' => true])->save();

        $this->get('/' . $comercio->username)
            ->assertOk()
            ->assertInertia(function (AssertableInertia $pagina) {
                $producto = $pagina->toArray()['props']['productos'][0];

                $this->assertEqualsWithDelta(16, (float) $producto['price_divisa_usdt'], 0.001);
            });
    }

    /* ── La factura ─────────────────────────────────────────────────────── */

    public function test_la_factura_recuerda_que_se_pago_en_divisas(): void
    {
        $comercio = $this->comercio();
        $producto = $this->comoTenant($comercio, fn () => Product::create([
            'name' => 'Audífonos',
            'price_usdt' => 20,
            'price_divisa_usdt' => 16,
            'stock' => 5,
        ]));

        $this->actingAs($comercio)
            ->post(route('facturas.store'), [
                'status' => 'draft',
                'en_divisas' => true,
                'items' => [[
                    'product_id' => $producto->id,
                    'product_name' => 'Audífonos',
                    'price_type' => 'detal',
                    'unit_price_usd' => 16,
                    'qty' => 1,
                ]],
            ])
            ->assertSessionHasNoErrors();

        $factura = Factura::withoutGlobalScope('tenant')->sole();

        $this->assertTrue((bool) $factura->en_divisas);
        $this->assertSame(16.0, $factura->total_usd);
    }

    /* ── Suscripciones ──────────────────────────────────────────────────── */

    public function test_una_suscripcion_necesita_periodo_para_renovarse(): void
    {
        $this->assertFalse((new Product(['es_suscripcion' => true]))->esSuscripcion());
        $this->assertFalse((new Product(['periodo_suscripcion' => 'mensual']))->esSuscripcion());
        $this->assertTrue(
            (new Product(['es_suscripcion' => true, 'periodo_suscripcion' => 'mensual']))->esSuscripcion(),
        );
    }

    public function test_apagar_la_suscripcion_borra_el_periodo(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)->post(route('productos.store'), [
            'name' => 'Hosting',
            'item_type' => 'servicio',
            'price_usdt' => 10,
            'es_suscripcion' => '1',
            'periodo_suscripcion' => 'trimestral',
        ])->assertSessionHasNoErrors();

        $producto = Product::withoutGlobalScope('tenant')->sole();
        $this->assertSame('trimestral', $producto->periodo_suscripcion);

        $this->actingAs($comercio)->patch(route('productos.update', $producto), [
            'name' => 'Hosting',
            'item_type' => 'servicio',
            'price_usdt' => 10,
            'es_suscripcion' => '0',
        ])->assertSessionHasNoErrors();

        $this->assertNull($producto->fresh()->periodo_suscripcion);
    }

    /** Una fecha en un renglón que no es suscripción ensucia el listado. */
    public function test_solo_se_guarda_la_fecha_si_el_producto_la_tiene(): void
    {
        $comercio = $this->comercio();

        [$suscripcion, $suelto] = $this->comoTenant($comercio, fn () => [
            Product::create([
                'name' => 'Hosting',
                'item_type' => Product::SERVICIO,
                'price_usdt' => 10,
                'es_suscripcion' => true,
                'periodo_suscripcion' => 'mensual',
            ]),
            Product::create(['name' => 'Cable', 'price_usdt' => 5, 'stock' => 9]),
        ]);

        $this->actingAs($comercio)->post(route('facturas.store'), [
            'status' => 'draft',
            'items' => [
                [
                    'product_id' => $suscripcion->id,
                    'product_name' => 'Hosting',
                    'price_type' => 'detal',
                    'unit_price_usd' => 10,
                    'qty' => 1,
                    'renueva_el' => '2026-12-01',
                ],
                [
                    'product_id' => $suelto->id,
                    'product_name' => 'Cable',
                    'price_type' => 'detal',
                    'unit_price_usd' => 5,
                    'qty' => 1,
                    'renueva_el' => '2026-12-01',
                ],
            ],
        ])->assertSessionHasNoErrors();

        $renglones = FacturaItem::orderBy('id')->get();

        $this->assertSame('2026-12-01', $renglones[0]->renueva_el->toDateString());
        $this->assertNull($renglones[1]->renueva_el, 'Un cable no se renueva');
    }

    /* ── El listado de renovaciones ─────────────────────────────────────── */

    /** @return array{0: User, 1: FacturaItem} */
    private function conRenovacion(string $renuevaEl, string $periodo = 'mensual'): array
    {
        $comercio = $this->comercio();

        $renglon = $this->comoTenant($comercio, function () use ($renuevaEl, $periodo) {
            $producto = Product::create([
                'name' => 'Hosting',
                'item_type' => Product::SERVICIO,
                'price_usdt' => 10,
                'es_suscripcion' => true,
                'periodo_suscripcion' => $periodo,
            ]);

            $factura = Factura::create([
                'client_name' => 'Luis',
                'client_phone' => '04141112233',
                'status' => 'confirmed',
                'subtotal_usd' => 10,
                'total_usd' => 10,
                'bcv_rate' => 39,
            ]);

            return FacturaItem::create([
                'factura_id' => $factura->id,
                'product_id' => $producto->id,
                'product_name' => 'Hosting',
                'price_type' => 'detal',
                'unit_price_usd' => 10,
                'qty' => 1,
                'subtotal_usd' => 10,
                'renueva_el' => $renuevaEl,
            ]);
        });

        return [$comercio, $renglon];
    }

    public function test_el_listado_muestra_a_quien_le_toca(): void
    {
        [$comercio] = $this->conRenovacion(now()->addDays(3)->toDateString());

        $this->actingAs($comercio)
            ->get(route('renovaciones.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('renovaciones', 1)
                ->where('renovaciones.0.cliente', 'Luis')
                ->where('renovaciones.0.servicio', 'Hosting')
                ->where('renovaciones.0.dias', 3)
                ->where('renovaciones.0.renovable', true));
    }

    /** Un borrador no es un compromiso de nadie. */
    public function test_un_borrador_no_entra_al_listado(): void
    {
        [$comercio, $renglon] = $this->conRenovacion(now()->addDays(3)->toDateString());

        $renglon->factura->update(['status' => 'draft']);

        $this->actingAs($comercio)
            ->get(route('renovaciones.index'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->has('renovaciones', 0));
    }

    public function test_renovar_adelanta_la_fecha_un_periodo(): void
    {
        [$comercio, $renglon] = $this->conRenovacion('2026-11-15');

        $this->actingAs($comercio)
            ->patch(route('renovaciones.renovar', $renglon))
            ->assertRedirect();

        $renglon->refresh();

        $this->assertSame('2026-12-15', $renglon->renueva_el->toDateString());
        $this->assertSame(1, $renglon->renovaciones);
        $this->assertNotNull($renglon->renovado_el);
    }

    /**
     * Se cuenta desde la fecha que tocaba y no desde hoy: a quien paga con
     * retraso no se le regalan los días que tardó.
     */
    public function test_renovar_tarde_no_regala_dias(): void
    {
        [$comercio, $renglon] = $this->conRenovacion('2026-09-10');

        $this->actingAs($comercio)->patch(route('renovaciones.renovar', $renglon));

        $this->assertSame('2026-10-10', $renglon->fresh()->renueva_el->toDateString());
    }

    public function test_un_periodo_anual_salta_doce_meses(): void
    {
        [$comercio, $renglon] = $this->conRenovacion('2026-11-15', 'anual');

        $this->actingAs($comercio)->patch(route('renovaciones.renovar', $renglon));

        $this->assertSame('2027-11-15', $renglon->fresh()->renueva_el->toDateString());
    }

    public function test_si_le_quitan_la_suscripcion_no_se_puede_renovar(): void
    {
        [$comercio, $renglon] = $this->conRenovacion(now()->addDay()->toDateString());

        $renglon->product->update(['es_suscripcion' => false, 'periodo_suscripcion' => null]);

        $this->actingAs($comercio)
            ->patch(route('renovaciones.renovar', $renglon))
            ->assertSessionHas('error');

        $this->assertSame(0, $renglon->fresh()->renovaciones);
    }

    public function test_dejar_de_seguirla_no_toca_la_factura(): void
    {
        [$comercio, $renglon] = $this->conRenovacion(now()->addDay()->toDateString());

        $this->actingAs($comercio)
            ->delete(route('renovaciones.destroy', $renglon))
            ->assertRedirect();

        $renglon->refresh();

        $this->assertNull($renglon->renueva_el);
        $this->assertSame(10.0, $renglon->unit_price_usd);
        $this->assertSame('confirmed', $renglon->factura->status);
    }

    public function test_nadie_renueva_la_suscripcion_de_otro_comercio(): void
    {
        [, $renglon] = $this->conRenovacion(now()->addDay()->toDateString());
        $ajeno = $this->comercio();

        $this->actingAs($ajeno)
            ->patch(route('renovaciones.renovar', $renglon))
            ->assertForbidden();

        $this->assertSame(0, $renglon->fresh()->renovaciones);
    }

    public function test_un_comercio_no_ve_las_renovaciones_de_otro(): void
    {
        $this->conRenovacion(now()->addDay()->toDateString());
        $ajeno = $this->comercio();

        $this->actingAs($ajeno)
            ->get(route('renovaciones.index'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->has('renovaciones', 0));
    }
}
