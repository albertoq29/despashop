<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\User;
use App\Services\ImportacionDeProductos;
use App\Support\ColumnasDeImportacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Traer el inventario desde una hoja de cálculo.
 *
 * El archivo se lee en el navegador —así no hay que subir nada ni instalar
 * un lector de Excel en el servidor— y aquí llegan las filas ya en JSON. Eso
 * no las hace de fiar: la correspondencia de columnas se propone aquí, se
 * confirma en pantalla, y cada valor se valida al importar.
 */
class ImportacionController extends Controller
{
    public function __construct(private ImportacionDeProductos $importacion)
    {
    }

    public function create(): Response
    {
        $comercio = User::findOrFail($this->tenantId());
        $maximo = $comercio->plan?->max_products;

        return Inertia::render('Productos/Importar', [
            'campos' => ColumnasDeImportacion::paraLaPantalla(),
            'maximoFilas' => ImportacionDeProductos::MAXIMO_FILAS,
            'limite' => [
                'maximo' => $maximo,
                'usados' => Product::count(),
            ],
        ]);
    }

    /**
     * Qué columna del archivo parece ser cuál de las nuestras.
     *
     * Responde JSON porque la pantalla ya tiene el archivo leído y no debe
     * recargarse: perdería lo que el comercio lleva revisado.
     */
    public function analizar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'encabezados' => ['required', 'array', 'min:1', 'max:200'],
            'encabezados.*' => ['nullable', 'string', 'max:200'],
        ]);

        return response()->json([
            'sugerencia' => ColumnasDeImportacion::sugerir($datos['encabezados']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'filas' => ['required', 'array', 'min:1', 'max:' . ImportacionDeProductos::MAXIMO_FILAS],
            'filas.*' => ['array', 'max:200'],
            'columnas' => ['required', 'array'],
            'columnas.*' => ['nullable', 'integer', 'min:0', 'max:199'],
            'sobrescribir' => ['boolean'],
        ], [
            'filas.max' => 'Son demasiadas filas de una sola vez: súbelas por partes.',
        ]);

        if (! array_key_exists(ColumnasDeImportacion::OBLIGATORIO, array_filter($datos['columnas'], fn ($v) => $v !== null))) {
            return back()->withErrors([
                'columnas' => 'Falta decir cuál columna trae el nombre del producto.',
            ]);
        }

        $comercio = User::findOrFail($this->tenantId());

        $resumen = $this->importacion->importar(
            $comercio,
            $datos['filas'],
            $datos['columnas'],
            $request->boolean('sobrescribir'),
        );

        ActivityLog::record(
            'productos.importados',
            "Importó {$resumen['creados']} productos desde una hoja de cálculo",
            $resumen,
        );

        return redirect()
            ->route('productos.index')
            ->with('success', $this->mensaje($resumen));
    }

    /** @param  array{creados: int, omitidos: int, categorias: int, avisos: list<string>}  $resumen */
    private function mensaje(array $resumen): string
    {
        if ($resumen['creados'] === 0) {
            return 'No se importó ningún producto. ' . implode(' ', $resumen['avisos']);
        }

        $partes = [$resumen['creados'] === 1 ? 'Se importó 1 producto' : "Se importaron {$resumen['creados']} productos"];

        if ($resumen['categorias'] > 0) {
            $partes[] = $resumen['categorias'] === 1
                ? 'y se creó 1 categoría nueva'
                : "y se crearon {$resumen['categorias']} categorías nuevas";
        }

        $mensaje = implode(' ', $partes) . '.';

        if ($resumen['omitidos'] > 0) {
            $mensaje .= " Se saltaron {$resumen['omitidos']}.";
        }

        return trim($mensaje . ' ' . implode(' ', $resumen['avisos']));
    }
}
