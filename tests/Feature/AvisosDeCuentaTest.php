<?php

namespace Tests\Feature;

use App\Mail\CuentaAprobada;
use App\Mail\EstadoDeCuenta;
use App\Mail\NuevaSolicitud;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use App\Support\Terminos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Los dos correos que rodean el alta de una cuenta.
 *
 * Son los que sostienen un proceso que se aprueba a mano: sin el aviso al
 * administrador la solicitud espera a que alguien se acuerde de mirar, y sin
 * el de aprobación el comercio no sabe que ya puede entrar. Por eso también
 * se fija aquí que un fallo de correo no tumbe ninguna de las dos acciones.
 */
class AvisosDeCuentaTest extends TestCase
{
    use RefreshDatabase;

    private function admin(string $correo = 'admin@ejemplo.test'): User
    {
        return User::create([
            'name' => 'Administrador',
            'email' => $correo,
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
        ]);
    }

    private function solicitante(array $atributos = []): User
    {
        return User::create([
            'name' => 'Dueña',
            'business_name' => 'Dulces Mariana',
            'username' => 'dulces-mariana',
            'email' => 'duena@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_PENDING,
            ...$atributos,
        ]);
    }

    // ── Aviso al comercio cuando lo aprueban ──────────────────────────────────

    public function test_al_aprobar_le_llega_el_correo_al_comercio(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante();

        $this->actingAs($admin)
            ->post(route('admin.comercios.aprobar', $comercio))
            ->assertSessionHasNoErrors();

        Mail::assertSent(CuentaAprobada::class, function (CuentaAprobada $correo) use ($comercio) {
            return $correo->hasTo($comercio->email)
                && $correo->comercio->is($comercio);
        });
    }

    public function test_el_correo_lleva_la_direccion_del_catalogo(): void
    {
        $comercio = $this->solicitante();
        $comercio->forceFill(['status' => User::STATUS_APPROVED])->save();

        $contenido = (new CuentaAprobada($comercio->fresh()))->render();

        $this->assertStringContainsString('dulces-mariana', $contenido);
        $this->assertStringContainsString('Dulces Mariana', $contenido);
        // El logo de la marca, que es lo que el usuario pidió explícitamente
        $this->assertStringContainsString('/marca/logo-verde.svg', $contenido);
    }

    public function test_aprobar_funciona_aunque_el_correo_falle(): void
    {
        $admin = $this->admin();
        $comercio = $this->solicitante();

        // Sin servidor de correo configurado el envío lanza; la aprobación
        // no puede depender de eso
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'no-existe.invalid']);

        $this->actingAs($admin)
            ->post(route('admin.comercios.aprobar', $comercio))
            ->assertSessionHasNoErrors();

        $this->assertSame(User::STATUS_APPROVED, $comercio->fresh()->status);
    }

    public function test_no_se_intenta_enviar_si_el_correo_es_invalido(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante();
        $comercio->forceFill(['email' => 'esto-no-es-un-correo'])->save();

        $this->actingAs($admin)->post(route('admin.comercios.aprobar', $comercio));

        Mail::assertNotSent(CuentaAprobada::class);
    }

    // ── Aviso a los administradores de una solicitud nueva ────────────────────

    public function test_al_registrarse_les_llega_el_aviso_a_los_administradores(): void
    {
        Mail::fake();

        $this->admin('uno@ejemplo.test');
        $this->admin('dos@ejemplo.test');
        $plan = Plan::create(['slug' => 'emprendedor', 'name' => 'Emprendedor', 'price_usd' => 9]);

        $this->post(route('register'), [
            'name' => 'Luis',
            'business_name' => 'TecnoExpress',
            'username' => 'tecnoexpress',
            'email' => 'luis@ejemplo.test',
            'phone' => '04125558899',
            'whatsapp' => '04125558899',
            'requested_plan_id' => $plan->id,
            'request_message' => 'Vendo accesorios de teléfono',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'acepta_terminos' => true,
        ])->assertSessionHasNoErrors();

        Mail::assertSent(NuevaSolicitud::class, function (NuevaSolicitud $correo) {
            return $correo->hasTo('uno@ejemplo.test')
                && $correo->hasTo('dos@ejemplo.test')
                && $correo->solicitante->username === 'tecnoexpress';
        });
    }

    public function test_el_aviso_trae_lo_necesario_para_decidir(): void
    {
        $plan = Plan::create(['slug' => 'negocio', 'name' => 'Negocio', 'price_usd' => 19]);
        $solicitante = $this->solicitante([
            'phone' => '04125558899',
            'requested_plan_id' => $plan->id,
            'request_message' => 'Hago tortas por encargo',
        ]);

        $contenido = (new NuevaSolicitud($solicitante, 3))->render();

        $this->assertStringContainsString('Dulces Mariana', $contenido);
        $this->assertStringContainsString('dulces-mariana', $contenido);
        $this->assertStringContainsString('duena@ejemplo.test', $contenido);
        $this->assertStringContainsString('04125558899', $contenido);
        $this->assertStringContainsString('Negocio', $contenido);
        $this->assertStringContainsString('Hago tortas por encargo', $contenido);
        $this->assertStringContainsString('3 solicitudes', $contenido);
    }

    public function test_el_asunto_distingue_una_solicitud_de_otra(): void
    {
        $solicitante = $this->solicitante();
        Setting::putPlatform('brand_name', 'Despashop');

        $asunto = (new NuevaSolicitud($solicitante))->envelope()->subject;

        $this->assertStringContainsString('Dulces Mariana', $asunto);
    }

    public function test_registrarse_funciona_aunque_no_haya_administradores(): void
    {
        Mail::fake();

        $this->post(route('register'), [
            'name' => 'Luis',
            'business_name' => 'TecnoExpress',
            'username' => 'tecnoexpress',
            'email' => 'luis@ejemplo.test',
            'phone' => '04125558899',
            'whatsapp' => '04125558899',
            'requested_plan_id' => Plan::public()->value('id'),
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'acepta_terminos' => true,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('users', ['username' => 'tecnoexpress']);
        Mail::assertNotSent(NuevaSolicitud::class);
    }

    public function test_el_correo_configurado_manda_sobre_los_administradores(): void
    {
        Mail::fake();

        $this->admin('uno@ejemplo.test');
        Setting::putPlatform('security_email', 'seguridad@ejemplo.test');

        // El aviso de solicitudes va a todos los administradores; el de
        // seguridad respeta la dirección configurada. Son listas distintas
        // a propósito: no es el mismo trabajo revisar altas que incidentes.
        $this->assertSame(['seguridad@ejemplo.test'], \App\Support\Administradores::correos('security_email'));
        $this->assertSame(['uno@ejemplo.test'], \App\Support\Administradores::correos());
    }

    // ── Cambios de estado ─────────────────────────────────────────────────────

    /** @param  array<string, string>  $datos */
    private function cambiarEstado(User $admin, User $comercio, string $nuevo)
    {
        return $this->actingAs($admin)->patch(route('admin.comercios.estado', $comercio), ['status' => $nuevo]);
    }

    public function test_al_suspender_se_le_avisa_al_comercio(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante(['status' => User::STATUS_APPROVED]);

        $this->cambiarEstado($admin, $comercio, User::STATUS_SUSPENDED)->assertSessionHasNoErrors();

        Mail::assertSent(EstadoDeCuenta::class, fn (EstadoDeCuenta $c) => $c->cambio === EstadoDeCuenta::SUSPENDIDA
            && $c->hasTo($comercio->email));
    }

    public function test_al_volver_a_pendiente_se_le_avisa(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante(['status' => User::STATUS_APPROVED]);

        $this->cambiarEstado($admin, $comercio, User::STATUS_PENDING)->assertSessionHasNoErrors();

        Mail::assertSent(EstadoDeCuenta::class, fn (EstadoDeCuenta $c) => $c->cambio === EstadoDeCuenta::PENDIENTE);
    }

    public function test_reactivar_una_suspendida_manda_el_correo_de_vuelta_no_el_de_bienvenida(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante(['status' => User::STATUS_SUSPENDED]);

        $this->cambiarEstado($admin, $comercio, User::STATUS_APPROVED)->assertSessionHasNoErrors();

        Mail::assertSent(EstadoDeCuenta::class, fn (EstadoDeCuenta $c) => $c->cambio === EstadoDeCuenta::REACTIVADA);
        Mail::assertNotSent(CuentaAprobada::class);
    }

    public function test_activar_una_pendiente_desde_el_estado_manda_la_bienvenida(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante(['status' => User::STATUS_PENDING]);

        $this->cambiarEstado($admin, $comercio, User::STATUS_APPROVED)->assertSessionHasNoErrors();

        // Antes este camino no avisaba nada: solo lo hacía el botón de aprobar
        Mail::assertSent(CuentaAprobada::class);
        Mail::assertNotSent(EstadoDeCuenta::class);
    }

    public function test_no_se_avisa_si_el_estado_no_cambia(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $comercio = $this->solicitante(['status' => User::STATUS_SUSPENDED]);

        $this->cambiarEstado($admin, $comercio, User::STATUS_SUSPENDED);

        Mail::assertNothingSent();
    }

    public function test_los_tres_correos_dicen_que_no_se_pierde_nada(): void
    {
        $comercio = $this->solicitante();

        foreach ([EstadoDeCuenta::SUSPENDIDA, EstadoDeCuenta::PENDIENTE, EstadoDeCuenta::REACTIVADA] as $cambio) {
            $contenido = (new EstadoDeCuenta($comercio, $cambio))->render();

            $this->assertStringContainsString('Dulces Mariana', $contenido);
            $this->assertStringContainsString('/marca/logo-verde.svg', $contenido);
            $this->assertStringContainsString($cambio === EstadoDeCuenta::REACTIVADA ? 'Nada de lo tuyo se perdió' : 'Tu información está intacta', $contenido);
        }
    }

    public function test_suspender_funciona_aunque_el_correo_falle(): void
    {
        $admin = $this->admin();
        $comercio = $this->solicitante(['status' => User::STATUS_APPROVED]);

        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'no-existe.invalid']);

        $this->cambiarEstado($admin, $comercio, User::STATUS_SUSPENDED)->assertSessionHasNoErrors();

        $this->assertSame(User::STATUS_SUSPENDED, $comercio->fresh()->status);
    }
}
