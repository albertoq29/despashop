<?php

namespace Tests\Feature;

use App\Mail\MensajeDelAdmin;
use App\Models\CatalogTheme;
use App\Models\Factura;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\FiltrosDeComercios;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Escribirle a los comercios que cumplen ciertas condiciones.
 *
 * Un filtro mal puesto aquí no se puede deshacer: el correo ya salió. Por eso
 * cada condición se comprueba por separado y se vigila que no alcance a quien
 * no toca —una cuenta pendiente, un administrador, otro comercio activo—.
 */
class CorreosDelAdminTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->admin = User::create([
            'name' => 'Admin',
            'username' => 'admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);
    }

    private function comercio(string $usuario, array $atributos = []): User
    {
        $comercio = User::create([
            'name' => 'Dueño',
            'business_name' => 'Comercio ' . $usuario,
            'username' => $usuario,
            'email' => $usuario . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            ...$atributos,
        ]);

        app(CatalogProvisioner::class)->provision($comercio);

        // Un catálogo nace publicado; estas pruebas parten de lo contrario
        $this->publicar($comercio, false);

        return $comercio;
    }

    private function publicar(User $comercio, bool $publicado = true): void
    {
        CatalogTheme::withoutGlobalScope('tenant')
            ->where('user_id', $comercio->id)
            ->update(['is_published' => $publicado]);
    }

    /** @param  list<string>  $condiciones */
    private function alcanza(array $condiciones, array $dias = []): array
    {
        return FiltrosDeComercios::consulta($condiciones, $dias)->pluck('username')->sort()->values()->all();
    }

    /* ── Las condiciones ────────────────────────────────────────────────── */

    public function test_alcanza_a_quien_hace_tiempo_que_no_entra(): void
    {
        $this->comercio('dormido', ['last_login_at' => now()->subDays(60)]);
        $this->comercio('activo', ['last_login_at' => now()->subDays(2)]);
        // Quien nunca entró es la inactividad más larga que hay
        $this->comercio('nunca', ['last_login_at' => null]);

        $this->assertSame(['dormido', 'nunca'], $this->alcanza(['sin_entrar'], ['sin_entrar' => 30]));
    }

    public function test_alcanza_a_quien_no_publico(): void
    {
        $this->publicar($this->comercio('publicado'));
        $this->comercio('guardado');

        $this->assertSame(['guardado'], $this->alcanza(['sin_publicar']));
    }

    public function test_alcanza_a_quien_no_cargo_productos(): void
    {
        $con = $this->comercio('concosas');
        app(Tenancy::class)->forTenant($con->id, fn () => Product::create(['name' => 'Algo', 'stock' => 1]));

        $this->comercio('vacio');

        $this->assertSame(['vacio'], $this->alcanza(['sin_productos']));
    }

    public function test_alcanza_a_quien_no_ha_facturado(): void
    {
        $con = $this->comercio('factura');
        Factura::create(['user_id' => $con->id, 'client_name' => 'Cliente', 'status' => 'draft']);

        $this->comercio('nofactura');

        $this->assertSame(['nofactura'], $this->alcanza(['sin_facturas']));
    }

    public function test_alcanza_a_quien_hace_tiempo_que_no_factura(): void
    {
        $viejo = $this->comercio('viejo');
        Factura::create(['user_id' => $viejo->id, 'client_name' => 'C', 'status' => 'draft'])
            ->forceFill(['created_at' => now()->subDays(120)])->save();

        $reciente = $this->comercio('reciente');
        Factura::create(['user_id' => $reciente->id, 'client_name' => 'C', 'status' => 'draft']);

        $this->assertSame(['viejo'], $this->alcanza(['sin_vender'], ['sin_vender' => 90]));
    }

    public function test_alcanza_a_quien_no_tiene_plan_o_lo_tiene_vencido(): void
    {
        $this->comercio('sinplan', ['plan_id' => null]);
        $this->comercio('vencido', ['plan_expires_at' => now()->subDay()]);
        $this->comercio('aldia', ['plan_expires_at' => now()->addMonth()]);

        $this->assertContains('sinplan', $this->alcanza(['sin_plan']));
        $this->assertSame(['vencido'], $this->alcanza(['plan_vencido']));
    }

    /**
     * Las condiciones se suman con «y»: quien lleva un mes sin entrar y
     * además nunca publicó es un solo envío, no dos.
     */
    public function test_las_condiciones_se_combinan(): void
    {
        $this->comercio('ambas', ['last_login_at' => now()->subDays(60)]);

        $soloDormido = $this->comercio('soloDormido', ['last_login_at' => now()->subDays(60)]);
        $this->publicar($soloDormido);

        $this->comercio('soloSinPublicar', ['last_login_at' => now()]);

        $this->assertSame(['ambas'], $this->alcanza(['sin_entrar', 'sin_publicar'], ['sin_entrar' => 30]));
    }

    /* ── A quién nunca se le escribe ────────────────────────────────────── */

    public function test_no_alcanza_a_pendientes_suspendidos_ni_al_admin(): void
    {
        $this->comercio('pendiente', ['status' => User::STATUS_PENDING]);
        $this->comercio('suspendido', ['status' => User::STATUS_SUSPENDED]);
        $this->comercio('bueno');

        $alcanzados = $this->alcanza(['sin_publicar']);

        $this->assertSame(['bueno'], $alcanzados);
        $this->assertNotContains('admin', $alcanzados);
    }

    public function test_una_condicion_inventada_no_abre_la_puerta(): void
    {
        $this->comercio('uno');
        $this->comercio('dos');

        // Si se ignorara sin más, quedaría la consulta sin filtrar: todos
        $this->assertSame(['dos', 'uno'], $this->alcanza(['lo_que_sea']));
    }

    /* ── El envío ───────────────────────────────────────────────────────── */

    public function test_le_llega_a_todos_los_que_cumplen(): void
    {
        $this->comercio('uno', ['last_login_at' => now()->subDays(90)]);
        $this->comercio('dos', ['last_login_at' => now()->subDays(90)]);
        $this->comercio('tres', ['last_login_at' => now()]);

        $this->actingAs($this->admin)
            ->post(route('admin.correos.store'), [
                'condiciones' => ['sin_entrar'],
                'dias' => ['sin_entrar' => 30],
                'titulo' => '{nombre}, te extrañamos',
                'cuerpo' => "Hace rato que no entras.\n\nTu catálogo sigue ahí.",
            ])
            ->assertSessionHasNoErrors();

        Mail::assertSent(MensajeDelAdmin::class, 2);
        Mail::assertSent(MensajeDelAdmin::class, fn ($correo) => $correo->hasTo('uno@ejemplo.test'));
        Mail::assertNotSent(MensajeDelAdmin::class, fn ($correo) => $correo->hasTo('tres@ejemplo.test'));
    }

    public function test_sin_condiciones_no_se_envia_nada(): void
    {
        $this->comercio('uno');

        $this->actingAs($this->admin)
            ->post(route('admin.correos.store'), [
                'condiciones' => [],
                'titulo' => 'Hola',
                'cuerpo' => 'Mensaje',
            ])
            ->assertSessionHasErrors('condiciones');

        Mail::assertNothingSent();
    }

    public function test_un_comercio_no_puede_escribirle_a_los_demas(): void
    {
        $comercio = $this->comercio('curioso');

        $respuesta = $this->actingAs($comercio)->post(route('admin.correos.store'), [
            'condiciones' => ['sin_publicar'],
            'titulo' => 'Hola',
            'cuerpo' => 'Mensaje',
        ]);

        // Que lo frene un 403 o una redirección es cosa del middleware; lo que
        // importa es que no salió ninguna campaña. El intento sí dispara un
        // aviso de seguridad al admin, que es justo lo que debe pasar.
        $this->assertContains($respuesta->getStatusCode(), [403, 302]);
        Mail::assertNotSent(MensajeDelAdmin::class);
    }

    public function test_la_pantalla_dice_a_cuantos_alcanza(): void
    {
        $this->comercio('uno', ['last_login_at' => now()->subDays(90)]);
        $this->comercio('dos', ['last_login_at' => now()]);

        $this->actingAs($this->admin)
            ->get(route('admin.correos.index', ['condiciones' => ['sin_entrar'], 'dias' => ['sin_entrar' => 30]]))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('Admin/Correos/Index')
                ->where('alcance.total', 1)
                ->where('alcance.muestra.0.nombre', 'Comercio uno'));
    }

    /* ── El correo ──────────────────────────────────────────────────────── */

    public function test_el_nombre_se_sustituye_y_el_cuerpo_va_en_parrafos(): void
    {
        $comercio = $this->comercio('panaderia');

        $correo = new MensajeDelAdmin(
            comercio: $comercio,
            titulo: '{nombre}, una novedad',
            cuerpo: "Primera idea.\n\nSegunda idea.",
        );

        $datos = $correo->content()->with;

        $this->assertSame('Comercio panaderia, una novedad', $datos['titulo']);
        $this->assertSame(['Primera idea.', 'Segunda idea.'], $datos['parrafos']);
    }

    public function test_lo_que_escribe_el_admin_no_es_marcado(): void
    {
        $comercio = $this->comercio('tienda');

        Mail::to($comercio->email)->send(new MensajeDelAdmin(
            comercio: $comercio,
            titulo: 'Aviso',
            cuerpo: '<script>alert(1)</script> Hola',
        ));

        Mail::assertSent(MensajeDelAdmin::class, function ($correo) {
            // Blade escapa: el guion sale como texto, no como etiqueta
            $cuerpo = $correo->render();

            return str_contains($cuerpo, '&lt;script&gt;') && ! str_contains($cuerpo, '<script>alert');
        });
    }
}
