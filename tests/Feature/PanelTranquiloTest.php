<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * El panel guía; las cifras viven aparte.
 *
 * Lo que se vigila aquí es que la primera pantalla siga respondiendo «¿y
 * ahora qué hago?» y no «mira cuánto vendiste». Si alguien devuelve el
 * gráfico al panel, o la guía deja de apagarse cuando ya no hace falta, esto
 * lo dice.
 */
class PanelTranquiloTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(): User
    {
        $comercio = User::create([
            'name' => 'Dueño',
            'business_name' => 'Ferretería Valencia',
            'username' => 'ferreteria',
            'email' => 'ferreteria@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($comercio);

        return $comercio;
    }

    private function tema(User $comercio): CatalogTheme
    {
        return CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->firstOrFail();
    }

    /* ── La guía ────────────────────────────────────────────────────────── */

    public function test_una_cuenta_nueva_ve_lo_que_le_falta(): void
    {
        $this->actingAs($this->comercio())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Dashboard')
                ->where('primerosPasos.listo', false)
                // Un catálogo nace publicado: ese ya está hecho, los otros no
                ->where('primerosPasos.hechos', 1)
                ->where('primerosPasos.pasos.0.clave', 'productos')
                ->where('primerosPasos.pasos.0.hecho', false)
                ->where('primerosPasos.pasos.3.clave', 'publicado')
                ->where('primerosPasos.pasos.3.hecho', true));
    }

    public function test_cuando_no_falta_nada_la_guia_se_apaga(): void
    {
        $comercio = $this->comercio();

        app(Tenancy::class)->forTenant($comercio->id, fn () => Product::create(['name' => 'Tornillos', 'stock' => 10]));

        $this->tema($comercio)->forceFill([
            'logo_path' => 'catalogo/1/logo.png',
            'hero_title' => 'Todo para tu obra',
            'is_published' => true,
        ])->save();

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('primerosPasos.listo', true)
                ->where('primerosPasos.hechos', 4));
    }

    /** Un título en blanco no cuenta como portada escrita. */
    public function test_una_portada_con_espacios_no_cuenta(): void
    {
        $comercio = $this->comercio();
        $this->tema($comercio)->forceFill(['hero_title' => '   '])->save();

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('primerosPasos.pasos.2.clave', 'portada')
                ->where('primerosPasos.pasos.2.hecho', false));
    }

    /* ── Las cifras, en su sitio ────────────────────────────────────────── */

    public function test_el_panel_ya_no_carga_ventas_ni_graficos(): void
    {
        $this->actingAs($this->comercio())
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->missing('dailySales')
                ->missing('totalSalesUsd')
                ->missing('customStats')
                ->missing('latest'));
    }

    public function test_las_ventas_se_ven_en_estadisticas(): void
    {
        $this->actingAs($this->comercio())
            ->get(route('estadisticas.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Estadisticas')
                ->has('dailySales')
                ->where('totalOrders', 0)
                ->has('visitas30d'));
    }

    /* ── Agregar rápido ─────────────────────────────────────────────────── */

    /**
     * Dos campos desde el panel y el producto queda visible.
     *
     * Lo que importa es que no nazca «agotado»: con cero unidades y el
     * control encendido, el catálogo lo tacharía apenas se carga.
     */
    public function test_agregar_rapido_deja_el_producto_listo_para_verse(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('productos.store'), [
                'name' => 'Tornillos de media',
                'price_usdt' => '0.35',
                'stock' => 0,
                'controla_stock' => false,
            ])
            ->assertSessionHasNoErrors();

        $producto = Product::withoutGlobalScopes()->firstOrFail();

        $this->assertSame('Tornillos de media', $producto->name);
        $this->assertFalse($producto->is_hidden, 'Nace visible');
        $this->assertFalse($producto->llevaExistencias(), 'Sin control de existencias no sale agotado');
    }

    /* ── La vista previa de la ficha ────────────────────────────────────── */

    public function test_la_ficha_trae_el_tema_para_mostrar_como_se_vera(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->get(route('productos.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('theme.color_primary')
                ->has('theme.font_heading')
                ->has('bcv'));
    }
}
