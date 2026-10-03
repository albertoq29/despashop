<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class Factura extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'user_id', 'client_name', 'client_phone', 'status',
        'subtotal_usd', 'discount_usd', 'shipping_usd', 'total_usd', 'total_bs',
        'bcv_rate', 'notes', 'confirmed_at', 'profit_usd', 'has_delivery',
        'show_variants_in_receipt', 'has_delivery_fee', 'delivery_bs',
    ];

    protected $casts = [
        'confirmed_at'             => 'datetime',
        'subtotal_usd'             => 'float',
        'discount_usd'             => 'float',
        'shipping_usd'             => 'float',
        'total_usd'                => 'float',
        'total_bs'                 => 'float',
        'bcv_rate'                 => 'float',
        'profit_usd'               => 'float',
        'has_delivery'             => 'boolean',
        'show_variants_in_receipt' => 'boolean',
        'has_delivery_fee'         => 'boolean',
        'delivery_bs'              => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(FacturaItem::class);
    }

    public function delivery()
    {
        return $this->hasOne(Delivery::class);
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isPendingVariants(): bool
    {
        return $this->status === 'pending_variants';
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function canEdit(): bool
    {
        return in_array($this->status, ['draft', 'pending_variants']);
    }

    public function supplements()
    {
        return $this->belongsToMany(Supplement::class, 'factura_supplements')
                    ->withPivot('qty')
                    ->withTimestamps();
    }
}
