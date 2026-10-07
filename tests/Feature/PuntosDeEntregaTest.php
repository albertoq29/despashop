<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\Factura;
use App\Models\Product;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * De dónde sale y a dónde va una entrega.
 *
 * Son opcionales dentro de algo que ya es opcional: hay entregas que se
 * acuerdan por teléfono y no necesitan quedar escritas, así que agendar
 * sin puntos tiene que seguir funcionando igual que antes.
 */
class PuntosDeEntregaTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;
    private Product $producto;

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
        ]);

        $this->producto = app(Tenancy::class)->forTenant($this->comercio->id, fn () => Product::create([
            'user_id' => $this->comercio->id,
            'name' => 'Torta de chocolate',
            'price_usdt' => 25,
            'stock' => 10,
        ]));
    }

    /** @return array<string, mixed> */
    private function factura(array $extra = []): array
    {
        return [
            'client_name' => 'Carolina',
            'status' => 'draft',
            'items' => [[
                'product_id' => $this->producto->id,
                'product_name' => 'Torta de chocolate',
                'price_type' => 'detal',
                'unit_price_usd' => 25,
                'qty' => 1,
            ]],
            ...$extra,
        ];
    }

    private function conEntrega(array $extra = []): array
    {
        return $this->factura([
            'has_delivery' => true,
            'delivery_date' => now()->addDay()->format('Y-m-d H:i:s'),
            'delivery_type' => Delivery::DELIVERY,
            ...$extra,
        ]);
    }

    private function conEntregaPersonal(array $extra = []): array
    {
        return $this->conEntrega(['delivery_type' => Delivery::PERSONAL, ...$extra]);
    }

    // ── Con puntos ────────────────────────────────────────────────────────────

    public function test_se_guardan_los_dos_puntos(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntrega([
                'delivery_point_a' => 'Mi negocio',
                'delivery_point_b' => 'Av. Bolívar, frente a la panadería',
            ]))
            ->assertSessionHasNoErrors();

        $entrega = Delivery::firstOrFail();

        $this->assertSame('Mi negocio', $entrega->point_a);
        $this->assertSame('Av. Bolívar, frente a la panadería', $entrega->point_b);
        $this->assertTrue($entrega->tienePuntos());
    }

    public function test_el_punto_a_se_puede_cambiar(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntrega([
                'delivery_point_a' => 'Depósito de La Candelaria',
                'delivery_point_b' => 'Casa del cliente',
            ]));

        $this->assertSame('Depósito de La Candelaria', Delivery::firstOrFail()->point_a);
    }

    public function test_vale_con_un_solo_punto(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntrega(['delivery_point_b' => 'Casa del cliente']))
            ->assertSessionHasNoErrors();

        $entrega = Delivery::firstOrFail();

        $this->assertNull($entrega->point_a);
        $this->assertSame('Casa del cliente', $entrega->point_b);
        $this->assertTrue($entrega->tienePuntos());
    }

    // ── Sin puntos ────────────────────────────────────────────────────────────

    public function test_agendar_sin_puntos_sigue_funcionando(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntrega())
            ->assertSessionHasNoErrors();

        $entrega = Delivery::firstOrFail();

        $this->assertNull($entrega->point_a);
        $this->assertNull($entrega->point_b);
        $this->assertFalse($entrega->tienePuntos());
    }

    public function test_sin_entrega_no_se_guarda_nada_de_puntos(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->factura([
                'delivery_point_a' => 'Mi negocio',
                'delivery_point_b' => 'Casa del cliente',
            ]));

        $this->assertSame(0, Delivery::count());
    }

    // ── Al editar ─────────────────────────────────────────────────────────────

    public function test_editar_cambia_los_puntos(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntrega([
            'delivery_point_a' => 'Mi negocio',
            'delivery_point_b' => 'Primera dirección',
        ]));

        $factura = Factura::firstOrFail();

        $this->actingAs($this->comercio)
            ->put(route('facturas.update', $factura), $this->conEntrega([
                'delivery_point_a' => 'Mi negocio',
                'delivery_point_b' => 'Se mudó: Av. Urdaneta',
            ]))
            ->assertSessionHasNoErrors();

        $this->assertSame('Se mudó: Av. Urdaneta', Delivery::firstOrFail()->point_b);
    }

    public function test_editar_puede_borrar_los_puntos(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntrega([
            'delivery_point_a' => 'Mi negocio',
            'delivery_point_b' => 'Casa del cliente',
        ]));

        $factura = Factura::firstOrFail();

        $this->actingAs($this->comercio)->put(route('facturas.update', $factura), $this->conEntrega());

        $entrega = Delivery::firstOrFail();

        $this->assertNull($entrega->point_a);
        $this->assertNull($entrega->point_b);
    }

    // ── Dónde se ven ──────────────────────────────────────────────────────────

    public function test_la_factura_muestra_el_recorrido(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntrega([
            'delivery_point_a' => 'Mi negocio',
            'delivery_point_b' => 'Casa del cliente',
        ]));

        $this->actingAs($this->comercio)
            ->get(route('facturas.show', Factura::firstOrFail()))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('factura.delivery.point_a', 'Mi negocio')
                ->where('factura.delivery.point_b', 'Casa del cliente'));
    }

    public function test_la_lista_de_entregas_lleva_el_recorrido(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntrega([
            'delivery_point_a' => 'Mi negocio',
            'delivery_point_b' => 'Casa del cliente',
        ]));

        $this->actingAs($this->comercio)
            ->get(route('deliveries.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('deliveries.0.point_a', 'Mi negocio')
                ->where('deliveries.0.point_b', 'Casa del cliente'));
    }

    // ── Lo que no se acepta ───────────────────────────────────────────────────

    public function test_un_punto_larguisimo_no_pasa(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntrega([
                'delivery_point_b' => str_repeat('a', 256),
            ]))
            ->assertSessionHasErrors('delivery_point_b');
    }

    // ── Entrega personal y delivery son cosas distintas ──────────────────────

    public function test_la_entrega_personal_se_guarda_como_tal(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntregaPersonal())
            ->assertSessionHasNoErrors();

        $entrega = Delivery::firstOrFail();

        $this->assertSame(Delivery::PERSONAL, $entrega->type);
        $this->assertFalse($entrega->esDelivery());
    }

    public function test_una_entrega_personal_no_guarda_puntos(): void
    {
        // Aunque lleguen en la petición: una entrega en mano no tiene
        // recorrido que anotar, y ensuciaría la lista de quien reparte
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntregaPersonal([
            'delivery_point_a' => 'Mi negocio',
            'delivery_point_b' => 'Casa del cliente',
        ]));

        $entrega = Delivery::firstOrFail();

        $this->assertNull($entrega->point_a);
        $this->assertNull($entrega->point_b);
    }

    public function test_sin_decir_el_tipo_se_entiende_personal(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->factura([
            'has_delivery' => true,
            'delivery_date' => now()->addDay()->format('Y-m-d H:i:s'),
        ]));

        $this->assertSame(Delivery::PERSONAL, Delivery::firstOrFail()->type);
    }

    public function test_no_se_acepta_un_tipo_inventado(): void
    {
        $this->actingAs($this->comercio)
            ->post(route('facturas.store'), $this->conEntrega(['delivery_type' => 'dron']))
            ->assertSessionHasErrors('delivery_type');
    }

    public function test_cambiar_de_delivery_a_personal_borra_el_recorrido(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntrega([
            'delivery_point_a' => 'Mi negocio',
            'delivery_point_b' => 'Casa del cliente',
        ]));

        $factura = Factura::firstOrFail();

        $this->actingAs($this->comercio)
            ->put(route('facturas.update', $factura), $this->conEntregaPersonal())
            ->assertSessionHasNoErrors();

        $entrega = Delivery::firstOrFail();

        $this->assertSame(Delivery::PERSONAL, $entrega->type);
        $this->assertNull($entrega->point_b);
    }

    public function test_la_lista_separa_las_dos_clases(): void
    {
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntregaPersonal());
        $this->actingAs($this->comercio)->post(route('facturas.store'), $this->conEntrega([
            'delivery_point_b' => 'Casa del cliente',
        ]));

        $this->assertSame(1, Delivery::personales()->count());
        $this->assertSame(1, Delivery::deliveries()->count());

        $this->actingAs($this->comercio)
            ->get(route('deliveries.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->has('deliveries', 2)
                ->where('deliveries.0.type', Delivery::PERSONAL)
                ->where('deliveries.1.type', Delivery::DELIVERY));
    }
}
