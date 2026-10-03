<?php

namespace App\Services\Ganancias;

use App\Models\Factura;
use App\Models\FacturaItem;
use App\Models\Product;
use App\Models\ProductAdjustment;
use App\Models\ProductPurchase;
use App\Models\Setting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Todos los números del módulo de ganancias, calculados en un solo lugar.
 *
 * Antes la pantalla sumaba por su cuenta algunas cifras que el servidor ya
 * había calculado de otra manera, y las dos podían no coincidir: la
 * ganancia de un combo, por ejemplo, aparecía en un total y no en el otro.
 * Aquí todo sale de las mismas consultas y la página solo pinta.
 *
 * Las consultas son agregadas: el costo no crece con la cantidad de
 * productos del comercio, que es lo que antes hacía inviable la pantalla.
 */
class ResumenDeGanancias
{
    public function __construct(private LibroDeCompras $libro)
    {
    }

    /**
     * @param  array{product_id?: mixed, month?: mixed, year?: mixed, page?: mixed}  $filtros
     * @return array<string, mixed>
     */
    public function para(int $comercioId, array $filtros = []): array
    {
        $productoId = ($filtros['product_id'] ?? null) ? (int) $filtros['product_id'] : null;
        [$arranque, $inicio, $fin, $mes, $ano] = $this->periodo($comercioId, $filtros);

        $productos = Product::query()
            ->where('user_id', $comercioId)
            ->when($productoId, fn ($q) => $q->where('id', $productoId))
            // Un producto que no existía en el período no tiene nada que decir
            ->when($fin, fn ($q) => $q->where('created_at', '<=', $fin))
            ->orderBy('name')
            ->get(['id', 'name', 'cost_price', 'stock', 'image_path', 'item_type', 'created_at']);

        $ids = $productos->pluck('id')->all();

        // Del período: lo que se vendió dentro del rango elegido.
        // Acumulado: todo lo vendido hasta el cierre, que es contra lo que se
        // mide cuánto falta por recuperar de la inversión.
        $delPeriodo = $this->ventasPorProducto($comercioId, $inicio, $fin);
        $acumulado = $this->ventasPorProducto($comercioId, $arranque, $fin);
        $perdidasPorProducto = $this->perdidasPorProducto($comercioId, $inicio, $fin);
        $invertido = $this->libro->totalesPorProducto($ids, $fin, $arranque);
        $compradas = $this->unidadesCompradas($ids, $fin, $arranque);
        $suplementos = $this->suplementosPorProducto($comercioId, $inicio, $fin);
        $stockAlCierre = $this->stockAlCierre($ids, $fin);

        $filas = $productos->map(function (Product $producto) use ($delPeriodo, $acumulado, $invertido, $compradas, $suplementos, $stockAlCierre, $perdidasPorProducto) {
            $id = $producto->id;
            $stock = $stockAlCierre[$id] ?? (int) $producto->stock;

            $inversion = (float) ($invertido[$id] ?? 0);
            $recaudado = (float) ($acumulado[$id]['ingresos'] ?? 0);
            $ganancia = (float) ($delPeriodo[$id]['ganancia'] ?? 0);
            $empaques = (float) ($suplementos[$id] ?? 0);

            return [
                'id' => $id,
                'name' => $producto->name,
                'es_servicio' => $producto->esServicio(),
                'cost_price' => (float) ($producto->cost_price ?? 0),
                'stock' => $stock,
                'image_path' => $producto->image_path,
                'inversion_stock' => round((float) ($producto->cost_price ?? 0) * $stock, 2),
                'inversion_historica' => $inversion,
                'unidades_compradas' => (int) ($compradas[$id] ?? 0),
                'unidades_vendidas' => (int) ($acumulado[$id]['unidades'] ?? 0),
                'unidades_perdidas' => (int) ($perdidasPorProducto[$id]['unidades'] ?? 0),
                'recaudado' => round($recaudado, 2),
                'ganancia' => round($ganancia, 2),
                'ganancia_bruta' => round($ganancia + $empaques, 2),
                'suplementos_gastados' => round($empaques, 2),
                'restante_por_recaudar' => round(max(0, $inversion - $recaudado), 2),
                'utilidad_sobre_inversion' => round($recaudado - $inversion, 2),
            ];
        })->values();

        $periodo = $this->totalesDelPeriodo($comercioId, $inicio, $fin);
        $ajustes = $this->ajustes($comercioId, $inicio, $fin, $productoId);

        $perdidas = round((float) $ajustes->where('type', 'loss')->sum('amount_usd'), 2);
        $adicionales = round((float) $ajustes->where('type', 'gain')->sum('amount_usd'), 2);

        $inversionTotal = round($filas->sum('inversion_historica'), 2);
        $recaudadoTotal = round($filas->sum('recaudado'), 2);

        return [
            'productos' => $filas,
            'adjustments' => $ajustes,
            'sales' => $this->ventas($comercioId, $inicio, $fin, $productoId),

            // Resultado del período: una sola fuente para toda la pantalla
            'periodo' => [
                'desde' => $inicio?->toDateString(),
                'hasta' => $fin?->toDateString(),
                'mes' => $mes,
                'ano' => $ano,
                'ingresos' => $periodo['ingresos'],
                'costo_ventas' => $periodo['costo'],
                'ganancia_bruta' => $periodo['ganancia'],
                'ganancia_combos' => $periodo['ganancia_combos'],
                'envios' => $periodo['envios'],
                'facturas' => $periodo['facturas'],
                'empaques' => $periodo['empaques'],
                'perdidas' => $perdidas,
                'ganancias_adicionales' => $adicionales,
                'neto' => round($periodo['ganancia'] - $perdidas + $adicionales, 2),
            ],

            // Acumulado del inventario, no del período
            'inversion' => [
                'en_stock' => round($filas->sum('inversion_stock'), 2),
                'historica' => $inversionTotal,
                'recaudado' => $recaudadoTotal,
                'restante_por_recaudar' => round(max(0, ($inversionTotal + $perdidas) - ($recaudadoTotal + $adicionales)), 2),
                'utilidad' => round(($recaudadoTotal + $adicionales) - ($inversionTotal + $perdidas), 2),
                'retorno' => $inversionTotal > 0
                    ? round(((($recaudadoTotal + $adicionales) - ($inversionTotal + $perdidas)) / $inversionTotal) * 100, 1)
                    : 0,
            ],
        ];
    }

    /**
     * Rango del período según los filtros.
     *
     * Elegir un mes sin año ya no significa «ese mes de todos los años»:
     * se asume el año en curso, que es lo que espera cualquiera.
     *
     * Devuelve el arranque del comercio (desde cuándo cuenta su historia),
     * el inicio y el fin del período elegido, y el mes y año pedidos.
     *
     * @return array{0: ?Carbon, 1: ?Carbon, 2: ?Carbon, 3: ?int, 4: ?int}
     */
    private function periodo(int $comercioId, array $filtros): array
    {
        $mes = ($filtros['month'] ?? null) ? (int) $filtros['month'] : null;
        $ano = ($filtros['year'] ?? null) ? (int) $filtros['year'] : null;

        if ($mes && ! $ano) {
            $ano = (int) now()->year;
        }

        $arranque = Setting::get('ganancias_start_date', null, $comercioId);
        $desde = $arranque ? Carbon::parse($arranque) : null;

        if (! $ano) {
            return [$desde, $desde, null, null, null];
        }

        $inicio = $mes
            ? Carbon::create($ano, $mes, 1)->startOfMonth()
            : Carbon::create($ano, 1, 1)->startOfYear();

        $fin = $mes
            ? $inicio->copy()->endOfMonth()
            : $inicio->copy()->endOfYear();

        // El arranque manda si es posterior al inicio del período elegido
        if ($desde && $desde->greaterThan($inicio)) {
            $inicio = $desde;
        }

        return [$desde, $inicio, $fin, $mes, $ano];
    }

    /**
     * Ventas agrupadas por producto dentro de un rango.
     *
     * @return array<int, array{unidades: int, ingresos: float, ganancia: float, costo: float}>
     */
    private function ventasPorProducto(int $comercioId, ?Carbon $desde, ?Carbon $hasta): array
    {
        return FacturaItem::query()
            ->join('facturas', 'facturas.id', '=', 'factura_items.factura_id')
            ->where('facturas.user_id', $comercioId)
            ->where('facturas.status', 'confirmed')
            ->whereNotNull('factura_items.product_id')
            ->when($desde, fn ($q) => $q->where('facturas.confirmed_at', '>=', $desde))
            ->when($hasta, fn ($q) => $q->where('facturas.confirmed_at', '<=', $hasta))
            ->selectRaw('factura_items.product_id as id')
            ->selectRaw('SUM(factura_items.qty) as unidades')
            ->selectRaw('SUM(factura_items.subtotal_usd) as ingresos')
            ->selectRaw('SUM(factura_items.profit_usd) as ganancia')
            ->selectRaw('SUM(factura_items.cost_price * factura_items.qty) as costo')
            ->groupBy('factura_items.product_id')
            ->get()
            ->keyBy('id')
            ->map(fn ($fila) => [
                'unidades' => (int) $fila->unidades,
                'ingresos' => (float) $fila->ingresos,
                'ganancia' => (float) $fila->ganancia,
                'costo' => (float) $fila->costo,
            ])
            ->all();
    }

    /**
     * Unidades que entraron por producto, según el libro de compras.
     *
     * @param  list<int>  $ids
     * @return array<int, int>
     */
    private function unidadesCompradas(array $ids, ?Carbon $hasta, ?Carbon $desde): array
    {
        if ($ids === []) {
            return [];
        }

        return ProductPurchase::query()
            ->whereIn('product_id', $ids)
            ->hasta($hasta)
            ->desde($desde)
            ->selectRaw('product_id as id, SUM(qty) as unidades')
            ->groupBy('product_id')
            ->pluck('unidades', 'id')
            ->map(fn ($valor) => (int) $valor)
            ->all();
    }

    /** @return array<int, array{unidades: int, monto: float}> */
    private function perdidasPorProducto(int $comercioId, ?Carbon $inicio, ?Carbon $fin): array
    {
        return ProductAdjustment::query()
            ->where('user_id', $comercioId)
            ->where('type', 'loss')
            ->whereNotNull('product_id')
            ->when($inicio, fn ($q) => $q->where('created_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('created_at', '<=', $fin))
            ->selectRaw('product_id as id, SUM(qty) as unidades, SUM(amount_usd) as monto')
            ->groupBy('product_id')
            ->get()
            ->keyBy('id')
            ->map(fn ($fila) => ['unidades' => (int) $fila->unidades, 'monto' => (float) $fila->monto])
            ->all();
    }

    /**
     * Cuánto del costo de empaques y suplementos cargó cada producto.
     *
     * El costo de los suplementos de una factura se reparte entre sus
     * unidades, igual que al emitirla. Se hace en una sola consulta.
     *
     * @return array<int, float>
     */
    private function suplementosPorProducto(int $comercioId, ?Carbon $inicio, ?Carbon $fin): array
    {
        $porFactura = DB::table('factura_supplements as fs')
            ->join('supplements as s', 's.id', '=', 'fs.supplement_id')
            ->selectRaw('fs.factura_id, SUM(s.cost_price * fs.qty) as costo')
            ->groupBy('fs.factura_id');

        $unidades = DB::table('factura_items')
            ->selectRaw('factura_id, SUM(qty) as unidades')
            ->groupBy('factura_id');

        return DB::table('factura_items as fi')
            ->join('facturas as f', 'f.id', '=', 'fi.factura_id')
            ->joinSub($porFactura, 'sup', fn ($j) => $j->on('sup.factura_id', '=', 'fi.factura_id'))
            ->joinSub($unidades, 'u', fn ($j) => $j->on('u.factura_id', '=', 'fi.factura_id'))
            ->where('f.user_id', $comercioId)
            ->where('f.status', 'confirmed')
            ->whereNotNull('fi.product_id')
            ->where('u.unidades', '>', 0)
            ->when($inicio, fn ($q) => $q->where('f.confirmed_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('f.confirmed_at', '<=', $fin))
            ->selectRaw('fi.product_id as id, SUM(fi.qty * (sup.costo / u.unidades)) as asignado')
            ->groupBy('fi.product_id')
            ->pluck('asignado', 'id')
            ->map(fn ($valor) => round((float) $valor, 2))
            ->all();
    }

    /**
     * Stock que tenía cada producto al cierre del período.
     *
     * Se reconstruye hacia atrás desde el stock de hoy: se devuelve lo que
     * se vendió y se perdió después, y se descuenta lo que se compró
     * después. Esto último faltaba y hacía que una reposición reciente
     * inflara el inventario de meses pasados.
     *
     * @param  list<int>  $ids
     * @return array<int, int>
     */
    private function stockAlCierre(array $ids, ?Carbon $fin): array
    {
        if ($fin === null || $ids === []) {
            return [];
        }

        $vendidoDespues = FacturaItem::query()
            ->join('facturas', 'facturas.id', '=', 'factura_items.factura_id')
            ->whereIn('factura_items.product_id', $ids)
            ->where('facturas.status', 'confirmed')
            ->where('facturas.confirmed_at', '>', $fin)
            ->selectRaw('factura_items.product_id as id, SUM(factura_items.qty) as unidades')
            ->groupBy('factura_items.product_id')
            ->pluck('unidades', 'id');

        $perdidoDespues = ProductAdjustment::query()
            ->whereIn('product_id', $ids)
            ->where('type', 'loss')
            ->where('adjusts_stock', true)
            ->where('created_at', '>', $fin)
            ->selectRaw('product_id as id, SUM(qty) as unidades')
            ->groupBy('product_id')
            ->pluck('unidades', 'id');

        $compradoDespues = ProductPurchase::query()
            ->whereIn('product_id', $ids)
            ->where('purchased_at', '>', $fin)
            ->selectRaw('product_id as id, SUM(qty) as unidades')
            ->groupBy('product_id')
            ->pluck('unidades', 'id');

        $stockActual = Product::whereIn('id', $ids)->pluck('stock', 'id');

        $resultado = [];

        foreach ($ids as $id) {
            $resultado[$id] = max(0, (int) ($stockActual[$id] ?? 0)
                + (int) ($vendidoDespues[$id] ?? 0)
                + (int) ($perdidoDespues[$id] ?? 0)
                - (int) ($compradoDespues[$id] ?? 0));
        }

        return $resultado;
    }

    /**
     * Resultado del período a partir de **todos** los renglones vendidos,
     * incluidos los combos, que no cuelgan de ningún producto.
     *
     * @return array<string, float|int>
     */
    private function totalesDelPeriodo(int $comercioId, ?Carbon $inicio, ?Carbon $fin): array
    {
        $items = FacturaItem::query()
            ->join('facturas', 'facturas.id', '=', 'factura_items.factura_id')
            ->where('facturas.user_id', $comercioId)
            ->where('facturas.status', 'confirmed')
            ->when($inicio, fn ($q) => $q->where('facturas.confirmed_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('facturas.confirmed_at', '<=', $fin))
            ->selectRaw('COALESCE(SUM(factura_items.subtotal_usd), 0) as ingresos')
            ->selectRaw('COALESCE(SUM(factura_items.cost_price * factura_items.qty), 0) as costo')
            ->selectRaw('COALESCE(SUM(factura_items.profit_usd), 0) as ganancia')
            ->selectRaw('COALESCE(SUM(CASE WHEN factura_items.combo_id IS NOT NULL THEN factura_items.profit_usd ELSE 0 END), 0) as ganancia_combos')
            ->first();

        $facturas = Factura::query()
            ->where('user_id', $comercioId)
            ->where('status', 'confirmed')
            ->when($inicio, fn ($q) => $q->where('confirmed_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('confirmed_at', '<=', $fin))
            ->selectRaw('COUNT(*) as cuantas, COALESCE(SUM(shipping_usd), 0) as envios')
            ->first();

        $empaques = (float) DB::table('factura_supplements as fs')
            ->join('supplements as s', 's.id', '=', 'fs.supplement_id')
            ->join('facturas as f', 'f.id', '=', 'fs.factura_id')
            ->where('f.user_id', $comercioId)
            ->where('f.status', 'confirmed')
            ->when($inicio, fn ($q) => $q->where('f.confirmed_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('f.confirmed_at', '<=', $fin))
            ->sum(DB::raw('s.cost_price * fs.qty'));

        return [
            'ingresos' => round((float) $items->ingresos, 2),
            'costo' => round((float) $items->costo, 2),
            'ganancia' => round((float) $items->ganancia, 2),
            'ganancia_combos' => round((float) $items->ganancia_combos, 2),
            'envios' => round((float) $facturas->envios, 2),
            'facturas' => (int) $facturas->cuantas,
            'empaques' => round($empaques, 2),
        ];
    }

    /** Las ventas del período, por páginas: la lista no puede crecer sin techo. */
    private function ventas(int $comercioId, ?Carbon $inicio, ?Carbon $fin, ?int $productoId): LengthAwarePaginator
    {
        return Factura::query()
            ->where('user_id', $comercioId)
            ->where('status', 'confirmed')
            ->when($inicio, fn ($q) => $q->where('confirmed_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('confirmed_at', '<=', $fin))
            ->when($productoId, fn ($q) => $q->whereHas('items', fn ($i) => $i->where('product_id', $productoId)))
            ->with(['items:id,factura_id,product_name,qty,unit_price_usd,cost_price,profit_usd'])
            ->orderByDesc('confirmed_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Factura $factura) => [
                'id' => $factura->id,
                'client_name' => $factura->client_name,
                'confirmed_at' => $factura->confirmed_at?->toIso8601String(),
                'total_usd' => (float) $factura->total_usd,
                'subtotal_usd' => (float) $factura->subtotal_usd,
                'shipping_usd' => (float) $factura->shipping_usd,
                'cost_usd' => round($factura->items->sum(fn ($i) => (float) $i->cost_price * $i->qty), 2),
                'profit_usd' => (float) $factura->profit_usd,
                // El margen se mide sobre la mercancía: el envío no es ganancia
                'margin' => $factura->subtotal_usd > 0
                    ? round(($factura->profit_usd / $factura->subtotal_usd) * 100, 1)
                    : 0,
                'items' => $factura->items->map(fn ($i) => [
                    'product_name' => $i->product_name,
                    'qty' => $i->qty,
                    'unit_price_usd' => (float) $i->unit_price_usd,
                    'cost_price' => (float) ($i->cost_price ?? 0),
                    'profit_usd' => (float) $i->profit_usd,
                ])->values(),
            ]);
    }

    private function ajustes(int $comercioId, ?Carbon $inicio, ?Carbon $fin, ?int $productoId)
    {
        return ProductAdjustment::query()
            ->where('user_id', $comercioId)
            ->when($productoId, fn ($q) => $q->where('product_id', $productoId))
            ->when($inicio, fn ($q) => $q->where('created_at', '>=', $inicio))
            ->when($fin, fn ($q) => $q->where('created_at', '<=', $fin))
            ->with('product:id,name')
            ->latest()
            ->limit(200)
            ->get();
    }

    /**
     * Años con movimiento, para el selector. Una consulta por tabla, no la
     * tabla entera en memoria como antes.
     *
     * @return list<int>
     */
    public function anosConMovimiento(int $comercioId): array
    {
        $anos = collect();

        $anos = $anos->merge(
            Factura::where('user_id', $comercioId)
                ->whereNotNull('confirmed_at')
                ->selectRaw('DISTINCT ' . $this->ano('confirmed_at') . ' as ano')
                ->pluck('ano')
        );

        $anos = $anos->merge(
            ProductAdjustment::where('user_id', $comercioId)
                ->selectRaw('DISTINCT ' . $this->ano('created_at') . ' as ano')
                ->pluck('ano')
        );

        $anos = $anos->merge([now()->year, now()->year - 1]);

        return $anos->filter()->map(fn ($ano) => (int) $ano)->unique()->sort()->values()->all();
    }

    /** YEAR() en MySQL, strftime en sqlite (las pruebas). */
    private function ano(string $columna): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "CAST(strftime('%Y', {$columna}) AS INTEGER)"
            : "YEAR({$columna})";
    }
}
