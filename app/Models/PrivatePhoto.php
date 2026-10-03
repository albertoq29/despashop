<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;
use Illuminate\Database\Eloquent\Model;

class PrivatePhoto extends Model
{
    use BelongsToTenant, GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['file_path'];

    protected $fillable = ['product_id', 'user_id', 'name', 'file_path', 'mime_type', 'size'];
    protected $appends = ['url'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getUrlAttribute()
    {
        return $this->file_path
            ? asset('storage/' . $this->file_path)
            : null;
    }
}
