<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    /** La lleva el propio comercio y se entrega en mano. */
    public const PERSONAL = 'personal';

    /** Se manda con alguien, de un punto a otro. */
    public const DELIVERY = 'delivery';

    protected $fillable = [
        'factura_id', 'type', 'delivery_date', 'status', 'point_a', 'point_b',
    ];

    protected $casts = [
        'delivery_date' => 'datetime',
    ];

    public function esDelivery(): bool
    {
        return $this->type === self::DELIVERY;
    }

    public function scopePersonales($query)
    {
        return $query->where('type', self::PERSONAL);
    }

    public function scopeDeliveries($query)
    {
        return $query->where('type', self::DELIVERY);
    }

    /** Si se anotó de dónde sale o a dónde va. */
    public function tienePuntos(): bool
    {
        return filled($this->point_a) || filled($this->point_b);
    }

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }
}
