<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ProductAdjustment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'user_id', 'product_id', 'type', 'concept', 'qty', 'amount_usd', 'reason', 'adjusts_stock',
    ];

    protected $casts = [
        'qty'           => 'integer',
        'amount_usd'    => 'float',
        'adjusts_stock' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
