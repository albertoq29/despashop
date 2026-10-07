<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Delivery;
use App\Models\Factura;
use App\Models\FacturaItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ExchangeRate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FacturaController extends Controller
{
    // ── Lista de facturas ─────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status', 'draft');

        $query = Factura::where('user_id', $this->tenantId())
            ->with('items');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('client_name', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%");
            });
        }

        if ($status && in_array($status, ['draft', 'pending_variants', 'confirmed'])) {
            $query->where('status', $status);
        }

        $facturas = $query->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Facturas/Index', [
            'facturas' => $facturas,
            'filters'  => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    // ── Formulario de creación ────────────────────────────────────────────────
    public function create()
    {
        // El selector solo muestra la foto principal (image_path): cargar la
        // galería completa de cada producto era traer filas que nadie usa.
        $productos = Product::with(['categories:id,name', 'variants:id,product_id,label,type,stock'])->latest()->get()
            ->map(fn($p) => [
                'id'                      => $p->id,
                'name'                    => $p->name,
                'price_usdt'              => $p->price_usdt,
                'price_mayor_usdt'        => $p->price_mayor_usdt,
                'price_distribuidor_usdt' => $p->price_distribuidor_usdt,
                'cost_price'              => $p->cost_price,
                'stock'                   => $p->stock,
                'image_path'              => $p->image_path,
                'categories'              => $p->categories->map(fn($cat) => [
                    'id'   => $cat->id,
                    'name' => $cat->name,
                ]),
                'variants'                => $p->variants->map(fn($v) => [
                    'id'    => $v->id,
                    'label' => $v->label,
                    'type'  => $v->type,
                    'stock' => $v->stock,
                ]),
            ]);

        $combos = \App\Models\Combo::where('user_id', $this->tenantId())
            ->with('products')
            ->latest()
            ->get()
            ->map(fn($c) => [
                'id'                      => $c->id,
                'name'                    => $c->name,
                'price_usdt'              => $c->price_usdt,
                'price_mayor_usdt'        => $c->price_mayor_usdt,
                'price_distribuidor_usdt' => $c->price_distribuidor_usdt,
                'cost_price'              => $c->cost_price,
                'stock'                   => $c->stock,
                'image_path'              => $c->image_path,
                'products'                => $c->products->map(fn($p) => [
                    'id'                      => $p->id,
                    'name'                    => $p->name,
                    'price_usdt'              => $p->price_usdt,
                    'price_mayor_usdt'        => $p->price_mayor_usdt,
                    'price_distribuidor_usdt' => $p->price_distribuidor_usdt,
                    'cost_price'              => $p->cost_price,
                    'image_path'              => $p->image_path,
                    'price_type'              => $p->pivot?->price_type ?? 'detal',
                ]),
            ]);

        $rate = ExchangeRate::latest('created_at')->first();
        $supplements = \App\Models\Supplement::where('user_id', $this->tenantId())->orderBy('name')->get(['id', 'name', 'type', 'stock']);
        $categorias = \App\Models\Category::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Facturas/Create', [
            'productos'   => $productos,
            'combos'      => $combos,
            'supplements' => $supplements,
            'categorias'  => $categorias,
            'bcvRate'     => $rate ? (float) $rate->bcv : 1.0,
        ]);
    }

    // ── Guardar factura (borrador) ────────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'client_name'              => $request->input('has_delivery') ? 'required|string|max:200' : 'nullable|string|max:200',
            'client_phone'             => 'nullable|string|max:50',
            'notes'                    => 'nullable|string|max:1000',
            'bcv_rate'                 => 'nullable|numeric|min:0.01',
            'shipping_usd'             => 'nullable|numeric|min:0',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'nullable|integer|exists:products,id',
            'items.*.product_variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.combo_id'         => 'nullable|integer|exists:combos,id',
            'items.*.product_name'     => 'required|string|max:255',
            'items.*.price_type'       => 'required|in:detal,mayor,distribuidor,custom',
            'items.*.unit_price_usd'   => 'required|numeric|min:0',
            'items.*.qty'              => 'required|integer|min:1',
            'total_bs'                 => 'nullable|numeric|min:0',
            'has_delivery'             => 'nullable|boolean',
            'delivery_date'            => 'nullable|date',
            // Entrega en mano o mandada con alguien: se agendan las dos,
            // pero cada una va a su propia lista
            'delivery_type'            => 'nullable|in:personal,delivery',
            // Texto libre: un punto de entrega aquí se dice «frente a la
            // panadería», no con una dirección postal
            'delivery_point_a'         => 'nullable|string|max:255',
            'delivery_point_b'         => 'nullable|string|max:255',
            'has_delivery_fee'         => 'nullable|boolean',
            'delivery_bs'              => 'nullable|numeric|min:0',
            'status'                   => 'required|in:draft,pending_variants',
            'show_variants_in_receipt' => 'nullable|boolean',
            'supplements'                 => 'nullable|array',
            'supplements.*.supplement_id' => 'required|integer|exists:supplements,id',
            'supplements.*.qty'           => 'required|numeric|min:0.01',
        ]);

        if ($request->filled('bcv_rate')) {
            $bcvRate = (float)$request->bcv_rate;
        } else {
            $rate = ExchangeRate::latest('created_at')->first();
            $bcvRate = $rate ? (float) $rate->bcv : 1.0;
        }

        $shippingUsd = (float)($request->shipping_usd ?? 0);
        $totalBs = $request->filled('total_bs') ? (float)$request->total_bs : null;

        DB::transaction(function () use ($request, $bcvRate, $shippingUsd, $totalBs) {
            // Calcular costo de suplementos distribuidos
            $totalSupplementCost = 0;
            if ($request->filled('supplements')) {
                foreach ($request->supplements as $supp) {
                    $supplement = \App\Models\Supplement::find($supp['supplement_id']);
                    if ($supplement) {
                        $totalSupplementCost += round((float)$supplement->cost_price * (float)$supp['qty'], 2);
                    }
                }
            }

            $totalItemsQty = 0;
            foreach ($request->items as $item) {
                $totalItemsQty += (int)$item['qty'];
            }

            $supplementCostPerUnit = 0;
            if ($totalItemsQty > 0) {
                $supplementCostPerUnit = round($totalSupplementCost / $totalItemsQty, 4);
            }

            $subtotal = 0;
            $totalProfit = 0;

            foreach ($request->items as $item) {
                $subtotal += round($item['unit_price_usd'] * $item['qty'], 2);
                
                $costPrice = 0;
                if (!empty($item['product_id'])) {
                    if ((float)$item['unit_price_usd'] > 0) {
                        $product = Product::find($item['product_id']);
                        $costPrice = (float)($product?->cost_price ?? 0);
                    }
                } elseif (!empty($item['combo_id'])) {
                    $combo = \App\Models\Combo::find($item['combo_id']);
                    $costPrice = (float)($combo?->cost_price ?? 0);
                }
                $adjustedCostPrice = $costPrice + $supplementCostPerUnit;
                $totalProfit += round(($item['unit_price_usd'] - $adjustedCostPrice) * $item['qty'], 2);
            }

            $totalUsd = $subtotal + $shippingUsd;
            $finalTotalBs = !is_null($totalBs) ? $totalBs : round($totalUsd * $bcvRate, 2);

            $factura = Factura::create([
                'user_id'                  => $this->tenantId(),
                'client_name'              => $request->client_name,
                'client_phone'             => $request->client_phone,
                'notes'                    => $request->notes,
                'status'                   => $request->status ?? 'draft',
                'subtotal_usd'             => $subtotal,
                'discount_usd'             => 0,
                'shipping_usd'             => $shippingUsd,
                'total_usd'                => $totalUsd,
                'total_bs'                 => $finalTotalBs,
                'bcv_rate'                 => $bcvRate,
                'profit_usd'               => $totalProfit,
                'has_delivery'             => $request->has_delivery ? true : false,
                'has_delivery_fee'         => $request->has_delivery_fee ? true : false,
                'delivery_bs'              => (float)($request->delivery_bs ?? 0),
                'show_variants_in_receipt' => $request->has('show_variants_in_receipt') ? (bool)$request->show_variants_in_receipt : true,
            ]);

            foreach ($request->items as $item) {
                $imagePath = null;
                $costPrice = 0;
                if (!empty($item['product_id'])) {
                    $product = Product::find($item['product_id']);
                    $imagePath = $product?->image_path;
                    if ((float)$item['unit_price_usd'] > 0) {
                        $costPrice = (float)($product?->cost_price ?? 0);
                    }
                } elseif (!empty($item['combo_id'])) {
                    $combo = \App\Models\Combo::find($item['combo_id']);
                    $imagePath = $combo?->image_path;
                    $costPrice = (float)($combo?->cost_price ?? 0);
                }

                $adjustedCostPrice = $costPrice + $supplementCostPerUnit;

                FacturaItem::create([
                    'factura_id'         => $factura->id,
                    'product_id'         => $item['product_id'] ?? null,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'combo_id'           => $item['combo_id'] ?? null,
                    'product_name'       => $item['product_name'],
                    'product_image_path' => $imagePath,
                    'price_type'         => $item['price_type'],
                    'unit_price_usd'     => $item['unit_price_usd'],
                    'cost_price'         => $adjustedCostPrice,
                    'qty'                => $item['qty'],
                    'subtotal_usd'       => round($item['unit_price_usd'] * $item['qty'], 2),
                    'profit_usd'         => round(($item['unit_price_usd'] - $adjustedCostPrice) * $item['qty'], 2),
                ]);
            }

            // Guardar suplementos aplicados
            if ($request->filled('supplements')) {
                foreach ($request->supplements as $supp) {
                    DB::table('factura_supplements')->insert([
                        'factura_id'    => $factura->id,
                        'supplement_id' => $supp['supplement_id'],
                        'qty'           => (float)$supp['qty'],
                        'created_at'    => Carbon::now(),
                        'updated_at'    => Carbon::now(),
                    ]);
                }
            }

            if ($request->has_delivery && $request->filled('delivery_date')) {
                \App\Models\Delivery::create(
                    $this->datosDeLaEntrega($request, $factura->id)
                );
            }

            session(['new_factura_id' => $factura->id]);
        });

        $newId = session('new_factura_id');
        return redirect()->route('facturas.show', $newId);
    }

    // ── Ver factura / recibo ──────────────────────────────────────────────────
    public function show(Factura $factura)
    {
        if ($factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        $factura->load(['items.variant', 'items.product.variants', 'delivery']);

        // La cabecera del recibo sale de la plantilla del comercio: sin esto
        // todas las facturas saldrían con la marca de otro.
        return Inertia::render('Facturas/Show', [
            'factura' => $factura,
            'plantilla' => \App\Models\InvoiceTemplate::firstOr(
                fn () => app(\App\Services\CatalogProvisioner::class)->invoiceTemplate($factura->user)
            ),
        ]);
    }

    // ── Toggle variante en recibo ──────────────────────────────────────────────
    public function toggleShowVariantsInReceipt(Factura $factura)
    {
        if ($factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        $factura->update([
            'show_variants_in_receipt' => !$factura->show_variants_in_receipt,
        ]);

        return redirect()->back();
    }

    // ── Confirmar y descontar stock ───────────────────────────────────────────
    public function confirmar(Factura $factura)
    {
        if ($factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        if ($factura->isConfirmed()) {
            return redirect()->back()->with('error', 'Esta factura ya fue confirmada.');
        }

        // Validar que si hay productos con variantes, se haya seleccionado una variante
        // Y validar que haya stock suficiente para cada item
        $factura->load(['items.product.variants', 'items.combo']);
        foreach ($factura->items as $item) {
            // Los servicios no llevan inventario: no se les revisan existencias
            if ($item->product_id && $item->product && ! $item->product->esServicio()) {
                // Verificar que tenga variante seleccionada si corresponde
                if ($item->product->variants->count() > 0 && is_null($item->product_variant_id)) {
                    return redirect()->back()->with('error', 'No puedes confirmar esta factura porque el producto "' . $item->product_name . '" tiene variantes sin especificar. Por favor edita la factura para asignar la variante.');
                }

                // Verificar stock
                if ($item->product_variant_id) {
                    $variant = $item->product->variants->firstWhere('id', $item->product_variant_id);
                    if (!$variant || $variant->stock < $item->qty) {
                        $vLabel = $variant ? $variant->label : 'Desconocida';
                        $available = $variant ? $variant->stock : 0;
                        return redirect()->back()->with('error', 'Stock insuficiente para el producto "' . $item->product_name . '" (Variante: ' . $vLabel . '). Stock disponible: ' . $available . '. Cantidad solicitada: ' . $item->qty);
                    }
                } else {
                    if ($item->product->stock < $item->qty) {
                        return redirect()->back()->with('error', 'Stock insuficiente para el producto "' . $item->product_name . '". Stock disponible: ' . $item->product->stock . '. Cantidad solicitada: ' . $item->qty);
                    }
                }
            }

            if ($item->combo_id && $item->combo) {
                if ($item->combo->stock < $item->qty) {
                    return redirect()->back()->with('error', 'Stock insuficiente para el combo "' . $item->product_name . '". Stock disponible: ' . $item->combo->stock . '. Cantidad solicitada: ' . $item->qty);
                }
            }
        }

        // Verificar suplementos aplicados
        $facturaSupplements = DB::table('factura_supplements')
            ->where('factura_id', $factura->id)
            ->get();

        foreach ($facturaSupplements as $fs) {
            $supplement = DB::table('supplements')->where('id', $fs->supplement_id)->first();
            if (!$supplement || $supplement->stock < $fs->qty) {
                $sName = $supplement ? $supplement->name : 'Desconocido';
                $available = $supplement ? $supplement->stock : 0;
                return redirect()->back()->with('error', 'Stock insuficiente para el suplemento/empaque "' . $sName . '". Stock disponible: ' . $available . '. Cantidad solicitada: ' . $fs->qty);
            }
        }

        try {
            DB::transaction(function () use ($factura) {
                $factura->load('items.product');

                $comboQuantities = [];
                foreach ($factura->items as $item) {
                    // Un servicio se cobra igual, pero no hay existencias que restar
                    if ($item->product_id && ! $item->product?->esServicio()) {
                        Product::where('id', $item->product_id)
                            ->decrement('stock', $item->qty);

                        if ($item->product_variant_id) {
                            ProductVariant::where('id', $item->product_variant_id)
                                ->decrement('stock', $item->qty);
                        }

                        // Recalcular stock total si el producto tiene variantes.
                        // La inversión NO se toca: vender no es comprar, y
                        // antes cada venta la reescribía hacia abajo.
                        $prod = Product::find($item->product_id);
                        if ($prod && $prod->variants()->count() > 0) {
                            $prod->update(['stock' => (int) $prod->variants()->sum('stock')]);
                        }
                    }
                    if ($item->combo_id) {
                        if (!isset($comboQuantities[$item->combo_id])) {
                            $comboQuantities[$item->combo_id] = $item->qty;
                        }
                    }
                }

                foreach ($comboQuantities as $comboId => $qty) {
                    \App\Models\Combo::where('id', $comboId)
                        ->decrement('stock', $qty);
                }

                // Descontar stock de suplementos aplicados
                $facturaSupplements = DB::table('factura_supplements')
                    ->where('factura_id', $factura->id)
                    ->get();

                foreach ($facturaSupplements as $fs) {
                    DB::table('supplements')
                        ->where('id', $fs->supplement_id)
                        ->decrement('stock', $fs->qty);
                }

                $factura->update([
                    'status'       => 'confirmed',
                    'confirmed_at' => Carbon::now(),
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Error al confirmar factura: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Ocurrió un error al procesar la confirmación: ' . $e->getMessage());
        }

        return redirect()->route('facturas.show', $factura->id)
            ->with('success', 'Factura confirmada. Stock descontado correctamente.');
    }

    // ── Formulario de edición ──────────────────────────────────────────────────
    public function edit(Factura $factura)
    {
        if ($factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        if (!$factura->canEdit()) {
            return redirect()->route('facturas.show', $factura->id)
                ->with('error', 'No se puede editar una factura confirmada o en estado no editable.');
        }

        $factura->load(['items.variant', 'delivery']);

        // El selector solo muestra la foto principal (image_path): cargar la
        // galería completa de cada producto era traer filas que nadie usa.
        $productos = Product::with(['categories:id,name', 'variants:id,product_id,label,type,stock'])->latest()->get()
            ->map(fn($p) => [
                'id'                      => $p->id,
                'name'                    => $p->name,
                'price_usdt'              => $p->price_usdt,
                'price_mayor_usdt'        => $p->price_mayor_usdt,
                'price_distribuidor_usdt' => $p->price_distribuidor_usdt,
                'cost_price'              => $p->cost_price,
                'stock'                   => $p->stock,
                'image_path'              => $p->image_path,
                'categories'              => $p->categories->map(fn($cat) => [
                    'id'   => $cat->id,
                    'name' => $cat->name,
                ]),
                'variants'                => $p->variants->map(fn($v) => [
                    'id'    => $v->id,
                    'label' => $v->label,
                    'type'  => $v->type,
                    'stock' => $v->stock,
                ]),
            ]);

        $combos = \App\Models\Combo::where('user_id', $this->tenantId())
            ->with('products')
            ->latest()
            ->get()
            ->map(fn($c) => [
                'id'                      => $c->id,
                'name'                    => $c->name,
                'price_usdt'              => $c->price_usdt,
                'price_mayor_usdt'        => $c->price_mayor_usdt,
                'price_distribuidor_usdt' => $c->price_distribuidor_usdt,
                'cost_price'              => $c->cost_price,
                'stock'                   => $c->stock,
                'image_path'              => $c->image_path,
                'products'                => $c->products->map(fn($p) => [
                    'id'                      => $p->id,
                    'name'                    => $p->name,
                    'price_usdt'              => $p->price_usdt,
                    'price_mayor_usdt'        => $p->price_mayor_usdt,
                    'price_distribuidor_usdt' => $p->price_distribuidor_usdt,
                    'cost_price'              => $p->cost_price,
                    'image_path'              => $p->image_path,
                    'price_type'              => $p->pivot?->price_type ?? 'detal',
                ]),
            ]);

        $supplements = \App\Models\Supplement::where('user_id', $this->tenantId())->orderBy('name')->get(['id', 'name', 'type', 'stock']);
        $appliedSupplements = DB::table('factura_supplements')
            ->where('factura_id', $factura->id)
            ->get(['supplement_id', 'qty'])
            ->map(fn($s) => [
                'supplement_id' => $s->supplement_id,
                'qty'           => (float)$s->qty,
            ])
            ->toArray();

        $categorias = \App\Models\Category::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Facturas/Edit', [
            'factura'            => $factura,
            'productos'          => $productos,
            'combos'             => $combos,
            'supplements'        => $supplements,
            'appliedSupplements' => $appliedSupplements,
            'categorias'         => $categorias,
            'bcvRate'            => (float)$factura->bcv_rate,
        ]);
    }

    // ── Actualizar factura borrador ───────────────────────────────────────────
    /**
     * La entrega que se guarda con la factura.
     *
     * Los puntos solo viajan con un delivery: una entrega en mano la hace
     * el propio comercio y no tiene recorrido que anotar, así que dejarlos
     * ahí solo ensuciaría la lista de quien reparte.
     *
     * @return array<string, mixed>
     */
    private function datosDeLaEntrega(Request $request, int $facturaId): array
    {
        $tipo = $request->input('delivery_type') === Delivery::DELIVERY
            ? Delivery::DELIVERY
            : Delivery::PERSONAL;

        return [
            'factura_id'    => $facturaId,
            'type'          => $tipo,
            'delivery_date' => $request->delivery_date,
            'status'        => 'pending',
            'point_a'       => $tipo === Delivery::DELIVERY ? $request->input('delivery_point_a') : null,
            'point_b'       => $tipo === Delivery::DELIVERY ? $request->input('delivery_point_b') : null,
        ];
    }

    public function update(Request $request, Factura $factura)
    {
        if ($factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        if (!$factura->canEdit()) {
            return redirect()->back()->with('error', 'No se puede editar una factura confirmada o en estado no editable.');
        }

        $request->validate([
            'client_name'              => $request->input('has_delivery') ? 'required|string|max:200' : 'nullable|string|max:200',
            'client_phone'             => 'nullable|string|max:50',
            'notes'                    => 'nullable|string|max:1000',
            'bcv_rate'                 => 'nullable|numeric|min:0.01',
            'shipping_usd'             => 'nullable|numeric|min:0',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'nullable|integer|exists:products,id',
            'items.*.product_variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.combo_id'         => 'nullable|integer|exists:combos,id',
            'items.*.product_name'     => 'required|string|max:255',
            'items.*.price_type'       => 'required|in:detal,mayor,distribuidor,custom',
            'items.*.unit_price_usd'   => 'required|numeric|min:0',
            'items.*.qty'              => 'required|integer|min:1',
            'total_bs'                 => 'nullable|numeric|min:0',
            'has_delivery'             => 'nullable|boolean',
            'delivery_date'            => 'nullable|date',
            // Entrega en mano o mandada con alguien: se agendan las dos,
            // pero cada una va a su propia lista
            'delivery_type'            => 'nullable|in:personal,delivery',
            // Texto libre: un punto de entrega aquí se dice «frente a la
            // panadería», no con una dirección postal
            'delivery_point_a'         => 'nullable|string|max:255',
            'delivery_point_b'         => 'nullable|string|max:255',
            'has_delivery_fee'         => 'nullable|boolean',
            'delivery_bs'              => 'nullable|numeric|min:0',
            'show_variants_in_receipt' => 'nullable|boolean',
            'status'                   => 'required|in:draft,pending_variants',
            'supplements'                 => 'nullable|array',
            'supplements.*.supplement_id' => 'required|integer|exists:supplements,id',
            'supplements.*.qty'           => 'required|numeric|min:0.01',
        ]);

        $bcvRate = (float)($request->bcv_rate ?? $factura->bcv_rate);
        $shippingUsd = (float)($request->shipping_usd ?? 0);
        $totalBs = $request->filled('total_bs') ? (float)$request->total_bs : null;

        DB::transaction(function () use ($request, $factura, $bcvRate, $shippingUsd, $totalBs) {
            // Calcular costo de suplementos distribuidos
            $totalSupplementCost = 0;
            if ($request->filled('supplements')) {
                foreach ($request->supplements as $supp) {
                    $supplement = \App\Models\Supplement::find($supp['supplement_id']);
                    if ($supplement) {
                        $totalSupplementCost += round((float)$supplement->cost_price * (float)$supp['qty'], 2);
                    }
                }
            }

            $totalItemsQty = 0;
            foreach ($request->items as $item) {
                $totalItemsQty += (int)$item['qty'];
            }

            $supplementCostPerUnit = 0;
            if ($totalItemsQty > 0) {
                $supplementCostPerUnit = round($totalSupplementCost / $totalItemsQty, 4);
            }

            $subtotal = 0;
            $totalProfit = 0;

            foreach ($request->items as $item) {
                $subtotal += round($item['unit_price_usd'] * $item['qty'], 2);
                
                $costPrice = 0;
                if (!empty($item['product_id'])) {
                    if ((float)$item['unit_price_usd'] > 0) {
                        $product = Product::find($item['product_id']);
                        $costPrice = (float)($product?->cost_price ?? 0);
                    }
                } elseif (!empty($item['combo_id'])) {
                    $combo = \App\Models\Combo::find($item['combo_id']);
                    $costPrice = (float)($combo?->cost_price ?? 0);
                }
                $adjustedCostPrice = $costPrice + $supplementCostPerUnit;
                $totalProfit += round(($item['unit_price_usd'] - $adjustedCostPrice) * $item['qty'], 2);
            }

            $totalUsd = $subtotal + $shippingUsd;
            $finalTotalBs = !is_null($totalBs) ? $totalBs : round($totalUsd * $bcvRate, 2);

            $factura->update([
                'client_name'              => $request->client_name,
                'client_phone'             => $request->client_phone,
                'notes'                    => $request->notes,
                'subtotal_usd'             => $subtotal,
                'shipping_usd'             => $shippingUsd,
                'total_usd'                => $totalUsd,
                'total_bs'                 => $finalTotalBs,
                'bcv_rate'                 => $bcvRate,
                'profit_usd'               => $totalProfit,
                'status'                   => $request->status ?? $factura->status,
                'has_delivery'             => $request->has_delivery ? true : false,
                'has_delivery_fee'         => $request->has_delivery_fee ? true : false,
                'delivery_bs'              => (float)($request->delivery_bs ?? 0),
                'show_variants_in_receipt' => $request->has('show_variants_in_receipt') ? (bool)$request->show_variants_in_receipt : $factura->show_variants_in_receipt,
            ]);

            if ($request->has_delivery && $request->filled('delivery_date')) {
                \App\Models\Delivery::updateOrCreate(
                    ['factura_id' => $factura->id],
                    collect($this->datosDeLaEntrega($request, $factura->id))->except('factura_id')->all()
                );
            } else {
                $factura->delivery()->delete();
            }

            // Eliminar items antiguos y re-crear
            $factura->items()->delete();

            foreach ($request->items as $item) {
                $imagePath = null;
                $costPrice = 0;
                if (!empty($item['product_id'])) {
                    $product = Product::find($item['product_id']);
                    $imagePath = $product?->image_path;
                    if ((float)$item['unit_price_usd'] > 0) {
                        $costPrice = (float)($product?->cost_price ?? 0);
                    }
                } elseif (!empty($item['combo_id'])) {
                    $combo = \App\Models\Combo::find($item['combo_id']);
                    $imagePath = $combo?->image_path;
                    $costPrice = (float)($combo?->cost_price ?? 0);
                }

                $adjustedCostPrice = $costPrice + $supplementCostPerUnit;

                FacturaItem::create([
                    'factura_id'         => $factura->id,
                    'product_id'         => $item['product_id'] ?? null,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'combo_id'           => $item['combo_id'] ?? null,
                    'product_name'       => $item['product_name'],
                    'product_image_path' => $imagePath,
                    'price_type'         => $item['price_type'],
                    'unit_price_usd'     => $item['unit_price_usd'],
                    'cost_price'         => $adjustedCostPrice,
                    'qty'                => $item['qty'],
                    'subtotal_usd'       => round($item['unit_price_usd'] * $item['qty'], 2),
                    'profit_usd'         => round(($item['unit_price_usd'] - $adjustedCostPrice) * $item['qty'], 2),
                ]);
            }

            // Actualizar suplementos aplicados
            DB::table('factura_supplements')->where('factura_id', $factura->id)->delete();

            if ($request->filled('supplements')) {
                foreach ($request->supplements as $supp) {
                    DB::table('factura_supplements')->insert([
                        'factura_id'    => $factura->id,
                        'supplement_id' => $supp['supplement_id'],
                        'qty'           => (float)$supp['qty'],
                        'created_at'    => Carbon::now(),
                        'updated_at'    => Carbon::now(),
                    ]);
                }
            }
        });

        return redirect()->route('facturas.show', $factura->id)
            ->with('success', 'Factura actualizada correctamente.');
    }

    // ── Eliminar borrador ────────────────────────────────────────────────────
    public function destroy(Factura $factura)
    {
        if ($factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        if (!$factura->canEdit()) {
            return redirect()->back()->with('error', 'No se puede eliminar una factura confirmada.');
        }

        $factura->delete();

        return redirect()->route('facturas.index')
            ->with('success', 'Borrador eliminado correctamente.');
    }
}
