<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogBanner extends Model
{
    use HasFactory, BelongsToTenant, GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['image_path', 'image_mobile_path'];

    protected $guarded = ['id'];

    protected $appends = ['image_url', 'image_mobile_url'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

    public function getImageMobileUrlAttribute(): ?string
    {
        return $this->image_mobile_path ? asset('storage/' . $this->image_mobile_path) : null;
    }

    /** Activos y dentro de su ventana de fechas */
    public function scopeLive($query)
    {
        $now = now();

        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now))
            ->orderBy('display_order');
    }
}
