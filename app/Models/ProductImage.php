<?php

namespace App\Models;

use App\Models\Concerns\GestionaArchivos;

use App\Support\Archivos;
use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    use GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['image_path'];

    /** Ver Product::archivoEnUso: las facturas emitidas conservan su imagen. */
    public function archivoEnUso(string $ruta): bool
    {
        return FacturaItem::where('product_image_path', $ruta)->exists();
    }

    protected $fillable = ['product_id', 'image_path'];
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

    /** Versión liviana para rejillas y miniaturas de la galería. */
    public function getThumbUrlAttribute(): ?string
    {
        return Archivos::urlMiniatura($this->image_path);
    }
}
