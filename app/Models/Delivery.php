<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $fillable = [
        'factura_id', 'delivery_date', 'status', 'point_a', 'point_b',
    ];

    protected $casts = [
        'delivery_date' => 'datetime',
    ];

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
