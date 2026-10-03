<?php

namespace Tests\Feature;

use App\Mail\AvisoDeSeguridad;
use App\Models\ActivityLog;
use App\Models\CatalogBanner;
use App\Models\Plan;
use App\Models\SecurityEvent;
use App\Models\Setting;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Registro de seguridad: qué se considera sospechoso, cómo se agrupa, cuándo
 * se avisa al admin y quién puede ver el registro.
 */
class RegistroDeSeguridadTest extends TestCase
{
    use RefreshDatabase;

    private const CLAVE = 'Clave.Segura9';

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        config(['seguridad.avisos' => true, 'seguridad.umbral_fuerza_bruta' => 5]);
    }

    private function admin(array $atributos = []): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => self::CLAVE,
            'email_verified_at' => now(),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
            ...$atributos,
        ]);
    }

    private function comercio(array $atributos = []): User
    {
        $usuario = User::create([
            'name' => 'Dueño',
            'business_name' => 'Comercio',
            'username' => 'comercio-' . uniqid(),
            'email' => uniqid() . '@ejemplo.test',
            'password' => self::CLAVE,
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
            ...$atributos,
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    private function hecho(array $atributos = []): SecurityEvent
    {
        return SecurityEvent::create([
            'type' => 'acceso.ajeno',
            'severity' => SecurityEvent::ALTA,
            'description' => 'Intento de abrir datos de otro comercio',
            'ip_address' => '10.0.0.9',
            ...$atributos,
        ]);
    }

    // ── Acceso a las cuentas ───────────────────────────────────────────────────

    public function test_un_intento_fallido_queda_anotado_sin_guardar_la_clave(): void
    {
        $comercio = $this->comercio();

        $this->post(route('login'), ['email' => $comercio->email, 'password' => 'la-que-no-es'])
            ->assertSessionHasErrors('email');

        $hecho = SecurityEvent::where('type', 'login.fallido')->sole();

        $this->assertSame(SecurityEvent::BAJA, $hecho->severity);
        $this->assertSame($comercio->id, $hecho->user_id);
        $this->assertTrue($hecho->properties['la_cuenta_existe']);
        $this->assertStringNotContainsString('la-que-no-es', json_encode($hecho->getAttributes()));
    }

    public function test_los_intentos_repetidos_se_agrupan_y_avisan_al_admin(): void
    {
        $this->admin();
        $comercio = $this->comercio();

        for ($intento = 0; $intento < 5; $intento++) {
            $this->post(route('login'), ['email' => $comercio->email, 'password' => "intento-{$intento}"]);
        }

        // Cinco intentos son una fila con cinco golpes, no cinco filas
        $fallidos = SecurityEvent::where('type', 'login.fallido')->sole();
        $this->assertSame(5, $fallidos->hits);

        $ataque = SecurityEvent::where('type', 'login.fuerza_bruta')->sole();
        $this->assertSame(SecurityEvent::ALTA, $ataque->severity);
        $this->assertNotNull($ataque->notified_at);

        Mail::assertSent(AvisoDeSeguridad::class, 1);
        Mail::assertSent(AvisoDeSeguridad::class, fn (AvisoDeSeguridad $correo) => $correo->hasTo('admin@ejemplo.test'));
    }

    public function test_el_aviso_va_al_correo_de_seguridad_configurado(): void
    {
        $this->admin();
        Setting::putPlatform('security_email', 'seguridad@ejemplo.test');

        $this->hechoGraveDesdeUnaPeticion();

        Mail::assertSent(AvisoDeSeguridad::class, fn (AvisoDeSeguridad $correo) => $correo->hasTo('seguridad@ejemplo.test')
            && ! $correo->hasTo('admin@ejemplo.test'));
    }

    public function test_lo_leve_no_manda_correo(): void
    {
        $this->admin();
        $comercio = $this->comercio();

        $this->post(route('login'), ['email' => $comercio->email, 'password' => 'la-que-no-es']);

        $this->assertSame(SecurityEvent::BAJA, SecurityEvent::where('type', 'login.fallido')->sole()->severity);
        Mail::assertNothingSent();
    }

    public function test_entrar_desde_una_ip_distinta_queda_anotado(): void
    {
        $comercio = $this->comercio(['last_login_ip' => '190.80.70.60']);

        $this->post(route('login'), ['email' => $comercio->email, 'password' => self::CLAVE])
            ->assertRedirect(route('dashboard'));

        $hecho = SecurityEvent::where('type', 'sesion.ip_nueva')->sole();

        $this->assertSame($comercio->id, $hecho->user_id);
        $this->assertSame('190.80.70.60', $hecho->properties['ip_anterior']);
        $this->assertSame('127.0.0.1', $comercio->fresh()->last_login_ip);
    }

    public function test_la_primera_sesion_de_una_cuenta_no_es_sospechosa(): void
    {
        $comercio = $this->comercio();

        $this->post(route('login'), ['email' => $comercio->email, 'password' => self::CLAVE]);

        $this->assertSame(0, SecurityEvent::where('type', 'sesion.ip_nueva')->count());
        $this->assertSame('127.0.0.1', $comercio->fresh()->last_login_ip);
    }

    // ── Permisos y sondeos ─────────────────────────────────────────────────────

    public function test_un_comercio_que_toca_el_panel_de_administracion_queda_anotado(): void
    {
        $this->admin();
        $comercio = $this->comercio();

        $this->actingAs($comercio)->get(route('admin.comercios.index'))->assertForbidden();

        $hecho = SecurityEvent::where('type', 'acceso.admin')->sole();

        $this->assertSame(SecurityEvent::ALTA, $hecho->severity);
        $this->assertSame($comercio->id, $hecho->user_id);
        $this->assertSame($comercio->id, $hecho->tenant_id);
        $this->assertSame('/admin/comercios', $hecho->path);
    }

    public function test_pedir_datos_de_otro_comercio_queda_anotado(): void
    {
        $unoDeOtro = $this->comercio();
        $curioso = $this->comercio();

        $banner = app(Tenancy::class)->forTenant(
            $unoDeOtro->id,
            fn () => CatalogBanner::create(['title' => 'Promo', 'image_path' => 'catalogo/x.jpg']),
        );

        // El aislamiento contesta "no existe", no "prohibido": el comercio ni
        // se entera de que ese banner es de otro.
        $this->actingAs($curioso)
            ->delete(route('catalogo.banners.destroy', $banner->id))
            ->assertNotFound();

        $hecho = SecurityEvent::where('type', 'acceso.inexistente')->sole();

        $this->assertSame(SecurityEvent::MEDIA, $hecho->severity);
        $this->assertSame($curioso->id, $hecho->user_id);
        $this->assertSame($curioso->id, $hecho->tenant_id);
        $this->assertSame((string) $banner->id, $hecho->properties['ids']);
    }

    public function test_probar_muchos_ids_ajenos_sube_a_grave(): void
    {
        $this->admin();
        $curioso = $this->comercio();

        foreach (range(101, 105) as $id) {
            $this->actingAs($curioso)->delete(route('catalogo.banners.destroy', $id))->assertNotFound();
        }

        $this->assertSame(5, SecurityEvent::where('type', 'acceso.inexistente')->sole()->hits);

        $escaneo = SecurityEvent::where('type', 'acceso.ajeno')->sole();

        $this->assertSame(SecurityEvent::ALTA, $escaneo->severity);
        $this->assertSame(5, $escaneo->properties['intentos']);
        Mail::assertSent(AvisoDeSeguridad::class, 1);
    }

    public function test_un_404_del_panel_sin_ids_no_se_anota(): void
    {
        $this->actingAs($this->comercio())
            ->delete(route('catalogo.imagen.destroy', 'banana'))
            ->assertNotFound();

        $this->assertSame(0, SecurityEvent::count());
    }

    public function test_el_sondeo_de_rutas_se_anota_y_un_404_normal_no(): void
    {
        $this->get('/.env')->assertNotFound();
        $this->get('/wp-login.php')->assertNotFound();

        // Una dirección mal escrita no es un ataque
        $this->get('/tienda-que-no-existe')->assertNotFound();

        // Los dos sondeos de la misma IP son una fila con dos golpes
        $hecho = SecurityEvent::where('type', 'sondeo.rutas')->sole();

        $this->assertSame(SecurityEvent::MEDIA, $hecho->severity);
        $this->assertSame(2, $hecho->hits);
        $this->assertSame(0, SecurityEvent::where('path', '/tienda-que-no-existe')->count());
    }

    public function test_una_direccion_con_carga_de_inyeccion_queda_anotada(): void
    {
        $this->admin();

        $this->get('/?buscar=1%20union%20select%20password%20from%20users');

        $hecho = SecurityEvent::where('type', 'inyeccion.intento')->sole();

        $this->assertSame(SecurityEvent::ALTA, $hecho->severity);
        Mail::assertSent(AvisoDeSeguridad::class, 1);
    }

    // ── Uso de la IA ───────────────────────────────────────────────────────────

    public function test_un_pedido_frenado_a_la_ia_queda_en_el_registro(): void
    {
        config(['services.groq.key' => 'gsk_prueba', 'ia.limite_diario' => 3]);

        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->postJson(route('catalogo.ia.generar'), [
                'descripcion' => 'Vendemos documentos falsos y cedulas falsas para quien lo necesite rápido.',
                'tono' => 'cercano',
                'incluir' => ['diseno' => true, 'textos' => true, 'inventario' => false],
            ])
            ->assertStatus(422);

        $hecho = SecurityEvent::where('type', 'ia.bloqueada')->sole();

        $this->assertSame($comercio->id, $hecho->tenant_id);
        $this->assertSame('fraude o documentos falsos', $hecho->properties['motivo']);
    }

    // ── Registros en ráfaga ────────────────────────────────────────────────────

    public function test_varias_solicitudes_desde_la_misma_ip_avisan(): void
    {
        $this->admin();
        Plan::create(['name' => 'Inicial', 'price_usd' => 0]);

        foreach (range(1, 3) as $numero) {
            ActivityLog::create([
                'action' => 'registro.solicitado',
                'description' => "Solicitud {$numero}",
                'ip_address' => '127.0.0.1',
            ]);
        }

        $this->post(route('register'), [
            'name' => 'Otro dueño',
            'business_name' => 'Tienda Cuatro',
            'username' => 'tienda-cuatro',
            'email' => 'cuatro@ejemplo.test',
            'password' => self::CLAVE,
            'password_confirmation' => self::CLAVE,
            'acepta_terminos' => true,
        ])->assertRedirect(route('cuenta.estado'));

        $hecho = SecurityEvent::where('type', 'registro.rafaga')->sole();

        $this->assertSame(SecurityEvent::ALTA, $hecho->severity);
        $this->assertSame(4, $hecho->properties['solicitudes']);
        // La cuenta se crea igual: el admin decide con el aviso delante
        $this->assertSame(User::STATUS_PENDING, User::where('username', 'tienda-cuatro')->sole()->status);
    }

    // ── El registro en el panel ────────────────────────────────────────────────

    public function test_el_comercio_no_entra_al_registro_de_seguridad(): void
    {
        $this->actingAs($this->comercio())->get(route('admin.seguridad.index'))->assertForbidden();
    }

    public function test_el_admin_ve_lo_pendiente_y_puede_marcarlo_revisado(): void
    {
        $admin = $this->admin();
        $hecho = $this->hecho();
        $this->hecho(['type' => 'login.fallido', 'severity' => SecurityEvent::BAJA, 'hits' => 4]);

        $this->actingAs($admin)
            ->get(route('admin.seguridad.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Admin/Seguridad/Index')
                ->where('conteos.sin_revisar', 2)
                ->where('conteos.graves', 1)
                ->has('eventos.data', 2)
                ->where('seguridad.graves', 1));

        $this->actingAs($admin)->patch(route('admin.seguridad.revisar', $hecho->id))->assertRedirect();

        $hecho->refresh();
        $this->assertNotNull($hecho->reviewed_at);
        $this->assertSame($admin->id, $hecho->reviewed_by);

        // Y se puede reabrir si hacía falta seguir mirándolo
        $this->actingAs($admin)->patch(route('admin.seguridad.revisar', $hecho->id));
        $this->assertNull($hecho->fresh()->reviewed_at);
    }

    public function test_marcar_todo_como_revisado_respeta_el_filtro_por_tipo(): void
    {
        $admin = $this->admin();
        $this->hecho(['type' => 'sondeo.rutas', 'severity' => SecurityEvent::MEDIA]);
        $this->hecho(['type' => 'sondeo.rutas', 'severity' => SecurityEvent::MEDIA]);
        $queda = $this->hecho();

        $this->actingAs($admin)
            ->post(route('admin.seguridad.revisar-todo'), ['tipo' => 'sondeo.rutas'])
            ->assertRedirect();

        $this->assertSame(0, SecurityEvent::sinRevisar()->where('type', 'sondeo.rutas')->count());
        $this->assertNull($queda->fresh()->reviewed_at);
    }

    public function test_el_comercio_no_recibe_la_insignia_de_seguridad(): void
    {
        $this->hecho();

        $this->actingAs($this->comercio())
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->where('seguridad', null));
    }

    public function test_lo_revisado_ya_no_agrupa_hechos_nuevos(): void
    {
        $admin = $this->admin();
        $comercio = $this->comercio();

        $this->post(route('login'), ['email' => $comercio->email, 'password' => 'la-que-no-es']);

        $this->actingAs($admin)
            ->post(route('admin.seguridad.revisar-todo'))
            ->assertRedirect();

        // Volver a ser un visitante: la pantalla de acceso no admite sesiones abiertas
        $this->app['auth']->guard('web')->logout();

        $this->post(route('login'), ['email' => $comercio->email, 'password' => 'tampoco']);

        $this->assertSame(2, SecurityEvent::where('type', 'login.fallido')->count());
    }

    /** Provoca un hecho grave con una petición real, para probar el aviso. */
    private function hechoGraveDesdeUnaPeticion(): void
    {
        $this->actingAs($this->comercio())->get(route('admin.comercios.index'))->assertForbidden();
    }
}
