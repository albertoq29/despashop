<?php

namespace App\Models;

use App\Models\Concerns\GestionaArchivos;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['image_path'];

    protected $fillable = [
        'product_id',
        'label',
        'type',
        'stock',
        'image_path',
        'sort_order',
    ];

    protected $casts = [
        'stock' => 'integer',
    ];

    protected $appends = ['image_url'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getImageUrlAttribute()
    {
        return $this->image_path
            ? asset('storage/' . $this->image_path)
            : null;
    }
}
