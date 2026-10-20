<?php

namespace Tests\Feature;

use App\Mail\AvisoDeVencimiento;
use App\Mail\CambioDePlan;
use App\Mail\PlanPorVencer;
use App\Mail\SolicitudDeCambioDePlan;
use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Los correos alrededor del plan.
 *
 * Tres momentos en los que callarse sale caro: una solicitud que nadie ve,
 * una respuesta que el comercio no recibe, y un plan que vence sin que se
 * entere hasta que un cliente no puede abrir su catálogo.
 */
class CorreosDePlanTest extends TestCase
{
    use RefreshDatabase;

    private Plan $basico;
    private Plan $avanzado;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->basico = $this->plan('Básico', 10);
        $this->avanzado = $this->plan('Avanzado', 30);
    }

    private function plan(string $nombre, float $precio): Plan
    {
        return Plan::create([
            'name' => $nombre,
            'price_usd' => $precio,
            'billing_period' => 'monthly',
            'ai_daily_limit' => 3,
            'color' => '#047857',
            'is_active' => true,
            'is_public' => true,
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
            'plan_id' => $this->basico->id,
            'plan_started_at' => now()->subMonth(),
            'plan_expires_at' => now()->addDays(10)->endOfDay(),
            ...$atributos,
        ]);
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin-' . uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);
    }

    // ── Al pedir: le llega al administrador ───────────────────────────────────

    public function test_pedir_un_cambio_avisa_a_los_administradores(): void
    {
        $admin = $this->admin();

        $this->actingAs($this->comercio())
            ->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        Mail::assertSent(SolicitudDeCambioDePlan::class, fn ($correo) => $correo->hasTo($admin->email));
    }

    public function test_el_asunto_dice_quien_y_a_que_plan(): void
    {
        $this->admin();

        $this->actingAs($this->comercio())
            ->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        Mail::assertSent(SolicitudDeCambioDePlan::class, function ($correo) {
            $asunto = $correo->envelope()->subject;

            $this->assertStringContainsString('Dulces Mariana', $asunto);
            $this->assertStringContainsString('Avanzado', $asunto);

            return true;
        });
    }

    public function test_sin_administradores_no_revienta_la_solicitud(): void
    {
        $this->actingAs($this->comercio())
            ->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, PlanChangeRequest::count());
        Mail::assertNothingSent();
    }

    // ── Al responder: le llega al comercio ────────────────────────────────────

    private function solicitudDe(User $comercio): PlanChangeRequest
    {
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        return PlanChangeRequest::firstOrFail();
    }

    public function test_aceptar_le_avisa_al_comercio(): void
    {
        $comercio = $this->comercio();
        $solicitud = $this->solicitudDe($comercio);

        $this->actingAs($this->admin())
            ->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'aceptada']);

        Mail::assertSent(
            CambioDePlan::class,
            fn ($correo) => $correo->hasTo($comercio->email) && $correo->momento === CambioDePlan::ACEPTADO,
        );
    }

    public function test_rechazar_tambien_le_avisa(): void
    {
        $comercio = $this->comercio();
        $solicitud = $this->solicitudDe($comercio);

        $this->actingAs($this->admin())
            ->patch(route('admin.cambios-plan.update', $solicitud), [
                'status' => 'rechazada',
                'admin_note' => 'Ese plan sale de catálogo el mes que viene.',
            ]);

        Mail::assertSent(CambioDePlan::class, function ($correo) use ($comercio) {
            $this->assertSame(CambioDePlan::RECHAZADO, $correo->momento);
            $this->assertStringContainsString('sale de catálogo', $correo->render());

            return $correo->hasTo($comercio->email);
        });
    }

    // ── Al aplicarse: le llega otra vez ───────────────────────────────────────

    public function test_renovar_con_el_plan_pedido_avisa_que_ya_esta_hecho(): void
    {
        $comercio = $this->comercio();
        $solicitud = $this->solicitudDe($comercio);
        $admin = $this->admin();

        $this->actingAs($admin)->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'aceptada']);

        $this->actingAs($admin)->patch(route('admin.comercios.plan', $comercio), [
            'plan_id' => $this->avanzado->id,
            'plan_expires_at' => now()->addMonth()->toDateString(),
        ]);

        Mail::assertSent(
            CambioDePlan::class,
            fn ($correo) => $correo->momento === CambioDePlan::APLICADO && $correo->hasTo($comercio->email),
        );
    }

    public function test_renovar_con_otro_plan_no_anuncia_un_cambio_que_no_paso(): void
    {
        $comercio = $this->comercio();
        $solicitud = $this->solicitudDe($comercio);
        $admin = $this->admin();

        $this->actingAs($admin)->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'aceptada']);

        $this->actingAs($admin)->patch(route('admin.comercios.plan', $comercio), [
            'plan_id' => $this->basico->id,
            'plan_expires_at' => now()->addMonth()->toDateString(),
        ]);

        Mail::assertNotSent(CambioDePlan::class, fn ($correo) => $correo->momento === CambioDePlan::APLICADO);
    }

    // ── Antes de vencer ───────────────────────────────────────────────────────

    public function test_avisa_en_los_dias_configurados(): void
    {
        config(['planes.avisos_previos' => [7, 3, 1]]);

        $this->comercio(['plan_expires_at' => now()->addDays(3)->endOfDay()]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        Mail::assertSent(PlanPorVencer::class, fn ($correo) => $correo->diasRestantes === 3);
    }

    public function test_no_avisa_un_dia_que_no_toca(): void
    {
        config(['planes.avisos_previos' => [7, 3, 1]]);

        $this->comercio(['plan_expires_at' => now()->addDays(5)->endOfDay()]);

        $this->artisan('planes:vencidos');

        Mail::assertNotSent(PlanPorVencer::class);
    }

    public function test_no_avisa_dos_veces_el_mismo_dia(): void
    {
        config(['planes.avisos_previos' => [3]]);

        $this->comercio(['plan_expires_at' => now()->addDays(3)->endOfDay()]);

        $this->artisan('planes:vencidos');
        $this->artisan('planes:vencidos');

        Mail::assertSentCount(1);
    }

    public function test_el_aviso_habla_de_perder_el_catalogo(): void
    {
        config(['planes.avisos_previos' => [1]]);

        $this->comercio(['plan_expires_at' => now()->addDay()->endOfDay()]);

        $this->artisan('planes:vencidos');

        Mail::assertSent(PlanPorVencer::class, function ($correo) {
            $this->assertStringContainsString('no pierdas tu catálogo', $correo->envelope()->subject);

            $html = $correo->render();
            $this->assertStringContainsString('deja de verse para tus clientes', $html);
            // Que sepa que sus datos siguen ahí: el susto no ayuda a renovar
            $this->assertStringContainsString('siguen en tu panel', $html);

            return true;
        });
    }

    public function test_un_plan_ya_vencido_no_recibe_el_aviso_previo(): void
    {
        config(['planes.avisos_previos' => [7, 3, 1]]);

        $this->comercio(['plan_expires_at' => now()->subDay()->endOfDay()]);

        $this->artisan('planes:vencidos');

        Mail::assertNotSent(PlanPorVencer::class);
    }

    public function test_una_cuenta_suspendida_no_recibe_avisos(): void
    {
        config(['planes.avisos_previos' => [3]]);

        $this->comercio([
            'status' => User::STATUS_SUSPENDED,
            'plan_expires_at' => now()->addDays(3)->endOfDay(),
        ]);

        $this->artisan('planes:vencidos');

        Mail::assertNotSent(PlanPorVencer::class);
    }

    public function test_el_aviso_cuenta_los_dias_de_gracia_del_panel(): void
    {
        config(['planes.avisos_previos' => [3], 'planes.dias_de_gracia' => 15]);
        Setting::putPlatform('grace_days', '40');

        $this->comercio(['plan_expires_at' => now()->addDays(3)->endOfDay()]);

        $this->artisan('planes:vencidos');

        Mail::assertSent(PlanPorVencer::class, function ($correo) {
            $this->assertStringContainsString('Después de 40 días', $correo->render());

            return true;
        });
    }
    /* ── La cuenta regresiva completa ──────────────────────────────── */

    /**
     * Uno a los siete días y después todos los días desde los tres.
     *
     * Se recorre día por día con el calendario corrido, que es como ocurre:
     * un comercio no vive un solo día de la cuenta regresiva, los vive todos,
     * y lo que importa es que no se salte ninguno ni repita.
     *
     * @return void
     */
    public function test_la_cuenta_regresiva_avisa_los_dias_que_toca(): void
    {
        $vence = now()->addDays(10)->endOfDay();
        $comercio = $this->comercio(['plan_expires_at' => $vence]);

        // Desde diez días antes hasta el día del vencimiento
        for ($faltan = 10; $faltan >= 0; $faltan--) {
            $this->travelTo($vence->copy()->subDays($faltan)->startOfDay()->addHours(5));
            $this->artisan('planes:vencidos');
        }

        $this->travelBack();

        $recibidos = Mail::sent(PlanPorVencer::class)
            ->filter(fn ($correo) => $correo->comercio->is($comercio))
            ->map(fn ($correo) => $correo->diasRestantes)
            ->sort()
            ->values()
            ->all();

        $this->assertSame([0, 1, 2, 3, 7], $recibidos);
    }

    /** El día que vence todavía se puede renovar sin que nadie se entere. */
    public function test_el_dia_que_vence_tambien_avisa(): void
    {
        $this->comercio(['plan_expires_at' => now()->endOfDay()]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        Mail::assertSent(PlanPorVencer::class, function ($correo) {
            $this->assertSame(0, $correo->diasRestantes);
            $this->assertStringContainsString('Hoy vence tu plan', $correo->envelope()->subject);

            return true;
        });
    }

    /**
     * Y a la mañana siguiente, con el catálogo ya caído, el aviso de que pasó.
     *
     * Es otro correo distinto: el de antes pide renovar a tiempo, este
     * explica qué se cayó y cuánto queda antes de perder los datos.
     */
    public function test_al_dia_siguiente_avisa_que_ya_vencio(): void
    {
        config(['planes.avisos' => [0, 1, 7, 12]]);

        $this->comercio(['plan_expires_at' => now()->subDay()->endOfDay()]);

        $this->artisan('planes:vencidos')->assertSuccessful();

        Mail::assertSent(AvisoDeVencimiento::class, fn ($correo) => $correo->diasParaBorrado > 0);
        Mail::assertNotSent(PlanPorVencer::class);
    }

    /** Dos corridas el mismo día no son dos correos. */
    public function test_ningun_dia_de_la_cuenta_regresiva_se_duplica(): void
    {
        $this->comercio(['plan_expires_at' => now()->addDays(2)->endOfDay()]);

        $this->artisan('planes:vencidos');
        $this->artisan('planes:vencidos');

        Mail::assertSentCount(1);
    }
}
