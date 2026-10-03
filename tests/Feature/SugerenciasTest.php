<?php

namespace Tests\Feature;

use App\Models\Suggestion;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Buzón de sugerencias y errores: lo que el comercio manda, lo que el admin
 * ve y contesta, y que ningún comercio lea lo de otro.
 */
class SugerenciasTest extends TestCase
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

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Dueño',
            'business_name' => 'Comercio',
            'username' => 'comercio-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            ...$atributos,
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    private function mensajeDe(User $comercio, array $atributos = []): Suggestion
    {
        return app(Tenancy::class)->forTenant($comercio->id, fn () => Suggestion::create([
            'type' => Suggestion::SUGERENCIA,
            'subject' => 'Poder duplicar un producto',
            'body' => 'Cuando cargo productos parecidos repito todo desde cero.',
            ...$atributos,
        ]));
    }

    public function test_el_comercio_envia_una_sugerencia(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('sugerencias.store'), [
                'type' => 'sugerencia',
                'subject' => 'Poder duplicar un producto',
                'body' => 'Cuando cargo productos parecidos repito todo desde cero y pierdo tiempo.',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $mensaje = Suggestion::withoutGlobalScope('tenant')->sole();

        $this->assertSame($comercio->id, $mensaje->user_id);
        $this->assertSame(Suggestion::NUEVA, $mensaje->status);
        $this->assertNull($mensaje->read_at);
    }

    public function test_un_error_guarda_la_pantalla_y_la_captura(): void
    {
        Storage::fake(Archivos::DISCO);

        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('sugerencias.store'), [
                'type' => 'error',
                'subject' => 'No puedo guardar una factura',
                'body' => 'Elegí dos productos, toqué Guardar y la pantalla se quedó cargando para siempre.',
                'page' => 'Facturas',
                'image' => UploadedFile::fake()->image('captura.png'),
            ])
            ->assertSessionHasNoErrors();

        $mensaje = Suggestion::withoutGlobalScope('tenant')->sole();

        $this->assertTrue($mensaje->esError());
        $this->assertSame('Facturas', $mensaje->page);
        $this->assertNotNull($mensaje->image_path);
        Storage::disk(Archivos::DISCO)->assertExists($mensaje->image_path);
    }

    public function test_el_mensaje_no_puede_ir_vacio(): void
    {
        $this->actingAs($this->comercio())
            ->post(route('sugerencias.store'), ['type' => 'sugerencia', 'subject' => 'Hola', 'body' => 'corto'])
            ->assertSessionHasErrors('body');

        $this->assertSame(0, Suggestion::withoutGlobalScope('tenant')->count());
    }

    public function test_cada_comercio_ve_solo_lo_suyo(): void
    {
        $mio = $this->comercio();
        $ajeno = $this->comercio();

        $this->mensajeDe($mio, ['subject' => 'Lo mío']);
        $this->mensajeDe($ajeno, ['subject' => 'Lo del otro']);

        $this->actingAs($mio)
            ->get(route('sugerencias.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Sugerencias/Index')
                ->has('mensajes', 1)
                ->where('mensajes.0.subject', 'Lo mío'));
    }

    public function test_el_comercio_retira_un_mensaje_que_nadie_leyo(): void
    {
        $comercio = $this->comercio();
        $mensaje = $this->mensajeDe($comercio);

        $this->actingAs($comercio)->delete(route('sugerencias.destroy', $mensaje->id))->assertRedirect();

        $this->assertSame(0, Suggestion::withoutGlobalScope('tenant')->count());
    }

    public function test_no_se_puede_retirar_un_mensaje_ya_leido(): void
    {
        $comercio = $this->comercio();
        $mensaje = $this->mensajeDe($comercio, ['read_at' => now()]);

        $this->actingAs($comercio)->delete(route('sugerencias.destroy', $mensaje->id))->assertForbidden();

        $this->assertSame(1, Suggestion::withoutGlobalScope('tenant')->count());
    }

    public function test_el_comercio_no_borra_el_mensaje_de_otro(): void
    {
        $ajeno = $this->comercio();
        $mensaje = $this->mensajeDe($ajeno);

        $this->actingAs($this->comercio())
            ->delete(route('sugerencias.destroy', $mensaje->id))
            ->assertNotFound();

        $this->assertSame(1, Suggestion::withoutGlobalScope('tenant')->count());
    }

    public function test_el_admin_ve_los_mensajes_de_todos_y_bajan_de_la_insignia(): void
    {
        $uno = $this->comercio();
        $otro = $this->comercio();
        $this->mensajeDe($uno);
        $this->mensajeDe($otro, ['type' => Suggestion::ERROR, 'subject' => 'Pantalla en blanco']);

        $this->actingAs($this->admin())
            ->get(route('admin.sugerencias.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Admin/Sugerencias/Index')
                ->has('mensajes.data', 2)
                ->where('conteos.sin_leer', 2)
                ->where('conteos.errores', 1)
                // La insignia ya refleja que acaba de verlos
                ->where('sugerencias.sin_leer', 0));

        $this->assertSame(0, Suggestion::withoutGlobalScope('tenant')->sinLeer()->count());
    }

    public function test_el_admin_responde_y_el_comercio_lo_ve(): void
    {
        $admin = $this->admin();
        $comercio = $this->comercio();
        $mensaje = $this->mensajeDe($comercio);

        $this->actingAs($admin)
            ->patch(route('admin.sugerencias.update', $mensaje->id), ['reply' => 'Buena idea, queda anotada para la próxima versión.'])
            ->assertSessionHasNoErrors();

        $mensaje->refresh();

        $this->assertSame('Buena idea, queda anotada para la próxima versión.', $mensaje->reply);
        $this->assertSame($admin->id, $mensaje->replied_by);
        // Contestar sin elegir estado deja el asunto en marcha
        $this->assertSame(Suggestion::EN_PROCESO, $mensaje->status);

        // El comercio ve la respuesta pendiente en su insignia...
        $this->actingAs($comercio)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->where('sugerencias.respuestas', 1));

        // ...y deja de estar pendiente cuando abre el buzón
        $this->actingAs($comercio)->get(route('sugerencias.index'))->assertOk();

        $this->assertNotNull($mensaje->fresh()->reply_seen_at);
    }

    public function test_el_admin_cambia_el_estado_sin_responder(): void
    {
        $mensaje = $this->mensajeDe($this->comercio());

        $this->actingAs($this->admin())
            ->patch(route('admin.sugerencias.update', $mensaje->id), ['status' => 'resuelta', 'reply' => ''])
            ->assertSessionHasNoErrors();

        $mensaje->refresh();

        $this->assertSame(Suggestion::RESUELTA, $mensaje->status);
        $this->assertNull($mensaje->reply);
        $this->assertNotNull($mensaje->read_at);
    }

    public function test_un_comercio_no_entra_al_buzon_del_admin(): void
    {
        $mensaje = $this->mensajeDe($this->comercio());

        $this->actingAs($this->comercio())
            ->get(route('admin.sugerencias.index'))
            ->assertForbidden();

        $this->actingAs($this->comercio())
            ->patch(route('admin.sugerencias.update', $mensaje->id), ['status' => 'descartada'])
            ->assertForbidden();
    }
}
