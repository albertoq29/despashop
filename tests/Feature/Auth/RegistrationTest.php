<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    /**
     * El registro abre una solicitud: la cuenta existe pero queda pendiente
     * de que un administrador la revise. Ver RegistroYAprobacionTest para el
     * recorrido completo.
     */
    public function test_new_users_register_as_a_pending_request(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'business_name' => 'Comercio de prueba',
            'username' => 'comercio-de-prueba',
            'email' => 'test@example.com',
            'phone' => '+58 414 1112233',
            'whatsapp' => '+58 414 1112233',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'acepta_terminos' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('cuenta.estado', absolute: false));

        $this->assertSame(
            User::STATUS_PENDING,
            User::where('email', 'test@example.com')->value('status')
        );
    }
}
