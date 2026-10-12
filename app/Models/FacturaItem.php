<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacturaItem extends Model
{
    protected $fillable = [
        'factura_id', 'product_id', 'product_variant_id', 'combo_id', 'product_name', 'product_image_path',
        'price_type', 'unit_price_usd', 'cost_price', 'qty', 'subtotal_usd', 'profit_usd',
        'renueva_el', 'renovaciones', 'renovado_el',
    ];

    protected $casts = [
        'unit_price_usd' => 'float',
        'cost_price'     => 'float',
        'subtotal_usd'   => 'float',
        'profit_usd'     => 'float',
        'qty'            => 'integer',
        'renueva_el'     => 'date',
        'renovaciones'   => 'integer',
        'renovado_el'    => 'datetime',
    ];

    /**
     * Los renglones que son una suscripción con fecha de renovación.
     *
     * Se pide la factura y el producto porque el listado de renovaciones
     * necesita saber de quién es y qué servicio: un renglón suelto no dice
     * a quién hay que cobrarle.
     */
    public function scopeConRenovacion($query)
    {
        return $query->whereNotNull('renueva_el')
            ->whereHas('factura', fn ($q) => $q->where('status', 'confirmed'))
            ->orderBy('renueva_el');
    }

    /** Días que faltan para renovar; negativo si ya pasó. */
    public function diasParaRenovar(): ?int
    {
        return $this->renueva_el === null
            ? null
            : (int) now()->startOfDay()->diffInDays($this->renueva_el->copy()->startOfDay(), false);
    }

    /**
     * Adelanta la fecha al siguiente período.
     *
     * Se cuenta desde la fecha que tocaba y no desde hoy: a quien renueva
     * con tres días de retraso no se le regalan tres días, y el día del mes
     * se mantiene. `addMonthsNoOverflow` evita que un 31 de enero termine
     * en marzo.
     */
    public function renovar(int $meses): void
    {
        if ($this->renueva_el === null || $meses < 1) {
            return;
        }

        $this->forceFill([
            'renueva_el' => $this->renueva_el->copy()->addMonthsNoOverflow($meses),
            'renovaciones' => (int) $this->renovaciones + 1,
            'renovado_el' => now(),
        ])->save();
    }

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function combo()
    {
        return $this->belongsTo(Combo::class);
    }
}
