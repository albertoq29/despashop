<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\NivelesDePrecio;
use App\Support\Tenancy;
use App\Support\SeccionesDelCatalogo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Opciones de diseño del catálogo: animaciones de entrada, bloques
 * desplegables, testimonios, cifras y separadores.
 *
 * Lo que llega del editor no es de fiar: cada opción tiene su lista de
 * valores válidos y cada renglón sus campos. Aquí queda fijado qué se
 * acepta y qué se descarta, porque un valor inventado en el tema se
 * convierte en un atributo que el CSS no sabe pintar.
 */
class DisenoDelCatalogoTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(): User
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
        ]);

        app(CatalogProvisioner::class)->provision($usuario);

        return $usuario;
    }

    private function tema(User $usuario): CatalogTheme
    {
        return CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $usuario->id)->firstOrFail();
    }

    /** Lo mismo que envía el editor: el tema completo con los cambios encima. */
    private function datosDelEditor(User $usuario, array $cambios): array
    {
        return array_merge($this->tema($usuario)->toArray(), $cambios);
    }

    // ── Movimiento ────────────────────────────────────────────────────────────

    public function test_el_comercio_elige_la_animacion_de_entrada(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, [
                'animation_level' => 'lively',
                'animation_entrance' => 'blur',
                'animation_speed' => 'slow',
                'animation_stagger' => false,
                'scroll_progress' => true,
            ]))
            ->assertSessionHasNoErrors();

        $tema = $this->tema($usuario)->fresh();

        $this->assertSame('blur', $tema->animation_entrance);
        $this->assertSame('slow', $tema->animation_speed);
        $this->assertFalse($tema->animation_stagger);
        $this->assertTrue($tema->scroll_progress);
    }

    public function test_una_animacion_inventada_se_rechaza(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, [
                'animation_entrance' => 'explotar',
            ]))
            ->assertSessionHasErrors('animation_entrance');

        $this->assertSame('up', $this->tema($usuario)->fresh()->animation_entrance);
    }

    public function test_las_opciones_de_movimiento_llegan_al_catalogo_publico(): void
    {
        $usuario = $this->comercio();

        $this->tema($usuario)->forceFill([
            'animation_entrance' => 'flip',
            'animation_speed' => 'fast',
            'heading_style' => 'gradient',
            'image_ratio' => 'portrait',
            'is_published' => true,
        ])->save();

        $this->get('/' . $usuario->username)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('theme.animation_entrance', 'flip')
                ->where('theme.animation_speed', 'fast')
                ->where('theme.heading_style', 'gradient')
                ->where('theme.image_ratio', 'portrait'));
    }

    public function test_los_efectos_nuevos_de_tarjeta_se_aceptan(): void
    {
        $usuario = $this->comercio();

        foreach (['glow', 'tilt'] as $efecto) {
            $this->actingAs($usuario)
                ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, ['card_hover' => $efecto]))
                ->assertSessionHasNoErrors();

            $this->assertSame($efecto, $this->tema($usuario)->fresh()->card_hover);
        }
    }

    // ── Preguntas frecuentes ──────────────────────────────────────────────────

    public function test_guardar_un_bloque_de_preguntas_conserva_cada_renglon(): void
    {
        $usuario = $this->comercio();

        $secciones = [
            ['id' => 'header', 'type' => 'header', 'visible' => true],
            [
                'id' => 'faq-abc123',
                'type' => 'faq',
                'visible' => true,
                'title' => 'Dudas comunes',
                'subtitle' => 'Lo que más nos preguntan',
                'style' => 'glass',
                'items' => [
                    ['question' => '¿Hacen envíos?', 'answer' => 'Sí, a todo el país.'],
                    ['question' => '¿Aceptan pago móvil?', 'answer' => 'Sí, y también divisas.'],
                ],
            ],
        ];

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, ['sections' => $secciones]))
            ->assertSessionHasNoErrors();

        $bloque = collect($this->tema($usuario)->fresh()->sections)->firstWhere('type', 'faq');

        $this->assertSame('Dudas comunes', $bloque['title']);
        $this->assertSame('Lo que más nos preguntan', $bloque['subtitle']);
        $this->assertSame('glass', $bloque['style']);
        $this->assertCount(2, $bloque['items']);
        $this->assertSame('¿Aceptan pago móvil?', $bloque['items'][1]['question']);
        $this->assertSame('Sí, y también divisas.', $bloque['items'][1]['answer']);
    }

    // ── Testimonios y cifras ──────────────────────────────────────────────────

    public function test_un_testimonio_guarda_su_nota_dentro_de_rango(): void
    {
        $usuario = $this->comercio();

        $secciones = [
            ['id' => 'header', 'type' => 'header', 'visible' => true],
            [
                'id' => 'testimonials-abc123',
                'type' => 'testimonials',
                'visible' => true,
                'style' => 'card',
                'items' => [
                    ['title' => 'María', 'text' => 'Excelente atención.', 'rating' => 5],
                    ['title' => 'Sin nota', 'text' => 'Muy bien todo.', 'rating' => 0],
                ],
            ],
        ];

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, ['sections' => $secciones]))
            ->assertSessionHasNoErrors();

        $bloque = collect($this->tema($usuario)->fresh()->sections)->firstWhere('type', 'testimonials');

        $this->assertSame(5, $bloque['items'][0]['rating']);
        // Cero es válido: no todo testimonio lleva estrellas
        $this->assertSame(0, $bloque['items'][1]['rating']);
    }

    public function test_una_nota_fuera_de_rango_se_recorta(): void
    {
        $usuario = $this->comercio();

        $secciones = SeccionesDelCatalogo::normalizar([
            ['id' => 'header', 'type' => 'header', 'visible' => true],
            [
                'id' => 'testimonials-abc123',
                'type' => 'testimonials',
                'visible' => true,
                'items' => [['title' => 'Quien sea', 'text' => 'Bien', 'rating' => 99]],
            ],
        ]);

        $bloque = collect($secciones)->firstWhere('type', 'testimonials');

        $this->assertSame(5, $bloque['items'][0]['rating']);
    }

    public function test_las_cifras_guardan_el_numero_y_su_etiqueta(): void
    {
        $usuario = $this->comercio();

        $secciones = [
            ['id' => 'header', 'type' => 'header', 'visible' => true],
            [
                'id' => 'stats-abc123',
                'type' => 'stats',
                'visible' => true,
                'style' => 'brand',
                'items' => [
                    ['value' => '+500', 'title' => 'Clientes'],
                    ['value' => '24h', 'title' => 'Respuesta'],
                ],
            ],
        ];

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, ['sections' => $secciones]))
            ->assertSessionHasNoErrors();

        $bloque = collect($this->tema($usuario)->fresh()->sections)->firstWhere('type', 'stats');

        $this->assertSame('+500', $bloque['items'][0]['value']);
        $this->assertSame('Respuesta', $bloque['items'][1]['title']);
    }

    // ── Separador ─────────────────────────────────────────────────────────────

    public function test_el_separador_guarda_su_figura(): void
    {
        $usuario = $this->comercio();

        $secciones = [
            ['id' => 'header', 'type' => 'header', 'visible' => true],
            ['id' => 'divider-abc123', 'type' => 'divider', 'visible' => true, 'shape' => 'zigzag'],
        ];

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, ['sections' => $secciones]))
            ->assertSessionHasNoErrors();

        $bloque = collect($this->tema($usuario)->fresh()->sections)->firstWhere('type', 'divider');

        $this->assertSame('zigzag', $bloque['shape']);
    }

    public function test_una_figura_inventada_cae_en_la_de_por_defecto(): void
    {
        $secciones = SeccionesDelCatalogo::normalizar([
            ['id' => 'divider-abc123', 'type' => 'divider', 'visible' => true, 'shape' => 'espiral'],
        ]);

        $bloque = collect($secciones)->firstWhere('type', 'divider');

        $this->assertSame('wave', $bloque['shape']);
    }

    // ── Reglas generales de los bloques nuevos ───────────────────────────────

    public function test_un_fondo_que_no_existe_cae_en_el_de_por_defecto(): void
    {
        $secciones = SeccionesDelCatalogo::normalizar([
            ['id' => 'faq-abc123', 'type' => 'faq', 'visible' => true, 'style' => 'neon'],
        ]);

        $bloque = collect($secciones)->firstWhere('type', 'faq');

        $this->assertSame('card', $bloque['style']);
    }

    public function test_los_bloques_nuevos_se_pueden_repetir(): void
    {
        $secciones = SeccionesDelCatalogo::normalizar([
            ['id' => 'faq-aaa111', 'type' => 'faq', 'visible' => true, 'title' => 'Envíos'],
            ['id' => 'faq-bbb222', 'type' => 'faq', 'visible' => true, 'title' => 'Pagos'],
            ['id' => 'divider-ccc333', 'type' => 'divider', 'visible' => true],
        ]);

        $faqs = collect($secciones)->where('type', 'faq')->values();

        $this->assertCount(2, $faqs);
        $this->assertSame('Envíos', $faqs[0]['title']);
        $this->assertSame('Pagos', $faqs[1]['title']);
    }

    public function test_una_lista_demasiado_larga_se_recorta(): void
    {
        $preguntas = collect(range(1, 30))
            ->map(fn ($n) => ['question' => "Pregunta {$n}", 'answer' => 'Respuesta'])
            ->all();

        $secciones = SeccionesDelCatalogo::normalizar([
            ['id' => 'faq-abc123', 'type' => 'faq', 'visible' => true, 'items' => $preguntas],
        ]);

        $bloque = collect($secciones)->firstWhere('type', 'faq');

        $this->assertCount(SeccionesDelCatalogo::MAXIMO_ITEMS, $bloque['items']);
    }

    public function test_un_renglon_mal_formado_no_rompe_el_bloque(): void
    {
        $secciones = SeccionesDelCatalogo::normalizar([
            [
                'id' => 'faq-abc123',
                'type' => 'faq',
                'visible' => true,
                'items' => ['esto no es un renglón', ['question' => 'Válida', 'answer' => 'Sí']],
            ],
        ]);

        $bloque = collect($secciones)->firstWhere('type', 'faq');

        $this->assertCount(1, $bloque['items']);
        $this->assertSame('Válida', $bloque['items'][0]['question']);
    }

    public function test_los_bloques_nuevos_llegan_al_catalogo_publico(): void
    {
        $usuario = $this->comercio();

        $this->tema($usuario)->forceFill([
            'is_published' => true,
            'sections' => [
                ['id' => 'header', 'type' => 'header', 'visible' => true],
                [
                    'id' => 'faq-abc123',
                    'type' => 'faq',
                    'visible' => true,
                    'title' => 'Dudas',
                    'items' => [['question' => '¿Envían?', 'answer' => 'Sí']],
                ],
                ['id' => 'divider-ddd444', 'type' => 'divider', 'visible' => true, 'shape' => 'curve'],
            ],
        ])->save();

        $this->get('/' . $usuario->username)
            ->assertOk()
            ->assertInertia(function (AssertableInertia $pagina) {
                $tipos = collect($pagina->toArray()['props']['theme']['sections'])->pluck('type');

                $this->assertTrue($tipos->contains('faq'));
                $this->assertTrue($tipos->contains('divider'));
            });
    }

    // ── Precios al mayor y de distribuidor ────────────────────────────────────

    private function productoConEscalones(User $usuario): void
    {
        app(Tenancy::class)->forTenant($usuario->id, fn () => Product::create([
            'name' => 'Audífonos TWS',
            'price_usdt' => 18,
            'price_mayor_usdt' => 15,
            'price_distribuidor_usdt' => 12,
            'cost_price' => 9,
            'stock' => 10,
        ]));
    }

    public function test_ocultos_no_viajan_al_catalogo_publico(): void
    {
        $usuario = $this->comercio();
        $this->productoConEscalones($usuario);
        $this->tema($usuario)->forceFill(['is_published' => true, 'wholesale_prices' => 'off'])->save();

        $this->get('/' . $usuario->username)
            ->assertOk()
            ->assertInertia(function (AssertableInertia $pagina) {
                $producto = $pagina->toArray()['props']['productos'][0];

                // No basta con no pintarlos: no pueden estar en la respuesta
                $this->assertArrayNotHasKey('price_mayor_usdt', $producto);
                $this->assertArrayNotHasKey('price_distribuidor_usdt', $producto);
            });
    }

    public function test_al_abrir_o_siempre_si_llegan(): void
    {
        foreach (['modal', 'card'] as $nivel) {
            $usuario = $this->comercio();
            $this->productoConEscalones($usuario);
            $this->tema($usuario)->forceFill(['is_published' => true, 'wholesale_prices' => $nivel])->save();

            $this->get('/' . $usuario->username)
                ->assertOk()
                ->assertInertia(function (AssertableInertia $pagina) use ($nivel) {
                    $producto = $pagina->toArray()['props']['productos'][0];

                    $this->assertEqualsWithDelta(15, (float) $producto['price_mayor_usdt'], 0.001, "nivel {$nivel}");
                    $this->assertEqualsWithDelta(12, (float) $producto['price_distribuidor_usdt'], 0.001, "nivel {$nivel}");
                    $this->assertSame($nivel, $pagina->toArray()['props']['theme']['wholesale_prices']);
                });
        }
    }

    public function test_el_costo_sigue_sin_salir_aunque_se_muestren_los_escalones(): void
    {
        $usuario = $this->comercio();
        $this->productoConEscalones($usuario);
        $this->tema($usuario)->forceFill(['is_published' => true, 'wholesale_prices' => 'card'])->save();

        $this->get('/' . $usuario->username)
            ->assertOk()
            ->assertInertia(function (AssertableInertia $pagina) {
                $producto = $pagina->toArray()['props']['productos'][0];

                $this->assertArrayNotHasKey('cost_price', $producto);
                $this->assertArrayNotHasKey('inversion_historica', $producto);
                $this->assertArrayNotHasKey('notes', $producto);
            });
    }

    public function test_un_valor_inventado_se_rechaza(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, [
                'wholesale_prices' => 'a-veces',
            ]))
            ->assertSessionHasErrors('wholesale_prices');

        $this->assertSame('off', $this->tema($usuario)->fresh()->wholesale_prices);
    }

    public function test_el_comercio_elige_donde_se_ven(): void
    {
        $usuario = $this->comercio();

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, [
                'wholesale_prices' => 'card',
            ]))
            ->assertSessionHasNoErrors();

        $this->assertSame('card', $this->tema($usuario)->fresh()->wholesale_prices);
    }

    /* ── Cómo se llama el tercer precio ─────────────────────────────────── */

    /** Las promociones se guardan juntas: el nombre viaja con lo demás. */
    private function guardarPromociones(User $usuario, array $cambios = [])
    {
        return $this->actingAs($usuario)->post(route('settings.update'), [
            'global_discount' => 0,
            'force_wholesale' => false,
            'force_distributor' => false,
            'distributor_price_label' => NivelesDePrecio::DISTRIBUIDOR,
            ...$cambios,
        ]);
    }

    public function test_sin_elegir_nada_se_llama_distribuidor(): void
    {
        $usuario = $this->comercio();

        $this->assertSame('Distribuidor', NivelesDePrecio::nombre($usuario->id));
    }

    public function test_el_comercio_lo_llama_gran_mayor(): void
    {
        $usuario = $this->comercio();

        $this->guardarPromociones($usuario, [
            'distributor_price_label' => NivelesDePrecio::GRAN_MAYOR,
        ])->assertSessionHasNoErrors();

        $this->assertSame('Gran mayor', NivelesDePrecio::nombre($usuario->id));
    }

    public function test_no_se_le_puede_poner_cualquier_nombre(): void
    {
        $usuario = $this->comercio();

        $this->guardarPromociones($usuario, ['distributor_price_label' => 'al_mayoreo'])
            ->assertSessionHasErrors(NivelesDePrecio::CLAVE);

        $this->assertSame('Distribuidor', NivelesDePrecio::nombre($usuario->id));
    }

    public function test_el_nombre_se_cambia_desde_el_formulario_del_producto(): void
    {
        $usuario = $this->comercio();

        // Sin mandar promociones: ahí solo va el nombre
        $this->actingAs($usuario)
            ->post(route('settings.nombre-del-precio'), [
                'distributor_price_label' => NivelesDePrecio::GRAN_MAYOR,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('Gran mayor', NivelesDePrecio::nombre($usuario->id));
    }

    public function test_cambiar_el_nombre_no_toca_las_promociones(): void
    {
        $usuario = $this->comercio();
        Setting::put('global_discount', '15', $usuario->id);
        Setting::put('force_distributor', '1', $usuario->id);

        $this->actingAs($usuario)->post(route('settings.nombre-del-precio'), [
            'distributor_price_label' => NivelesDePrecio::GRAN_MAYOR,
        ]);

        $ajustes = Setting::forTenant($usuario->id);

        $this->assertSame('15', $ajustes['global_discount']);
        $this->assertSame('1', $ajustes['force_distributor']);
    }

    public function test_el_panel_recibe_el_nombre_elegido(): void
    {
        $usuario = $this->comercio();
        Setting::put(NivelesDePrecio::CLAVE, NivelesDePrecio::GRAN_MAYOR, $usuario->id);

        $this->actingAs($usuario)
            ->get(route('productos.index'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('nivelesDePrecio.distribuidor', 'Gran mayor')
                ->where('nivelesDePrecio.elegido', NivelesDePrecio::GRAN_MAYOR));
    }

    public function test_el_catalogo_usa_el_nombre_del_comercio(): void
    {
        $usuario = $this->comercio();
        $this->productoConEscalones($usuario);
        $this->tema($usuario)->forceFill(['is_published' => true, 'wholesale_prices' => 'card'])->save();
        Setting::put(NivelesDePrecio::CLAVE, NivelesDePrecio::GRAN_MAYOR, $usuario->id);

        $this->get('/' . $usuario->username)
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->where('comercio.nombreDistribuidor', 'Gran mayor'));
    }

    public function test_con_los_precios_ocultos_el_nombre_no_hace_falta(): void
    {
        $usuario = $this->comercio();
        $this->productoConEscalones($usuario);
        $this->tema($usuario)->forceFill(['is_published' => true, 'wholesale_prices' => 'off'])->save();

        $this->get('/' . $usuario->username)
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->where('comercio.nombreDistribuidor', null));
    }
}
