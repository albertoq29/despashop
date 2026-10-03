<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplement extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'stock',
        'cost_price',
        'total_purchased',
    ];

    protected $appends = ['total_investment'];

    public function getTotalInvestmentAttribute()
    {
        return round(($this->cost_price ?? 0) * ($this->total_purchased ?? 0), 2);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function facturas()
    {
        return $this->belongsToMany(Factura::class, 'factura_supplements')
                    ->withPivot('qty')
                    ->withTimestamps();
    }
}
