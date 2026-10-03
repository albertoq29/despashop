<?php

namespace App\Http\Controllers;

use App\Models\AiGeneration;
use App\Models\User;
use App\Services\Ia\AsistenteDeCatalogo;
use App\Services\Ia\ErrorDeIa;
use App\Services\Ia\GeneradorDeCatalogo;
use App\Services\Ia\LimitesDeIa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Asistente de IA del editor del catálogo.
 *
 * Responde JSON porque lo usa una ventana dentro del editor, que no debe
 * recargar la página: el comercio puede tener cambios sin guardar.
 */
class CatalogoIaController extends Controller
{
    public function __construct(
        private AsistenteDeCatalogo $asistente,
        private LimitesDeIa $limites,
    ) {
    }

    public function generar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'descripcion' => ['required', 'string', 'min:' . config('ia.minimo_caracteres'), 'max:' . config('ia.maximo_caracteres')],
            'tono' => ['required', Rule::in(array_keys(GeneradorDeCatalogo::TONOS))],
            'incluir' => ['required', 'array'],
            'incluir.diseno' => ['boolean'],
            'incluir.textos' => ['boolean'],
            'incluir.inventario' => ['boolean'],
        ], [
            'descripcion.required' => 'Describe tu negocio para que la IA pueda proponerte algo.',
            'descripcion.min' => 'Cuéntanos un poco más: al menos :min caracteres sobre qué vendes y cómo quieres que se vea.',
            'descripcion.max' => 'La descripción puede tener hasta :max caracteres.',
        ]);

        $incluir = [
            'diseno' => (bool) ($datos['incluir']['diseno'] ?? false),
            'textos' => (bool) ($datos['incluir']['textos'] ?? false),
            'inventario' => (bool) ($datos['incluir']['inventario'] ?? false),
        ];

        $comercio = $this->comercio();

        if (! in_array(true, $incluir, true)) {
            return $this->error($comercio, 'Elige al menos una cosa para que la IA proponga.', 422);
        }

        try {
            $generacion = $this->asistente->crear(
                $comercio,
                $request->user(),
                $datos['descripcion'],
                $datos['tono'],
                $incluir,
            );
        } catch (ErrorDeIa $e) {
            return $this->error($comercio, $e->getMessage(), $e->estadoHttp);
        }

        return response()->json([
            'generacion_id' => $generacion->id,
            'propuesta' => $generacion->result,
            'uso' => $this->limites->estado($comercio),
        ]);
    }

    public function inventario(Request $request, AiGeneration $generacion): JsonResponse
    {
        $datos = $request->validate([
            'categorias' => ['present', 'array', 'max:20'],
            'categorias.*' => ['integer', 'min:0'],
            'productos' => ['present', 'array', 'max:20'],
            'productos.*' => ['integer', 'min:0'],
        ]);

        $comercio = $this->comercio();

        try {
            $creado = $this->asistente->crearInventario($comercio, $generacion, $datos['categorias'], $datos['productos']);
        } catch (ErrorDeIa $e) {
            return $this->error($comercio, $e->getMessage(), $e->estadoHttp);
        }

        return response()->json(['creado' => $creado]);
    }

    /** Comercio dueño del catálogo: el autenticado o el que inspecciona el admin. */
    private function comercio(): User
    {
        return User::findOrFail($this->tenantId());
    }

    private function error(User $comercio, string $mensaje, int $estado): JsonResponse
    {
        return response()->json([
            'message' => $mensaje,
            'uso' => $this->limites->estado($comercio),
        ], $estado);
    }
}
