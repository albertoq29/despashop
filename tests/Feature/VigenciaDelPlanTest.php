<?php

namespace Tests\Feature;

use App\Models\CatalogBanner;
use App\Models\ExchangeRate;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Vigencia del plan: una cuenta aprobada tiene un mes de plan salvo que el
 * admin decida otra cosa, y el comercio ve siempre cuándo vence y cuánto usa
 * de cada límite.
 */
class VigenciaDelPlanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Un 31 de enero: el mes siguiente no tiene 31 días
        Carbon::setTestNow(Carbon::parse('2027-01-31 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);
    }

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
            'status' => User::STATUS_PENDING,
            ...$atributos,
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    public function test_al_aprobar_sin_fecha_el_plan_dura_un_mes(): void
    {
        $solicitante = $this->comercio();

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.aprobar', $solicitante->id))
            ->assertSessionHasNoErrors();

        $solicitante->refresh();

        $this->assertSame('2027-01-31', $solicitante->plan_started_at->toDateString());
        // 31 de enero + 1 mes = 28 de febrero, no 3 de marzo; y dura todo ese día
        $this->assertSame('2027-02-28 23:59:59', $solicitante->plan_expires_at->toDateTimeString());
    }

    public function test_el_admin_puede_elegir_otra_fecha_al_aprobar(): void
    {
        $solicitante = $this->comercio();

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.aprobar', $solicitante->id), ['plan_expires_at' => '2027-06-15'])
            ->assertSessionHasNoErrors();

        $this->assertSame('2027-06-15 23:59:59', $solicitante->fresh()->plan_expires_at->toDateTimeString());
    }

    public function test_el_admin_puede_aprobar_sin_vencimiento(): void
    {
        $solicitante = $this->comercio();

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.aprobar', $solicitante->id), [
                'plan_expires_at' => '2027-06-15',
                'sin_vencimiento' => true,
            ])
            ->assertSessionHasNoErrors();

        $this->assertNull($solicitante->fresh()->plan_expires_at);
    }

    public function test_no_se_puede_aprobar_con_una_fecha_pasada(): void
    {
        $solicitante = $this->comercio();

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.aprobar', $solicitante->id), ['plan_expires_at' => '2027-01-10'])
            ->assertSessionHasErrors('plan_expires_at');

        $this->assertSame(User::STATUS_PENDING, $solicitante->fresh()->status);
    }

    public function test_activar_una_cuenta_pendiente_tambien_abre_su_mes(): void
    {
        $solicitante = $this->comercio();

        $this->actingAs($this->admin())
            ->patch(route('admin.comercios.estado', $solicitante->id), ['status' => 'approved']);

        $this->assertSame('2027-02-28', $solicitante->fresh()->plan_expires_at->toDateString());
    }

    public function test_reactivar_una_cuenta_suspendida_conserva_su_vencimiento(): void
    {
        $comercio = $this->comercio([
            'status' => User::STATUS_SUSPENDED,
            'plan_started_at' => now()->subMonths(2),
            'plan_expires_at' => now()->addDays(10),
        ]);

        $this->actingAs($this->admin())
            ->patch(route('admin.comercios.estado', $comercio->id), ['status' => 'approved']);

        $this->assertSame('2027-02-10', $comercio->fresh()->plan_expires_at->toDateString());
    }

    public function test_el_panel_muestra_la_vigencia_y_el_uso_de_los_limites(): void
    {
        $plan = Plan::create(['name' => 'Inicial', 'price_usd' => 0, 'max_products' => 10, 'max_banners' => 1, 'ai_daily_limit' => 3]);
        $comercio = $this->comercio([
            'status' => User::STATUS_APPROVED,
            'plan_id' => $plan->id,
            'plan_started_at' => now()->subDays(20),
            'plan_expires_at' => now()->addDays(5)->endOfDay(),
        ]);

        app(Tenancy::class)->forTenant($comercio->id, function () {
            Product::create(['name' => 'Uno']);
            Product::create(['name' => 'Dos']);
            CatalogBanner::create(['title' => 'Promo', 'image_path' => 'catalogo/x.jpg']);
        });

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('plan.estado', 'por_vencer')
                ->where('plan.vence', '2027-02-05')
                ->where('plan.dias_restantes', 5)
                ->where('plan.limites.0.clave', 'productos')
                ->where('plan.limites.0.usados', 2)
                ->where('plan.limites.0.maximo', 10)
                ->where('plan.limites.2.usados', 1)
                ->where('plan.limites.3.maximo', null)
                ->where('avisoDePlan.estado', 'por_vencer')
                ->where('avisoDePlan.dias_restantes', 5));
    }

    public function test_el_aviso_solo_aparece_cerca_del_vencimiento_o_vencido(): void
    {
        $plan = Plan::create(['name' => 'Inicial', 'price_usd' => 0]);
        $comercio = $this->comercio([
            'status' => User::STATUS_APPROVED,
            'plan_id' => $plan->id,
            'plan_expires_at' => now()->addDays(20)->endOfDay(),
        ]);

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('plan.estado', 'activo')
                ->where('avisoDePlan', null));

        $comercio->update(['plan_expires_at' => now()->subDays(2)->endOfDay()]);

        $this->actingAs($comercio->fresh())
            ->get(route('productos.index'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('avisoDePlan.estado', 'vencido')
                ->where('avisoDePlan.dias_restantes', -2));
    }

    public function test_la_tasa_ya_no_tiene_dolar_paralelo(): void
    {
        $comercio = $this->comercio(['status' => User::STATUS_APPROVED]);

        app(Tenancy::class)->forTenant($comercio->id, fn () => ExchangeRate::create(['bcv' => 40.5, 'binance' => 55]));

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('latest.bcv', '40.5000')
                ->missing('latest.binance'));
    }
}
