<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceTemplate extends Model
{
    use HasFactory, BelongsToTenant, GestionaArchivos;

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['logo_path', 'signature_path'];

    protected $guarded = ['id'];

    protected $appends = ['logo_url', 'signature_url'];

    protected function casts(): array
    {
        return [
            'visible_columns' => 'array',
            'show_logo' => 'boolean',
            'use_catalog_logo' => 'boolean',
            'zebra_rows' => 'boolean',
            'watermark_enabled' => 'boolean',
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        // Con use_catalog_logo activo la factura hereda el logo del catálogo
        if ($this->use_catalog_logo) {
            $themeLogo = CatalogTheme::withoutGlobalScope('tenant')
                ->where('user_id', $this->user_id)
                ->value('logo_path');

            if ($themeLogo) {
                return asset('storage/' . $themeLogo);
            }
        }

        return $this->logo_path ? asset('storage/' . $this->logo_path) : null;
    }

    public function getSignatureUrlAttribute(): ?string
    {
        return $this->signature_path ? asset('storage/' . $this->signature_path) : null;
    }
}
