<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Cada página que renderizamos tiene que estar en el manifiesto de Vite.
 *
 * `app.blade.php` pide el archivo de la página por su ruta:
 *
 *     @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
 *
 * Si Rollup no le emitió un trozo propio, no aparece en el manifiesto y
 * Laravel responde «Unable to locate file in Vite manifest» al entrar. Pasó
 * de verdad: la ficha de un comercio importaba un componente de la lista de
 * comercios, Rollup se llevó la lista dentro del paquete de la ficha y la
 * lista dejó de existir como página.
 *
 * El suite no lo notó porque ninguna prueba abría esa pantalla. Esta mira
 * las dos cosas: que el manifiesto cubra todo lo que renderizamos, y que las
 * pantallas del panel de administración respondan de verdad.
 */
class PaginasEnElManifiestoTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, string> ruta del archivo => dónde se renderiza */
    private function paginasQueRenderizamos(): array
    {
        $paginas = [];

        foreach (File::allFiles(app_path()) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            preg_match_all(
                "/Inertia::render\(\s*'([^']+)'/",
                (string) file_get_contents($archivo->getPathname()),
                $coincidencias,
            );

            foreach ($coincidencias[1] as $componente) {
                $paginas['resources/js/Pages/' . $componente . '.jsx'] = $archivo->getFilename();
            }
        }

        return $paginas;
    }

    public function test_todas_las_paginas_tienen_su_trozo_en_el_manifiesto(): void
    {
        $ruta = public_path('build/manifest.json');

        if (! file_exists($ruta)) {
            $this->markTestSkipped('No hay build: corre `npm run build` antes.');
        }

        $manifiesto = json_decode((string) file_get_contents($ruta), true);
        $paginas = $this->paginasQueRenderizamos();

        $this->assertNotEmpty($paginas, 'No encontré ninguna llamada a Inertia::render');

        $faltan = [];

        foreach ($paginas as $archivo => $donde) {
            if (! isset($manifiesto[$archivo])) {
                $faltan[] = $archivo . ' (' . $donde . ')';
            }
        }

        $this->assertSame([], $faltan, implode("\n", [
            'Estas páginas se renderizan pero no están en el manifiesto:',
            ...$faltan,
            '',
            'Suele ser porque otra página las importa de forma estática y Rollup',
            'se las llevó dentro de su paquete. Saca lo compartido a un componente.',
        ]));
    }

    /**
     * Un componente definido en una página y nunca renderizado.
     *
     * Pasó con la vitrina de la bienvenida: el componente quedó escrito y
     * la sección nunca se pintó, porque la línea que lo renderizaba no se
     * guardó. Compila igual, las pruebas del servidor pasan igual —el prop
     * sí viaja— y la pantalla simplemente no muestra nada.
     *
     * Se mira el archivo y no el navegador porque aquí no hay forma de
     * pintar React, pero el síntoma es visible desde el código: nadie usa
     * la etiqueta.
     */
    public function test_ninguna_pagina_define_un_componente_que_no_usa(): void
    {
        $muertos = [];

        foreach (File::allFiles(resource_path('js/Pages')) as $archivo) {
            if ($archivo->getExtension() !== 'jsx') {
                continue;
            }

            $codigo = (string) file_get_contents($archivo->getPathname());

            // El componente de la página se exporta por defecto y nunca se
            // usa como etiqueta dentro de su propio archivo
            preg_match('/^export\s+default\s+function\s+(\w+)/m', $codigo, $principal);

            preg_match_all('/^(?:export\s+)?function\s+([A-Z]\w*)\s*\(/m', $codigo, $definidos);

            foreach ($definidos[1] as $componente) {
                if ($componente === ($principal[1] ?? null)) {
                    continue;
                }

                // Como etiqueta, o pasado como valor (un mapa de paneles)
                $sinSuDefinicion = str_replace('function ' . $componente, '', $codigo);

                if (! str_contains($codigo, '<' . $componente)
                    && ! preg_match('/[:\s,\[(]' . $componente . '[\s,\])}]/', $sinSuDefinicion)) {
                    $muertos[] = $archivo->getFilename() . ' -> ' . $componente;
                }
            }
        }

        $this->assertSame([], $muertos, implode("\n", [
            'Estos componentes están definidos en una página y nadie los usa:',
            ...$muertos,
            '',
            'O falta la línea que los renderiza, o son código muerto que sobra.',
        ]));
    }

    /**
     * Una etiqueta que no existe en ninguna parte.
     *
     * El reverso del caso anterior, y pasó también: una página usaba
     * `<PagoEnDivisas>` y el componente solo quedó escrito en la otra. No
     * es un error de compilación —un identificador suelto no lo es— así
     * que el build pasa y la pantalla revienta al abrirla.
     */
    public function test_ninguna_pagina_usa_un_componente_que_no_existe(): void
    {
        $fantasmas = [];

        foreach (File::allFiles(resource_path('js/Pages')) as $archivo) {
            if ($archivo->getExtension() !== 'jsx') {
                continue;
            }

            $codigo = (string) file_get_contents($archivo->getPathname());

            // Lo que el archivo tiene a mano: definido aquí, importado, o
            // recibido como prop. Un icono llega casi siempre así
            // —`function Metrica({ Icono })`— y luego se pinta.
            preg_match_all('/(?:function|const|let|class)\s+([A-Z]\w*)/', $codigo, $propios);
            preg_match_all('/^import\s+(.+?)\s+from\s/ms', $codigo, $importes);
            preg_match_all('/[{,]\s*([A-Z]\w*)\s*[,}=:]/', $codigo, $recibidos);

            $aMano = [...$propios[1], ...$recibidos[1]];

            foreach ($importes[1] as $lista) {
                preg_match_all('/([A-Z]\w*)/', $lista, $nombres);
                $aMano = [...$aMano, ...$nombres[1]];
            }

            // Las etiquetas que de verdad se pintan. `<Foo.Bar>` cuenta
            // como `Foo`, que es lo que tiene que existir.
            preg_match_all('/<([A-Z]\w*)/', $codigo, $usados);

            foreach (array_unique($usados[1]) as $componente) {
                if (! in_array($componente, $aMano, true)) {
                    $fantasmas[] = $archivo->getFilename() . ' -> <' . $componente . '>';
                }
            }
        }

        $this->assertSame([], $fantasmas, implode("\n", [
            'Estas páginas pintan un componente que no definen ni importan:',
            ...$fantasmas,
        ]));
    }

    /**
     * Las pantallas del admin abren de verdad.
     *
     * Son las que menos se prueban y las que más fácil se rompen así: cada
     * una es una página distinta y el fallo solo aparece al entrar.
     */
    public function test_las_pantallas_del_admin_abren(): void
    {
        if (! file_exists(public_path('build/manifest.json'))) {
            $this->markTestSkipped('No hay build: corre `npm run build` antes.');
        }

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@ejemplo.test',
            'password' => 'Clave.Segura9',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_APPROVED,
        ]);

        $rutas = [
            'admin.dashboard',
            'admin.comercios.index',
            'admin.planes.index',
            'admin.ajustes',
            'admin.avisos.index',
            'admin.cambios-plan.index',
            'admin.seguridad.index',
            'admin.sugerencias.index',
        ];

        foreach ($rutas as $nombre) {
            $this->actingAs($admin)->get(route($nombre))->assertOk($nombre);
        }
    }
}
