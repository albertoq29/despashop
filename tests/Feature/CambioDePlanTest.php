<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Solicitudes de cambio de plan.
 *
 * Lo que importa de este módulo es que aceptar no cambia nada todavía: el
 * comercio sigue en su plan hasta renovar. Si aceptar moviera el plan al
 * instante, se le cortaría un período que ya pagó.
 */
class CambioDePlanTest extends TestCase
{
    use RefreshDatabase;

    private Plan $basico;
    private Plan $avanzado;

    protected function setUp(): void
    {
        parent::setUp();

        $this->basico = $this->plan('Básico', 10);
        $this->avanzado = $this->plan('Avanzado', 30);
    }

    private function plan(string $nombre, float $precio, array $atributos = []): Plan
    {
        return Plan::create([
            'name' => $nombre,
            'price_usd' => $precio,
            'billing_period' => 'monthly',
            'ai_daily_limit' => 3,
            'color' => '#047857',
            'is_active' => true,
            'is_public' => true,
            ...$atributos,
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

    // ── El comercio pide ──────────────────────────────────────────────────────

    public function test_el_comercio_ve_su_plan_y_los_demas(): void
    {
        $this->actingAs($this->comercio())
            ->get(route('plan.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('Plan/Index')
                ->where('planActualId', $this->basico->id)
                ->has('planes', 2));
    }

    public function test_pedir_un_cambio_deja_la_solicitud_pendiente(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('plan.solicitudes.store'), [
                'to_plan_id' => $this->avanzado->id,
                'message' => 'Me quedé sin espacio para productos.',
            ])
            ->assertRedirect();

        $solicitud = PlanChangeRequest::firstOrFail();

        $this->assertSame($comercio->id, $solicitud->user_id);
        $this->assertSame($this->basico->id, $solicitud->from_plan_id);
        $this->assertSame($this->avanzado->id, $solicitud->to_plan_id);
        $this->assertSame(PlanChangeRequest::PENDIENTE, $solicitud->status);
        // Pedir no cambia nada todavía
        $this->assertSame($this->basico->id, $comercio->fresh()->plan_id);
        $this->assertNull($comercio->fresh()->pending_plan_id);
    }

    public function test_no_se_puede_pedir_el_plan_que_ya_se_tiene(): void
    {
        $this->actingAs($this->comercio())
            ->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->basico->id])
            ->assertSessionHasErrors('to_plan_id');

        $this->assertSame(0, PlanChangeRequest::count());
    }

    public function test_no_se_puede_pedir_un_plan_desactivado(): void
    {
        $oculto = $this->plan('Interno', 99, ['is_active' => false]);

        $this->actingAs($this->comercio())
            ->post(route('plan.solicitudes.store'), ['to_plan_id' => $oculto->id])
            ->assertSessionHasErrors('to_plan_id');
    }

    public function test_solo_una_solicitud_a_la_vez(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        $otro = $this->plan('Pro', 50);

        $this->actingAs($comercio)
            ->post(route('plan.solicitudes.store'), ['to_plan_id' => $otro->id])
            ->assertSessionHas('error');

        $this->assertSame(1, PlanChangeRequest::count());
    }

    public function test_el_comercio_retira_su_solicitud(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        $solicitud = PlanChangeRequest::firstOrFail();

        $this->actingAs($comercio)
            ->delete(route('plan.solicitudes.destroy', $solicitud))
            ->assertRedirect();

        $this->assertSame(PlanChangeRequest::CANCELADA, $solicitud->fresh()->status);
    }

    public function test_nadie_retira_la_solicitud_de_otro(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        $this->actingAs($this->comercio())
            ->delete(route('plan.solicitudes.destroy', PlanChangeRequest::firstOrFail()))
            ->assertForbidden();
    }

    // ── El administrador responde ─────────────────────────────────────────────

    public function test_aceptar_no_cambia_el_plan_todavia(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);
        $solicitud = PlanChangeRequest::firstOrFail();

        $this->actingAs($this->admin())
            ->patch(route('admin.cambios-plan.update', $solicitud), [
                'status' => PlanChangeRequest::ACEPTADA,
                'admin_note' => 'Listo, te lo cambiamos al renovar.',
            ])
            ->assertRedirect();

        $comercio->refresh();

        $this->assertSame(PlanChangeRequest::ACEPTADA, $solicitud->fresh()->status);
        // Queda apuntado, pero el plan de hoy sigue siendo el de antes
        $this->assertSame($this->avanzado->id, $comercio->pending_plan_id);
        $this->assertSame($this->basico->id, $comercio->plan_id);
    }

    public function test_rechazar_no_deja_nada_apuntado(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        $this->actingAs($this->admin())
            ->patch(route('admin.cambios-plan.update', PlanChangeRequest::firstOrFail()), [
                'status' => PlanChangeRequest::RECHAZADA,
            ]);

        $this->assertNull($comercio->fresh()->pending_plan_id);
        $this->assertSame($this->basico->id, $comercio->fresh()->plan_id);
    }

    public function test_una_solicitud_cerrada_no_se_responde_dos_veces(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);
        $solicitud = PlanChangeRequest::firstOrFail();

        $admin = $this->admin();
        $this->actingAs($admin)->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'rechazada']);

        $this->actingAs($admin)
            ->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'aceptada'])
            ->assertSessionHas('error');

        $this->assertSame(PlanChangeRequest::RECHAZADA, $solicitud->fresh()->status);
    }

    // ── La renovación aplica el cambio ────────────────────────────────────────

    public function test_renovar_con_el_plan_pedido_aplica_la_solicitud(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);
        $solicitud = PlanChangeRequest::firstOrFail();

        $admin = $this->admin();
        $this->actingAs($admin)->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'aceptada']);

        $this->actingAs($admin)->patch(route('admin.comercios.plan', $comercio), [
            'plan_id' => $this->avanzado->id,
            'plan_expires_at' => now()->addMonth()->toDateString(),
        ]);

        $comercio->refresh();
        $solicitud->refresh();

        $this->assertSame($this->avanzado->id, $comercio->plan_id);
        $this->assertNull($comercio->pending_plan_id);
        $this->assertSame(PlanChangeRequest::APLICADA, $solicitud->status);
        $this->assertNotNull($solicitud->applied_at);
    }

    public function test_renovar_con_otro_plan_deja_la_solicitud_en_espera(): void
    {
        $comercio = $this->comercio();
        $this->actingAs($comercio)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);
        $solicitud = PlanChangeRequest::firstOrFail();

        $admin = $this->admin();
        $this->actingAs($admin)->patch(route('admin.cambios-plan.update', $solicitud), ['status' => 'aceptada']);

        // Renueva el plan de siempre: el cambio sigue esperando su turno
        $this->actingAs($admin)->patch(route('admin.comercios.plan', $comercio), [
            'plan_id' => $this->basico->id,
            'plan_expires_at' => now()->addMonth()->toDateString(),
        ]);

        $comercio->refresh();

        $this->assertSame($this->basico->id, $comercio->plan_id);
        $this->assertSame($this->avanzado->id, $comercio->pending_plan_id);
        $this->assertSame(PlanChangeRequest::ACEPTADA, $solicitud->fresh()->status);
    }

    // ── Quién puede qué ───────────────────────────────────────────────────────

    public function test_un_comercio_no_entra_al_panel_de_solicitudes(): void
    {
        $this->actingAs($this->comercio())
            ->get(route('admin.cambios-plan.index'))
            ->assertForbidden();
    }

    public function test_el_admin_ve_las_solicitudes_de_todos_los_comercios(): void
    {
        $uno = $this->comercio();
        $otro = $this->comercio();

        $this->actingAs($uno)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);
        $this->actingAs($otro)->post(route('plan.solicitudes.store'), ['to_plan_id' => $this->avanzado->id]);

        $this->actingAs($this->admin())
            ->get(route('admin.cambios-plan.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->has('solicitudes.data', 2)
                ->where('conteos.pendientes', 2));
    }

    /* ── La prueba gratis es para quien llega ──────────────────────── */

    public function test_a_quien_ya_tiene_plan_no_se_le_ofrece_la_prueba(): void
    {
        $this->avanzado->update(['discount_percent' => 100, 'trial_days' => 30, 'discount_limit' => 10]);

        $this->actingAs($this->comercio())
            ->get(route('plan.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('planes.1.name', 'Avanzado')
                ->where('planes.1.es_prueba_gratis', false)
                ->where('planes.1.descuento_activo', false)
                ->where('planes.1.precio_final', 30)
                ->where('planes.1.cupos_libres', null)
                ->where('pruebaOculta', true));
    }

    public function test_los_cupos_no_se_gastan_por_mirar(): void
    {
        $this->avanzado->update(['discount_percent' => 100, 'discount_limit' => 10]);

        $this->actingAs($this->comercio())->get(route('plan.index'))->assertOk();

        // Esconderla es solo de pantalla: el plan sigue con su oferta intacta
        $this->avanzado->refresh();

        $this->assertSame(100, $this->avanzado->discount_percent);
        $this->assertSame(10, $this->avanzado->cupos_libres);
    }

    public function test_un_descuento_normal_si_se_le_ofrece(): void
    {
        $this->avanzado->update(['discount_percent' => 20, 'discount_label' => 'Aniversario']);

        $this->actingAs($this->comercio())
            ->get(route('plan.index'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('planes.1.descuento_activo', true)
                ->where('planes.1.precio_final', 24)
                ->where('planes.1.discount_label', 'Aniversario')
                ->where('pruebaOculta', false));
    }

    public function test_sin_plan_todavia_la_prueba_se_ve(): void
    {
        $this->avanzado->update(['discount_percent' => 100, 'trial_days' => 30]);

        $reciente = $this->comercio(['plan_id' => null, 'plan_started_at' => null]);

        $this->actingAs($reciente)
            ->get(route('plan.index'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('planes.1.es_prueba_gratis', true)
                ->where('planes.1.descuento_activo', true)
                ->where('pruebaOculta', false));
    }

    public function test_sin_ninguna_prueba_corriendo_no_se_avisa_nada(): void
    {
        $this->actingAs($this->comercio())
            ->get(route('plan.index'))
            ->assertInertia(fn ($pagina) => $pagina->where('pruebaOculta', false));
    }

    public function test_una_prueba_que_ya_cerro_no_cuenta_como_escondida(): void
    {
        $this->avanzado->update(['discount_percent' => 100, 'discount_ends_at' => now()->subDay()]);

        $this->actingAs($this->comercio())
            ->get(route('plan.index'))
            ->assertInertia(fn ($pagina) => $pagina->where('pruebaOculta', false));
    }
}
