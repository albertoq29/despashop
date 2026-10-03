<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacturaItem extends Model
{
    protected $fillable = [
        'factura_id', 'product_id', 'product_variant_id', 'combo_id', 'product_name', 'product_image_path',
        'price_type', 'unit_price_usd', 'cost_price', 'qty', 'subtotal_usd', 'profit_usd',
    ];

    protected $casts = [
        'unit_price_usd' => 'float',
        'cost_price'     => 'float',
        'subtotal_usd'   => 'float',
        'profit_usd'     => 'float',
        'qty'            => 'integer',
    ];

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
