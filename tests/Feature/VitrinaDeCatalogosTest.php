<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\User;
use App\Services\CatalogProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Vitrina de catálogos anclados en la bienvenida.
 *
 * La tira de «negocios que ya publicaron» se llena sola por fecha y sirve
 * para mostrar que la plataforma se usa. Esta se elige a mano porque lo que
 * enseña es lo que se puede lograr con ella, y eso no lo decide una
 * consulta: ni el catálogo más nuevo ni el que tiene más productos es el
 * mejor armado.
 */
class VitrinaDeCatalogosTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(string $nombre, bool $publicado = true): User
    {
        $usuario = User::create([
            'name' => 'Dueña',
            'business_name' => $nombre,
            'username' => 'tienda-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        $this->tema($usuario)->forceFill(['is_published' => $publicado])->save();

        return $usuario;
    }

    private function tema(User $usuario): CatalogTheme
    {
        return CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $usuario->id)->firstOrFail();
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

    private function anclar(User $comercio, array $datos = [])
    {
        return $this->actingAs($this->admin())
            ->patch(route('admin.comercios.vitrina', $comercio), ['anclado' => true, ...$datos]);
    }

    // ── Lo que ve el visitante ────────────────────────────────────────────────

    public function test_sin_nada_anclado_la_seccion_no_existe(): void
    {
        $this->comercio('Dulces Mariana');

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->has('vitrina', 0));
    }

    public function test_el_anclado_llega_con_su_nota_y_sus_colores(): void
    {
        $comercio = $this->comercio('Dulces Mariana');
        $this->tema($comercio)->forceFill(['color_primary' => '#c2185b', 'hero_title' => 'Tortas por encargo'])->save();

        $this->anclar($comercio, ['showcase_note' => 'Portada con fotos propias'])->assertRedirect();

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->has('vitrina', 1)
                ->where('vitrina.0.name', 'Dulces Mariana')
                ->where('vitrina.0.nota', 'Portada con fotos propias')
                ->where('vitrina.0.colores.primario', '#c2185b')
                ->where('vitrina.0.titulo', 'Tortas por encargo'));
    }

    /** El último anclado va primero: la fecha de anclaje es el orden. */
    public function test_el_ultimo_anclado_sale_de_primero(): void
    {
        $primero = $this->comercio('Primero');
        $segundo = $this->comercio('Segundo');

        $this->travelTo(now()->subHour(), fn () => $this->anclar($primero));
        $this->anclar($segundo);

        $this->get(route('home'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('vitrina.0.name', 'Segundo')
                ->where('vitrina.1.name', 'Primero'));
    }

    /**
     * Un comercio puede despublicar su catálogo después de que lo anclaron.
     * La vitrina no puede quedar enlazando a una página que no existe.
     */
    public function test_si_despublica_su_catalogo_sale_de_la_vitrina(): void
    {
        $comercio = $this->comercio('Dulces Mariana');
        $this->anclar($comercio);

        $this->tema($comercio)->forceFill(['is_published' => false])->save();

        $this->get(route('home'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->has('vitrina', 0));

        // Sigue anclado: al volver a publicar reaparece sin tocar nada
        $this->assertNotNull($comercio->fresh()->showcase_at);
    }

    public function test_una_cuenta_suspendida_no_se_muestra(): void
    {
        $comercio = $this->comercio('Dulces Mariana');
        $this->anclar($comercio);

        $comercio->update(['status' => User::STATUS_SUSPENDED]);

        $this->get(route('home'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->has('vitrina', 0));
    }

    public function test_el_encabezado_sale_de_los_ajustes(): void
    {
        $this->anclar($this->comercio('Dulces Mariana'));

        $this->actingAs($this->admin())
            ->put(route('admin.ajustes.update'), [
                ...$this->ajustesMinimos(),
                'showcase_title' => 'Lo que han armado',
                'showcase_subtitle' => 'Entra y míralos.',
            ])
            ->assertSessionHasNoErrors();

        $this->get(route('home'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('ajustes.showcase_title', 'Lo que han armado')
                ->where('ajustes.showcase_subtitle', 'Entra y míralos.'));
    }

    /** Lo que el formulario de ajustes exige, para poder guardar una clave. */
    private function ajustesMinimos(): array
    {
        return [
            'brand_name' => 'Despashop',
            'landing_headline' => 'Tu catálogo en línea',
            'landing_cta_primary' => 'Crear mi catálogo',
            'landing_cta_secondary' => 'Ya tengo cuenta',
            'plans_title' => 'Planes',
            'registrations_open' => '1',
        ];
    }

    // ── Lo que hace el admin ──────────────────────────────────────────────────

    public function test_no_se_puede_anclar_un_catalogo_sin_publicar(): void
    {
        $comercio = $this->comercio('Sin publicar', publicado: false);

        $this->anclar($comercio)->assertSessionHas('error');

        $this->assertNull($comercio->fresh()->showcase_at);
    }

    public function test_quitarlo_borra_tambien_la_nota(): void
    {
        $comercio = $this->comercio('Dulces Mariana');
        $this->anclar($comercio, ['showcase_note' => 'Muy bien armado']);

        $this->actingAs($this->admin())
            ->patch(route('admin.comercios.vitrina', $comercio), ['anclado' => false])
            ->assertRedirect();

        $comercio->refresh();

        $this->assertNull($comercio->showcase_at);
        $this->assertNull($comercio->showcase_note);
    }

    public function test_volver_a_anclarlo_lo_manda_al_frente(): void
    {
        $comercio = $this->comercio('Dulces Mariana');

        $this->travelTo(now()->subDays(3), fn () => $this->anclar($comercio));
        $anclado = $comercio->fresh()->showcase_at;

        $this->anclar($comercio, ['showcase_note' => 'Cambió la portada']);

        $comercio->refresh();

        $this->assertTrue($comercio->showcase_at->isAfter($anclado));
        $this->assertSame('Cambió la portada', $comercio->showcase_note);
    }

    public function test_la_nota_no_puede_ser_un_parrafo(): void
    {
        $comercio = $this->comercio('Dulces Mariana');

        $this->anclar($comercio, ['showcase_note' => str_repeat('a', 121)])
            ->assertSessionHasErrors('showcase_note');
    }

    public function test_un_comercio_no_puede_anclarse_a_si_mismo(): void
    {
        $comercio = $this->comercio('Dulces Mariana');

        $this->actingAs($comercio)
            ->patch(route('admin.comercios.vitrina', $comercio), ['anclado' => true])
            ->assertForbidden();

        $this->assertNull($comercio->fresh()->showcase_at);
    }
}
