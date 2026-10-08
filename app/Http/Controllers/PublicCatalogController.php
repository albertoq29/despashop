<?php

namespace App\Http\Controllers;

use App\Models\CatalogBanner;
use App\Models\CatalogModal;
use App\Models\CatalogTheme;
use App\Models\CatalogVisit;
use App\Models\Category;
use App\Models\Combo;
use App\Models\ExchangeRate;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\NivelesDePrecio;
use App\Support\SeccionesDelCatalogo;
use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Catálogo público de un comercio, servido en /{username}.
 *
 * Todo lo que se muestra queda acotado al dueño del catálogo: se fija el
 * contexto de tenant antes de consultar nada, así que los modelos filtran
 * solos y no hay forma de que se cuele el inventario de otro comercio.
 *
 * La misma página se sirve dentro del editor como vista previa en vivo:
 * ahí el editor le envía el diseño sin guardar y la página lo pinta.
 */
class PublicCatalogController extends Controller
{
    /** Órdenes que el visitante puede pedir. La clave viaja en la URL. */
    private const ORDENES = ['manual', 'newest', 'price_asc', 'price_desc', 'name'];

    /** Artículos por tanda en la rejilla principal y techo de lo que se sirve. */
    private const POR_TANDA = 24;
    private const MAXIMO_VISIBLE = 240;

    /** Columnas que necesita el catálogo. El costo y las notas nunca salen de aquí. */
    private const COLUMNAS = [
        'id', 'user_id', 'name', 'description', 'item_type', 'service_duration', 'service_mode',
        'price_usdt', 'conditional_price', 'conditional_min_quantity',
        'stock', 'por_llegar', 'last_units', 'image_path', 'show_variants_in_store', 'display_order',
    ];

    public function __construct(
        private Tenancy $tenancy,
        private CatalogProvisioner $provisioner,
    ) {
    }

    public function show(Request $request, string $username): Response
    {
        [$owner, $theme, $viewerIsOwner] = $this->catalogoVisible($request, $username);

        if (! $viewerIsOwner) {
            CatalogVisit::hit($owner->id);
        }

        return $this->renderizar($request, $owner, $theme, [
            'isPreview' => $viewerIsOwner && (! $theme->is_published || $owner->planExpired()),
            'modoEditor' => false,
            'rutaBase' => '/' . $owner->username,
        ])->withViewData(['og' => $this->vistaPreviaDelEnlace($owner, $theme)]);
    }

    /**
     * Quién puede ver este catálogo, y con qué tema.
     *
     * Las mismas puertas para la portada del catálogo y para la página de
     * un producto: una cuenta sin aprobar, un catálogo sin publicar o un
     * plan vencido solo los ve su dueño y el administrador.
     *
     * @return array{0: User, 1: CatalogTheme, 2: bool}
     */
    private function catalogoVisible(Request $request, string $username): array
    {
        $owner = User::where('username', $username)
            ->where('role', User::ROLE_TENANT)
            ->first();

        abort_if($owner === null, 404, 'No existe un catálogo con esa dirección.');

        $viewerIsOwner = $request->user()?->id === $owner->id || $request->user()?->isAdmin();

        abort_if(! $owner->isApproved() && ! $viewerIsOwner, 404, 'Este catálogo todavía no está disponible.');

        $theme = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $owner->id)->first()
            ?? $this->provisioner->theme($owner);

        abort_if(! $theme->is_published && ! $viewerIsOwner, 404, 'Este catálogo no está publicado.');

        // Un plan vencido esconde el catálogo al público. El dueño y el admin
        // lo siguen viendo: así el comercio comprueba que sigue todo ahí.
        abort_if($owner->planExpired() && ! $viewerIsOwner, 404, 'Este catálogo no está disponible en este momento.');

        return [$owner, $theme, $viewerIsOwner];
    }

    /**
     * Lo que se ve al pegar el enlace del catálogo en WhatsApp.
     *
     * Es la carta de presentación del comercio, así que manda su portada y
     * su nombre; la marca de la plataforma solo aparece si no hay imagen.
     *
     * @return array<string, string>
     */
    private function vistaPreviaDelEnlace(User $owner, CatalogTheme $theme): array
    {
        $nombre = $owner->business_name ?: $owner->name;

        return [
            'titulo' => $theme->seo_title ?: $nombre,
            'descripcion' => $theme->seo_description
                ?: $theme->hero_subtitle
                ?: "Mira el catálogo de {$nombre} y escríbenos por WhatsApp.",
            'imagen' => Archivos::url($theme->cover_path)
                ?? Archivos::url($theme->logo_path)
                ?? url('/marca/enlace.png'),
        ];
    }

    /**
     * Vista previa que carga el editor en un iframe.
     *
     * Siempre es el catálogo del comercio en sesión (o del que inspecciona
     * el admin), esté publicado o no, y no cuenta como visita.
     */
    public function vistaPrevia(Request $request): Response
    {
        $owner = User::findOrFail($this->tenantId());

        $theme = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $owner->id)->first()
            ?? $this->provisioner->theme($owner);

        return $this->renderizar($request, $owner, $theme, [
            'isPreview' => false,
            'modoEditor' => true,
            'rutaBase' => route('catalogo.vista-previa', absolute: false),
        ]);
    }

    /**
     * Arma la página consultando solo lo que se va a pintar.
     *
     * Un catálogo con cientos de productos no puede traerlo todo en cada
     * visita: cada bloque apagado es una consulta que no se hace, la rejilla
     * llega por tandas (`ver`) y de cada fila solo viajan las columnas que
     * el visitante puede ver.
     */
    private function renderizar(Request $request, User $owner, CatalogTheme $theme, array $extra): Response
    {
        $this->nivelDePreciosPorVolumen = (string) ($theme->wholesale_prices ?? 'off');

        $secciones = $theme->sections;
        $orden = $this->orden($request, $theme);
        $enElEditor = $extra['modoEditor'];

        // En el editor cualquier bloque puede encenderse en el momento, así
        // que ahí se carga todo; en el catálogo público, solo lo visible.
        $pinta = fn (string $tipo) => $enElEditor || SeccionesDelCatalogo::esVisible($secciones, $tipo);

        $ver = $this->cuantosVer($request);

        $data = $this->tenancy->forTenant($owner->id, function () use ($request, $secciones, $orden, $enElEditor, $pinta, $ver) {
            // El editor puede agregar un bloque de cualquier categoría en
            // cualquier momento; el catálogo público solo trae las que usa.
            $categoriasDestacadas = $enElEditor
                ? Category::pluck('id')->all()
                : SeccionesDelCatalogo::categoriasDestacadas($secciones);

            $rejilla = $pinta('products') ? $this->consulta($request, $orden) : null;

            return [
                'productos' => $rejilla ? $rejilla->clone()->limit($ver)->get()->map($this->presentador()) : collect(),
                'productosTotal' => $rejilla ? $rejilla->clone()->count() : 0,
                'servicios' => $pinta('services')
                    ? $this->consultaBase()->servicios()->orderBy('display_order')->orderByDesc('id')->limit(48)->get()->map($this->presentador())
                    : collect(),
                'novedades' => $pinta('featured')
                    ? $this->consultaBase()->productos()->latest('id')->limit(24)->get()->map($this->presentador())
                    : collect(),
                'porCategoria' => $this->productosPorCategoria($categoriasDestacadas),
                'combos' => $pinta('combos')
                    ? Combo::with([
                        'products:id,name',
                        'images:id,combo_id,image_path',
                    ])
                        ->where('is_hidden', false)
                        ->latest()
                        ->limit(24)
                        ->get()
                        ->map(fn ($c) => $this->presentarCombo($c))
                    : collect(),
                'categories' => Category::orderBy('name')->get(['id', 'name']),
                'rate' => ExchangeRate::current(),
                'banners' => $pinta('banners') ? CatalogBanner::live()->get() : collect(),
                'modals' => CatalogModal::live()->get(),
            ];
        });

        return Inertia::render('Catalogo/Publico', [
            'comercio' => [
                'username' => $owner->username,
                'name' => $owner->business_name ?: $owner->name,
                'whatsapp' => $theme->whatsapp_number ?: $owner->whatsapp,
                // Unos venden «al distribuidor» y otros «al gran mayor»: es
                // el mismo precio con el nombre que usa cada ramo. Solo se
                // consulta si esos precios se van a mostrar.
                'nombreDistribuidor' => $this->mostrarPreciosPorVolumen()
                    ? NivelesDePrecio::nombre($owner->id)
                    : null,
            ],
            'theme' => $theme,
            'banners' => $data['banners'],
            'modals' => $data['modals'],
            'productos' => $data['productos'],
            'productosTotal' => $data['productosTotal'],
            'servicios' => $data['servicios'],
            'novedades' => $data['novedades'],
            'porCategoria' => (object) $data['porCategoria'],
            'combos' => $data['combos'],
            'categories' => $data['categories'],
            'bcvRate' => $data['rate'] ? (float) $data['rate']->bcv : 1,
            'filters' => [
                'search' => $request->input('search'),
                'category_id' => $request->input('category_id'),
                'orden' => $orden,
                'ver' => $ver,
            ],
        ] + $extra);
    }

    /** Cuántos artículos pidió ver el visitante: de a tandas, con techo. */
    private function cuantosVer(Request $request): int
    {
        $pedido = (int) $request->input('ver', self::POR_TANDA);

        return max(self::POR_TANDA, min(self::MAXIMO_VISIBLE, $pedido));
    }

    /**
     * Base de toda consulta de artículos del catálogo.
     *
     * Trae solo las columnas públicas y las relaciones recortadas: una
     * imagen es un id y una ruta, no la fila entera.
     */
    private function consultaBase(): Builder
    {
        return Product::query()
            ->select($this->columnas())
            ->with([
                'images:id,product_id,image_path',
                'variants:id,product_id,label,type,stock,image_path',
            ])
            ->where('is_hidden', false);
    }

    /**
     * Columnas que se traen de cada producto.
     *
     * La lista base deja fuera el costo, la inversión y las notas internas.
     * Los precios al mayor se suman solo si el comercio decidió enseñarlos:
     * una columna que no se va a mostrar tampoco hace falta consultarla.
     *
     * @return list<string>
     */
    private function columnas(): array
    {
        return $this->mostrarPreciosPorVolumen()
            ? [...self::COLUMNAS, 'price_mayor_usdt', 'price_distribuidor_usdt']
            : self::COLUMNAS;
    }

    /** @return callable(Product): array<string, mixed> */
    private function presentador(): callable
    {
        return fn (Product $producto) => $this->presentarProducto($producto);
    }

    /**
     * ¿Se enseñan los precios al mayor y de distribuidor?
     *
     * Se guarda al renderizar para que el presentador lo tenga: si están
     * ocultos no viajan en la respuesta, igual que el costo. Un precio que
     * no se muestra no tiene por qué estar en el código de la página.
     */
    private function mostrarPreciosPorVolumen(): bool
    {
        return in_array($this->nivelDePreciosPorVolumen, ['modal', 'card'], true);
    }

    private string $nivelDePreciosPorVolumen = 'off';

    /**
     * Solo lo que un visitante puede ver de un producto.
     *
     * El modelo completo trae el costo, la inversión, los precios al mayor y
     * las notas internas. Enviarlo tal cual a una página pública lo dejaba
     * a la vista de cualquiera que abriera las herramientas del navegador.
     *
     * @return array<string, mixed>
     */
    private function presentarProducto(Product $producto): array
    {
        $esServicio = $producto->esServicio();

        return [
            'id' => $producto->id,
            'name' => $producto->name,
            'description' => $producto->description,
            'tipo' => $producto->item_type,
            'esServicio' => $esServicio,
            'detalle' => $producto->detalleDelServicio(),
            'price_usdt' => $producto->price_usdt,
            ...($this->mostrarPreciosPorVolumen() ? [
                'price_mayor_usdt' => $producto->price_mayor_usdt,
                'price_distribuidor_usdt' => $producto->price_distribuidor_usdt,
            ] : []),
            'conditional_price' => $producto->conditional_price,
            'conditional_min_quantity' => $producto->conditional_min_quantity,
            // Un servicio no se agota: no tiene existencias que mostrar
            'stock' => $esServicio ? null : $producto->stock,
            'por_llegar' => ! $esServicio && $producto->por_llegar,
            'last_units' => ! $esServicio && $producto->last_units,
            'image_url' => $producto->image_url,
            'thumb_url' => $producto->thumb_url,
            'images' => $producto->images
                ->map(fn ($imagen) => [
                    'id' => $imagen->id,
                    'image_url' => $imagen->image_url,
                    'thumb_url' => $imagen->thumb_url,
                ])
                ->values(),
            'variants' => $producto->show_variants_in_store
                ? $producto->variants->map(fn ($variante) => [
                    'id' => $variante->id,
                    'label' => $variante->label,
                    'type' => $variante->type,
                    'agotada' => (int) $variante->stock <= 0,
                    'image_url' => $variante->image_url,
                ])->values()
                : [],
        ];
    }

    /** @return array<string, mixed> */
    private function presentarCombo(Combo $combo): array
    {
        return [
            'id' => $combo->id,
            'name' => $combo->name,
            'description' => $combo->description,
            'price_usdt' => $combo->price_usdt,
            ...($this->mostrarPreciosPorVolumen() ? [
                'price_mayor_usdt' => $combo->price_mayor_usdt,
                'price_distribuidor_usdt' => $combo->price_distribuidor_usdt,
            ] : []),
            'stock' => $combo->stock,
            'image_url' => $combo->image_url,
            'thumb_url' => $combo->thumb_url,
            'images' => $combo->images
                ->map(fn ($imagen) => [
                    'id' => $imagen->id,
                    'image_url' => $imagen->image_url,
                    'thumb_url' => $imagen->thumb_url,
                ])
                ->values(),
            'incluye' => $combo->products->pluck('name')->values(),
            'esCombo' => true,
        ];
    }

    /**
     * @param  list<int>  $categorias
     * @return array<int, mixed>
     */
    private function productosPorCategoria(array $categorias): array
    {
        $resultado = [];

        foreach ($categorias as $categoriaId) {
            $resultado[$categoriaId] = $this->consultaBase()
                ->whereHas('categories', fn ($q) => $q->where('categories.id', $categoriaId))
                ->orderBy('display_order')
                ->orderByDesc('id')
                ->limit(12)
                ->get()
                ->map($this->presentador());
        }

        return $resultado;
    }

    /** El orden elegido por el visitante manda, si el comercio lo permite. */
    private function orden(Request $request, CatalogTheme $theme): string
    {
        $pedido = $request->input('orden');

        if ($theme->show_sort && in_array($pedido, self::ORDENES, true)) {
            return $pedido;
        }

        return in_array($theme->product_sort, self::ORDENES, true) ? $theme->product_sort : 'manual';
    }

    /**
     * Búsqueda tolerante a acentos, errores de escritura y sinónimos del rubro.
     */
    private function consulta(Request $request, string $orden): Builder
    {
        $query = $this->consultaBase();

        // La rejilla es de productos, porque los servicios tienen su propio
        // bloque; pero quien busca algo espera encontrarlo todo en un lugar.
        if (! $request->filled('search')) {
            $query->productos();
        }

        match ($orden) {
            'newest' => $query->orderByDesc('id'),
            // Los productos sin precio van al final en ambos sentidos
            'price_asc' => $query->orderByRaw('price_usdt IS NULL')->orderBy('price_usdt'),
            'price_desc' => $query->orderByRaw('price_usdt IS NULL')->orderByDesc('price_usdt'),
            'name' => $query->orderBy('name'),
            default => $query->orderBy('display_order')->orderByDesc('id'),
        };

        if ($request->filled('category_id')) {
            $query->whereHas('categories', function ($q) use ($request) {
                $q->where('categories.id', $request->category_id);
            });
        }

        if (! $request->filled('search')) {
            return $query;
        }

        $tokens = $this->searchTokens($request->search);

        if ($tokens === []) {
            return $query;
        }

        $unaccent = function (string $column) {
            return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER({$column}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ü', 'u'), 'ñ', 'n')";
        };

        $unaccentName = $unaccent('name');
        $unaccentDesc = $unaccent('description');

        // SOUNDEX es de MySQL; en otros motores la búsqueda usa solo el resto
        $porSonido = $query->getConnection()->getDriverName() === 'mysql';

        $query->where(function ($q) use ($tokens, $unaccentName, $unaccentDesc, $porSonido) {
            foreach ($tokens as $token) {
                $q->orWhere('name', 'like', '%' . $token . '%')
                    ->orWhere('description', 'like', '%' . $token . '%')
                    ->orWhereRaw("{$unaccentName} LIKE ?", ['%' . $token . '%'])
                    ->orWhereRaw("{$unaccentDesc} LIKE ?", ['%' . $token . '%']);

                if ($porSonido && strlen($token) >= 3) {
                    $q->orWhereRaw("SOUNDEX(name) LIKE CONCAT('%', SOUNDEX(?), '%')", [$token])
                        ->orWhereRaw("SOUNDEX(description) LIKE CONCAT('%', SOUNDEX(?), '%')", [$token]);
                }
            }
        });

        return $query;
    }

    /** @return list<string> */
    private function searchTokens(string $search): array
    {
        $clean = mb_strtolower($search, 'UTF-8');
        $clean = str_replace(
            ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
            ['a', 'e', 'i', 'o', 'u', 'u', 'n'],
            $clean
        );
        $clean = trim(preg_replace('/[^a-z0-9\s]/', '', $clean));

        return array_values(array_unique(array_filter(explode(' ', $clean))));
    }
}
