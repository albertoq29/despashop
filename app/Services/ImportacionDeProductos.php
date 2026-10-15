<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\ColumnasDeImportacion;
use App\Support\UnidadesDeMedida;
use Illuminate\Support\Facades\DB;

/**
 * Trae el inventario que el comercio ya tenía en una hoja de cálculo.
 *
 * El archivo lo lee el navegador y aquí llegan filas ya en JSON, pero eso no
 * las hace de fiar: cada valor se vuelve a validar, se recorta y se encaja en
 * lo que la columna admite. Lo que el archivo no traiga se queda vacío, que
 * es lo honesto: una importación trae lo que trae y el resto se completa
 * después, producto por producto.
 *
 * Nada se crea a medias: si algo revienta, la tanda entera se deshace.
 */
class ImportacionDeProductos
{
    /** Tope por tanda. Un archivo más grande se sube por partes. */
    public const MAXIMO_FILAS = 2000;

    /**
     * @param  list<array<int, mixed>>  $filas  Las filas del archivo, sin encabezado
     * @param  array<string, int>  $columnas  campo => índice de columna
     * @return array{creados: int, omitidos: int, categorias: int, avisos: list<string>}
     */
    public function importar(User $comercio, array $filas, array $columnas, bool $sobrescribir = false): array
    {
        $columnas = $this->columnasValidas($columnas);

        $resumen = ['creados' => 0, 'omitidos' => 0, 'categorias' => 0, 'avisos' => []];

        $maximo = $comercio->plan?->max_products;
        $existentes = Product::count();
        $nombresUsados = Product::pluck('id', 'name')->all();

        DB::transaction(function () use ($filas, $columnas, $sobrescribir, $maximo, &$existentes, &$nombresUsados, &$resumen) {
            $categorias = Category::pluck('id', 'name')
                ->mapWithKeys(fn ($id, $nombre) => [ColumnasDeImportacion::normalizar($nombre) => $id])
                ->all();

            foreach (array_slice($filas, 0, self::MAXIMO_FILAS) as $numero => $fila) {
                if (! is_array($fila)) {
                    $resumen['omitidos']++;

                    continue;
                }

                $nombre = $this->texto($this->celda($fila, $columnas, 'nombre'), 255);

                if ($nombre === '') {
                    $resumen['omitidos']++;

                    continue;
                }

                $yaEsta = $nombresUsados[$nombre] ?? null;

                if ($yaEsta !== null && ! $sobrescribir) {
                    $resumen['omitidos']++;
                    $this->avisar($resumen, "Ya tenías «{$nombre}»: se dejó como estaba.");

                    continue;
                }

                // El plan solo limita lo que se agrega; actualizar no suma
                if ($yaEsta === null && $maximo !== null && $existentes >= $maximo) {
                    $resumen['omitidos']++;
                    $this->avisar($resumen, "Tu plan permite {$maximo} productos: el resto del archivo no se importó.");

                    continue;
                }

                $datos = $this->datosDeLaFila($fila, $columnas, $nombre);

                if ($yaEsta !== null) {
                    Product::whereKey($yaEsta)->first()?->update($datos);
                } else {
                    $producto = Product::create($datos);
                    $nombresUsados[$nombre] = $producto->id;
                    $existentes++;
                }

                $resumen['creados']++;

                $this->asignarCategorias(
                    $nombresUsados[$nombre],
                    $this->celda($fila, $columnas, 'categorias'),
                    $categorias,
                    $resumen,
                );
            }
        });

        if (count($filas) > self::MAXIMO_FILAS) {
            $sobran = count($filas) - self::MAXIMO_FILAS;
            $this->avisar($resumen, "El archivo traía {$sobran} filas de más: súbelas en otra tanda.");
        }

        return $resumen;
    }

    /**
     * Una fila convertida en producto.
     *
     * @param  array<int, mixed>  $fila
     * @param  array<string, int>  $columnas
     * @return array<string, mixed>
     */
    private function datosDeLaFila(array $fila, array $columnas, string $nombre): array
    {
        $esServicio = $this->esServicio($this->celda($fila, $columnas, 'tipo'));
        $unidad = UnidadesDeMedida::normalizar($this->unidad($this->celda($fila, $columnas, 'unidad')));

        return [
            'name' => $nombre,
            'item_type' => $esServicio ? Product::SERVICIO : Product::PRODUCTO,
            'description' => $this->texto($this->celda($fila, $columnas, 'descripcion'), 5000) ?: null,
            'notes' => $this->texto($this->celda($fila, $columnas, 'notas'), 5000) ?: null,
            'price_usdt' => $this->dinero($this->celda($fila, $columnas, 'precio')),
            'price_mayor_usdt' => $this->dinero($this->celda($fila, $columnas, 'precio_mayor')),
            'price_distribuidor_usdt' => $this->dinero($this->celda($fila, $columnas, 'precio_distribuidor')),
            'cost_price' => $this->dinero($this->celda($fila, $columnas, 'costo')),
            'unidad' => $unidad,
            'stock' => $esServicio ? 0 : $this->existencias($this->celda($fila, $columnas, 'existencias'), $unidad),
            'service_duration' => $esServicio ? $this->texto($this->celda($fila, $columnas, 'duracion'), 40) ?: null : null,
            'service_mode' => $esServicio ? 'acordar' : null,
            'is_hidden' => $this->siONo($this->celda($fila, $columnas, 'oculto')),
        ];
    }

    /**
     * Las categorías de la fila, creando las que falten.
     *
     * @param  array<string, int>  $categorias  Las que ya existen, por nombre en minúsculas
     */
    private function asignarCategorias(int $productoId, mixed $celda, array &$categorias, array &$resumen): void
    {
        $nombres = collect(preg_split('/[,;\/|]+/u', (string) $celda))
            ->map(fn ($nombre) => $this->texto($nombre, 100))
            ->filter()
            ->unique(fn ($nombre) => ColumnasDeImportacion::normalizar($nombre))
            ->take(5);

        if ($nombres->isEmpty()) {
            return;
        }

        $ids = [];

        foreach ($nombres as $nombre) {
            // Sin acentos ni mayúsculas: en un Excel, «Viveres» y «Víveres»
            // son la misma categoría escrita con prisa, y duplicarla deja al
            // comercio con dos filas que tiene que unir a mano después.
            $clave = ColumnasDeImportacion::normalizar($nombre);

            if (! isset($categorias[$clave])) {
                $categorias[$clave] = Category::create(['name' => $nombre])->id;
                $resumen['categorias']++;
            }

            $ids[] = $categorias[$clave];
        }

        Product::whereKey($productoId)->first()?->categories()->sync($ids);
    }

    /* ── Lectura de celdas ──────────────────────────────────────────────── */

    /** @param  array<int, mixed>  $fila */
    private function celda(array $fila, array $columnas, string $campo): mixed
    {
        $indice = $columnas[$campo] ?? null;

        return $indice === null ? null : ($fila[$indice] ?? null);
    }

    private function texto(mixed $valor, int $maximo): string
    {
        if (is_bool($valor) || $valor === null) {
            return '';
        }

        if (! is_scalar($valor)) {
            return '';
        }

        return mb_substr(trim(preg_replace('/\s+/u', ' ', strip_tags((string) $valor))), 0, $maximo);
    }

    /**
     * Un precio escrito como lo escribe cada quien.
     *
     * Hay hojas con «$ 12,50», con «12.500,00» y con «1,234.56». Se quitan
     * los símbolos y se decide cuál es el separador decimal mirando cuál va
     * de último, que es como se escribe un número en cualquiera de los dos
     * estilos.
     */
    private function dinero(mixed $valor): ?float
    {
        // Solo si el Excel lo entregó como número. Una cadena como «1.450»
        // también pasa por `is_numeric` y vale 1,45: hay que leerla abajo.
        if (is_int($valor) || is_float($valor)) {
            return round(max(0, (float) $valor), 2) ?: null;
        }

        $texto = preg_replace('/[^0-9,.\-]/u', '', (string) $valor);

        if ($texto === '' || $texto === '-') {
            return null;
        }

        $ultimaComa = strrpos($texto, ',');
        $ultimoPunto = strrpos($texto, '.');

        if ($ultimaComa !== false && ($ultimoPunto === false || $ultimaComa > $ultimoPunto)) {
            $texto = str_replace('.', '', $texto);
            $texto = str_replace(',', '.', $texto);
        } elseif ($this->esSeparadorDeMiles($texto)) {
            $texto = str_replace('.', '', $texto);
        } else {
            $texto = str_replace(',', '', $texto);
        }

        return is_numeric($texto) ? (round(max(0, (float) $texto), 2) ?: null) : null;
    }

    /**
     * Si ese punto separa los miles y no los decimales.
     *
     * «1.450» son mil cuatrocientos cincuenta tornillos, no uno con
     * cuarenta y cinco; leerlo al revés deja el inventario en la milésima
     * parte. La señal es la de siempre, la que usa cualquier hoja de
     * cálculo: un solo separador con exactamente tres cifras detrás.
     *
     * Con un cero delante no vale: «0.500» es medio kilo, no quinientos.
     */
    private function esSeparadorDeMiles(string $texto): bool
    {
        return (bool) preg_match('/^[1-9]\d{0,2}\.\d{3}$/', $texto);
    }

    private function existencias(mixed $valor, string $unidad): float
    {
        $cantidad = $this->dinero($valor) ?? 0;

        return UnidadesDeMedida::admiteFraccion($unidad) ? round($cantidad, 3) : round($cantidad);
    }

    /** «kg», «Kilos», «KG.» y «kilogramo» son la misma unidad. */
    private function unidad(mixed $valor): string
    {
        $texto = ColumnasDeImportacion::normalizar($valor);

        if ($texto === '') {
            return UnidadesDeMedida::POR_DEFECTO;
        }

        $equivalencias = [
            'kg' => ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
            'g' => ['g', 'gr', 'grs', 'gramo', 'gramos'],
            'lb' => ['lb', 'lbs', 'libra', 'libras'],
            'l' => ['l', 'lt', 'lts', 'litro', 'litros'],
            'ml' => ['ml', 'mililitro', 'mililitros', 'cc'],
            'm' => ['m', 'mt', 'mts', 'metro', 'metros'],
            'cm' => ['cm', 'centimetro', 'centimetros'],
            'm2' => ['m2', 'mt2', 'metro cuadrado', 'metros cuadrados'],
            'm3' => ['m3', 'mt3', 'metro cubico', 'metros cubicos'],
            'gal' => ['gal', 'gln', 'galon', 'galones'],
            'caja' => ['caja', 'cajas', 'cj', 'box'],
            'paquete' => ['paquete', 'paquetes', 'paq', 'pack'],
            'bulto' => ['bulto', 'bultos', 'saco', 'sacos'],
            'par' => ['par', 'pares'],
            'docena' => ['docena', 'docenas', 'dz'],
            'unidad' => ['unidad', 'unidades', 'und', 'un', 'u', 'pieza', 'piezas', 'pza', 'c u', 'each'],
        ];

        foreach ($equivalencias as $clave => $formas) {
            if (in_array($texto, $formas, true)) {
                return $clave;
            }
        }

        return UnidadesDeMedida::POR_DEFECTO;
    }

    private function esServicio(mixed $valor): bool
    {
        return str_contains(ColumnasDeImportacion::normalizar($valor), 'servicio');
    }

    /** «sí», «si», «x», «1», «true» y «verdadero» quieren decir lo mismo. */
    private function siONo(mixed $valor): bool
    {
        if (is_bool($valor)) {
            return $valor;
        }

        return in_array(ColumnasDeImportacion::normalizar($valor), ['si', 'x', '1', 'true', 'verdadero', 'yes'], true);
    }

    /**
     * Solo los campos que conocemos y que apuntan a una columna de verdad.
     *
     * @param  array<string, mixed>  $columnas
     * @return array<string, int>
     */
    private function columnasValidas(array $columnas): array
    {
        $validas = [];

        foreach ($columnas as $campo => $indice) {
            if (array_key_exists($campo, ColumnasDeImportacion::CAMPOS) && is_numeric($indice) && (int) $indice >= 0) {
                $validas[$campo] = (int) $indice;
            }
        }

        return $validas;
    }

    /** El mismo aviso repetido cien veces no se lee: va una sola vez. */
    private function avisar(array &$resumen, string $texto): void
    {
        if (! in_array($texto, $resumen['avisos'], true) && count($resumen['avisos']) < 5) {
            $resumen['avisos'][] = $texto;
        }
    }
}
