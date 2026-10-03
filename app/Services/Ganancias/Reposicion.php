<?php

namespace App\Services\Ganancias;

use App\Models\Product;
use App\Models\ProductPurchase;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

/**
 * Entra mercancía: cuántas unidades, a qué costo y qué pasa con el costo
 * del producto.
 *
 * Hasta ahora reponer era escribir un número más grande en «Stock
 * disponible». El libro de compras lo anotaba al costo que el producto
 * tenía en ese momento, así que si la mercancía subió de precio la
 * inversión quedaba mal y la ganancia de las ventas siguientes también.
 *
 * Registrar la reposición resuelve las dos cosas: el libro guarda el costo
 * **de esa entrada**, y el costo del producto se puede recalcular como el
 * promedio entre lo que quedaba y lo que acaba de llegar.
 */
class Reposicion
{
    /** Qué hacer con el costo unitario del producto después de la entrada. */
    public const PROMEDIO = 'promedio';
    public const NUEVO = 'nuevo';
    public const MANTENER = 'mantener';

    /** @var array<string, string> */
    public const POLITICAS = [
        self::PROMEDIO => 'Promediar con lo que me quedaba',
        self::NUEVO => 'Usar el costo nuevo',
        self::MANTENER => 'Dejar mi costo como está',
    ];

    public function __construct(private LibroDeCompras $libro)
    {
    }

    /**
     * Anota la entrada, sube el inventario y deja el costo del producto
     * según la política elegida.
     *
     * Si el producto tiene variantes hay que decir a cuál entraron las
     * unidades: su stock es la suma de las variantes, y tocarlo por fuera
     * lo pisaría el siguiente guardado del producto.
     *
     * @return array{compra: ?ProductPurchase, stock_antes: int, stock_despues: int, costo_antes: float, costo_despues: float, invertido: float}
     */
    public function registrar(
        Product $producto,
        int $cantidad,
        float $costoUnitario,
        string $politica = self::PROMEDIO,
        ?int $varianteId = null,
        ?string $nota = null,
        ?\DateTimeInterface $fecha = null,
    ): array {
        return DB::transaction(function () use ($producto, $cantidad, $costoUnitario, $politica, $varianteId, $nota, $fecha) {
            $stockAntes = (int) $producto->stock;
            $costoAntes = (float) ($producto->cost_price ?? 0);

            $compra = $this->libro->registrar(
                $producto,
                $cantidad,
                $costoUnitario,
                ProductPurchase::REPOSICION,
                $nota,
                $fecha,
            );

            $cambios = ['stock' => $stockAntes + $cantidad];

            // Con variantes, el stock del producto es la suma de las suyas
            if ($varianteId !== null) {
                $variante = $producto->variants()->find($varianteId);

                if ($variante instanceof ProductVariant) {
                    $variante->forceFill(['stock' => max(0, (int) $variante->stock + $cantidad)])->save();
                    $cambios['stock'] = (int) $producto->variants()->sum('stock');
                }
            }

            $costoDespues = $this->costoResultante($politica, $stockAntes, $costoAntes, $cantidad, $costoUnitario);

            if ($costoDespues !== null) {
                $cambios['cost_price'] = $costoDespues;
            }

            $producto->forceFill($cambios)->save();

            return [
                'compra' => $compra,
                'stock_antes' => $stockAntes,
                'stock_despues' => (int) $producto->stock,
                'costo_antes' => round($costoAntes, 2),
                'costo_despues' => round((float) ($producto->cost_price ?? 0), 2),
                'invertido' => round($cantidad * $costoUnitario, 2),
            ];
        });
    }

    /**
     * El costo unitario que queda, o null para no tocarlo.
     *
     * El promedio es ponderado: pesa cada lote por sus unidades, que es la
     * forma normal de valorar inventario cuando no se sigue cada unidad por
     * separado. Sin stock viejo (o sin costo viejo) no hay nada que
     * promediar y manda el costo nuevo.
     */
    public function costoResultante(string $politica, int $stockAntes, float $costoAntes, int $cantidad, float $costoNuevo): ?float
    {
        if ($politica === self::MANTENER) {
            return null;
        }

        if ($politica === self::NUEVO || $stockAntes <= 0 || $costoAntes <= 0) {
            return round($costoNuevo, 2);
        }

        $unidades = $stockAntes + $cantidad;

        if ($unidades <= 0) {
            return round($costoNuevo, 2);
        }

        return round((($stockAntes * $costoAntes) + ($cantidad * $costoNuevo)) / $unidades, 2);
    }
}
