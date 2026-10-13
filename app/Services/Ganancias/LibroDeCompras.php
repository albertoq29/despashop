<?php

namespace App\Services\Ganancias;

use App\Models\Product;
use App\Models\ProductPurchase;
use App\Support\UnidadesDeMedida;
use Illuminate\Support\Carbon;

/**
 * Único lugar por donde se registra que entró mercancía.
 *
 * Antes la inversión de un producto era una columna que tres caminos del
 * código escribían con fórmulas distintas. Ahora es la suma de este libro,
 * y la columna `products.inversion_historica` queda solo como total en
 * caché para no sumar el libro entero en cada pantalla.
 *
 * Regla: vender **no** es un movimiento de este libro. Vender cambia el
 * stock y la ganancia, no lo que te costó comprar la mercancía.
 */
class LibroDeCompras
{
    /**
     * Anota una entrada de mercancía.
     *
     * @param  float|null  $costoUnitario  Si no se indica, el costo actual del producto
     */
    public function registrar(
        Product $producto,
        float $cantidad,
        ?float $costoUnitario = null,
        string $origen = ProductPurchase::MANUAL,
        ?string $nota = null,
        ?\DateTimeInterface $fecha = null,
    ): ?ProductPurchase {
        // Comparado contra 0.0: la cantidad puede venir en kilos o litros
        if ($cantidad === 0.0) {
            return null;
        }

        $costo = $costoUnitario ?? (float) ($producto->cost_price ?? 0);

        // Una entrada sin costo no es inversión: no ensucia el libro
        if ($costo <= 0) {
            return null;
        }

        $compra = ProductPurchase::create([
            'user_id' => $producto->user_id,
            'product_id' => $producto->id,
            'qty' => $cantidad,
            'unit_cost' => round($costo, 4),
            'total_cost' => round($cantidad * $costo, 2),
            'origin' => $origen,
            'note' => $nota,
            'purchased_at' => $fecha ? Carbon::instance($fecha) : now(),
        ]);

        $this->recalcular($producto);

        return $compra;
    }

    /**
     * Compara el stock de antes con el de ahora y anota la diferencia.
     *
     * Es el camino de quien escribe el stock a mano al editar el producto:
     * se anota como **ajuste**, no como reposición, porque no sabemos a qué
     * costo entró esa mercancía y hay que valorarla al costo que el
     * producto tiene hoy. Para eso está App\Services\Ganancias\Reposicion,
     * que sí pregunta el costo de la entrada.
     *
     * Bajar el stock a mano es una corrección y se anota en negativo, para
     * que el libro siga cuadrando con la realidad.
     */
    public function ajustarPorStock(Product $producto, float $stockAnterior, float $stockNuevo, ?float $costoUnitario = null): ?ProductPurchase
    {
        $diferencia = round($stockNuevo - $stockAnterior, 3);

        if ($diferencia === 0.0) {
            return null;
        }

        // La nota se lee, así que lleva la unidad: «2,5 kg» y no «2,5 unidades»
        $cuanto = UnidadesDeMedida::formatear(abs($diferencia), $producto->unidad);

        return $this->registrar(
            $producto,
            $diferencia,
            $costoUnitario,
            $diferencia > 0 ? ProductPurchase::AJUSTE : ProductPurchase::CORRECCION,
            $diferencia > 0
                ? "Se subió el inventario en {$cuanto}, al costo del momento"
                : "Se bajó el inventario en {$cuanto}",
        );
    }

    /** Vuelve a sumar el libro y lo deja en la columna del producto. */
    public function recalcular(Product $producto): float
    {
        $total = (float) ProductPurchase::withoutGlobalScope('tenant')
            ->where('product_id', $producto->id)
            ->sum('total_cost');

        $producto->forceFill(['inversion_historica' => round($total, 2)])->saveQuietly();

        return round($total, 2);
    }

    /**
     * Inversión de varios productos de una sola consulta.
     *
     * @param  list<int>  $productos
     * @return array<int, float>  id => invertido
     */
    public function totalesPorProducto(array $productos, ?\DateTimeInterface $hasta = null, ?\DateTimeInterface $desde = null): array
    {
        if ($productos === []) {
            return [];
        }

        return ProductPurchase::query()
            ->whereIn('product_id', $productos)
            ->hasta($hasta)
            ->desde($desde)
            ->selectRaw('product_id, SUM(total_cost) as invertido')
            ->groupBy('product_id')
            ->pluck('invertido', 'product_id')
            ->map(fn ($valor) => round((float) $valor, 2))
            ->all();
    }
}
