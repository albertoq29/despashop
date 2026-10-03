<?php

namespace App\Models;

use App\Models\Concerns\GestionaArchivos;
use App\Support\Archivos;

use Illuminate\Database\Eloquent\Model;

class ComboImage extends Model
{
    use GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['image_path'];

    protected $fillable = ['combo_id', 'image_path'];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
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

    public function combo()
    {
        return $this->belongsTo(Combo::class);
    }
}
