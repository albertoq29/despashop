<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Descuentos programados en los planes.
 *
 * El precio del plan nunca se toca: el descuento vive aparte y solo pinta
 * mientras corre su ventana, de modo que una promoción de temporada se
 * apaga sola sin que nadie se acuerde de volver a subir el precio.
 */
class DescuentosDePlanTest extends TestCase
{
    use RefreshDatabase;

    private function plan(array $atributos = [], string $nombre = 'Emprende'): Plan
    {
        return Plan::create([
            'name' => $nombre,
            'price_usd' => 20,
            'billing_period' => 'monthly',
            'ai_daily_limit' => 3,
            'color' => '#047857',
            'is_active' => true,
            'is_public' => true,
            ...$atributos,
        ]);
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);
    }

    // ── Cuándo corre ──────────────────────────────────────────────────────────

    public function test_sin_porcentaje_no_hay_descuento(): void
    {
        $plan = $this->plan(['discount_starts_at' => now()->subDay(), 'discount_ends_at' => now()->addDay()]);

        $this->assertFalse($plan->descuentoVigente());
        $this->assertSame(20.0, $plan->precio_final);
    }

    public function test_sin_fechas_el_descuento_corre_desde_ya(): void
    {
        $plan = $this->plan(['discount_percent' => 25]);

        $this->assertTrue($plan->descuentoVigente());
        $this->assertSame(15.0, $plan->precio_final);
    }

    public function test_antes_de_la_fecha_de_inicio_todavia_no_aplica(): void
    {
        $plan = $this->plan(['discount_percent' => 50, 'discount_starts_at' => now()->addWeek()]);

        $this->assertFalse($plan->descuentoVigente());
        $this->assertSame(20.0, $plan->precio_final);
    }

    public function test_pasada_la_fecha_de_cierre_vuelve_el_precio_de_siempre(): void
    {
        $plan = $this->plan([
            'discount_percent' => 50,
            'discount_starts_at' => now()->subMonth(),
            'discount_ends_at' => now()->subDay(),
        ]);

        $this->assertFalse($plan->descuentoVigente());
        $this->assertSame(20.0, $plan->precio_final);
    }

    public function test_dentro_de_la_ventana_aplica(): void
    {
        $plan = $this->plan([
            'discount_percent' => 30,
            'discount_starts_at' => now()->subDay(),
            'discount_ends_at' => now()->addDay(),
        ]);

        $this->assertTrue($plan->descuentoVigente());
        $this->assertSame(14.0, $plan->precio_final);
    }

    public function test_el_precio_en_bolivares_tambien_se_rebaja(): void
    {
        $plan = $this->plan(['price_bs' => 800, 'discount_percent' => 10]);

        $this->assertSame(720.0, $plan->precio_bs_final);
    }

    public function test_sin_precio_en_bolivares_no_se_inventa_uno(): void
    {
        $this->assertNull($this->plan(['discount_percent' => 10])->precio_bs_final);
    }

    public function test_el_precio_del_plan_nunca_se_toca(): void
    {
        $plan = $this->plan(['discount_percent' => 40]);

        $this->assertSame('20.00', $plan->fresh()->price_usd);
    }

    // ── Lo que llega a la página pública ──────────────────────────────────────

    public function test_la_bienvenida_recibe_el_precio_ya_rebajado(): void
    {
        $this->plan(['discount_percent' => 25, 'discount_label' => 'Aniversario']);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('planes.0.descuento_activo', true)
                ->where('planes.0.precio_final', 15)
                ->where('planes.0.discount_label', 'Aniversario'));
    }

    public function test_una_promocion_terminada_no_llega_a_la_pagina(): void
    {
        $this->plan(['discount_percent' => 25, 'discount_ends_at' => now()->subDay()]);

        $this->get(route('home'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('planes.0.descuento_activo', false)
                ->where('planes.0.precio_final', 20));
    }

    // ── El formulario del admin ───────────────────────────────────────────────

    public function test_el_admin_programa_un_descuento(): void
    {
        $plan = $this->plan();

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 20,
                'discount_label' => 'Navidad',
                'discount_starts_at' => '2026-12-01',
                'discount_ends_at' => '2026-12-31',
            ])
            ->assertRedirect();

        $plan->refresh();

        $this->assertSame(20, $plan->discount_percent);
        // Desde el primer minuto del primer día hasta el último del último
        $this->assertSame('2026-12-01 00:00:00', $plan->discount_starts_at->toDateTimeString());
        $this->assertSame('2026-12-31 23:59:59', $plan->discount_ends_at->toDateTimeString());
    }

    public function test_el_cierre_no_puede_ir_antes_del_inicio(): void
    {
        $plan = $this->plan();

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 20,
                'discount_starts_at' => '2026-12-31',
                'discount_ends_at' => '2026-12-01',
            ])
            ->assertSessionHasErrors('discount_ends_at');
    }

    public function test_no_se_puede_pasar_del_cien(): void
    {
        $plan = $this->plan();

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 120,
            ])
            ->assertSessionHasErrors('discount_percent');
    }

    public function test_un_cero_se_guarda_como_sin_descuento(): void
    {
        $plan = $this->plan(['discount_percent' => 30]);

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 0,
            ]);

        $this->assertNull($plan->fresh()->discount_percent);
    }

    /* ── Prueba gratis ─────────────────────────────────────────── */

    /** Un comercio recién registrado, pendiente de aprobación. */
    private function solicitante(Plan $plan, string $correo = 'tienda@ejemplo.test'): User
    {
        return User::create([
            'name' => 'Tienda',
            'business_name' => 'Tienda de prueba',
            'username' => 'tienda' . substr(md5($correo), 0, 6),
            'email' => $correo,
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_PENDING,
            'requested_plan_id' => $plan->id,
            'email_verified_at' => now(),
        ]);
    }

    private function aprobar(User $comercio): void
    {
        $this->actingAs($this->admin())
            ->patch(route('admin.comercios.estado', $comercio), ['status' => User::STATUS_APPROVED])
            ->assertRedirect();
    }

    public function test_el_cien_por_ciento_es_una_prueba_gratis(): void
    {
        $plan = $this->plan(['discount_percent' => 100]);

        $this->assertTrue($plan->esPruebaGratis());
        $this->assertTrue($plan->descuentoVigente());
        $this->assertSame(0.0, $plan->precio_final);
    }

    public function test_un_descuento_normal_no_es_prueba_gratis(): void
    {
        $this->assertFalse($this->plan(['discount_percent' => 90])->esPruebaGratis());
    }

    public function test_sin_dias_propios_usa_los_de_la_plataforma(): void
    {
        $plan = $this->plan(['discount_percent' => 100]);

        $this->assertSame((int) config('planes.dias_de_prueba'), $plan->diasDePrueba());
        $this->assertSame(10, $this->plan(['trial_days' => 10], 'Otro')->diasDePrueba());
    }

    public function test_sin_tope_no_hay_cupos_que_contar(): void
    {
        $plan = $this->plan(['discount_percent' => 100]);

        $this->assertNull($plan->cupos_libres);
        $this->assertFalse($plan->cuposAgotados());
        $this->assertTrue($plan->tomarCupo());
    }

    public function test_los_cupos_se_reparten_hasta_agotarse(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 2]);

        $this->assertTrue($plan->tomarCupo());
        $this->assertSame(1, $plan->cupos_libres);

        $this->assertTrue($plan->tomarCupo());
        $this->assertSame(0, $plan->cupos_libres);

        // El tercero se queda sin nada, y el contador no se pasa del tope
        $this->assertFalse($plan->tomarCupo());
        $this->assertSame(2, $plan->fresh()->discount_claimed);
    }

    public function test_agotados_los_cupos_la_oferta_deja_de_correr(): void
    {
        $plan = $this->plan([
            'discount_percent' => 100,
            'discount_limit' => 1,
            'discount_claimed' => 1,
        ]);

        $this->assertTrue($plan->cuposAgotados());
        $this->assertFalse($plan->descuentoVigente());
        $this->assertSame(20.0, $plan->precio_final);
    }

    public function test_bajar_el_tope_no_deja_cupos_negativos(): void
    {
        $plan = $this->plan([
            'discount_percent' => 100,
            'discount_limit' => 2,
            'discount_claimed' => 5,
        ]);

        $this->assertSame(0, $plan->cupos_libres);
    }

    public function test_una_oferta_agotada_no_llega_a_la_pagina(): void
    {
        $this->plan(['discount_percent' => 100, 'discount_limit' => 1, 'discount_claimed' => 1]);

        $this->get(route('home'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('planes.0.descuento_activo', false)
                ->where('planes.0.es_prueba_gratis', true)
                ->where('planes.0.cupos_libres', 0));
    }

    // ── Al aprobar la cuenta ──────────────────────────────────────

    public function test_al_aprobar_se_aplica_la_prueba_y_se_gasta_un_cupo(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 3, 'trial_days' => 45]);
        $comercio = $this->solicitante($plan);

        $this->aprobar($comercio);

        $comercio->refresh();

        $this->assertTrue((bool) $comercio->plan_is_trial);
        $this->assertSame($plan->id, $comercio->plan_id);
        $this->assertSame(
            now()->addDays(45)->toDateString(),
            $comercio->plan_expires_at->toDateString(),
        );
        $this->assertSame(2, $plan->fresh()->cupos_libres);
    }

    public function test_sin_oferta_la_aprobacion_abre_el_mes_de_siempre(): void
    {
        $plan = $this->plan();
        $comercio = $this->solicitante($plan);

        $this->aprobar($comercio);

        $comercio->refresh();

        $this->assertFalse((bool) $comercio->plan_is_trial);
        $this->assertSame(
            now()->addMonthNoOverflow()->toDateString(),
            $comercio->plan_expires_at->toDateString(),
        );
    }

    public function test_agotada_la_oferta_la_aprobacion_sigue_sin_prueba(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 1, 'discount_claimed' => 1]);
        $comercio = $this->solicitante($plan);

        $this->aprobar($comercio);

        $comercio->refresh();

        $this->assertSame(User::STATUS_APPROVED, $comercio->status);
        $this->assertFalse((bool) $comercio->plan_is_trial);
        $this->assertSame(1, $plan->fresh()->discount_claimed);
    }

    public function test_una_oferta_que_todavia_no_empieza_no_regala_nada(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_starts_at' => now()->addWeek()]);
        $comercio = $this->solicitante($plan);

        $this->aprobar($comercio);

        $this->assertFalse((bool) $comercio->refresh()->plan_is_trial);
    }

    public function test_reactivar_una_cuenta_suspendida_no_gasta_cupos(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 3]);
        $comercio = $this->solicitante($plan);
        $comercio->update(['status' => User::STATUS_SUSPENDED, 'plan_id' => $plan->id]);

        $this->aprobar($comercio);

        $this->assertSame(0, $plan->fresh()->discount_claimed);
    }

    // ── El formulario del admin ──────────────────────────────────

    public function test_la_pagina_de_planes_trae_los_dias_por_defecto(): void
    {
        $this->plan(['discount_percent' => 100, 'discount_limit' => 4, 'discount_claimed' => 1]);

        $this->actingAs($this->admin())
            ->get(route('admin.planes.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('diasDePrueba', (int) config('planes.dias_de_prueba'))
                ->where('planes.0.es_prueba_gratis', true)
                ->where('planes.0.discount_claimed', 1)
                ->where('planes.0.cupos_libres', 3));
    }

    public function test_el_admin_ofrece_una_prueba_por_cupos(): void
    {
        $plan = $this->plan();

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 100,
                'discount_label' => 'Lanzamiento',
                'trial_days' => 30,
                'discount_limit' => 10,
            ])
            ->assertRedirect();

        $plan->refresh();

        $this->assertTrue($plan->esPruebaGratis());
        $this->assertSame(30, $plan->trial_days);
        $this->assertSame(10, $plan->discount_limit);
        $this->assertSame(10, $plan->cupos_libres);
    }

    public function test_quitar_la_oferta_pone_los_cupos_en_cero(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 5, 'discount_claimed' => 3]);

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => '',
            ]);

        $this->assertSame(0, $plan->fresh()->discount_claimed);
    }

    public function test_el_conteo_sobrevive_a_un_cambio_de_tope(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 5, 'discount_claimed' => 3]);

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 100,
                'discount_limit' => 8,
            ]);

        $plan->refresh();

        $this->assertSame(3, $plan->discount_claimed);
        $this->assertSame(5, $plan->cupos_libres);
    }

    public function test_el_admin_puede_volver_el_conteo_a_cero(): void
    {
        $plan = $this->plan(['discount_percent' => 100, 'discount_limit' => 5, 'discount_claimed' => 3]);

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 100,
                'discount_limit' => 5,
                'reiniciar_cupos' => true,
            ]);

        $this->assertSame(0, $plan->fresh()->discount_claimed);
    }

    public function test_los_cupos_no_pueden_ser_cero(): void
    {
        $plan = $this->plan();

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 100,
                'discount_limit' => 0,
            ])
            ->assertSessionHasErrors('discount_limit');
    }
}
