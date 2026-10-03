<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\ProductAdjustment;
use App\Models\ProductPurchase;
use App\Models\Setting;
use App\Services\Ganancias\LibroDeCompras;
use App\Services\Ganancias\ResumenDeGanancias;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Control de ganancias del comercio.
 *
 * El controlador solo recoge filtros y entrega lo que calcula
 * App\Services\Ganancias\ResumenDeGanancias: todos los números de la
 * pantalla salen de ahí, para que no haya dos formas de sumar lo mismo.
 */
class ProfitController extends Controller
{
    public function __construct(
        private ResumenDeGanancias $resumen,
        private LibroDeCompras $libro,
    ) {
    }

    public function index(Request $request): Response
    {
        $comercio = $this->tenantId();
        $filtros = $request->only(['product_id', 'month', 'year']);

        $datos = $this->resumen->para($comercio, $filtros);

        return Inertia::render('Profits/Index', [
            ...$datos,
            'allProducts' => Product::where('user_id', $comercio)->orderBy('name')->get(['id', 'name']),
            'availableYears' => $this->resumen->anosConMovimiento($comercio),
            'gananciasStartDate' => Setting::get('ganancias_start_date', null, $comercio),
            'origenesDeCompra' => ProductPurchase::ORIGENES,
            'filters' => [
                'product_id' => $filtros['product_id'] ?? '',
                'month' => $filtros['month'] ?? '',
                'year' => $filtros['year'] ?? '',
            ],
        ]);
    }

    /** Historial de entradas de un producto, para revisar su inversión. */
    public function compras(Request $request, Product $producto): Response
    {
        abort_unless((int) $producto->user_id === (int) $this->tenantId(), 403);

        return Inertia::render('Profits/Compras', [
            'producto' => [
                'id' => $producto->id,
                'name' => $producto->name,
                'cost_price' => (float) ($producto->cost_price ?? 0),
                'stock' => (int) $producto->stock,
                'inversion' => (float) $producto->inversion_historica,
            ],
            'compras' => ProductPurchase::where('product_id', $producto->id)
                ->orderByDesc('purchased_at')
                ->orderByDesc('id')
                ->get()
                ->map(fn (ProductPurchase $compra) => [
                    'id' => $compra->id,
                    'fecha' => $compra->purchased_at->toIso8601String(),
                    'cantidad' => $compra->qty,
                    'costo_unitario' => $compra->unit_cost,
                    'total' => $compra->total_cost,
                    'origen' => $compra->etiquetaDeOrigen(),
                    'nota' => $compra->note,
                ]),
        ]);
    }

    /**
     * Registra una entrada de mercancía.
     *
     * Es la forma correcta de subir la inversión de un producto: antes se
     * escribía el total a mano y cualquier cambio posterior lo pisaba.
     */
    public function storePurchase(Request $request): RedirectResponse
    {
        $validado = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('user_id', $this->tenantId())],
            'qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'unit_cost' => ['required', 'numeric', 'min:0.0001'],
            'purchased_at' => ['nullable', 'date', 'before_or_equal:today'],
            'note' => ['nullable', 'string', 'max:160'],
            'sumar_stock' => ['boolean'],
        ], [
            'unit_cost.min' => 'Indica cuánto te costó cada unidad.',
        ]);

        $producto = Product::where('user_id', $this->tenantId())->findOrFail($validado['product_id']);

        DB::transaction(function () use ($producto, $validado, $request) {
            $this->libro->registrar(
                $producto,
                (int) $validado['qty'],
                (float) $validado['unit_cost'],
                ProductPurchase::MANUAL,
                $validado['note'] ?? null,
                isset($validado['purchased_at']) ? Carbon::parse($validado['purchased_at']) : null,
            );

            // Lo normal es que una compra entre al inventario
            if ($request->boolean('sumar_stock', true)) {
                $producto->forceFill(['stock' => $producto->stock + (int) $validado['qty']])->save();
            }
        });

        ActivityLog::record('compra.registrada', "Registró la compra de {$validado['qty']} unidades de {$producto->name}");

        return back()->with('success', 'Compra registrada. La inversión del producto quedó al día.');
    }

    public function destroyPurchase(ProductPurchase $compra): RedirectResponse
    {
        abort_unless((int) $compra->user_id === (int) $this->tenantId(), 403);

        $producto = $compra->product;
        $compra->delete();

        if ($producto) {
            $this->libro->recalcular($producto);
        }

        return back()->with('success', 'Entrada eliminada del libro de compras.');
    }

    public function storeAdjustment(Request $request): RedirectResponse
    {
        $validado = $request->validate([
            // Solo productos propios: antes se validaba contra toda la plataforma
            'product_id' => ['nullable', Rule::exists('products', 'id')->where('user_id', $this->tenantId())],
            'type' => ['required', 'in:loss,gain'],
            'concept' => ['nullable', 'string', 'max:100'],
            'qty' => ['required', 'integer', 'min:1'],
            'amount_usd' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:500'],
            'adjust_stock' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($validado, $request) {
            $descuentaStock = $validado['type'] === 'loss'
                && ! empty($validado['product_id'])
                && $request->boolean('adjust_stock');

            ProductAdjustment::create([
                'user_id' => $this->tenantId(),
                'product_id' => $validado['product_id'] ?: null,
                'type' => $validado['type'],
                'concept' => $validado['concept'] ?? null,
                'qty' => $validado['qty'],
                'amount_usd' => $validado['amount_usd'],
                'reason' => $validado['reason'],
                // Queda anotado si tocó el inventario: sin esto no se puede
                // reconstruir el stock de un mes pasado sin contar doble
                'adjusts_stock' => $descuentaStock,
            ]);

            if ($descuentaStock) {
                $producto = Product::where('user_id', $this->tenantId())->find($validado['product_id']);

                if ($producto) {
                    $producto->forceFill(['stock' => max(0, $producto->stock - $validado['qty'])])->save();
                }
            }
        });

        return back()->with('success', 'Ajuste financiero registrado correctamente.');
    }

    /** Solo el costo unitario: la inversión ya no se escribe a mano. */
    public function updateProductFinancials(Request $request): RedirectResponse
    {
        $validado = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('user_id', $this->tenantId())],
            'cost_price' => ['required', 'numeric', 'min:0'],
        ]);

        $producto = Product::where('user_id', $this->tenantId())->findOrFail($validado['product_id']);
        $producto->update(['cost_price' => $validado['cost_price']]);

        return back()->with('success', 'Costo actualizado. Las ventas ya emitidas conservan el costo que tenían.');
    }

    public function resetStartDate(Request $request): RedirectResponse
    {
        $request->validate(['reset' => ['required', 'boolean']]);

        if ($request->boolean('reset')) {
            Setting::where('key', 'ganancias_start_date')
                ->where('user_id', $this->tenantId())
                ->delete();

            return back()->with('success', 'Se ha restablecido el control para ver todo el historial.');
        }

        Setting::put('ganancias_start_date', now()->toDateTimeString(), $this->tenantId());

        return back()->with('success', 'Control de ganancias configurado para contar desde hoy.');
    }
}
