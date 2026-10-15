<?php

namespace App\Services\Ia;

use App\Models\AiGeneration;
use App\Models\CatalogBanner;
use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Combo;
use App\Models\Product;
use App\Models\User;
use App\Services\Seguridad\RegistroDeSeguridad;
use App\Support\Contraste;
use App\Support\SeccionesDelCatalogo;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Crea un catálogo a partir de la descripción que escribe el comercio.
 *
 * El orden importa: primero lo gratis (límites, filtro local), después lo
 * barato (clasificador de seguridad) y al final lo caro (la generación).
 * Cada intento queda registrado con su resultado.
 */
class AsistenteDeCatalogo
{
    public function __construct(
        private ClienteGroq $cliente,
        private LimitesDeIa $limites,
        private ModeradorDeContenido $moderador,
        private GeneradorDeCatalogo $generador,
        private RegistroDeSeguridad $seguridad,
    ) {
    }

    /**
     * @param  array{diseno: bool, textos: bool, extras: list<string>, preferencias: array<string, string>}  $incluir
     */
    public function crear(User $comercio, ?User $solicitante, string $descripcion, string $tono, array $incluir, string $indicaciones = ''): AiGeneration
    {
        $limpiar = fn (string $texto) => trim(preg_replace('/\s+/u', ' ', strip_tags($texto)));
        $descripcion = $limpiar($descripcion);
        $indicaciones = $limpiar($indicaciones);

        $this->limites->verificar($comercio);

        // Un solo pedido a la vez por comercio: dos pestañas no duplican el gasto
        $candado = Cache::lock("ia-catalogo:{$comercio->id}", 120);

        if (! $candado->get()) {
            throw new ErrorDeIa('Ya estamos preparando una propuesta para tu catálogo. Espera a que termine.', 429);
        }

        try {
            return $this->procesar($comercio, $solicitante, $descripcion, $tono, $incluir, $indicaciones);
        } finally {
            $candado->release();
        }
    }

    private function procesar(User $comercio, ?User $solicitante, string $descripcion, string $tono, array $incluir, string $indicaciones): AiGeneration
    {
        $registro = [
            'requested_by' => $solicitante?->id,
            'prompt' => $descripcion,
            'options' => ['tono' => $tono, 'incluir' => $incluir, 'indicaciones' => $indicaciones],
        ];

        // Las indicaciones también las escribe el comercio y también acaban
        // en el prompt: pasan por los mismos filtros que la descripción.
        $aRevisar = trim($descripcion . "\n" . $indicaciones);

        // 1. Filtro local: gratis, y no gasta cupo del comercio
        if ($categoria = $this->moderador->terminoProhibido($aRevisar)) {
            $this->registrar($registro + ['status' => AiGeneration::BLOQUEADA, 'reason' => $categoria]);

            throw new ErrorDeIa($this->mensajeDeRechazo($categoria), 422);
        }

        // 2. Clasificador de seguridad
        $moderacion = $this->moderador->evaluar($aRevisar);

        if ($moderacion['categoria']) {
            $this->registrar($registro + [
                'status' => AiGeneration::RECHAZADA,
                'reason' => $moderacion['categoria'],
                'model' => config('services.groq.modelo_moderacion'),
                'prompt_tokens' => $moderacion['tokens'],
            ]);

            throw new ErrorDeIa($this->mensajeDeRechazo($moderacion['categoria']), 422);
        }

        // 3. Generación
        $tema = CatalogTheme::first();
        $secciones = $tema?->sections ?? SeccionesDelCatalogo::normalizar([]);
        $contexto = $this->contexto($comercio, $tema);

        try {
            $respuesta = $this->cliente->completar(
                $this->generador->mensajes($descripcion, $tono, $incluir, $contexto, $indicaciones),
                $this->generador->opciones($incluir, $contexto),
            );
        } catch (ErrorDeIa $e) {
            $this->registrar($registro + ['status' => AiGeneration::FALLIDA, 'reason' => mb_substr($e->getMessage(), 0, 190)]);

            throw $e;
        }

        $uso = [
            'model' => $respuesta['modelo'],
            'prompt_tokens' => $respuesta['tokens_entrada'] + $moderacion['tokens'],
            'completion_tokens' => $respuesta['tokens_salida'],
        ];

        $crudo = json_decode($respuesta['contenido'], true);

        if (! is_array($crudo)) {
            $this->registrar($registro + $uso + ['status' => AiGeneration::FALLIDA, 'reason' => 'Respuesta que no es JSON']);

            throw ErrorDeIa::fallo();
        }

        if (($crudo['permitido'] ?? false) !== true) {
            $motivo = $this->generador->texto($crudo['motivo'] ?? '', 180) ?: 'La descripción no corresponde a un comercio.';

            // Si el clasificador de seguridad ya la aprobó, lo más probable es
            // que el generador se haya pasado de cauto: no se le cobra al comercio.
            // Sin clasificador (desactivado o caído) el rechazo sí cuenta.
            $aprobadaPorClasificador = $moderacion['tokens'] > 0;

            $this->registrar($registro + $uso + [
                'status' => $aprobadaPorClasificador ? AiGeneration::FALLIDA : AiGeneration::RECHAZADA,
                'reason' => 'La IA no quiso generarla: ' . $motivo,
            ]);

            throw new ErrorDeIa(
                "No pudimos crear una propuesta con esa descripción. {$motivo} Describe tu negocio: qué vendes y cómo quieres que se vea."
                . ($aprobadaPorClasificador ? ' Este intento no cuenta para tu límite.' : ''),
                422,
            );
        }

        // Con la descripción a mano, el generador descarta promesas que el comercio no hizo
        $propuesta = $this->generador->propuesta($crudo, $incluir, $secciones, [...$contexto, 'descripcion' => $descripcion]);

        return $this->registrar($registro + $uso + ['status' => AiGeneration::COMPLETADA, 'result' => $propuesta]);
    }

    /** Lo que la IA necesita saber del comercio. Nunca precios, costos ni datos de clientes. */
    private function contexto(User $comercio, ?CatalogTheme $tema): array
    {
        $categorias = Category::orderBy('name')->limit(15)->pluck('name', 'id');

        return [
            'nombre' => $comercio->business_name ?: $comercio->name,
            'categorias' => $categorias->values()->all(),
            // Para atar el bloque de categoría destacada: la IA responde con
            // un nombre y aquí se busca a qué id corresponde
            'categorias_con_id' => $categorias->all(),
            'productos' => Product::latest('id')->limit(25)->pluck('name')->all(),
            'productos_totales' => Product::count(),
            'banners' => CatalogBanner::count(),
            'combos' => Combo::where('is_hidden', false)->count(),
            // Una portada con fondo de imagen sin imagen queda en degradado
            'tiene_portada' => (bool) $tema?->cover_path,
            // Un comercio que ya subió su logo tiene su marca decidida: la IA
            // propone alrededor de esos colores en vez de inventar otros.
            'colores_del_logo' => $this->coloresDelLogo($tema),
            'tiene_logo' => (bool) $tema?->logo_path,
            // Una barbería no vende «productos», y los textos se notan
            'servicios' => Product::where('item_type', Product::SERVICIO)->count(),
        ];
    }

    /**
     * Los colores del logo, si los hay y son válidos.
     *
     * Se filtran aquí y no en el prompt porque `logo_palette` es una columna
     * JSON: lo que haya quedado de una versión vieja del extractor no debe
     * acabar escrito en la petición.
     *
     * @return list<string>
     */
    private function coloresDelLogo(?CatalogTheme $tema): array
    {
        $colores = array_filter(
            (array) ($tema?->logo_palette ?? []),
            fn ($color) => is_string($color) && Contraste::esHex($color),
        );

        return array_values(array_map('strtolower', array_slice($colores, 0, 4)));
    }

    private function registrar(array $datos): AiGeneration
    {
        $registro = AiGeneration::create(['kind' => 'catalogo', ...$datos]);

        if (in_array($registro->status, [AiGeneration::BLOQUEADA, AiGeneration::RECHAZADA], true)) {
            $this->avisarAlAdmin($registro);
        }

        return $registro;
    }

    /**
     * Un pedido frenado puede ser una descripción mal escrita; varios del
     * mismo comercio en el día ya son alguien tanteando el filtro, y eso el
     * admin lo tiene que ver.
     */
    private function avisarAlAdmin(AiGeneration $registro): void
    {
        $frenados = AiGeneration::withoutGlobalScope('tenant')
            ->where('user_id', $registro->user_id)
            ->whereIn('status', [AiGeneration::BLOQUEADA, AiGeneration::RECHAZADA])
            ->where('created_at', '>=', now()->subDay())
            ->count();

        $insiste = $frenados >= (int) config('seguridad.umbral_ia');

        $this->seguridad->reportar(
            $insiste ? 'ia.insistencia' : 'ia.bloqueada',
            $insiste
                ? "Este comercio lleva {$frenados} pedidos a la IA frenados en un día"
                : 'Se frenó un pedido a la IA por su contenido: ' . $registro->reason,
            [
                'motivo' => $registro->reason,
                'frenados_en_un_dia' => $frenados,
                // El texto exacto queda en ai_generations; aquí va un resumen
                'descripcion' => Str::limit($registro->prompt, 200),
            ],
            comercioId: $registro->user_id,
        );
    }

    private function mensajeDeRechazo(string $categoria): string
    {
        return $categoria === 'instrucciones al sistema'
            ? 'El asistente solo arma catálogos. Describe tu negocio: qué vendes, a quién y cómo quieres que se vea.'
            : "Despashop no permite catálogos relacionados con {$categoria}. Si es un error, reescribe la descripción de tu negocio.";
    }
}
