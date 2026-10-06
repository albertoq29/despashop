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

    private function plan(array $atributos = []): Plan
    {
        return Plan::create([
            'name' => 'Emprende',
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

    public function test_no_se_puede_regalar_el_plan_entero(): void
    {
        $plan = $this->plan();

        $this->actingAs($this->admin())
            ->put(route('admin.planes.update', $plan), [
                ...$plan->only(['name', 'price_usd', 'billing_period', 'ai_daily_limit', 'color']),
                'discount_percent' => 100,
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
}
