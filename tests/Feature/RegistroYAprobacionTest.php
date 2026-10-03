<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\InvoiceTemplate;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Las cuentas se revisan a mano: el registro crea una solicitud, no un
 * comercio activo. Hasta que un administrador la aprueba, la cuenta no
 * entra al panel y su catálogo no existe para el público.
 */
class RegistroYAprobacionTest extends TestCase
{
    use RefreshDatabase;

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

    private function datosDeSolicitud(array $extra = []): array
    {
        return [
            'name' => 'Ana Rivas',
            'business_name' => 'Flores Rivas',
            'username' => 'floresrivas',
            'email' => 'ana@ejemplo.test',
            'phone' => '+58 414 1112233',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'acepta_terminos' => true,
            ...$extra,
        ];
    }

    public function test_el_registro_crea_una_solicitud_pendiente(): void
    {
        $this->post('/register', $this->datosDeSolicitud())
            ->assertRedirect(route('cuenta.estado'));

        $usuario = User::where('email', 'ana@ejemplo.test')->first();

        $this->assertNotNull($usuario);
        $this->assertSame(User::STATUS_PENDING, $usuario->status);
        $this->assertSame(User::ROLE_TENANT, $usuario->role);
        $this->assertSame('floresrivas', $usuario->username);
    }

    public function test_una_cuenta_recien_creada_primero_confirma_su_correo(): void
    {
        $this->post('/register', $this->datosDeSolicitud());

        // Sin confirmar el correo no se llega ni a la pantalla de estado
        $this->get('/dashboard')->assertRedirect(route('verification.notice'));
        $this->get('/productos')->assertRedirect(route('verification.notice'));
    }

    public function test_una_cuenta_pendiente_no_entra_al_panel(): void
    {
        $this->post('/register', $this->datosDeSolicitud());

        $usuario = User::where('email', 'ana@ejemplo.test')->sole();
        $usuario->forceFill(['email_verified_at' => now()])->save();

        // El guardia conserva el usuario que se registró: hay que refrescarlo
        $this->actingAs($usuario->fresh());

        $this->get('/dashboard')->assertRedirect(route('cuenta.estado'));
        $this->get('/productos')->assertRedirect(route('cuenta.estado'));
        $this->get(route('cuenta.estado'))->assertOk();
    }

    public function test_el_catalogo_de_una_solicitud_pendiente_no_es_publico(): void
    {
        $this->post('/register', $this->datosDeSolicitud());
        $this->post('/logout');

        $this->get('/floresrivas')->assertNotFound();
    }

    public function test_el_nombre_de_usuario_no_puede_ser_uno_reservado(): void
    {
        $this->post('/register', $this->datosDeSolicitud(['username' => 'admin']))
            ->assertSessionHasErrors('username');

        $this->assertDatabaseMissing('users', ['email' => 'ana@ejemplo.test']);
    }

    public function test_el_nombre_de_usuario_no_admite_mayusculas_ni_simbolos(): void
    {
        $this->post('/register', $this->datosDeSolicitud(['username' => 'Flores Rivas!']))
            ->assertSessionHasErrors('username');
    }

    public function test_el_nombre_de_usuario_no_puede_repetirse(): void
    {
        $this->post('/register', $this->datosDeSolicitud());
        $this->post('/logout');

        $this->post('/register', $this->datosDeSolicitud(['email' => 'otra@ejemplo.test']))
            ->assertSessionHasErrors('username');
    }

    public function test_al_aprobar_se_activa_la_cuenta_y_queda_lista_para_usar(): void
    {
        $plan = Plan::create(['name' => 'Emprendedor', 'slug' => 'emprendedor', 'price_usd' => 9]);

        $this->post('/register', $this->datosDeSolicitud());
        $this->post('/logout');

        $solicitante = User::where('email', 'ana@ejemplo.test')->first();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.comercios.aprobar', $solicitante->id), ['plan_id' => $plan->id])
            ->assertRedirect();

        $solicitante->refresh();

        $this->assertSame(User::STATUS_APPROVED, $solicitante->status);
        $this->assertSame($plan->id, $solicitante->plan_id);
        $this->assertSame($admin->id, $solicitante->reviewed_by);
        $this->assertNotNull($solicitante->reviewed_at);

        // El aprovisionamiento deja el catálogo y la factura listos
        $this->assertTrue(
            CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $solicitante->id)->exists()
        );
        $this->assertTrue(
            InvoiceTemplate::withoutGlobalScope('tenant')->where('user_id', $solicitante->id)->exists()
        );

        $this->get('/floresrivas')->assertOk();
    }

    public function test_al_rechazar_se_guarda_el_motivo_y_lo_ve_el_solicitante(): void
    {
        $this->post('/register', $this->datosDeSolicitud());
        $this->post('/logout');

        $solicitante = User::where('email', 'ana@ejemplo.test')->first();

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.rechazar', $solicitante->id), [
                'rejection_reason' => 'Faltan datos del comercio.',
            ]);

        $solicitante->refresh();

        $this->assertSame(User::STATUS_REJECTED, $solicitante->status);
        $this->assertSame('Faltan datos del comercio.', $solicitante->rejection_reason);

        $this->actingAs($solicitante)
            ->get(route('cuenta.estado'))
            ->assertOk()
            ->assertSee('Faltan datos del comercio.');
    }

    public function test_el_rechazo_exige_un_motivo(): void
    {
        $this->post('/register', $this->datosDeSolicitud());
        $this->post('/logout');

        $solicitante = User::where('email', 'ana@ejemplo.test')->first();

        $this->actingAs($this->admin())
            ->post(route('admin.comercios.rechazar', $solicitante->id), [])
            ->assertSessionHasErrors('rejection_reason');

        $this->assertSame(User::STATUS_PENDING, $solicitante->fresh()->status);
    }

    public function test_un_comercio_no_puede_aprobarse_a_si_mismo(): void
    {
        $this->post('/register', $this->datosDeSolicitud());

        $solicitante = User::where('email', 'ana@ejemplo.test')->first();

        $this->actingAs($solicitante)
            ->post(route('admin.comercios.aprobar', $solicitante->id))
            ->assertForbidden();

        $this->assertSame(User::STATUS_PENDING, $solicitante->fresh()->status);
    }

    public function test_al_iniciar_sesion_cada_rol_llega_a_su_panel(): void
    {
        $admin = $this->admin();

        $this->post('/login', ['email' => $admin->email, 'password' => 'Clave.Segura9'])
            ->assertRedirect(route('admin.dashboard'));
    }
}
