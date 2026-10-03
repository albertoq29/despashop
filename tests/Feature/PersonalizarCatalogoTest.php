<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\SeccionesDelCatalogo;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * El editor del catálogo guarda la estructura de la página como una lista
 * de bloques. Estas pruebas cuidan que lo que arma el comercio llegue
 * intacto a la base y que el catálogo público no muestre de más.
 */
class PersonalizarCatalogoTest extends TestCase
{
    use RefreshDatabase;

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

    private function comoTenant(User $usuario, callable $callback): mixed
    {
        return app(Tenancy::class)->forTenant($usuario->id, $callback);
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

    public function test_guardar_conserva_el_contenido_de_cada_bloque(): void
    {
        $usuario = $this->comercio();
        $categoria = $this->comoTenant($usuario, fn () => Category::create(['name' => 'Tazas']));

        $secciones = [
            ['id' => 'header', 'type' => 'header', 'visible' => true],
            [
                'id' => 'benefits-abc123',
                'type' => 'benefits',
                'visible' => true,
                'title' => 'Por qué comprarnos',
                'style' => 'card',
                'items' => [
                    ['icon' => 'truck', 'title' => 'Envíos', 'text' => 'A todo el país'],
                    ['icon' => 'gift', 'title' => 'Regalos', 'text' => 'Con tarjeta'],
                ],
            ],
            [
                'id' => 'category-xyz789',
                'type' => 'category',
                'visible' => true,
                'title' => '',
                'category_id' => $categoria->id,
                'style' => 'grid',
                'limit' => 12,
            ],
            ['id' => 'text-qwe456', 'type' => 'text', 'visible' => false, 'title' => 'Horario', 'text' => 'Lunes a sábado', 'align' => 'left', 'style' => 'brand'],
            ['id' => 'products', 'type' => 'products', 'visible' => true, 'title' => 'Todo', 'subtitle' => ''],
        ];

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, [
                'sections' => $secciones,
                'hero_layout' => 'split',
                'animation_level' => 'lively',
            ]))
            ->assertSessionHasNoErrors();

        $guardadas = collect($this->tema($usuario)->sections)->keyBy('id');

        // Lo enviado conserva su orden; los bloques fijos que faltaban se intercalan en su sitio
        $enviados = array_column($secciones, 'id');
        $this->assertSame($enviados, $guardadas->keys()->filter(fn ($id) => in_array($id, $enviados, true))->values()->all());
        $this->assertSame('card', $guardadas['benefits-abc123']['style']);
        $this->assertSame('gift', $guardadas['benefits-abc123']['items'][1]['icon']);
        $this->assertSame($categoria->id, $guardadas['category-xyz789']['category_id']);
        $this->assertSame('grid', $guardadas['category-xyz789']['style']);
        $this->assertSame(12, $guardadas['category-xyz789']['limit']);
        $this->assertSame('left', $guardadas['text-qwe456']['align']);
        $this->assertFalse($guardadas['text-qwe456']['visible']);

        // Los bloques fijos que no se enviaron se agregan igual
        $this->assertTrue($guardadas->has('contact'));
        $this->assertSame('split', $this->tema($usuario)->hero_layout);
    }

    public function test_ocultar_un_bloque_apaga_su_bandera_heredada(): void
    {
        $usuario = $this->comercio();
        $secciones = collect($this->tema($usuario)->sections)
            ->map(fn ($s) => in_array($s['id'], ['hero', 'banners'], true) ? [...$s, 'visible' => false] : $s)
            ->all();

        $this->actingAs($usuario)
            ->put(route('catalogo.personalizar.update'), $this->datosDelEditor($usuario, ['sections' => $secciones]))
            ->assertSessionHasNoErrors();

        $tema = $this->tema($usuario);
        $this->assertFalse($tema->hero_enabled);
        $this->assertFalse($tema->banners_enabled);
    }

    public function test_una_estructura_mal_formada_se_normaliza(): void
    {
        $secciones = SeccionesDelCatalogo::normalizar([
            ['type' => 'products'],
            ['type' => 'products'],
            ['type' => 'desconocido'],
            ['id' => 'text-<script>', 'type' => 'text', 'style' => 'rarisimo', 'title' => str_repeat('a', 500)],
        ]);

        $ids = array_column($secciones, 'id');

        $this->assertSame(1, count(array_keys($ids, 'products', true)));
        $this->assertNotContains('desconocido', array_column($secciones, 'type'));
        $this->assertCount(count(SeccionesDelCatalogo::FIJAS) + 1, $secciones);

        $texto = collect($secciones)->firstWhere('type', 'text');
        $this->assertMatchesRegularExpression('/^text-[a-z0-9]{6}$/', $texto['id']);
        $this->assertSame('plain', $texto['style']);
        $this->assertSame(120, mb_strlen($texto['title']));
    }

    public function test_el_catalogo_publico_no_expone_costos_ni_notas_internas(): void
    {
        $usuario = $this->comercio(['username' => 'papeleria']);

        $this->comoTenant($usuario, fn () => Product::create([
            'name' => 'Cuaderno cosido',
            'price_usdt' => 5,
            'cost_price' => 987.65,
            'notes' => 'Proveedor secreto de la esquina',
        ]));

        $this->get('/papeleria')
            ->assertOk()
            ->assertSee('Cuaderno cosido')
            ->assertDontSee('987.65')
            ->assertDontSee('Proveedor secreto');
    }

    public function test_la_vista_previa_muestra_el_catalogo_aunque_no_este_publicado(): void
    {
        $usuario = $this->comercio(['username' => 'borrador']);
        $this->tema($usuario)->update(['is_published' => false]);

        $this->get('/borrador')->assertNotFound();

        $this->actingAs($usuario)
            ->get(route('catalogo.vista-previa'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->component('Catalogo/Publico')
                ->where('modoEditor', true)
                ->where('comercio.username', 'borrador'));
    }

    public function test_el_visitante_puede_ordenar_por_precio(): void
    {
        $usuario = $this->comercio(['username' => 'ferreteria']);

        $this->comoTenant($usuario, function () {
            Product::create(['name' => 'Taladro', 'price_usdt' => 80]);
            Product::create(['name' => 'Tornillo', 'price_usdt' => 1]);
            Product::create(['name' => 'Martillo', 'price_usdt' => 12]);
        });

        $this->get('/ferreteria?orden=price_asc')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina
                ->where('productos.0.name', 'Tornillo')
                ->where('productos.2.name', 'Taladro')
                ->where('filters.orden', 'price_asc'));

        // Si el comercio no permite reordenar, manda su orden
        $this->tema($usuario)->update(['show_sort' => false, 'product_sort' => 'price_desc']);

        $this->get('/ferreteria?orden=price_asc')
            ->assertInertia(fn (AssertableInertia $pagina) => $pagina->where('productos.0.name', 'Taladro'));
    }
}
