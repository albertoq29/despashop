<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\ColumnasDeImportacion;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Traer el inventario desde una hoja de cálculo.
 *
 * Nadie lleva su Excel con nuestros nombres de campo, así que lo primero es
 * reconocer sus columnas; y como el archivo lo lee el navegador, lo segundo
 * es desconfiar de todo lo que llega. Un error aquí no se nota: se nota
 * mil productos después, con los precios en la columna equivocada.
 */
class ImportacionDeProductosTest extends TestCase
{
    use RefreshDatabase;

    private User $comercio;

    protected function setUp(): void
    {
        parent::setUp();

        $this->comercio = $this->crearComercio('bodega');
    }

    private function crearComercio(string $usuario, array $atributos = []): User
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

        return $comercio;
    }

    private function comoTenant(callable $callback, ?User $comercio = null): mixed
    {
        return app(Tenancy::class)->forTenant(($comercio ?? $this->comercio)->id, $callback);
    }

    /** Lo que manda la pantalla: las filas y a qué campo va cada columna. */
    private function importar(array $filas, array $columnas, array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->comercio)->post(route('productos.importar.store'), [
            'filas' => $filas,
            'columnas' => $columnas,
            ...$extra,
        ]);
    }

    /* ── Reconocer las columnas ─────────────────────────────────────────── */

    public function test_reconoce_los_nombres_de_columna_mas_comunes(): void
    {
        $sugerencia = ColumnasDeImportacion::sugerir([
            'PRODUCTO', 'Descripción', 'Precio', 'Costo', 'Stock', 'Categoría',
        ]);

        $this->assertSame(0, $sugerencia['nombre']);
        $this->assertSame(1, $sugerencia['descripcion']);
        $this->assertSame(2, $sugerencia['precio']);
        $this->assertSame(3, $sugerencia['costo']);
        $this->assertSame(4, $sugerencia['existencias']);
        $this->assertSame(5, $sugerencia['categorias']);
    }

    public function test_reconoce_columnas_en_ingles_y_con_adornos(): void
    {
        $sugerencia = ColumnasDeImportacion::sugerir([
            'Item Name', 'Retail Price (USD)', 'Qty on hand', 'unit_cost',
        ]);

        $this->assertSame(0, $sugerencia['nombre']);
        $this->assertSame(1, $sugerencia['precio']);
        $this->assertSame(2, $sugerencia['existencias']);
        $this->assertSame(3, $sugerencia['costo']);
    }

    /**
     * «Precio al mayor» lleva la palabra «precio» dentro. Si se buscara el
     * detal primero, se llevaría la columna del mayor y todo el catálogo
     * saldría con el precio equivocado.
     */
    public function test_el_precio_al_mayor_no_se_lleva_la_columna_del_detal(): void
    {
        $sugerencia = ColumnasDeImportacion::sugerir(['Nombre', 'Precio al mayor', 'Precio']);

        $this->assertSame(2, $sugerencia['precio']);
        $this->assertSame(1, $sugerencia['precio_mayor']);
    }

    public function test_una_columna_no_se_asigna_a_dos_campos(): void
    {
        $sugerencia = ColumnasDeImportacion::sugerir(['Producto', 'Articulo', 'Precio']);

        $this->assertSame(1, count(array_keys($sugerencia, $sugerencia['nombre'], true)));
    }

    public function test_lo_que_no_reconoce_lo_deja_fuera(): void
    {
        $sugerencia = ColumnasDeImportacion::sugerir(['Nombre', 'Pasillo', 'Proveedor habitual']);

        $this->assertSame(0, $sugerencia['nombre']);
        $this->assertArrayNotHasKey('precio', $sugerencia);
        $this->assertArrayNotHasKey('costo', $sugerencia);
    }

    public function test_la_pantalla_pregunta_que_columna_es_cual(): void
    {
        $this->actingAs($this->comercio)
            ->postJson(route('productos.importar.analizar'), [
                'encabezados' => ['Producto', 'PVP', 'Existencia'],
            ])
            ->assertOk()
            ->assertJson(['sugerencia' => ['nombre' => 0, 'precio' => 1, 'existencias' => 2]]);
    }

    /* ── Importar ───────────────────────────────────────────────────────── */

    public function test_trae_los_productos_del_archivo(): void
    {
        $this->importar(
            [
                ['Harina de maíz', 'Paquete de 1 kg', '2.50', '1.20', '40'],
                ['Aceite de maíz', 'Botella de 1 L', '4.00', '2.80', '25'],
            ],
            ['nombre' => 0, 'descripcion' => 1, 'precio' => 2, 'costo' => 3, 'existencias' => 4],
        )->assertSessionHasNoErrors();

        $productos = $this->comoTenant(fn () => Product::orderBy('name')->get());

        $this->assertCount(2, $productos);
        $this->assertSame('Aceite de maíz', $productos[0]->name);
        $this->assertSame(4.0, (float) $productos[0]->price_usdt);
        $this->assertSame(2.8, (float) $productos[0]->cost_price);
        $this->assertSame(25.0, $productos[0]->stock);
        $this->assertSame('Botella de 1 L', $productos[0]->description);
    }

    /**
     * Lo que el archivo no trae se queda vacío. Es lo que se espera de una
     * importación, y es lo que el comercio completa después.
     */
    public function test_lo_que_no_viene_en_el_archivo_queda_vacio(): void
    {
        $this->importar([['Pan canilla']], ['nombre' => 0])->assertSessionHasNoErrors();

        $producto = $this->comoTenant(fn () => Product::sole());

        $this->assertSame('Pan canilla', $producto->name);
        $this->assertNull($producto->price_usdt);
        $this->assertNull($producto->cost_price);
        $this->assertNull($producto->description);
        $this->assertSame(0.0, $producto->stock);
        $this->assertFalse($producto->is_hidden);
    }

    /**
     * Cada hoja escribe los números a su manera: con coma decimal, con punto
     * de miles, con el símbolo pegado.
     */
    public function test_entiende_los_precios_como_los_escribe_cada_quien(): void
    {
        $this->importar(
            [
                ['Con coma', '12,50'],
                ['Con simbolo', '$ 8.75'],
                ['Con miles', '1.234,56'],
                ['Al estilo ingles', '1,234.56'],
                ['Vacio', ''],
            ],
            ['nombre' => 0, 'precio' => 1],
        )->assertSessionHasNoErrors();

        $precios = $this->comoTenant(fn () => Product::pluck('price_usdt', 'name'));

        $this->assertSame(12.5, (float) $precios['Con coma']);
        $this->assertSame(8.75, (float) $precios['Con simbolo']);
        $this->assertSame(1234.56, (float) $precios['Con miles']);
        $this->assertSame(1234.56, (float) $precios['Al estilo ingles']);
        $this->assertNull($precios['Vacio']);
    }

    public function test_entiende_las_unidades_como_las_escribe_cada_quien(): void
    {
        $this->importar(
            [
                ['Queso', '2,5', 'Kilos'],
                ['Aceite', '12', 'LT'],
                ['Tela', '30', 'metros'],
                ['Taza', '8', 'c/u'],
                ['Tornillo', '500', 'vaina rara'],
            ],
            ['nombre' => 0, 'existencias' => 1, 'unidad' => 2],
        )->assertSessionHasNoErrors();

        $productos = $this->comoTenant(fn () => Product::pluck('unidad', 'name'));

        $this->assertSame('kg', $productos['Queso']);
        $this->assertSame('l', $productos['Aceite']);
        $this->assertSame('m', $productos['Tela']);
        $this->assertSame('unidad', $productos['Taza']);
        // Una unidad que no reconocemos cae en la de siempre
        $this->assertSame('unidad', $productos['Tornillo']);

        // Y el queso conserva su medio kilo
        $this->assertSame(2.5, $this->comoTenant(fn () => Product::where('name', 'Queso')->value('stock')));
    }

    public function test_crea_las_categorias_que_falten_y_reusa_las_que_hay(): void
    {
        $this->comoTenant(fn () => Category::create(['name' => 'Víveres']));

        $this->importar(
            [
                ['Harina', 'Víveres'],
                ['Jabón', 'Limpieza, Hogar'],
                ['Arroz', 'viveres'],
            ],
            ['nombre' => 0, 'categorias' => 1],
        )->assertSessionHasNoErrors();

        $this->comoTenant(function () {
            // Víveres no se duplica por estar escrita en minúsculas
            $this->assertSame(3, Category::count());
            $this->assertSame(2, Product::where('name', 'Jabón')->sole()->categories()->count());
            $this->assertSame('Víveres', Product::where('name', 'Arroz')->sole()->categories()->sole()->name);
        });
    }

    public function test_una_fila_sin_nombre_no_crea_nada(): void
    {
        $this->importar(
            [['Harina', '2.50'], ['', '9.99'], ['   ', '5.00']],
            ['nombre' => 0, 'precio' => 1],
        )->assertSessionHasNoErrors();

        $this->assertSame(1, $this->comoTenant(fn () => Product::count()));
    }

    public function test_sin_columna_de_nombre_no_se_importa(): void
    {
        $this->importar([['Harina', '2.50']], ['precio' => 1])
            ->assertSessionHasErrors('columnas');

        $this->assertSame(0, $this->comoTenant(fn () => Product::count()));
    }

    public function test_un_producto_que_ya_existe_se_salta(): void
    {
        $this->comoTenant(fn () => Product::create(['name' => 'Harina', 'price_usdt' => 9, 'stock' => 5]));

        $this->importar([['Harina', '2.50']], ['nombre' => 0, 'precio' => 1])
            ->assertSessionHasNoErrors();

        $this->comoTenant(function () {
            $this->assertSame(1, Product::count());
            // El precio viejo se respeta: no se pidió sobrescribir
            $this->assertSame(9.0, (float) Product::sole()->price_usdt);
        });
    }

    public function test_si_lo_pide_se_le_escribe_encima(): void
    {
        $this->comoTenant(fn () => Product::create(['name' => 'Harina', 'price_usdt' => 9, 'stock' => 5]));

        $this->importar([['Harina', '2.50']], ['nombre' => 0, 'precio' => 1], ['sobrescribir' => true])
            ->assertSessionHasNoErrors();

        $this->comoTenant(function () {
            $this->assertSame(1, Product::count());
            $this->assertSame(2.5, (float) Product::sole()->price_usdt);
        });
    }

    public function test_respeta_el_limite_de_productos_del_plan(): void
    {
        $plan = Plan::create(['name' => 'Chico', 'slug' => 'chico', 'max_products' => 2, 'is_active' => true]);
        $this->comercio->forceFill(['plan_id' => $plan->id])->save();

        $this->importar(
            [['Uno'], ['Dos'], ['Tres'], ['Cuatro']],
            ['nombre' => 0],
        )->assertSessionHasNoErrors();

        $this->assertSame(2, $this->comoTenant(fn () => Product::count()));
    }

    public function test_un_servicio_entra_como_servicio(): void
    {
        $this->importar(
            [['Corte de cabello', 'Servicio', '45 min'], ['Champú', 'Producto', '']],
            ['nombre' => 0, 'tipo' => 1, 'duracion' => 2],
        )->assertSessionHasNoErrors();

        $this->comoTenant(function () {
            $corte = Product::where('name', 'Corte de cabello')->sole();

            $this->assertTrue($corte->esServicio());
            $this->assertSame('45 min', $corte->service_duration);
            $this->assertSame(0.0, $corte->stock);
            $this->assertFalse(Product::where('name', 'Champú')->sole()->esServicio());
        });
    }

    public function test_el_archivo_no_puede_meter_columnas_que_no_existen(): void
    {
        // La pantalla manda la correspondencia, y la pantalla no es de fiar
        $this->importar(
            [['Harina', 'lo que sea']],
            ['nombre' => 0, 'inversion_historica' => 1, 'user_id' => 1],
        )->assertSessionHasNoErrors();

        $producto = $this->comoTenant(fn () => Product::sole());

        $this->assertSame(0.0, (float) $producto->inversion_historica);
        $this->assertSame($this->comercio->id, $producto->user_id);
    }

    public function test_lo_importado_es_de_quien_lo_importa(): void
    {
        $otro = $this->crearComercio('vecino');

        $this->importar([['Harina']], ['nombre' => 0])->assertSessionHasNoErrors();

        $this->assertSame(0, app(Tenancy::class)->forTenant($otro->id, fn () => Product::count()));
        $this->assertSame(1, $this->comoTenant(fn () => Product::count()));
    }

    public function test_el_resumen_dice_que_paso(): void
    {
        $this->comoTenant(fn () => Product::create(['name' => 'Harina', 'stock' => 1]));

        $this->importar(
            [['Harina'], ['Arroz', 'Víveres'], ['']],
            ['nombre' => 0, 'categorias' => 1],
        )->assertSessionHas('success', fn (string $mensaje) => str_contains($mensaje, 'Se importó 1 producto')
            && str_contains($mensaje, '1 categoría nueva')
            && str_contains($mensaje, 'Se saltaron 2'));
    }

    public function test_la_pantalla_de_importar_abre(): void
    {
        $this->actingAs($this->comercio)
            ->get(route('productos.importar'))
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('Productos/Importar')
                ->has('campos')
                ->where('campos.0.clave', 'nombre')
                ->where('campos.0.obligatorio', true));
    }
}
