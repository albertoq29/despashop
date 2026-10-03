<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Support\Archivos;
use Illuminate\Database\Eloquent\Model;
use App\Models\ExchangeRate;

class Combo extends Model
{
    use HasFactory, BelongsToTenant, GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['image_path'];

    /** Hijos que se eliminan por Eloquent para que limpien sus propios archivos. */
    protected $relacionesConArchivos = ['images'];

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'notes',
        'price_usdt',
        'price_type',
        'price_mayor_usdt',
        'price_distribuidor_usdt',
        'cost_price',
        'conditional_price',
        'conditional_min_quantity',
        'stock',
        'image_path',
        'is_hidden',
    ];

    protected $casts = [
        'is_hidden' => 'boolean',
    ];

    protected $appends = ['image_url', 'price_bs', 'price_mayor_bs', 'price_distribuidor_bs'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? asset('storage/' . $this->image_path)
            : null;
    }

    /** Versión liviana para rejillas y listas. */
    public function getThumbUrlAttribute(): ?string
    {
        return Archivos::urlMiniatura($this->image_path);
    }

    public function getPriceBsAttribute(): float
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->price_usdt) return 0;
        return round($this->price_usdt * $rate->bcv, 2);
    }

    public function getPriceMayorBsAttribute(): float
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->price_mayor_usdt) return 0;
        return round($this->price_mayor_usdt * $rate->bcv, 2);
    }

    public function getPriceDistribuidorBsAttribute(): float
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->price_distribuidor_usdt) return 0;
        return round($this->price_distribuidor_usdt * $rate->bcv, 2);
    }

    /**
     * Products that form this combo.
     */
    public function products()
    {
        return $this->belongsToMany(Product::class, 'combo_items')
                    ->withPivot('price_type')
                    ->with(['images']);
    }

    /**
     * Gallery images of the combo itself.
     */
    public function images()
    {
        return $this->hasMany(ComboImage::class);
    }
}
