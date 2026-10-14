<?php

namespace App\Support;

/**
 * Qué columna del Excel del comercio es cuál de las nuestras.
 *
 * Nadie lleva su inventario con nuestros nombres de campo. Unos escriben
 * «PVP», otros «precio venta», otros «Price»; unos ponen «stock» y otros
 * «cantidad disponible». Esto reconoce las formas comunes y propone una
 * correspondencia, que el comercio confirma o corrige antes de importar:
 * adivinar y ejecutar sin preguntar es cómo se arruina un inventario.
 *
 * Lo que no aparezca en el archivo se queda vacío, que es lo que se espera
 * de una importación: trae lo que trae.
 */
class ColumnasDeImportacion
{
    /**
     * Los campos que se pueden traer, con cómo suelen llamarse.
     *
     * El orden importa: se busca campo por campo, y el primero que reclame
     * una columna se la queda. Por eso «precio al mayor» va antes que
     * «precio» a secas, o se llevaría la columna equivocada.
     *
     * @var array<string, array{nombre: string, ayuda: string, sinonimos: list<string>}>
     */
    public const CAMPOS = [
        'nombre' => [
            'nombre' => 'Nombre',
            'ayuda' => 'Lo único obligatorio.',
            'sinonimos' => [
                'nombre', 'nombre del producto', 'producto', 'productos', 'articulo', 'articulos',
                'item', 'descripcion corta', 'denominacion', 'detalle del producto',
                'name', 'product', 'product name', 'title', 'titulo', 'descripcion del articulo',
            ],
        ],
        'precio_mayor' => [
            'nombre' => 'Precio al mayor',
            'ayuda' => 'En dólares.',
            'sinonimos' => [
                'precio al mayor', 'precio mayor', 'precio x mayor', 'precio por mayor', 'al mayor',
                'mayor', 'mayorista', 'precio mayorista', 'wholesale', 'wholesale price', 'precio 2',
            ],
        ],
        'precio_distribuidor' => [
            'nombre' => 'Precio de distribuidor',
            'ayuda' => 'En dólares.',
            'sinonimos' => [
                'precio distribuidor', 'precio de distribuidor', 'distribuidor', 'gran mayor',
                'precio gran mayor', 'precio 3', 'dealer', 'dealer price',
            ],
        ],
        'costo' => [
            'nombre' => 'Costo',
            'ayuda' => 'Lo que te cuesta a ti. No se publica.',
            'sinonimos' => [
                'costo', 'costo unitario', 'costo compra', 'costo promedio', 'precio de compra',
                'precio compra', 'cost', 'cost price', 'unit cost', 'inversion',
            ],
        ],
        'precio' => [
            'nombre' => 'Precio al detal',
            'ayuda' => 'En dólares. Vacío sale como «Consultar».',
            'sinonimos' => [
                'precio', 'precio detal', 'precio al detal', 'precio de venta', 'precio venta',
                'precio unitario', 'precio publico', 'pvp', 'p v p', 'venta', 'valor',
                'price', 'retail', 'retail price', 'sale price', 'precio 1', 'p vta', 'pv',
            ],
        ],
        'existencias' => [
            'nombre' => 'Existencias',
            'ayuda' => 'Cuánto tienes.',
            'sinonimos' => [
                'existencias', 'existencia', 'stock', 'cantidad', 'cantidad disponible', 'disponible',
                'inventario', 'unidades', 'saldo', 'qty', 'quantity', 'on hand', 'stock actual',
                'ctd', 'cdad', 'cant', 'exist',
            ],
        ],
        'unidad' => [
            'nombre' => 'Unidad de medida',
            'ayuda' => 'Kg, litros, cajas… Si no viene, se cuenta por unidades.',
            'sinonimos' => [
                'unidad', 'unidad de medida', 'medida', 'um', 'u m', 'uom', 'unit', 'unit of measure',
                'presentacion', 'ud', 'unid',
            ],
        ],
        'categorias' => [
            'nombre' => 'Categorías',
            'ayuda' => 'Separadas por coma. Las que no existan se crean.',
            'sinonimos' => [
                'categoria', 'categorias', 'rubro', 'rubros', 'linea', 'familia', 'grupo',
                'departamento', 'seccion', 'category', 'categories', 'department', 'tipo de producto',
                // Contracciones: no se deducen solas porque no empiezan
                // igual que la palabra entera
                'depto', 'dpto', 'dep', 'categ', 'cat',
            ],
        ],
        'descripcion' => [
            'nombre' => 'Descripción',
            'ayuda' => 'La que se ve en tu catálogo.',
            'sinonimos' => [
                'descripcion', 'descripcion larga', 'detalle', 'detalles', 'description',
                'caracteristicas', 'especificaciones', 'contenido', 'descrip', 'desc',
            ],
        ],
        'tipo' => [
            'nombre' => 'Producto o servicio',
            'ayuda' => 'Si no viene, todo entra como producto.',
            'sinonimos' => ['tipo', 'clase', 'type', 'tipo de item', 'producto o servicio'],
        ],
        'notas' => [
            'nombre' => 'Notas internas',
            'ayuda' => 'Solo las ves tú.',
            'sinonimos' => [
                'notas', 'nota', 'notas internas', 'observaciones', 'observacion', 'comentarios',
                'notes', 'internal notes', 'remarks', 'obs',
            ],
        ],
        'oculto' => [
            'nombre' => 'Oculto del catálogo',
            'ayuda' => 'Sí / no.',
            'sinonimos' => ['oculto', 'ocultar', 'no publicar', 'hidden', 'privado'],
        ],
        'duracion' => [
            'nombre' => 'Duración del servicio',
            'ayuda' => 'Solo para servicios: «45 min», «2 horas».',
            'sinonimos' => ['duracion', 'duration', 'tiempo', 'tiempo estimado'],
        ],
    ];

    /** Lo único sin lo cual no se puede crear nada. */
    public const OBLIGATORIO = 'nombre';

    /**
     * Propone qué columna del archivo va a qué campo.
     *
     * Devuelve `campo => índice de la columna`, y deja fuera lo que no
     * reconoce. Una misma columna no se asigna dos veces.
     *
     * @param  list<string>  $encabezados  La primera fila del archivo
     * @return array<string, int>
     */
    public static function sugerir(array $encabezados): array
    {
        $normalizados = array_map([self::class, 'normalizar'], $encabezados);
        $sugerencia = [];
        $tomadas = [];

        foreach (self::CAMPOS as $campo => $definicion) {
            foreach ($definicion['sinonimos'] as $sinonimo) {
                $indice = array_search($sinonimo, $normalizados, true);

                if ($indice !== false && ! in_array($indice, $tomadas, true)) {
                    $sugerencia[$campo] = $indice;
                    $tomadas[] = $indice;

                    continue 2;
                }
            }
        }

        // Segunda pasada, más laxa: «precio (usd)» o «nombre del producto*»
        $sugerencia = self::buscar($sugerencia, $tomadas, $normalizados, 'contiene');

        // Tercera: abreviaturas. Nadie escribe «existencias» completo en una
        // hoja de cálculo; escribe «EXIST.», «DEPTO.» u «OBSERVAC.», y ahí
        // el encabezado es más corto que la palabra, no más largo.
        return self::buscar($sugerencia, $tomadas, $normalizados, 'abrevia');
    }

    /**
     * Una pasada de búsqueda sobre los campos que todavía no tienen columna.
     *
     * @param  array<string, int>  $sugerencia
     * @param  list<int>  $tomadas
     * @param  list<string>  $normalizados
     * @return array<string, int>
     */
    private static function buscar(array $sugerencia, array &$tomadas, array $normalizados, string $modo): array
    {
        foreach (self::CAMPOS as $campo => $definicion) {
            if (isset($sugerencia[$campo])) {
                continue;
            }

            foreach ($definicion['sinonimos'] as $sinonimo) {
                foreach ($normalizados as $indice => $encabezado) {
                    if ($encabezado === '' || in_array($indice, $tomadas, true)) {
                        continue;
                    }

                    // Cuatro letras como mínimo para abreviar: con menos, una
                    // columna llamada «U» o «P» se llevaría cualquier cosa.
                    $coincide = $modo === 'contiene'
                        ? str_contains($encabezado, $sinonimo)
                        : mb_strlen($encabezado) >= 4 && str_starts_with($sinonimo, $encabezado);

                    if ($coincide) {
                        $sugerencia[$campo] = $indice;
                        $tomadas[] = $indice;

                        continue 3;
                    }
                }
            }
        }

        return $sugerencia;
    }

    /**
     * El encabezado reducido a lo comparable.
     *
     * Quita acentos, signos y espacios de más, porque «Precio (USD)»,
     * «precio_usd» y «PRECIO  USD» son la misma columna escrita por tres
     * personas distintas.
     */
    public static function normalizar(mixed $encabezado): string
    {
        $texto = mb_strtolower(trim((string) $encabezado));

        $texto = strtr($texto, [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        ]);

        // Los paréntesis suelen traer la moneda o la unidad: «precio (usd)»
        $texto = preg_replace('/\((?:usd|us\$|\$|bs|ves|bolivares|dolares)\)/u', '', $texto);
        $texto = preg_replace('/[^a-z0-9\s]/u', ' ', $texto);

        return trim(preg_replace('/\s+/u', ' ', $texto));
    }

    /**
     * Los campos tal como los necesita una pantalla, en orden de lectura.
     *
     * No es el orden de `CAMPOS`, que está pensado para que la búsqueda no
     * se equivoque de columna: en pantalla se lee mejor por importancia.
     *
     * @return list<array{clave: string, nombre: string, ayuda: string, obligatorio: bool}>
     */
    public static function paraLaPantalla(): array
    {
        $orden = [
            'nombre', 'descripcion', 'categorias', 'precio', 'precio_mayor', 'precio_distribuidor',
            'costo', 'existencias', 'unidad', 'tipo', 'duracion', 'oculto', 'notas',
        ];

        return array_map(fn (string $clave) => [
            'clave' => $clave,
            'nombre' => self::CAMPOS[$clave]['nombre'],
            'ayuda' => self::CAMPOS[$clave]['ayuda'],
            'obligatorio' => $clave === self::OBLIGATORIO,
        ], $orden);
    }
}
