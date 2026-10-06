<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\Category;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\ProductPurchase;
use App\Services\Ganancias\LibroDeCompras;
use App\Services\Ganancias\Reposicion;
use App\Support\Archivos;
use App\Models\PrivatePhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    public function index()
    {
        $pendingCounts = \DB::table('factura_items')
            ->join('facturas', 'factura_items.factura_id', '=', 'facturas.id')
            ->where('facturas.status', 'pending_variants')
            ->whereNull('factura_items.product_variant_id')
            ->whereNotNull('factura_items.product_id')
            ->groupBy('factura_items.product_id')
            ->select('factura_items.product_id', \DB::raw('SUM(factura_items.qty) as total_pending'))
            ->pluck('total_pending', 'product_id')
            ->toArray();

        $productos = Product::with(['categories', 'images', 'variants', 'privatePhotos'])
                            ->where('user_id', $this->tenantId())
                            ->orderBy('display_order', 'asc')
                            ->orderBy('id', 'desc')
                            ->get()
                            ->map(function ($p) use ($pendingCounts) {
                                $hasVariants = $p->variants->count() > 0;
                                $p->pending_variant_confirmation_count = $hasVariants ? (int)($pendingCounts[$p->id] ?? 0) : 0;
                                return $p;
                            });

        $categories = Category::orderBy('name')->get();

        return Inertia::render('Productos/Index', [
            'productos'  => $productos,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name'                     => 'required|string|max:255',
                'item_type'                => 'nullable|in:producto,servicio',
                'service_duration'         => 'nullable|string|max:40',
                'service_mode'             => 'nullable|in:local,domicilio,remoto,acordar',
                'price_usdt'               => 'nullable|numeric|min:0',
                'price_mayor_usdt'         => 'nullable|numeric|min:0.01',
                'price_distribuidor_usdt'  => 'nullable|numeric|min:0.01',
                'cost_price'               => 'nullable|numeric|min:0',
                // Un servicio no lleva existencias: solo se exigen a los productos
                'stock'                    => 'required_unless:item_type,servicio|nullable|integer|min:0',
                'categories'               => 'nullable|array',
                'categories.*'             => 'exists:categories,id',
                'conditional_price'        => 'nullable|numeric|min:0.01',
                'conditional_min_quantity' => 'nullable|integer|min:1',
                'notes'                    => 'nullable|string',
                'description'              => 'nullable|string',
                'image'                    => 'nullable|image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'photos'                   => 'nullable|array',
                'photos.*'                 => 'image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'private_photos'           => 'nullable|array',
                'private_photos.*'         => 'image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'private_photo_names'      => 'nullable|array',
                'private_photo_names.*'    => 'nullable|string|max:255',
                'variants'                 => 'nullable|array',
                'variants.*.label'         => 'required_with:variants|string|max:100',
                'variants.*.type'          => 'nullable|string|max:50',
                'variants.*.stock'         => 'nullable|integer|min:0',
                'variants.*.image'         => 'nullable|image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'existing_variants'        => 'nullable|array',
                'show_variants_in_store'   => 'nullable|boolean',
                'last_units'               => 'nullable|boolean',
            ]);

            $dbPath = $request->hasFile('image')
                ? Archivos::guardar($request->file('image'), 'products')
                : null;

            $tipo = $request->input('item_type') === Product::SERVICIO ? Product::SERVICIO : Product::PRODUCTO;
            $existencias = $tipo === Product::SERVICIO ? 0 : (int) $request->stock;
            $costo = (float) ($request->cost_price ?? 0);

            $product = Product::create([
                'user_id'                  => $this->tenantId(),
                'name'                     => $request->name,
                'item_type'                => $tipo,
                'service_duration'         => $tipo === Product::SERVICIO ? $request->service_duration : null,
                'service_mode'             => $tipo === Product::SERVICIO ? $request->service_mode : null,
                'price_usdt'               => $request->price_usdt ?: null,
                'price_mayor_usdt'         => $request->price_mayor_usdt,
                'price_distribuidor_usdt'  => $request->price_distribuidor_usdt,
                'cost_price'               => $request->cost_price,
                'stock'                    => $existencias,
                'conditional_price'        => $request->conditional_price,
                'conditional_min_quantity' => $request->conditional_min_quantity,
                'notes'                    => $request->notes,
                'description'              => $request->description,
                'image_path'               => $dbPath,
                'is_hidden'                => filter_var($request->input('is_hidden', false), FILTER_VALIDATE_BOOLEAN),
                'por_llegar'               => filter_var($request->input('por_llegar', false), FILTER_VALIDATE_BOOLEAN),
                'show_variants_in_store'   => filter_var($request->input('show_variants_in_store', true), FILTER_VALIDATE_BOOLEAN),
                'last_units'               => filter_var($request->input('last_units', false), FILTER_VALIDATE_BOOLEAN),
            ]);

            // La mercancía con la que nace el producto es su primera compra
            if ($existencias > 0 && $costo > 0) {
                app(LibroDeCompras::class)->registrar(
                    $product,
                    $existencias,
                    $costo,
                    ProductPurchase::ALTA,
                    'Carga inicial del producto',
                );
            }

            $cats = array_filter((array)($request->input('categories', [])), fn($v) => $v !== '');
            $product->categories()->sync($cats);

            if ($request->hasFile('photos')) {
                foreach ($request->file('photos') as $photoFile) {
                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_path' => Archivos::guardar($photoFile, 'products'),
                    ]);
                }
            }

            // Fichero de fotos privadas
            $this->storePrivatePhotos($request, $product);

            // Procesar variantes
            $this->processVariants($request, $product);

            return redirect()->back()->with('success', 'Producto creado correctamente');

        } catch (\Illuminate\Validation\ValidationException $e) {
            // Un dato mal puesto no es una falla del servidor: cada mensaje
            // tiene que volver a su campo y no quedar pegado al de la imagen.
            throw $e;
        } catch (\Exception $e) {
            Log::error('Error al guardar producto: ' . $e->getMessage());
            return redirect()->back()->withErrors(['image' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, Product $producto)
    {
        if ((int) $producto->user_id !== (int) $this->tenantId()) {
            abort(403, 'No tienes permiso para editar este producto.');
        }

        try {
            $request->validate([
                'name'                     => 'required|string|max:255',
                'item_type'                => 'nullable|in:producto,servicio',
                'service_duration'         => 'nullable|string|max:40',
                'service_mode'             => 'nullable|in:local,domicilio,remoto,acordar',
                'price_usdt'               => 'nullable|numeric|min:0',
                'price_mayor_usdt'         => 'nullable|numeric|min:0.01',
                'price_distribuidor_usdt'  => 'nullable|numeric|min:0.01',
                'cost_price'               => 'nullable|numeric|min:0',
                'stock'                    => 'required_unless:item_type,servicio|nullable|integer|min:0',
                'categories'               => 'nullable|array',
                'categories.*'             => 'exists:categories,id',
                'conditional_price'        => 'nullable|numeric|min:0.01',
                'conditional_min_quantity' => 'nullable|integer|min:1',
                'notes'                    => 'nullable|string',
                'description'              => 'nullable|string',
                'image'                    => 'nullable|image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'photos'                   => 'nullable|array',
                'photos.*'                 => 'image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'private_photos'           => 'nullable|array',
                'private_photos.*'         => 'image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'private_photo_names'      => 'nullable|array',
                'private_photo_names.*'    => 'nullable|string|max:255',
                'variants'                 => 'nullable|array',
                'variants.*.label'         => 'required_with:variants|string|max:100',
                'variants.*.type'          => 'nullable|string|max:50',
                'variants.*.stock'         => 'nullable|integer|min:0',
                'variants.*.image'         => 'nullable|image|mimes:' . Archivos::FORMATOS . '|max:10240',
                'existing_variants'        => 'nullable|array',
                'show_variants_in_store'   => 'nullable|boolean',
                'last_units'               => 'nullable|boolean',
            ]);

            $data = $request->only(
                'name', 'price_mayor_usdt', 'price_distribuidor_usdt', 'cost_price',
                'stock', 'conditional_price', 'conditional_min_quantity', 'notes', 'description'
            );

            // Pasar de producto a servicio (o al revés) limpia lo que ya no aplica
            $data['item_type'] = $request->input('item_type') === Product::SERVICIO ? Product::SERVICIO : Product::PRODUCTO;
            $esServicio = $data['item_type'] === Product::SERVICIO;
            $data['service_duration'] = $esServicio ? $request->service_duration : null;
            $data['service_mode'] = $esServicio ? $request->service_mode : null;
            $data['stock'] = $esServicio ? 0 : (int) $request->stock;
            $data['price_usdt']             = $request->price_usdt ?: null;
            $data['is_hidden']              = filter_var($request->input('is_hidden', false), FILTER_VALIDATE_BOOLEAN);
            $data['por_llegar']             = filter_var($request->input('por_llegar', false), FILTER_VALIDATE_BOOLEAN);
            $data['show_variants_in_store'] = filter_var($request->input('show_variants_in_store', true), FILTER_VALIDATE_BOOLEAN);
            $data['last_units']             = filter_var($request->input('last_units', false), FILTER_VALIDATE_BOOLEAN);

            if ($request->hasFile('image')) {
                // La anterior solo se borra si ninguna factura emitida la usa
                if (! $producto->archivoEnUso((string) $producto->image_path)) {
                    Archivos::eliminar($producto->image_path);
                }

                $data['image_path'] = Archivos::guardar($request->file('image'), 'products');
            }

            // Antes de guardar se recuerda el stock: la diferencia es
            // mercancía que entró (o una corrección), y eso va al libro.
            $stockAnterior = (int) $producto->stock;

            $producto->update($data);

            if (! $esServicio && ! $producto->variants()->exists()) {
                app(LibroDeCompras::class)->ajustarPorStock(
                    $producto,
                    $stockAnterior,
                    (int) $producto->stock,
                    (float) ($request->cost_price ?? $producto->cost_price ?? 0),
                );
            }

            $cats = array_filter((array)($request->input('categories', [])), fn($v) => $v !== '');
            $producto->categories()->sync($cats);

            if ($request->hasFile('photos')) {
                foreach ($request->file('photos') as $photoFile) {
                    ProductImage::create([
                        'product_id' => $producto->id,
                        'image_path' => Archivos::guardar($photoFile, 'products'),
                    ]);
                }
            }

            // Fichero de fotos privadas
            $this->storePrivatePhotos($request, $producto);

            // Procesar variantes (existentes y nuevas)
            $this->processVariants($request, $producto);

            return redirect()->back()->with('success', 'Producto actualizado correctamente');

        } catch (\Illuminate\Validation\ValidationException $e) {
            // Cada mensaje vuelve a su campo, no al de la imagen
            throw $e;
        } catch (\Exception $e) {
            Log::error('Error al actualizar: ' . $e->getMessage());
            return redirect()->back()->withErrors(['image' => 'Error: ' . $e->getMessage()]);
        }
    }

    /**
     * Helper: guarda las fotos del fichero del producto en storage/app/public/fichero-fotos
     * y deja la ruta relativa en la base de datos.
     */
    private function storePrivatePhotos(Request $request, Product $product): void
    {
        if (!$request->hasFile('private_photos')) return;

        $names = (array) $request->input('private_photo_names', []);

        foreach ($request->file('private_photos') as $index => $file) {
            if (!$file || !$file->isValid()) continue;

            $nombre = trim((string)($names[$index] ?? ''));
            if ($nombre === '') {
                $nombre = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            }

            // Los metadatos se leen antes de mover: despues el temporal ya no existe.
            $mime = $file->getClientMimeType();
            $size = $file->getSize();

            $ruta = Archivos::guardar($file, 'fichero-fotos');

            PrivatePhoto::create([
                'product_id' => $product->id,
                'user_id'    => $this->tenantId(),
                'name'       => mb_substr($nombre, 0, 255),
                'file_path'  => $ruta,
                'mime_type'  => $mime,
                'size'       => $size,
            ]);
        }
    }

    /**
     * Helper: procesa variantes (existentes y nuevas) y calcula el stock total si hay variantes.
     */
    private function processVariants(Request $request, Product $product): void
    {
        // 1. Actualizar variantes existentes
        $existingVariantsInput = $request->input('existing_variants', []);
        if (!empty($existingVariantsInput)) {
            foreach ($existingVariantsInput as $variantId => $vData) {
                $variant = ProductVariant::where('id', $variantId)->where('product_id', $product->id)->first();
                if ($variant) {
                    $updateData = [];
                    if (isset($vData['label'])) $updateData['label'] = $vData['label'];
                    if (isset($vData['type'])) $updateData['type'] = $vData['type'];
                    if (isset($vData['stock'])) $updateData['stock'] = (int)$vData['stock'];

                    $fileKey = "existing_variants.{$variantId}.image";
                    if ($request->hasFile($fileKey)) {
                        Archivos::eliminar($variant->image_path);
                        $updateData['image_path'] = Archivos::guardar($request->file($fileKey), 'products', 'variante');
                    }

                    if (!empty($updateData)) {
                        $variant->update($updateData);
                    }
                }
            }
        }

        // 2. Agregar nuevas variantes
        $variants = $request->input('variants', []);
        if (!empty($variants)) {
            foreach ($variants as $index => $variantData) {
                $label = $variantData['label'] ?? '';
                if (trim($label) === '') continue;

                $variantImagePath = null;
                $fileKey = "variants.{$index}.image";
                if ($request->hasFile($fileKey)) {
                    $variantImagePath = Archivos::guardar($request->file($fileKey), 'products', 'variante');
                }

                ProductVariant::create([
                    'product_id' => $product->id,
                    'label'      => $label,
                    'type'       => $variantData['type'] ?? 'tipo',
                    'stock'      => isset($variantData['stock']) ? (int)$variantData['stock'] : 0,
                    'image_path' => $variantImagePath,
                    'sort_order' => $index,
                ]);
            }
        }

        // 3. Si el producto tiene variantes, calcular stock total automáticamente
        if ($product->variants()->count() > 0) {
            $stockAnterior = (int) $product->stock;
            $totalStock = (int) $product->variants()->sum('stock');

            $product->update(['stock' => $totalStock]);

            // Vender no pasa por aquí: esto solo corre al editar variantes,
            // así que un aumento es mercancía que entró.
            app(LibroDeCompras::class)->ajustarPorStock($product, $stockAnterior, $totalStock);
        }
    }

    public function destroy(Product $producto)
    {
        if ((int) $producto->user_id !== (int) $this->tenantId()) {
            abort(403, 'No tienes permiso para eliminar este producto.');
        }

        try {
            // El modelo borra del disco su imagen, su galería, sus variantes
            // y su fichero de fotos privadas al eliminarse
            $producto->delete();
            return redirect()->back()->with('success', 'Producto eliminado correctamente');
        } catch (\Exception $e) {
            Log::error('Error al eliminar: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al eliminar']);
        }
    }

    public function toggleHidden(Product $producto)
    {
        if ((int) $producto->user_id !== (int) $this->tenantId()) abort(403);
        $producto->update(['is_hidden' => !$producto->is_hidden]);
        return redirect()->back()->with('success', $producto->is_hidden ? 'Producto ocultado de la tienda.' : 'Producto visible en la tienda.');
    }

    /**
     * Entró mercancía: se registra con su costo y sube el inventario.
     *
     * Es la forma buena de reponer. Escribir el stock a mano sigue
     * disponible para arreglar errores de conteo, pero valora lo que entra
     * al costo de hoy; aquí se guarda el costo real de esa compra, que es
     * lo que hace que la inversión y la ganancia cuadren con la realidad.
     */
    public function reponer(Request $request, Product $producto, Reposicion $reposicion)
    {
        if ((int) $producto->user_id !== (int) $this->tenantId()) abort(403);

        if ($producto->esServicio()) {
            return back()->withErrors(['cantidad' => 'Un servicio no lleva inventario: no hay nada que reponer.']);
        }

        $tieneVariantes = $producto->variants()->exists();

        $validado = $request->validate([
            'cantidad' => ['required', 'integer', 'min:1', 'max:100000'],
            'costo_unitario' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'variant_id' => [
                $tieneVariantes ? 'required' : 'nullable',
                Rule::exists('product_variants', 'id')->where('product_id', $producto->id),
            ],
            'politica' => ['required', Rule::in(array_keys(Reposicion::POLITICAS))],
            'fecha' => ['nullable', 'date', 'before_or_equal:today'],
            'nota' => ['nullable', 'string', 'max:160'],
        ], [
            'costo_unitario.min' => 'Indica cuánto te costó cada unidad.',
            'variant_id.required' => 'Di a cuál variante entraron las unidades.',
            'fecha.before_or_equal' => 'La compra no puede ser de una fecha futura.',
        ]);

        $resultado = $reposicion->registrar(
            $producto,
            (int) $validado['cantidad'],
            (float) $validado['costo_unitario'],
            $validado['politica'],
            isset($validado['variant_id']) ? (int) $validado['variant_id'] : null,
            $validado['nota'] ?? null,
            isset($validado['fecha']) ? Carbon::parse($validado['fecha']) : null,
        );

        ActivityLog::record(
            'reposicion.registrada',
            "Repuso {$validado['cantidad']} unidades de {$producto->name} a \${$validado['costo_unitario']} c/u",
        );

        $aviso = "Reposición registrada: invertiste \${$resultado['invertido']} y el stock quedó en {$resultado['stock_despues']} uds.";

        if ($resultado['costo_despues'] !== $resultado['costo_antes']) {
            $aviso .= " Tu costo unitario pasó de \${$resultado['costo_antes']} a \${$resultado['costo_despues']}.";
        }

        return back()->with('success', $aviso);
    }

    public function publicCatalog()
    {
        $productos = Product::orderBy('display_order', 'asc')->orderBy('id', 'desc')->get();
        return Inertia::render('PublicCatalog', ['productos' => $productos]);
    }

    public function destroyImage($id)
    {
        $image = ProductImage::findOrFail($id);
        $product = Product::findOrFail($image->product_id);
        if ((int) $product->user_id !== (int) $this->tenantId()) {
            abort(403, 'No tienes permiso para eliminar esta imagen.');
        }
        $image->delete();
        return redirect()->back()->with('success', 'Imagen eliminada de la galería.');
    }

    public function destroyVariant(ProductVariant $variant)
    {
        $product = Product::findOrFail($variant->product_id);
        if ((int) $product->user_id !== (int) $this->tenantId()) {
            abort(403, 'No tienes permiso para eliminar esta variante.');
        }
        $variant->delete();

        // Recalcular stock total del producto si aún tiene variantes
        if ($product->variants()->count() > 0) {
            $stockAnterior = (int) $product->stock;
            $totalStock = (int) $product->variants()->sum('stock');

            $product->update(['stock' => $totalStock]);

            // Vender no pasa por aquí: esto solo corre al editar variantes,
            // así que un aumento es mercancía que entró.
            app(LibroDeCompras::class)->ajustarPorStock($product, $stockAnterior, $totalStock);
        }

        return redirect()->back()->with('success', 'Variante eliminada.');
    }

    public function reorderPage()
    {
        $productos = Product::with(['categories'])
                            ->where('user_id', $this->tenantId())
                            ->orderBy('display_order', 'asc')
                            ->orderBy('id', 'desc')
                            ->get();

        return Inertia::render('Productos/Reorder', [
            'productos' => $productos,
        ]);
    }

    public function reorder(Request $request)
    {
        if ($request->input('reset') === true || $request->input('reset') === 'true') {
            Product::where('user_id', $this->tenantId())->update(['display_order' => 0]);
            return redirect()->back()->with('success', 'Orden de productos restablecido por defecto.');
        }

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:products,id',
        ]);

        $ids = $request->ids;
        foreach ($ids as $index => $id) {
            Product::where('id', $id)
                   ->where('user_id', $this->tenantId())
                   ->update(['display_order' => $index + 1]);
        }

        return redirect()->back()->with('success', 'Orden de productos actualizado correctamente.');
    }
}