<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Factura;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El aislamiento entre comercios es la garantía central de la plataforma:
 * un comercio no puede ver ni tocar el inventario, las facturas ni los
 * ajustes de otro. Estas pruebas cubren esa frontera.
 */
class TenancyTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Dueño',
            'business_name' => 'Comercio',
            'username' => 'comercio-' . uniqid(),
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

    private function comoTenant(User $usuario, callable $callback): mixed
    {
        return app(Tenancy::class)->forTenant($usuario->id, $callback);
    }

    public function test_los_productos_quedan_aislados_por_comercio(): void
    {
        $uno = $this->comercio(['username' => 'floreria']);
        $dos = $this->comercio(['username' => 'ferreteria']);

        $this->comoTenant($uno, fn () => Product::create(['name' => 'Ramo de girasoles', 'price_usdt' => 15]));
        $this->comoTenant($dos, fn () => Product::create(['name' => 'Martillo', 'price_usdt' => 8]));

        $delUno = $this->comoTenant($uno, fn () => Product::pluck('name')->all());
        $delDos = $this->comoTenant($dos, fn () => Product::pluck('name')->all());

        $this->assertSame(['Ramo de girasoles'], $delUno);
        $this->assertSame(['Martillo'], $delDos);
    }

    public function test_el_user_id_se_rellena_solo_al_crear(): void
    {
        $comercio = $this->comercio();

        $producto = $this->comoTenant($comercio, fn () => Product::create(['name' => 'Vela', 'price_usdt' => 3]));

        $this->assertSame($comercio->id, $producto->user_id);
    }

    public function test_sin_contexto_de_tenant_no_se_filtra_nada(): void
    {
        $uno = $this->comercio();
        $dos = $this->comercio();

        $this->comoTenant($uno, fn () => Product::create(['name' => 'Uno', 'price_usdt' => 1]));
        $this->comoTenant($dos, fn () => Product::create(['name' => 'Dos', 'price_usdt' => 2]));

        // Es el modo del panel de administración
        $this->assertSame(2, app(Tenancy::class)->withoutTenancy(fn () => Product::count()));
    }

    public function test_las_categorias_y_facturas_tambien_quedan_aisladas(): void
    {
        $uno = $this->comercio();
        $dos = $this->comercio();

        $this->comoTenant($uno, function () {
            Category::create(['name' => 'Ramos']);
            Factura::create([
                'client_name' => 'Cliente de uno',
                'status' => 'draft',
                'subtotal_usd' => 10,
                'total_usd' => 10,
                'total_bs' => 365,
                'bcv_rate' => 36.5,
            ]);
        });

        $categorias = $this->comoTenant($dos, fn () => Category::count());
        $facturas = $this->comoTenant($dos, fn () => Factura::count());

        $this->assertSame(0, $categorias);
        $this->assertSame(0, $facturas);
    }

    public function test_el_catalogo_publico_solo_muestra_los_productos_de_su_dueno(): void
    {
        $uno = $this->comercio(['username' => 'floreria']);
        $dos = $this->comercio(['username' => 'ferreteria']);

        $this->comoTenant($uno, fn () => Product::create(['name' => 'Ramo de girasoles', 'price_usdt' => 15]));
        $this->comoTenant($dos, fn () => Product::create(['name' => 'Martillo', 'price_usdt' => 8]));

        $this->get('/floreria')
            ->assertOk()
            ->assertSee('Ramo de girasoles')
            ->assertDontSee('Martillo');
    }

    public function test_un_comercio_no_puede_borrar_el_banner_de_otro(): void
    {
        $uno = $this->comercio(['username' => 'floreria']);
        $dos = $this->comercio(['username' => 'ferreteria']);

        $banner = $this->comoTenant($uno, fn () => $uno->banners()->create([
            'title' => 'Promoción de uno',
            'image_path' => 'catalogo/1/banner.jpg',
        ]));

        $this->actingAs($dos)
            ->delete(route('catalogo.banners.destroy', $banner->id))
            ->assertNotFound();

        $this->assertDatabaseHas('catalog_banners', ['id' => $banner->id]);
    }

    public function test_el_catalogo_de_una_cuenta_sin_aprobar_no_es_publico(): void
    {
        $this->comercio(['username' => 'pendiente-uno', 'status' => User::STATUS_PENDING]);

        $this->get('/pendiente-uno')->assertNotFound();
    }

    public function test_el_catalogo_suspendido_deja_de_verse(): void
    {
        $comercio = $this->comercio(['username' => 'suspendida']);

        $this->get('/suspendida')->assertOk();

        $comercio->update(['status' => User::STATUS_SUSPENDED]);

        $this->get('/suspendida')->assertNotFound();
    }

    public function test_los_ajustes_de_un_comercio_no_se_mezclan_con_los_de_otro(): void
    {
        $uno = $this->comercio();
        $dos = $this->comercio();

        \App\Models\Setting::put('global_discount', '15', $uno->id);
        \App\Models\Setting::put('global_discount', '5', $dos->id);
        \App\Models\Setting::putPlatform('brand_name', 'Despashop');

        $this->assertSame('15', \App\Models\Setting::get('global_discount', null, $uno->id));
        $this->assertSame('5', \App\Models\Setting::get('global_discount', null, $dos->id));
        $this->assertSame('Despashop', \App\Models\Setting::platform('brand_name'));
    }

    public function test_un_tenant_no_entra_al_panel_de_administracion(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)->get('/admin')->assertForbidden();
    }

    public function test_el_admin_puede_inspeccionar_la_cuenta_de_un_comercio(): void
    {
        $plan = Plan::create(['name' => 'Base', 'slug' => 'base', 'price_usd' => 0]);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);

        $comercio = $this->comercio(['username' => 'inspeccionado', 'plan_id' => $plan->id]);
        $this->comoTenant($comercio, fn () => Product::create(['name' => 'Producto observado', 'price_usdt' => 4]));

        $this->actingAs($admin)
            ->post(route('admin.comercios.inspeccionar', $comercio->id))
            ->assertRedirect(route('dashboard'));

        $this->actingAs($admin)
            ->withSession(['impersonating_tenant' => $comercio->id])
            ->get('/productos')
            ->assertOk()
            ->assertSee('Producto observado');
    }
}
