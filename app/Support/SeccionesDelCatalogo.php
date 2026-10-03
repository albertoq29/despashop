<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Estructura del catálogo público como una lista ordenada de bloques.
 *
 * Todo lo que llega aquí sale de un editor que arrastra, duplica y borra
 * bloques en el navegador, así que no se confía en su forma: se descartan
 * los tipos desconocidos y las claves que no correspondan, se recortan los
 * textos y se garantiza que cada bloque fijo aparezca exactamente una vez.
 * Así el catálogo público nunca recibe una estructura que no sepa pintar.
 */
class SeccionesDelCatalogo
{
    /** Bloques que existen una sola vez. Este es también su orden por defecto. */
    public const FIJAS = [
        'marquee', 'header', 'announcement', 'banners', 'hero',
        'featured', 'combos', 'services', 'products', 'contact',
    ];

    /** Bloques que el comercio puede agregar tantas veces como quiera. */
    public const REPETIBLES = ['text', 'benefits', 'category', 'faq', 'testimonials', 'stats', 'divider'];

    public const MAXIMO_REPETIBLES = 20;

    /** Tope de renglones en los bloques que son una lista (preguntas, testimonios). */
    public const MAXIMO_ITEMS = 12;

    public const ICONOS = [
        'truck', 'credit-card', 'shield-check', 'clock', 'map-pin', 'gift', 'star',
        'heart', 'package', 'phone', 'badge-check', 'sparkles', 'leaf', 'smile',
    ];

    /** Estilos válidos por tipo de bloque. El primero es el de por defecto. */
    private const ESTILOS = [
        'featured' => ['carousel', 'grid'],
        'combos' => ['carousel', 'grid'],
        'services' => ['grid', 'carousel'],
        'category' => ['carousel', 'grid'],
        'contact' => self::SUPERFICIES,
        'text' => ['plain', 'card', 'brand', 'glass', 'outline'],
        'benefits' => ['plain', 'card', 'brand', 'glass', 'outline'],
        'faq' => ['card', 'plain', 'glass', 'outline', 'brand'],
        'testimonials' => ['card', 'plain', 'glass', 'outline', 'brand'],
        'stats' => ['brand', 'card', 'plain', 'glass', 'outline'],
    ];

    /** Fondos que puede llevar un bloque de contenido. El primero es el de por defecto. */
    public const SUPERFICIES = ['brand', 'card', 'plain', 'glass', 'outline'];

    /** Figuras del bloque separador. */
    public const FIGURAS = ['wave', 'slant', 'curve', 'zigzag', 'line', 'dots'];

    /**
     * @param  array<mixed>  $secciones  Lo que haya guardado o enviado el editor.
     * @param  array<string, bool>  $visibilidadHeredada  Para catálogos anteriores a las secciones.
     * @return list<array<string, mixed>>
     */
    public static function normalizar(array $secciones, array $visibilidadHeredada = []): array
    {
        $resultado = [];
        $usados = [];
        $repetibles = 0;

        foreach ($secciones as $seccion) {
            if (! is_array($seccion)) {
                continue;
            }

            $tipo = $seccion['type'] ?? $seccion['id'] ?? null;
            $esRepetible = in_array($tipo, self::REPETIBLES, true);

            if (! $esRepetible && ! in_array($tipo, self::FIJAS, true)) {
                continue;
            }

            if ($esRepetible) {
                if ($repetibles >= self::MAXIMO_REPETIBLES) {
                    continue;
                }

                $id = is_string($seccion['id'] ?? null) && preg_match('/^' . $tipo . '-[a-z0-9]{4,12}$/', $seccion['id'])
                    ? $seccion['id']
                    : self::nuevoId($tipo);

                // Un bloque duplicado a mano conserva el contenido con otro id
                if (isset($usados[$id])) {
                    $id = self::nuevoId($tipo);
                }

                $repetibles++;
            } else {
                $id = $tipo;

                if (isset($usados[$id])) {
                    continue;
                }
            }

            $usados[$id] = true;
            $resultado[] = self::limpiar($tipo, $id, $seccion);
        }

        return self::completarFijas($resultado, $usados, $visibilidadHeredada);
    }

    /** @return array<string, mixed> */
    public static function porDefecto(string $tipo, array $visibilidadHeredada = []): array
    {
        $base = [
            'id' => $tipo,
            'type' => $tipo,
            'visible' => $visibilidadHeredada[$tipo] ?? ! in_array($tipo, ['featured'], true),
        ];

        return $base + match ($tipo) {
            'featured' => ['title' => 'Novedades', 'subtitle' => 'Lo último que llegó a la tienda.', 'style' => 'carousel', 'limit' => 8],
            'combos' => ['title' => 'Combos', 'subtitle' => 'Llévate más por menos.', 'style' => 'carousel'],
            'services' => ['title' => 'Nuestros servicios', 'subtitle' => 'Lo que hacemos por ti.', 'style' => 'grid'],
            'products' => ['title' => 'Nuestros productos', 'subtitle' => ''],
            'contact' => [
                'title' => '¿Tienes alguna pregunta?',
                'text' => 'Escríbenos y te respondemos lo antes posible.',
                'button_text' => 'Escribir por WhatsApp',
                'style' => 'brand',
            ],
            'text' => [
                'title' => 'Sobre nosotros',
                'text' => 'Cuenta aquí quiénes son, qué los hace distintos o cómo trabajan.',
                'button_text' => '',
                'button_link' => '',
                'align' => 'center',
                'style' => 'plain',
            ],
            'benefits' => [
                'title' => '',
                'style' => 'plain',
                'items' => [
                    ['icon' => 'truck', 'title' => 'Envíos', 'text' => 'Llevamos tu pedido a donde estés.'],
                    ['icon' => 'credit-card', 'title' => 'Pagos flexibles', 'text' => 'Divisas, bolívares y pago móvil.'],
                    ['icon' => 'shield-check', 'title' => 'Compra segura', 'text' => 'Te atendemos antes y después de comprar.'],
                ],
            ],
            'category' => ['title' => '', 'category_id' => null, 'style' => 'carousel', 'limit' => 8],
            'faq' => [
                'title' => 'Preguntas frecuentes',
                'subtitle' => '',
                'style' => 'card',
                'items' => [
                    ['question' => '¿Hacen envíos?', 'answer' => 'Sí. Escríbenos y te decimos el costo hasta tu zona.'],
                    ['question' => '¿Cómo puedo pagar?', 'answer' => 'Aceptamos divisas, pago móvil y transferencia.'],
                    ['question' => '¿Puedo cambiar un producto?', 'answer' => 'Cuéntanos qué pasó y buscamos la solución.'],
                ],
            ],
            'testimonials' => [
                'title' => 'Lo que dicen nuestros clientes',
                'subtitle' => '',
                'style' => 'card',
                'items' => [
                    ['title' => 'María G.', 'text' => 'Todo llegó tal cual y rapidísimo. Repito segura.', 'rating' => 5],
                    ['title' => 'José R.', 'text' => 'Me asesoraron por WhatsApp hasta dar con lo que buscaba.', 'rating' => 5],
                ],
            ],
            'stats' => [
                'title' => '',
                'subtitle' => '',
                'style' => 'brand',
                'items' => [
                    ['value' => '+500', 'title' => 'Clientes atendidos'],
                    ['value' => '3', 'title' => 'Años en el mercado'],
                    ['value' => '24h', 'title' => 'Tiempo de respuesta'],
                ],
            ],
            'divider' => ['shape' => 'wave'],
            default => [],
        };
    }

    /**
     * Ids de las categorías que usan los bloques visibles de "categoría destacada".
     *
     * @param  list<array<string, mixed>>  $secciones
     * @return list<int>
     */
    public static function categoriasDestacadas(array $secciones): array
    {
        return collect($secciones)
            ->filter(fn ($s) => $s['type'] === 'category' && $s['visible'] && $s['category_id'])
            ->pluck('category_id')
            ->unique()
            ->values()
            ->all();
    }

    /** @param  list<array<string, mixed>>  $secciones */
    public static function esVisible(array $secciones, string $id): bool
    {
        foreach ($secciones as $seccion) {
            if ($seccion['id'] === $id) {
                return (bool) $seccion['visible'];
            }
        }

        return false;
    }

    /** @return array<string, mixed> */
    private static function limpiar(string $tipo, string $id, array $datos): array
    {
        $seccion = self::porDefecto($tipo);
        $seccion['id'] = $id;
        $seccion['visible'] = filter_var($datos['visible'] ?? $seccion['visible'], FILTER_VALIDATE_BOOLEAN);

        $textos = ['title' => 120, 'subtitle' => 200, 'text' => 1500, 'button_text' => 40, 'button_link' => 255];

        foreach ($textos as $clave => $maximo) {
            if (array_key_exists($clave, $seccion) && array_key_exists($clave, $datos)) {
                $seccion[$clave] = self::texto($datos[$clave], $maximo);
            }
        }

        if (isset(self::ESTILOS[$tipo])) {
            $seccion['style'] = in_array($datos['style'] ?? null, self::ESTILOS[$tipo], true)
                ? $datos['style']
                : self::ESTILOS[$tipo][0];
        }

        if (array_key_exists('align', $seccion)) {
            $seccion['align'] = in_array($datos['align'] ?? null, ['left', 'center'], true) ? $datos['align'] : 'center';
        }

        if (array_key_exists('limit', $seccion) && isset($datos['limit'])) {
            $seccion['limit'] = max(2, min(24, (int) $datos['limit']));
        }

        if ($tipo === 'category') {
            $seccion['category_id'] = is_numeric($datos['category_id'] ?? null) ? (int) $datos['category_id'] : null;
        }

        if ($tipo === 'divider') {
            $seccion['shape'] = in_array($datos['shape'] ?? null, self::FIGURAS, true) ? $datos['shape'] : 'wave';
        }

        if ($tipo === 'faq' && isset($datos['items']) && is_array($datos['items'])) {
            $seccion['items'] = collect($datos['items'])
                ->filter(fn ($item) => is_array($item))
                ->take(self::MAXIMO_ITEMS)
                ->map(fn ($item) => [
                    'question' => self::texto($item['question'] ?? '', 160),
                    'answer' => self::texto($item['answer'] ?? '', 800),
                ])
                ->values()
                ->all();
        }

        if ($tipo === 'testimonials' && isset($datos['items']) && is_array($datos['items'])) {
            $seccion['items'] = collect($datos['items'])
                ->filter(fn ($item) => is_array($item))
                ->take(self::MAXIMO_ITEMS)
                ->map(fn ($item) => [
                    'title' => self::texto($item['title'] ?? '', 60),
                    'text' => self::texto($item['text'] ?? '', 400),
                    // 0 significa «sin estrellas»: no todo testimonio lleva nota
                    'rating' => max(0, min(5, (int) ($item['rating'] ?? 5))),
                ])
                ->values()
                ->all();
        }

        if ($tipo === 'stats' && isset($datos['items']) && is_array($datos['items'])) {
            $seccion['items'] = collect($datos['items'])
                ->filter(fn ($item) => is_array($item))
                ->take(4)
                ->map(fn ($item) => [
                    'value' => self::texto($item['value'] ?? '', 12),
                    'title' => self::texto($item['title'] ?? '', 60),
                ])
                ->values()
                ->all();
        }

        if ($tipo === 'benefits' && isset($datos['items']) && is_array($datos['items'])) {
            $seccion['items'] = collect($datos['items'])
                ->filter(fn ($item) => is_array($item))
                ->take(4)
                ->map(fn ($item) => [
                    'icon' => in_array($item['icon'] ?? null, self::ICONOS, true) ? $item['icon'] : 'star',
                    'title' => self::texto($item['title'] ?? '', 60),
                    'text' => self::texto($item['text'] ?? '', 160),
                ])
                ->values()
                ->all();
        }

        return $seccion;
    }

    /**
     * Agrega los bloques fijos que falten, cada uno detrás del bloque fijo
     * que le precede en el orden por defecto. Así un catálogo guardado antes
     * de que existiera un bloque lo recibe en un lugar razonable.
     */
    private static function completarFijas(array $resultado, array $usados, array $visibilidadHeredada): array
    {
        foreach (self::FIJAS as $posicion => $tipo) {
            if (isset($usados[$tipo])) {
                continue;
            }

            $destino = 0;

            for ($anterior = $posicion - 1; $anterior >= 0; $anterior--) {
                $indice = array_search(self::FIJAS[$anterior], array_column($resultado, 'id'), true);

                if ($indice !== false) {
                    $destino = $indice + 1;
                    break;
                }
            }

            array_splice($resultado, $destino, 0, [self::porDefecto($tipo, $visibilidadHeredada)]);
            $usados[$tipo] = true;
        }

        return $resultado;
    }

    private static function texto(mixed $valor, int $maximo): string
    {
        return is_scalar($valor) ? mb_substr(trim((string) $valor), 0, $maximo) : '';
    }

    private static function nuevoId(string $tipo): string
    {
        return $tipo . '-' . Str::lower(Str::random(6));
    }
}
