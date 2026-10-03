<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use App\Support\Terminos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Condiciones de uso: se pueden leer sin cuenta, hay que aceptarlas para
 * registrarse y queda constancia de qué versión aceptó cada comercio.
 */
class TerminosTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function solicitud(array $cambios = []): array
    {
        return [
            'name' => 'Ana Pérez',
            'business_name' => 'Flores Ana',
            'username' => 'flores-ana',
            'email' => 'ana@ejemplo.test',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'acepta_terminos' => true,
            ...$cambios,
        ];
    }

    public function test_cualquiera_puede_leer_los_terminos(): void
    {
        $this->get(route('terminos'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Legales/Terminos')
                ->where('version', Terminos::VERSION)
                ->has('secciones'));
    }

    public function test_los_terminos_dicen_lo_que_tienen_que_decir(): void
    {
        $texto = json_encode(Terminos::secciones(), JSON_UNESCAPED_UNICODE);

        foreach ([
            'Venezuela',            // marco legal
            'inteligencia artificial',
            'registro de la actividad',
            'Armas',
            'Drogas',
            'revocar el acceso',
        ] as $esperado) {
            $this->assertStringContainsString($esperado, $texto);
        }
    }

    public function test_no_se_puede_pedir_una_cuenta_sin_aceptar(): void
    {
        $this->post(route('register'), $this->solicitud(['acepta_terminos' => false]))
            ->assertSessionHasErrors('acepta_terminos');

        $this->assertSame(0, User::where('email', 'ana@ejemplo.test')->count());
    }

    public function test_al_aceptar_queda_la_fecha_y_la_version(): void
    {
        Plan::create(['name' => 'Inicial', 'price_usd' => 0]);

        $this->post(route('register'), $this->solicitud())
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('cuenta.estado'));

        $comercio = User::where('email', 'ana@ejemplo.test')->sole();

        $this->assertNotNull($comercio->terms_accepted_at);
        $this->assertSame(Terminos::VERSION, $comercio->terms_version);
    }
}
