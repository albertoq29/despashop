<?php

namespace App\Services\Respaldos;

use App\Models\CatalogBanner;
use App\Models\CatalogModal;
use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Combo;
use App\Models\ComboImage;
use App\Models\InvoiceTemplate;
use App\Models\PrivatePhoto;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductPurchase;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\User;
use App\Services\Ganancias\LibroDeCompras;
use App\Support\Archivos;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ZipArchive;

/**
 * Respaldo del catálogo y la configuración de un comercio.
 *
 * Es un archivo que el comercio se lleva y puede volver a subir: dentro va
 * un `respaldo.json` con todo lo que se puede escribir y una carpeta con las
 * imágenes tal cual. No incluye facturas ni clientes a propósito —eso se
 * baja como planillas desde «Descargar mis datos»— porque restaurar ventas
 * viejas encima de las nuevas descuadraría las cuentas.
 *
 * Todo lo que entra por `restaurar()` es **texto que el comercio pudo editar
 * a mano**: se valida campo por campo, no se confía en ninguna ruta del ZIP
 * y las imágenes se vuelven a guardar con nombres nuevos.
 */
class RespaldoDelComercio
{
    /** Sube cuando el formato cambia de manera incompatible. */
    public const FORMATO = 1;

    public const MODO_AGREGAR = 'agregar';
    public const MODO_REEMPLAZAR = 'reemplazar';

    /** Columnas que se guardan de cada cosa. Lo que no esté aquí, no viaja. */
    private const CAMPOS_PRODUCTO = [
        'name', 'item_type', 'service_duration', 'service_mode',
        'price_usdt', 'price_mayor_usdt', 'price_distribuidor_usdt', 'cost_price',
        'stock', 'conditional_price', 'conditional_min_quantity', 'notes', 'description',
        'is_hidden', 'por_llegar', 'show_variants_in_store', 'display_order', 'last_units',
    ];

    private const CAMPOS_COMBO = [
        'name', 'description', 'notes', 'price_usdt', 'price_type',
        'price_mayor_usdt', 'price_distribuidor_usdt', 'cost_price',
        'conditional_price', 'conditional_min_quantity', 'stock', 'is_hidden',
    ];

    private const CAMPOS_BANNER = [
        'title', 'subtitle', 'cta_text', 'link', 'text_position', 'text_color',
        'overlay', 'display_order', 'is_active',
    ];

    private const CAMPOS_MODAL = [
        'title', 'body', 'cta_text', 'cta_link', 'size', 'animation', 'trigger',
        'delay_seconds', 'scroll_percent', 'frequency', 'display_order', 'is_active',
    ];

    /** Del tema y la plantilla no viajan ni el id, ni el dueño, ni las fechas. */
    private const SIN_COPIAR = ['id', 'user_id', 'created_at', 'updated_at'];

    // ── Crear el respaldo ──────────────────────────────────────────────────────

    /**
     * Arma el ZIP y devuelve su ruta en el disco del servidor.
     *
     * Quien lo llama decide qué hacer con el archivo: descargarlo o
     * guardarlo como copia de seguridad antes de restaurar.
     */
    public function exportar(User $comercio, string $carpeta = null): string
    {
        $carpeta ??= storage_path('app/respaldos-comercio/' . $comercio->id);
        File::ensureDirectoryExists($carpeta);

        $ruta = $carpeta . DIRECTORY_SEPARATOR
            . 'respaldo-' . ($comercio->username ?: $comercio->id) . '-' . now()->format('Y-m-d_His') . '.zip';

        $datos = $this->reunir($comercio);

        $zip = new ZipArchive();
        $zip->open($ruta, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('respaldo.json', json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $zip->addFromString('LEEME.txt', $this->leeme($comercio, $datos));

        foreach ($this->imagenesDe($datos) as $imagen) {
            if (Archivos::existe($imagen)) {
                $zip->addFile(Archivos::disco()->path($imagen), 'imagenes/' . $imagen);
            }
        }

        $zip->close();

        return $ruta;
    }

    /** @return array<string, mixed> */
    private function reunir(User $comercio): array
    {
        $tema = CatalogTheme::first();
        $plantilla = InvoiceTemplate::first();

        $productos = Product::with(['categories:id,name', 'variants', 'images', 'privatePhotos'])
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $combos = Combo::with(['products:id,name', 'images'])->orderBy('id')->get();

        return [
            'formato' => self::FORMATO,
            'generado' => now()->toIso8601String(),
            'plataforma' => config('app.name'),
            'comercio' => [
                'negocio' => $comercio->business_name,
                'usuario' => $comercio->username,
            ],
            'resumen' => [
                'productos' => $productos->where('item_type', Product::PRODUCTO)->count(),
                'servicios' => $productos->where('item_type', Product::SERVICIO)->count(),
                'categorias' => Category::count(),
                'combos' => $combos->count(),
                'banners' => CatalogBanner::count(),
                'modales' => CatalogModal::count(),
            ],
            'tema' => $tema ? $this->sinColumnas($tema->getAttributes(), self::SIN_COPIAR) : null,
            'plantilla_factura' => $plantilla ? $this->sinColumnas($plantilla->getAttributes(), self::SIN_COPIAR) : null,
            'ajustes' => Setting::forTenant($comercio->id),
            'categorias' => Category::orderBy('name')->pluck('name')->all(),
            'productos' => $productos->map(fn (Product $p) => [
                ...collect($p->getAttributes())->only(self::CAMPOS_PRODUCTO)->all(),
                'categorias' => $p->categories->pluck('name')->values()->all(),
                'imagen' => $p->image_path,
                'galeria' => $p->images->pluck('image_path')->values()->all(),
                'variantes' => $p->variants->map(fn (ProductVariant $v) => [
                    'label' => $v->label,
                    'type' => $v->type,
                    'stock' => $v->stock,
                    'sort_order' => $v->sort_order,
                    'imagen' => $v->image_path,
                ])->values()->all(),
                'fotos_privadas' => $p->privatePhotos->map(fn (PrivatePhoto $f) => [
                    'nombre' => $f->name,
                    'imagen' => $f->image_path,
                ])->values()->all(),
            ])->values()->all(),
            'combos' => $combos->map(fn (Combo $c) => [
                ...collect($c->getAttributes())->only(self::CAMPOS_COMBO)->all(),
                'imagen' => $c->image_path,
                'galeria' => $c->images->pluck('image_path')->values()->all(),
                'productos' => $c->products->map(fn ($p) => [
                    'nombre' => $p->name,
                    'price_type' => $p->pivot?->price_type ?? 'detal',
                ])->values()->all(),
            ])->values()->all(),
            'banners' => CatalogBanner::orderBy('display_order')->get()->map(fn (CatalogBanner $b) => [
                ...collect($b->getAttributes())->only(self::CAMPOS_BANNER)->all(),
                'imagen' => $b->image_path,
                'imagen_movil' => $b->image_mobile_path,
            ])->values()->all(),
            'modales' => CatalogModal::orderBy('display_order')->get()->map(fn (CatalogModal $m) => [
                ...collect($m->getAttributes())->only(self::CAMPOS_MODAL),
                'imagen' => $m->image_path,
            ])->values()->all(),
        ];
    }

    /**
     * Todas las rutas de imagen que menciona un respaldo.
     *
     * @return list<string>
     */
    private function imagenesDe(array $datos): array
    {
        $rutas = collect([
            $datos['tema']['logo_path'] ?? null,
            $datos['tema']['cover_path'] ?? null,
            $datos['tema']['favicon_path'] ?? null,
            $datos['plantilla_factura']['logo_path'] ?? null,
            $datos['plantilla_factura']['signature_path'] ?? null,
        ]);

        foreach ($datos['productos'] ?? [] as $producto) {
            $rutas->push($producto['imagen'] ?? null);
            $rutas = $rutas->merge($producto['galeria'] ?? []);
            $rutas = $rutas->merge(collect($producto['variantes'] ?? [])->pluck('imagen'));
            $rutas = $rutas->merge(collect($producto['fotos_privadas'] ?? [])->pluck('imagen'));
        }

        foreach ($datos['combos'] ?? [] as $combo) {
            $rutas->push($combo['imagen'] ?? null);
            $rutas = $rutas->merge($combo['galeria'] ?? []);
        }

        foreach ($datos['banners'] ?? [] as $banner) {
            $rutas->push($banner['imagen'] ?? null)->push($banner['imagen_movil'] ?? null);
        }

        foreach ($datos['modales'] ?? [] as $modal) {
            $rutas->push($modal['imagen'] ?? null);
        }

        return $rutas->filter()->unique()->values()->all();
    }

    private function leeme(User $comercio, array $datos): string
    {
        $marca = config('app.name');
        $fecha = now()->format('d/m/Y H:i');
        $r = $datos['resumen'];

        return <<<TEXTO
        RESPALDO DE {$comercio->business_name} · {$marca}
        =====================================================

        Generado: {$fecha}

        Contiene: {$r['productos']} productos, {$r['servicios']} servicios,
        {$r['categorias']} categorías, {$r['combos']} combos, {$r['banners']} banners
        y el diseño completo de tu catálogo.

        NO contiene facturas ni clientes. Eso se descarga aparte, como
        planillas, desde «Mi perfil → Descargar mis datos».

        PARA RESTAURARLO
          Entra a tu panel, ve a «Respaldo de mi catálogo» y sube este mismo
          archivo sin descomprimirlo ni cambiarle el nombre.

        No edites el archivo respaldo.json a mano: si algo queda mal escrito,
        la restauración lo descarta para no dañar tu catálogo.
        TEXTO;
    }

    // ── Leer un respaldo ───────────────────────────────────────────────────────

    /**
     * Mira qué trae un archivo antes de tocar nada.
     *
     * @return array{ok: bool, error?: string, datos?: array, resumen?: array}
     */
    public function analizar(string $ruta): array
    {
        $zip = new ZipArchive();

        if ($zip->open($ruta) !== true) {
            return ['ok' => false, 'error' => 'No pudimos abrir el archivo. ¿Seguro que es el ZIP que descargaste?'];
        }

        $crudo = $zip->getFromName('respaldo.json');
        $zip->close();

        if ($crudo === false) {
            return ['ok' => false, 'error' => 'Este ZIP no es un respaldo: le falta el archivo respaldo.json.'];
        }

        $datos = json_decode($crudo, true);

        if (! is_array($datos)) {
            return ['ok' => false, 'error' => 'El respaldo está dañado y no se puede leer.'];
        }

        if ((int) ($datos['formato'] ?? 0) > self::FORMATO) {
            return ['ok' => false, 'error' => 'Este respaldo se hizo con una versión más nueva de la plataforma.'];
        }

        return [
            'ok' => true,
            'datos' => $datos,
            'resumen' => [
                'negocio' => (string) ($datos['comercio']['negocio'] ?? 'Sin nombre'),
                'generado' => (string) ($datos['generado'] ?? ''),
                'productos' => count($datos['productos'] ?? []),
                'categorias' => count($datos['categorias'] ?? []),
                'combos' => count($datos['combos'] ?? []),
                'banners' => count($datos['banners'] ?? []),
                'modales' => count($datos['modales'] ?? []),
                'tiene_diseno' => ! empty($datos['tema']),
            ],
        ];
    }

    // ── Restaurar ──────────────────────────────────────────────────────────────

    /**
     * Vuelca el respaldo sobre la cuenta del comercio.
     *
     * En modo «agregar» solo crea lo que falta y no toca el diseño. En modo
     * «reemplazar» borra el catálogo actual y deja exactamente lo del
     * archivo. Todo ocurre dentro de una transacción: si algo falla a mitad,
     * el catálogo queda como estaba.
     *
     * @return array{productos: int, categorias: int, combos: int, banners: int, modales: int, omitidos: int}
     */
    public function restaurar(User $comercio, string $ruta, string $modo): array
    {
        $lectura = $this->analizar($ruta);

        if (! $lectura['ok']) {
            throw new RespaldoInvalido($lectura['error']);
        }

        $datos = $lectura['datos'];
        $zip = new ZipArchive();
        $zip->open($ruta);

        $hechos = ['productos' => 0, 'categorias' => 0, 'combos' => 0, 'banners' => 0, 'modales' => 0, 'omitidos' => 0];

        try {
            DB::transaction(function () use ($comercio, $datos, $zip, $modo, &$hechos) {
                if ($modo === self::MODO_REEMPLAZAR) {
                    $this->vaciarCatalogo();
                }

                $hechos['categorias'] = $this->restaurarCategorias($datos['categorias'] ?? []);
                [$hechos['productos'], $hechos['omitidos']] = $this->restaurarProductos($comercio, $datos['productos'] ?? [], $zip, $modo);
                $hechos['combos'] = $this->restaurarCombos($datos['combos'] ?? [], $zip, $modo);

                if ($modo === self::MODO_REEMPLAZAR) {
                    $hechos['banners'] = $this->restaurarBanners($datos['banners'] ?? [], $zip);
                    $hechos['modales'] = $this->restaurarModales($datos['modales'] ?? [], $zip);
                    $this->restaurarDiseno($datos, $zip);
                    $this->restaurarAjustes($comercio, $datos['ajustes'] ?? []);
                }
            });
        } finally {
            $zip->close();
        }

        return $hechos;
    }

    /** Deja el catálogo vacío, con sus archivos borrados del disco. */
    private function vaciarCatalogo(): void
    {
        // Uno por uno y por Eloquent: así cada modelo limpia sus imágenes
        Product::get()->each->delete();
        Combo::get()->each->delete();
        CatalogBanner::get()->each->delete();
        CatalogModal::get()->each->delete();
        Category::get()->each->delete();
    }

    /** @param  list<mixed>  $nombres */
    private function restaurarCategorias(array $nombres): int
    {
        $creadas = 0;

        foreach ($nombres as $nombre) {
            $limpio = $this->texto($nombre, 120);

            if ($limpio === '' || Category::where('name', $limpio)->exists()) {
                continue;
            }

            Category::create(['name' => $limpio]);
            $creadas++;
        }

        return $creadas;
    }

    /**
     * @param  list<mixed>  $productos
     * @return array{0: int, 1: int}  creados y omitidos
     */
    private function restaurarProductos(User $comercio, array $productos, ZipArchive $zip, string $modo): array
    {
        $maximo = $comercio->plan?->max_products;
        $creados = 0;
        $omitidos = 0;

        foreach ($productos as $fila) {
            if (! is_array($fila)) {
                continue;
            }

            $nombre = $this->texto($fila['name'] ?? '', 255);

            if ($nombre === '') {
                $omitidos++;

                continue;
            }

            // Agregar no pisa lo que ya existe con el mismo nombre
            if ($modo === self::MODO_AGREGAR && Product::where('name', $nombre)->exists()) {
                $omitidos++;

                continue;
            }

            if ($maximo !== null && Product::count() >= $maximo) {
                $omitidos++;

                continue;
            }

            $producto = Product::create([
                ...$this->camposLimpios($fila, self::CAMPOS_PRODUCTO),
                'name' => $nombre,
                'item_type' => ($fila['item_type'] ?? null) === Product::SERVICIO ? Product::SERVICIO : Product::PRODUCTO,
                'image_path' => $this->guardarImagen($zip, $fila['imagen'] ?? null, 'products'),
            ]);

            $categorias = collect($fila['categorias'] ?? [])
                ->map(fn ($nombre) => $this->texto($nombre, 120))
                ->filter()
                ->map(fn ($nombre) => Category::firstOrCreate(['name' => $nombre])->id)
                ->all();

            $producto->categories()->sync($categorias);

            // El stock restaurado es mercancía que el comercio tiene: entra
            // al libro de compras para que su inversión no quede en cero.
            if ($producto->stock > 0 && (float) $producto->cost_price > 0) {
                app(LibroDeCompras::class)->registrar(
                    $producto,
                    (int) $producto->stock,
                    (float) $producto->cost_price,
                    ProductPurchase::RESTAURADO,
                    'Inventario que traía el respaldo',
                );
            }

            foreach (array_slice((array) ($fila['galeria'] ?? []), 0, 20) as $imagen) {
                if ($ruta = $this->guardarImagen($zip, $imagen, 'products')) {
                    ProductImage::create(['product_id' => $producto->id, 'image_path' => $ruta]);
                }
            }

            foreach (array_slice((array) ($fila['variantes'] ?? []), 0, 50) as $orden => $variante) {
                $etiqueta = $this->texto($variante['label'] ?? '', 100);

                if ($etiqueta === '') {
                    continue;
                }

                ProductVariant::create([
                    'product_id' => $producto->id,
                    'label' => $etiqueta,
                    'type' => in_array($variante['type'] ?? '', ['color', 'fragancia', 'tipo'], true) ? $variante['type'] : 'tipo',
                    'stock' => max(0, (int) ($variante['stock'] ?? 0)),
                    'sort_order' => (int) ($variante['sort_order'] ?? $orden),
                    'image_path' => $this->guardarImagen($zip, $variante['imagen'] ?? null, 'products'),
                ]);
            }

            foreach (array_slice((array) ($fila['fotos_privadas'] ?? []), 0, 30) as $foto) {
                if ($ruta = $this->guardarImagen($zip, $foto['imagen'] ?? null, 'fichero-fotos')) {
                    PrivatePhoto::create([
                        'product_id' => $producto->id,
                        'name' => $this->texto($foto['nombre'] ?? '', 255) ?: null,
                        'image_path' => $ruta,
                    ]);
                }
            }

            $creados++;
        }

        return [$creados, $omitidos];
    }

    /** @param  list<mixed>  $combos */
    private function restaurarCombos(array $combos, ZipArchive $zip, string $modo): int
    {
        $creados = 0;

        foreach ($combos as $fila) {
            if (! is_array($fila)) {
                continue;
            }

            $nombre = $this->texto($fila['name'] ?? '', 255);

            if ($nombre === '' || ($modo === self::MODO_AGREGAR && Combo::where('name', $nombre)->exists())) {
                continue;
            }

            $combo = Combo::create([
                ...$this->camposLimpios($fila, self::CAMPOS_COMBO),
                'name' => $nombre,
                'image_path' => $this->guardarImagen($zip, $fila['imagen'] ?? null, 'combos'),
            ]);

            foreach (array_slice((array) ($fila['galeria'] ?? []), 0, 20) as $imagen) {
                if ($ruta = $this->guardarImagen($zip, $imagen, 'combos')) {
                    ComboImage::create(['combo_id' => $combo->id, 'image_path' => $ruta]);
                }
            }

            // Los productos del combo se buscan por nombre: los ids del
            // respaldo no significan nada en esta cuenta.
            $incluye = [];

            foreach ((array) ($fila['productos'] ?? []) as $item) {
                $producto = Product::where('name', $this->texto($item['nombre'] ?? '', 255))->first();

                if ($producto) {
                    $incluye[$producto->id] = ['price_type' => $this->texto($item['price_type'] ?? 'detal', 20) ?: 'detal'];
                }
            }

            $combo->products()->sync($incluye);
            $creados++;
        }

        return $creados;
    }

    /** @param  list<mixed>  $banners */
    private function restaurarBanners(array $banners, ZipArchive $zip): int
    {
        $creados = 0;

        foreach (array_slice($banners, 0, 30) as $fila) {
            if (! is_array($fila)) {
                continue;
            }

            CatalogBanner::create([
                ...$this->camposLimpios($fila, self::CAMPOS_BANNER),
                'image_path' => $this->guardarImagen($zip, $fila['imagen'] ?? null, 'catalogo'),
                'image_mobile_path' => $this->guardarImagen($zip, $fila['imagen_movil'] ?? null, 'catalogo'),
            ]);

            $creados++;
        }

        return $creados;
    }

    /** @param  list<mixed>  $modales */
    private function restaurarModales(array $modales, ZipArchive $zip): int
    {
        $creados = 0;

        foreach (array_slice($modales, 0, 20) as $fila) {
            if (! is_array($fila)) {
                continue;
            }

            CatalogModal::create([
                ...$this->camposLimpios($fila, self::CAMPOS_MODAL),
                'image_path' => $this->guardarImagen($zip, $fila['imagen'] ?? null, 'catalogo'),
            ]);

            $creados++;
        }

        return $creados;
    }

    /** El diseño del catálogo y la plantilla de factura. */
    private function restaurarDiseno(array $datos, ZipArchive $zip): void
    {
        if (is_array($datos['tema'] ?? null)) {
            $tema = CatalogTheme::first();

            if ($tema) {
                $valores = $this->sinColumnas($datos['tema'], self::SIN_COPIAR);

                foreach (['logo_path' => 'catalogo', 'cover_path' => 'catalogo', 'favicon_path' => 'catalogo'] as $campo => $carpeta) {
                    $valores[$campo] = $this->guardarImagen($zip, $datos['tema'][$campo] ?? null, $carpeta);
                }

                // El modelo ya normaliza `sections` y las listas de colores
                $tema->fill($valores)->save();
            }
        }

        if (is_array($datos['plantilla_factura'] ?? null)) {
            $plantilla = InvoiceTemplate::first();

            if ($plantilla) {
                $valores = $this->sinColumnas($datos['plantilla_factura'], self::SIN_COPIAR);

                foreach (['logo_path', 'signature_path'] as $campo) {
                    $valores[$campo] = $this->guardarImagen($zip, $datos['plantilla_factura'][$campo] ?? null, 'facturas');
                }

                $plantilla->fill($valores)->save();
            }
        }
    }

    /** @param  array<string, mixed>  $ajustes */
    private function restaurarAjustes(User $comercio, array $ajustes): void
    {
        foreach ($ajustes as $clave => $valor) {
            if (is_string($clave) && (is_scalar($valor) || $valor === null)) {
                Setting::put($this->texto($clave, 60), $valor === null ? null : $this->texto($valor, 2000), $comercio->id);
            }
        }
    }

    // ── Ayudas ─────────────────────────────────────────────────────────────────

    /**
     * Saca una imagen del ZIP y la guarda con un nombre nuevo.
     *
     * Nunca se usa la ruta que viene dentro del archivo para escribir: se
     * genera una propia en la carpeta que corresponde. Así un respaldo
     * manipulado no puede escribir fuera de su sitio.
     */
    private function guardarImagen(ZipArchive $zip, mixed $ruta, string $carpeta): ?string
    {
        if (! is_string($ruta) || $ruta === '') {
            return null;
        }

        $contenido = $zip->getFromName('imagenes/' . $ruta);

        if ($contenido === false || $contenido === '') {
            return null;
        }

        $extension = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));

        // `ico` se queda: no ejecuta nada y es el ícono de pestaña de siempre
        if (! in_array($extension, [...explode(',', Archivos::FORMATOS), 'ico'], true)) {
            return null;
        }

        $destino = trim($carpeta, '/') . '/restaurado-' . Str::lower(Str::random(12)) . '.' . $extension;

        Archivos::disco()->put($destino, $contenido);
        Archivos::optimizar($destino);

        return $destino;
    }

    /**
     * Deja solo las columnas permitidas, con el tipo que corresponde.
     *
     * @param  list<string>  $permitidas
     * @return array<string, mixed>
     */
    private function camposLimpios(array $fila, array $permitidas): array
    {
        $limpio = [];

        foreach ($permitidas as $campo) {
            if (! array_key_exists($campo, $fila)) {
                continue;
            }

            $valor = $fila[$campo];

            $limpio[$campo] = match (true) {
                is_bool($valor) => $valor,
                is_numeric($valor) => $valor + 0,
                is_string($valor) => $this->texto($valor, 2000),
                default => null,
            };
        }

        return $limpio;
    }

    private function texto(mixed $valor, int $maximo): string
    {
        return is_scalar($valor) ? mb_substr(trim((string) $valor), 0, $maximo) : '';
    }

    /**
     * Quita columnas que no deben viajar (id, dueño, fechas).
     *
     * @param  array<string, mixed>  $valores
     * @param  list<string>  $quitar
     * @return array<string, mixed>
     */
    private function sinColumnas(array $valores, array $quitar): array
    {
        return array_diff_key($valores, array_flip($quitar));
    }
}
