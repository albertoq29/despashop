<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Una entrada de mercancía: cuántas unidades y a qué costo.
 *
 * Es el libro del que sale la inversión de cada producto. Nunca se escribe
 * a mano desde un controlador: todo pasa por App\Services\Ganancias\LibroDeCompras,
 * que además mantiene al día el total en caché del producto.
 */
class ProductPurchase extends Model
{
    use BelongsToTenant;

    /** De dónde salió la entrada. */
    public const ALTA = 'alta';                 // el producto nació con stock
    public const REPOSICION = 'reposicion';     // entró mercancía y se registró con su costo
    public const AJUSTE = 'ajuste';             // le subieron el stock a mano, sin registrar la compra
    public const CORRECCION = 'correccion';     // le bajaron el stock a mano
    public const MANUAL = 'manual';             // el comercio registró una compra
    public const INICIAL = 'inicial';           // lo que ya estaba antes del libro
    public const RESTAURADO = 'restaurado';     // vino de un respaldo

    /** @var array<string, string> */
    public const ORIGENES = [
        self::ALTA => 'Carga inicial del producto',
        self::REPOSICION => 'Reposición registrada',
        self::AJUSTE => 'Ajuste de inventario',
        self::CORRECCION => 'Corrección de inventario',
        self::MANUAL => 'Compra registrada',
        self::INICIAL => 'Inventario anterior al registro',
        self::RESTAURADO => 'Restaurado de un respaldo',
    ];

    protected $fillable = [
        'user_id', 'product_id', 'qty', 'unit_cost', 'total_cost', 'origin', 'note', 'purchased_at',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'unit_cost' => 'float',
            'total_cost' => 'float',
            'purchased_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function scopeHasta(Builder $query, ?\DateTimeInterface $fecha): Builder
    {
        return $fecha ? $query->where('purchased_at', '<=', $fecha) : $query;
    }

    public function scopeDesde(Builder $query, ?\DateTimeInterface $fecha): Builder
    {
        return $fecha ? $query->where('purchased_at', '>=', $fecha) : $query;
    }

    public function etiquetaDeOrigen(): string
    {
        return self::ORIGENES[$this->origin] ?? $this->origin;
    }
}
