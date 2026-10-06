<?php

namespace Tests\Feature;

use App\Models\LandingNotice;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Avisos flotantes de la portada y los ajustes nuevos de la plataforma.
 *
 * Lo que más importa aquí es que salga uno solo: varias ventanas al entrar
 * no se leen, se cierran.
 */
class AvisosDeLaPortadaTest extends TestCase
{
    use RefreshDatabase;

    private function aviso(array $atributos = []): LandingNotice
    {
        return LandingNotice::create([
            'title' => '20% en el plan anual',
            'body' => 'Solo esta semana.',
            'tone' => 'promo',
            'position' => 'centro',
            'delay_seconds' => 2,
            'frequency' => 'una_vez_dia',
            'is_active' => true,
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

    // ── Cuál llega a la portada ───────────────────────────────────────────────

    public function test_sin_avisos_la_portada_no_manda_ninguno(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->where('aviso', null));
    }

    public function test_sale_el_aviso_vigente(): void
    {
        $this->aviso();

        $this->get(route('home'))
            ->assertInertia(fn ($pagina) => $pagina->where('aviso.title', '20% en el plan anual'));
    }

    public function test_sale_uno_solo_y_es_el_primero_del_orden(): void
    {
        $this->aviso(['title' => 'Segundo', 'display_order' => 2]);
        $this->aviso(['title' => 'Primero', 'display_order' => 1]);

        $this->get(route('home'))
            ->assertInertia(fn ($pagina) => $pagina->where('aviso.title', 'Primero'));
    }

    public function test_un_aviso_desactivado_no_sale(): void
    {
        $this->aviso(['is_active' => false]);

        $this->get(route('home'))->assertInertia(fn ($pagina) => $pagina->where('aviso', null));
    }

    public function test_fuera_de_su_ventana_no_sale(): void
    {
        $this->aviso(['title' => 'Todavía no', 'starts_at' => now()->addWeek()]);
        $this->aviso(['title' => 'Ya pasó', 'ends_at' => now()->subDay(), 'display_order' => 2]);

        $this->get(route('home'))->assertInertia(fn ($pagina) => $pagina->where('aviso', null));
    }

    public function test_sin_fechas_el_aviso_corre_siempre(): void
    {
        $this->aviso(['starts_at' => null, 'ends_at' => null]);

        $this->get(route('home'))->assertInertia(fn ($pagina) => $pagina->where('aviso.title', '20% en el plan anual'));
    }

    // ── El panel ──────────────────────────────────────────────────────────────

    public function test_el_admin_crea_un_aviso_con_imagen(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin())
            ->post(route('admin.avisos.store'), [
                'title' => 'Aniversario',
                'body' => 'Tres años contigo.',
                'tone' => 'promo',
                'position' => 'esquina',
                'delay_seconds' => 4,
                'frequency' => 'una_vez_sesion',
                'is_active' => true,
                'image' => UploadedFile::fake()->image('promo.jpg', 800, 400),
            ])
            ->assertRedirect();

        $aviso = LandingNotice::firstOrFail();

        $this->assertSame('Aniversario', $aviso->title);
        $this->assertNotNull($aviso->image_path);
        $this->assertNotNull($aviso->image_url);
    }

    public function test_el_cierre_no_puede_ir_antes_del_inicio(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.avisos.store'), [
                'title' => 'Mal puesta',
                'tone' => 'promo',
                'position' => 'centro',
                'delay_seconds' => 2,
                'frequency' => 'siempre',
                'starts_at' => '2026-12-31',
                'ends_at' => '2026-12-01',
            ])
            ->assertSessionHasErrors('ends_at');
    }

    public function test_al_eliminar_un_aviso_se_borra_su_imagen(): void
    {
        Storage::fake('public');

        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.avisos.store'), [
            'title' => 'Con foto',
            'tone' => 'promo',
            'position' => 'centro',
            'delay_seconds' => 2,
            'frequency' => 'siempre',
            'image' => UploadedFile::fake()->image('promo.jpg'),
        ]);

        $aviso = LandingNotice::firstOrFail();
        $ruta = $aviso->image_path;

        Storage::disk('public')->assertExists($ruta);

        $this->actingAs($admin)->delete(route('admin.avisos.destroy', $aviso));

        Storage::disk('public')->assertMissing($ruta);
    }

    public function test_un_comercio_no_toca_los_avisos(): void
    {
        $comercio = User::create([
            'name' => 'Dueña',
            'username' => 'dulces',
            'email' => 'duena@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        $this->actingAs($comercio)->get(route('admin.avisos.index'))->assertForbidden();
    }

    // ── Ajustes nuevos de la plataforma ───────────────────────────────────────

    public function test_la_cinta_y_las_redes_llegan_a_la_portada(): void
    {
        Setting::putPlatform('landing_announcement', 'Planes con 20% hasta el domingo');
        Setting::putPlatform('social_instagram', 'https://instagram.com/despashop');

        $this->get(route('home'))
            ->assertInertia(fn ($pagina) => $pagina
                ->where('ajustes.landing_announcement', 'Planes con 20% hasta el domingo')
                ->where('ajustes.social_instagram', 'https://instagram.com/despashop'));
    }

    public function test_los_dias_de_gracia_del_panel_mandan_sobre_la_configuracion(): void
    {
        config(['planes.dias_de_gracia' => 15]);

        $this->assertSame(15, Setting::platformInt('grace_days', (int) config('planes.dias_de_gracia')));

        Setting::putPlatform('grace_days', '30');

        $this->assertSame(30, Setting::platformInt('grace_days', (int) config('planes.dias_de_gracia')));
    }

    public function test_un_ajuste_vacio_cae_en_el_valor_de_respaldo(): void
    {
        Setting::putPlatform('trial_days', '');

        $this->assertSame(7, Setting::platformInt('trial_days', 7));
    }

    public function test_la_fecha_de_borrado_usa_los_dias_del_panel(): void
    {
        Setting::putPlatform('grace_days', '40');

        $comercio = User::create([
            'name' => 'Dueña',
            'username' => 'vencida',
            'email' => 'vencida@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            'plan_expires_at' => now()->subDay()->endOfDay(),
        ]);

        $this->assertSame(
            now()->subDay()->addDays(40)->toDateString(),
            $comercio->fechaDeBorrado()->toDateString(),
        );
    }
}
