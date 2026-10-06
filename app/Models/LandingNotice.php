<?php

namespace App\Models;

use App\Models\Concerns\GestionaArchivos;
use App\Support\Archivos;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Aviso flotante de la página de bienvenida.
 *
 * A diferencia de las ventanas del catálogo de un comercio, este es de la
 * plataforma: no lleva tenant ni global scope. Lo escribe el administrador
 * y lo ve cualquiera que entre a la portada.
 */
class LandingNotice extends Model
{
    use HasFactory, GestionaArchivos;

    /** Columnas cuyos archivos hay que borrar del disco al eliminar la fila. */
    protected $columnasDeArchivo = ['image_path'];

    protected $guarded = ['id'];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'delay_seconds' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return Archivos::url($this->image_path);
    }

    /**
     * Los que de verdad deben salir hoy.
     *
     * Sin fecha de inicio ya corre; sin fecha de fin no termina. Un aviso
     * desactivado nunca sale, aunque sus fechas estén vigentes.
     */
    public function scopeVigentes($query)
    {
        $ahora = now();

        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $ahora))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $ahora))
            ->orderBy('display_order')
            ->orderBy('id');
    }
}
