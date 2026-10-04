<?php

namespace Tests\Feature;

use App\Mail\ConfirmarCorreo;
use App\Mail\RestablecerContrasena;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Confirmación del correo.
 *
 * El caso que rompía: el comercio abre el enlace desde el teléfono, donde
 * no tiene sesión. El middleware lo manda al login guardando la URL, y el
 * login la descartaba por tener la cuenta pendiente — así que iniciaba
 * sesión, no pasaba nada, y la pantalla de estado no mencionaba que
 * faltara confirmar el correo.
 */
class VerificacionDeCorreoTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(array $atributos = []): User
    {
        return User::create([
            'name' => 'Dueña',
            'business_name' => 'Dulces Mariana',
            'username' => 'dulces-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_PENDING,
            ...$atributos,
        ]);
    }

    private function enlace(User $usuario): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $usuario->id,
            'hash' => sha1($usuario->email),
        ]);
    }

    // ── El caso que reportó el tester ─────────────────────────────────────────

    public function test_abrir_el_enlace_sin_sesion_y_entrar_confirma_el_correo(): void
    {
        $usuario = $this->comercio();
        $enlace = $this->enlace($usuario);

        // Desde el teléfono, sin sesión: lo manda al login
        $this->get($enlace)->assertRedirect(route('login'));

        // Inicia sesión y debe retomar el enlace, no perderlo
        $this->post(route('login'), [
            'email' => $usuario->email,
            'password' => 'Clave.Segura9',
        ])->assertRedirect($enlace);

        $this->actingAs($usuario->fresh())->get($enlace);

        $this->assertTrue($usuario->fresh()->hasVerifiedEmail());
    }

    public function test_tras_verificar_una_cuenta_pendiente_va_a_su_pantalla_de_estado(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->get($this->enlace($usuario))
            ->assertRedirect(route('cuenta.estado'));
    }

    public function test_tras_verificar_una_cuenta_aprobada_va_al_panel(): void
    {
        $usuario = $this->comercio(['status' => User::STATUS_APPROVED]);

        $this->actingAs($usuario)
            ->get($this->enlace($usuario))
            ->assertRedirect(route('dashboard'));
    }

    public function test_no_rebota_al_enlace_despues_de_verificar(): void
    {
        $usuario = $this->comercio();
        $enlace = $this->enlace($usuario);

        // El login dejó guardado este mismo enlace como destino
        $this->get($enlace);
        $this->post(route('login'), ['email' => $usuario->email, 'password' => 'Clave.Segura9']);

        $respuesta = $this->actingAs($usuario->fresh())->get($enlace);

        // Antes volvía al propio enlace y daba otra vuelta
        $respuesta->assertRedirect(route('cuenta.estado'));
        $this->assertNull(session('url.intended'));
    }

    public function test_verificar_dos_veces_no_rompe_nada(): void
    {
        $usuario = $this->comercio();
        $enlace = $this->enlace($usuario);

        $this->actingAs($usuario)->get($enlace);
        $this->actingAs($usuario->fresh())->get($enlace)->assertRedirect(route('cuenta.estado'));

        $this->assertTrue($usuario->fresh()->hasVerifiedEmail());
    }

    public function test_el_evento_se_dispara_una_sola_vez(): void
    {
        Event::fake();

        $usuario = $this->comercio();
        $enlace = $this->enlace($usuario);

        $this->actingAs($usuario)->get($enlace);
        $this->actingAs($usuario->fresh())->get($enlace);

        Event::assertDispatchedTimes(Verified::class, 1);
    }

    // ── La pantalla de estado ─────────────────────────────────────────────────

    public function test_la_pantalla_de_estado_dice_si_falta_confirmar(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->get(route('cuenta.estado'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->where('cuenta.verificado', false));

        $usuario->forceFill(['email_verified_at' => now()])->save();

        $this->actingAs($usuario->fresh())
            ->get(route('cuenta.estado'))
            ->assertInertia(fn ($pagina) => $pagina->where('cuenta.verificado', true));
    }

    // ── Que no se rompa lo que ya andaba ──────────────────────────────────────

    public function test_un_enlace_adulterado_no_verifica(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->get(route('verification.verify', ['id' => $usuario->id, 'hash' => 'inventado']))
            ->assertForbidden();

        $this->assertFalse($usuario->fresh()->hasVerifiedEmail());
    }

    public function test_entrar_sin_destino_guardado_lleva_a_donde_corresponde(): void
    {
        $pendiente = $this->comercio();
        $aprobado = $this->comercio(['status' => User::STATUS_APPROVED, 'email_verified_at' => now()]);

        $this->post(route('login'), ['email' => $pendiente->email, 'password' => 'Clave.Segura9'])
            ->assertRedirect(route('cuenta.estado'));

        $this->post(route('logout'));

        $this->post(route('login'), ['email' => $aprobado->email, 'password' => 'Clave.Segura9'])
            ->assertRedirect(route('dashboard'));
    }

    // ── Los correos son los nuestros, no los del framework ───────────────────

    public function test_el_correo_de_verificacion_es_el_nuestro(): void
    {
        Notification::fake();

        $usuario = $this->comercio();
        $usuario->sendEmailVerificationNotification();

        Notification::assertSentTo($usuario, VerifyEmail::class, function (VerifyEmail $aviso) use ($usuario) {
            $correo = $aviso->toMail($usuario);

            $this->assertInstanceOf(ConfirmarCorreo::class, $correo);
            $this->assertStringContainsString('Confirma tu correo', $correo->envelope()->subject);

            $html = $correo->render();
            $this->assertStringContainsString('/marca/logo-verde.svg', $html);
            $this->assertStringContainsString('Confirmar mi correo', $html);
            // El del framework venía en inglés
            $this->assertStringNotContainsString('Verify Email Address', $html);

            return true;
        });
    }

    public function test_el_correo_de_recuperacion_es_el_nuestro(): void
    {
        Notification::fake();

        $usuario = $this->comercio();

        $this->post(route('password.email'), ['email' => $usuario->email]);

        Notification::assertSentTo($usuario, ResetPassword::class, function (ResetPassword $aviso) use ($usuario) {
            $correo = $aviso->toMail($usuario);

            $this->assertInstanceOf(RestablecerContrasena::class, $correo);

            $html = $correo->render();
            $this->assertStringContainsString('/marca/logo-verde.svg', $html);
            $this->assertStringContainsString('Elegir contraseña nueva', $html);
            // El aviso de seguridad, que importa más de lo que parece
            $this->assertStringContainsString('¿No pediste esto?', $html);
            $this->assertStringNotContainsString('Reset Password Notification', $html);

            return true;
        });
    }

    public function test_el_enlace_de_recuperacion_lleva_al_formulario(): void
    {
        $usuario = $this->comercio();
        $enlace = route('password.reset', ['token' => 'abc123', 'email' => $usuario->email]);

        $html = (new RestablecerContrasena($usuario, $enlace))->render();

        $this->assertStringContainsString('abc123', $html);
    }
}
