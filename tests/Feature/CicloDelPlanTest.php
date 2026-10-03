<?php

namespace Tests\Feature;

use App\Mail\AvisoDeVencimiento;
use App\Mail\DatosEliminados;
use App\Models\Factura;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Qué pasa cuando un plan se vence: el catálogo se esconde, se avisa por
 * correo y, cumplido el plazo, se elimina todo.
 */
class CicloDelPlanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        config(['planes.dias_de_gracia' => 15, 'planes.borrado_automatico' => true, 'planes.avisos' => [0, 7, 12]]);
    }

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Dueña',
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

    // ── El catálogo se esconde ─────────────────────────────────────────────────

    public function test_un_plan_vencido_esconde_el_catalogo(): void
    {
        $comercio = $this->comercio(['plan_expires_at' => now()->subDay()->endOfDay()]);

        $this->get('/' . $comercio->username)->assertNotFound();

        // El dueño lo sigue viendo, para comprobar que todo está en su sitio
        $this->actingAs($comercio)
            ->get('/' . $comercio->username)
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->where('isPreview', true));
    }

    public function test_un_plan_al_dia_no_esconde_nada(): void
    {
        $comercio = $this->comercio(['plan_expires_at' => now()->addDays(3)->endOfDay()]);

        $this->get('/' . $comercio->username)->assertOk();
    }

    // ── Avisos ─────────────────────────────────────────────────────────────────

    public function test_avisa_el_dia_que_vence_y_no_repite_el_aviso(): void
    {
        $comercio = $this->comercio(['plan_expires_at' => now()->subHours(2)]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        Mail::assertSent(AvisoDeVencimiento::class, 1);
        Mail::assertSent(AvisoDeVencimiento::class, fn ($correo) => $correo->hasTo($comercio->email));
        $this->assertNotNull($comercio->fresh()->expiry_notified_at);

        // Correrlo otra vez el mismo día no manda un segundo correo
        $this->artisan('planes:vencidos')->assertSuccessful();
        Mail::assertSent(AvisoDeVencimiento::class, 1);
    }

    public function test_vuelve_a_avisar_cuando_se_acerca_el_plazo(): void
    {
        $comercio = $this->comercio([
            'plan_expires_at' => now()->subDays(12)->endOfDay(),
            'expiry_notified_at' => now()->subDays(5),
        ]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        Mail::assertSent(AvisoDeVencimiento::class, fn ($correo) => $correo->diasParaBorrado === 3);
    }

    public function test_un_dia_cualquiera_no_manda_nada(): void
    {
        $this->comercio(['plan_expires_at' => now()->subDays(4)->endOfDay()]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        Mail::assertNothingSent();
    }

    // ── Borrado ────────────────────────────────────────────────────────────────

    public function test_cumplido_el_plazo_se_elimina_todo(): void
    {
        Storage::fake(Archivos::DISCO);

        $comercio = $this->comercio(['plan_expires_at' => now()->subDays(15)->endOfDay()]);
        $correo = $comercio->email;

        app(Tenancy::class)->forTenant($comercio->id, function () {
            Product::create(['name' => 'Torta', 'price_usdt' => 20, 'stock' => 3]);
            Factura::create(['client_name' => 'Cliente', 'status' => 'draft', 'total_usd' => 20, 'bcv_rate' => 39]);
        });

        $this->artisan('planes:vencidos')->assertSuccessful();

        // Se avisa antes de borrar: después ya no hay a quién escribirle
        Mail::assertSent(DatosEliminados::class, fn ($mensaje) => $mensaje->hasTo($correo));

        $this->assertDatabaseMissing('users', ['id' => $comercio->id]);
        $this->assertSame(0, Product::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->count());
        $this->assertSame(0, Factura::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->count());
    }

    public function test_con_el_borrado_apagado_solo_avisa(): void
    {
        config(['planes.borrado_automatico' => false]);

        $comercio = $this->comercio(['plan_expires_at' => now()->subDays(20)->endOfDay()]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $comercio->id]);
        Mail::assertNotSent(DatosEliminados::class);
    }

    public function test_la_simulacion_no_toca_nada(): void
    {
        $comercio = $this->comercio(['plan_expires_at' => now()->subDays(20)->endOfDay()]);

        $this->artisan('planes:vencidos', ['--simular' => true])->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $comercio->id]);
        Mail::assertNothingSent();
    }

    public function test_una_cuenta_sin_vencimiento_nunca_se_toca(): void
    {
        $comercio = $this->comercio(['plan_expires_at' => null]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $comercio->id]);
        Mail::assertNothingSent();
    }

    // ── Lo que ve el comercio ──────────────────────────────────────────────────

    public function test_el_panel_dice_cuando_se_borraran_los_datos(): void
    {
        $plan = Plan::create(['name' => 'Emprendedor', 'price_usd' => 9]);
        $comercio = $this->comercio([
            'plan_id' => $plan->id,
            'plan_expires_at' => now()->subDays(5)->endOfDay(),
        ]);

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('plan.estado', 'vencido')
                ->where('plan.dias_para_borrado', 10)
                ->where('avisoDePlan.dias_para_borrado', 10));
    }

    // ── Pruebas gratis y descuentos ────────────────────────────────────────────

    public function test_el_admin_da_una_prueba_gratis(): void
    {
        Carbon::setTestNow('2027-03-10 09:00:00');

        $plan = Plan::create(['name' => 'Emprendedor', 'price_usd' => 9]);
        $comercio = $this->comercio(['plan_expires_at' => now()->subDay()]);

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.prueba', $comercio->id), ['plan_id' => $plan->id, 'dias' => 30])
            ->assertSessionHasNoErrors();

        $comercio->refresh();

        $this->assertTrue($comercio->plan_is_trial);
        $this->assertSame($plan->id, $comercio->plan_id);
        $this->assertSame('2027-04-09 23:59:59', $comercio->plan_expires_at->toDateTimeString());
        // Los avisos empiezan de cero con el período nuevo
        $this->assertNull($comercio->expiry_notified_at);

        Carbon::setTestNow();
    }

    public function test_el_descuento_se_ve_en_el_panel_del_comercio(): void
    {
        $plan = Plan::create(['name' => 'Negocio', 'price_usd' => 20]);
        $comercio = $this->comercio([
            'plan_id' => $plan->id,
            'plan_expires_at' => now()->addMonth(),
            'plan_discount_percent' => 30,
            'plan_note' => 'Precio de lanzamiento',
        ]);

        $this->assertSame(14.0, $comercio->precioConDescuento());

        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('plan.descuento', 30)
                ->where('plan.plan.precio_con_descuento', 14)
                ->where('plan.nota', 'Precio de lanzamiento'));
    }

    public function test_el_plan_gratis_no_se_ofrece_al_registrarse(): void
    {
        Plan::create(['name' => 'Inicial', 'slug' => 'gratis', 'price_usd' => 0, 'is_public' => false]);
        Plan::create(['name' => 'Emprendedor', 'slug' => 'emprendedor', 'price_usd' => 9]);

        $this->get(route('register'))
            ->assertInertia(fn ($pagina) => $pagina
                ->has('plans', 1)
                ->where('plans.0.name', 'Emprendedor'));
    }
}
