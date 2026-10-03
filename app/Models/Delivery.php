<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $fillable = [
        'factura_id', 'delivery_date', 'status',
    ];

    protected $casts = [
        'delivery_date' => 'datetime',
    ];

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }
}
