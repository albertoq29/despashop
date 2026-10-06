<?php

namespace Tests\Feature;

use App\Models\Factura;
use App\Models\Product;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El panel del comercio necesita un comercio detrás.
 *
 * El administrador puede entrar a estas pantallas, pero solo mientras
 * inspecciona a alguien. Sin comercio elegido no hay a quién pertenece
 * nada: las listas salían mezcladas de todos y guardar una factura
 * reventaba con «Column 'user_id' cannot be null».
 */
class PanelSinComercioTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
        ]);
    }

    private function comercio(array $atributos = []): User
    {
        return User::create([
            'name' => 'Dueña',
            'business_name' => 'Dulces Mariana',
            'username' => 'dulces-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
            ...$atributos,
        ]);
    }

    // ── El administrador sin comercio elegido ─────────────────────────────────

    public function test_el_admin_sin_comercio_no_entra_al_panel(): void
    {
        $this->actingAs($this->admin())
            ->get(route('dashboard'))
            ->assertRedirect(route('admin.comercios.index'))
            ->assertSessionHas('info');
    }

    public function test_tampoco_al_formulario_de_facturas(): void
    {
        $this->actingAs($this->admin())
            ->get(route('facturas.create'))
            ->assertRedirect(route('admin.comercios.index'));
    }

    public function test_y_no_puede_guardar_una_factura_sin_dueno(): void
    {
        $comercio = $this->comercio();

        $producto = app(Tenancy::class)->forTenant($comercio->id, fn () => Product::create([
            'user_id' => $comercio->id,
            'name' => 'Torta',
            'price_usdt' => 25,
            'stock' => 5,
        ]));

        $this->actingAs($this->admin())
            ->post(route('facturas.store'), [
                'client_name' => 'Carolina',
                'status' => 'draft',
                'items' => [[
                    'product_id' => $producto->id,
                    'product_name' => 'Torta',
                    'price_type' => 'detal',
                    'unit_price_usd' => 25,
                    'qty' => 1,
                ]],
            ])
            ->assertRedirect(route('admin.comercios.index'));

        $this->assertSame(0, Factura::withoutGlobalScopes()->count());
    }

    public function test_no_ve_los_productos_de_todos_mezclados(): void
    {
        $uno = $this->comercio();
        $otro = $this->comercio();

        foreach ([$uno, $otro] as $duenio) {
            app(Tenancy::class)->forTenant($duenio->id, fn () => Product::create([
                'user_id' => $duenio->id,
                'name' => 'Producto de ' . $duenio->id,
                'price_usdt' => 10,
                'stock' => 1,
            ]));
        }

        $this->actingAs($this->admin())
            ->get(route('productos.index'))
            ->assertRedirect(route('admin.comercios.index'));
    }

    // ── Inspeccionando sí entra ───────────────────────────────────────────────

    public function test_inspeccionando_un_comercio_entra_normal(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($this->admin())
            ->withSession(['impersonating_tenant' => $comercio->id])
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_inspeccionando_la_factura_se_guarda_a_nombre_del_comercio(): void
    {
        $comercio = $this->comercio();

        $producto = app(Tenancy::class)->forTenant($comercio->id, fn () => Product::create([
            'user_id' => $comercio->id,
            'name' => 'Torta',
            'price_usdt' => 25,
            'stock' => 5,
        ]));

        $this->actingAs($this->admin())
            ->withSession(['impersonating_tenant' => $comercio->id])
            ->post(route('facturas.store'), [
                'client_name' => 'Carolina',
                'status' => 'draft',
                'items' => [[
                    'product_id' => $producto->id,
                    'product_name' => 'Torta',
                    'price_type' => 'detal',
                    'unit_price_usd' => 25,
                    'qty' => 1,
                ]],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame($comercio->id, Factura::withoutGlobalScopes()->firstOrFail()->user_id);
    }

    // ── El comercio, como siempre ─────────────────────────────────────────────

    public function test_un_comercio_aprobado_entra_a_su_panel(): void
    {
        $this->actingAs($this->comercio())->get(route('dashboard'))->assertOk();
    }

    public function test_un_comercio_pendiente_va_a_su_pantalla_de_estado(): void
    {
        $this->actingAs($this->comercio(['status' => User::STATUS_PENDING]))
            ->get(route('dashboard'))
            ->assertRedirect(route('cuenta.estado'));
    }

    public function test_un_comercio_suspendido_tambien(): void
    {
        $this->actingAs($this->comercio(['status' => User::STATUS_SUSPENDED]))
            ->get(route('dashboard'))
            ->assertRedirect(route('cuenta.estado'));
    }
}
