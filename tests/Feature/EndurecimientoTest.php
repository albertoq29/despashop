<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Archivos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Los agujeros que cerró la revisión de seguridad.
 *
 * Cada prueba describe el ataque concreto que evita, porque dentro de un
 * año el valor de estas líneas no será el código que cubren sino el
 * recordar por qué estaban ahí.
 */
class EndurecimientoTest extends TestCase
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
            'status' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
            ...$atributos,
        ]);
    }

    // ── 1. Registro y recuperación con freno ──────────────────────────────────

    public function test_no_se_pueden_crear_cuentas_en_masa(): void
    {
        $datos = fn (int $n) => [
            'name' => 'Persona',
            'business_name' => "Negocio {$n}",
            'username' => "negocio-{$n}",
            'email' => "persona{$n}@ejemplo.test",
            'phone' => '+58 412 0000000',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
            'terms' => true,
        ];

        // El sexto intento desde la misma procedencia ya no pasa
        for ($i = 1; $i <= 5; $i++) {
            $this->post(route('register'), $datos($i));
        }

        $this->post(route('register'), $datos(6))->assertStatus(429);
    }

    public function test_no_se_puede_inundar_un_buzon_con_recuperaciones(): void
    {
        $comercio = $this->comercio();

        for ($i = 0; $i < 5; $i++) {
            $this->post(route('password.email'), ['email' => $comercio->email]);
        }

        $this->post(route('password.email'), ['email' => $comercio->email])->assertStatus(429);
    }

    public function test_el_formulario_de_restablecer_tambien_tiene_freno(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->post(route('password.store'), [
                'token' => 'inventado',
                'email' => 'alguien@ejemplo.test',
                'password' => 'Clave.Segura9',
                'password_confirmation' => 'Clave.Segura9',
            ]);
        }

        $this->post(route('password.store'), [
            'token' => 'inventado',
            'email' => 'alguien@ejemplo.test',
            'password' => 'Clave.Segura9',
            'password_confirmation' => 'Clave.Segura9',
        ])->assertStatus(429);
    }

    public function test_entrar_una_vez_sigue_funcionando(): void
    {
        $comercio = $this->comercio();

        $this->post(route('login'), ['email' => $comercio->email, 'password' => 'Clave.Segura9'])
            ->assertRedirect();

        $this->assertAuthenticatedAs($comercio->fresh());
    }

    // ── 2. Nada de SVG en las subidas ─────────────────────────────────────────

    /** Un SVG con un script dentro, que es exactamente lo que se evita. */
    private function svgConScript(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'logo.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>',
        );
    }

    public function test_un_producto_no_acepta_un_svg(): void
    {
        Storage::fake('public');

        $this->actingAs($this->comercio())
            ->post(route('productos.store'), [
                'name' => 'Torta',
                'price_usdt' => 25,
                'image' => $this->svgConScript(),
            ])
            ->assertSessionHasErrors('image');
    }

    public function test_las_fotos_privadas_tampoco(): void
    {
        Storage::fake('public');

        $this->actingAs($this->comercio())
            ->post(route('productos.store'), [
                'name' => 'Torta',
                'price_usdt' => 25,
                'private_photos' => [$this->svgConScript()],
            ])
            ->assertSessionHasErrors('private_photos.0');
    }

    public function test_la_portada_del_catalogo_tampoco(): void
    {
        Storage::fake('public');

        $this->actingAs($this->comercio())
            ->post(route('catalogo.imagen', 'cover'), ['imagen' => $this->svgConScript()])
            ->assertSessionHasErrors('imagen');
    }

    public function test_una_foto_de_verdad_sigue_entrando(): void
    {
        Storage::fake('public');

        $this->actingAs($this->comercio())
            ->post(route('productos.store'), [
                'name' => 'Torta',
                'price_usdt' => 25,
                'stock' => 4,
                'image' => UploadedFile::fake()->image('torta.jpg', 800, 600),
            ])
            ->assertSessionHasNoErrors();
    }

    public function test_los_formatos_permitidos_no_incluyen_svg(): void
    {
        $this->assertStringNotContainsString('svg', Archivos::FORMATOS);
    }

    // ── 3. Cambiar la contraseña echa a los demás ─────────────────────────────

    public function test_cambiar_la_contrasena_guarda_la_nueva(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->put(route('password.update'), [
                'current_password' => 'Clave.Segura9',
                'password' => 'Otra.Clave.Larga7',
                'password_confirmation' => 'Otra.Clave.Larga7',
            ])
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('Otra.Clave.Larga7', $comercio->fresh()->password));
    }

    public function test_la_sesion_de_otro_navegador_deja_de_valer(): void
    {
        $comercio = $this->comercio();
        $hashDeAntes = $comercio->password;

        $this->actingAs($comercio)->put(route('password.update'), [
            'current_password' => 'Clave.Segura9',
            'password' => 'Otra.Clave.Larga7',
            'password_confirmation' => 'Otra.Clave.Larga7',
        ]);

        // Una sesión abierta en otro navegador se quedó con el hash de antes
        $this->actingAs($comercio->fresh())
            ->withSession(['password_hash_web' => $hashDeAntes])
            ->get(route('dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_una_sesion_al_dia_sigue_entrando(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->withSession(['password_hash_web' => $comercio->password])
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_quien_cambia_la_contrasena_no_se_echa_a_si_mismo(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)->put(route('password.update'), [
            'current_password' => 'Clave.Segura9',
            'password' => 'Otra.Clave.Larga7',
            'password_confirmation' => 'Otra.Clave.Larga7',
        ]);

        $this->get(route('dashboard'))->assertOk();
    }

    public function test_sin_la_contrasena_actual_no_se_cambia_nada(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->put(route('password.update'), [
                'current_password' => 'la-que-no-es',
                'password' => 'Otra.Clave.Larga7',
                'password_confirmation' => 'Otra.Clave.Larga7',
            ])
            ->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('Clave.Segura9', $comercio->fresh()->password));
    }
}
