<?php

namespace Tests\Feature;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Lo que se ve desde el primer momento.
 *
 * Un producto nace visible y un catálogo nace publicado. Las dos cosas
 * dependen del valor por defecto de su columna, que es justo lo que se
 * cambia sin querer en una migración y nadie nota hasta que un comercio
 * pregunta por qué su catálogo está vacío para todo el mundo.
 */
class VisibilidadAlNacerTest extends TestCase
{
    use RefreshDatabase;

    private function comercio(): User
    {
        $comercio = User::create([
            'name' => 'Dueño',
            'business_name' => 'Comercio',
            'username' => 'comercio',
            'email' => 'comercio@ejemplo.test',
            'password' => 'Clave.Segura9',
            'email_verified_at' => now(),
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_APPROVED,
        ]);

        app(CatalogProvisioner::class)->provision($comercio);

        return $comercio;
    }

    public function test_un_catalogo_nace_publicado(): void
    {
        $comercio = $this->comercio();

        $tema = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->sole();

        $this->assertTrue((bool) $tema->is_published);
    }

    public function test_un_producto_nace_visible(): void
    {
        $comercio = $this->comercio();

        $producto = app(Tenancy::class)->forTenant(
            $comercio->id,
            fn () => Product::create(['name' => 'Taza', 'stock' => 3]),
        );

        $this->assertFalse((bool) $producto->is_hidden);
    }

    public function test_el_producto_que_crea_el_formulario_nace_visible(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('productos.store'), ['name' => 'Taza', 'item_type' => 'producto', 'stock' => 3])
            ->assertSessionHasNoErrors();

        $producto = app(Tenancy::class)->forTenant($comercio->id, fn () => Product::sole());

        $this->assertFalse($producto->is_hidden);
    }

    /**
     * Lo importado también. Si el archivo trae una columna «oculto» se
     * respeta, pero sin ella entra a la vista de todos.
     */
    public function test_lo_importado_nace_visible(): void
    {
        $comercio = $this->comercio();

        $this->actingAs($comercio)
            ->post(route('productos.importar.store'), [
                'filas' => [['Harina']],
                'columnas' => ['nombre' => 0],
            ])
            ->assertSessionHasNoErrors();

        $this->assertFalse(app(Tenancy::class)->forTenant($comercio->id, fn () => Product::sole())->is_hidden);
    }
}
