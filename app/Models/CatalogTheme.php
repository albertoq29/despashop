<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;
use App\Support\SeccionesDelCatalogo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogTheme extends Model
{
    use HasFactory, BelongsToTenant, GestionaArchivos;

    /**
     * Tipografías disponibles. Las usan el editor, los temas rápidos y el
     * asistente de IA: una fuente fuera de esta lista no se puede elegir.
     */
    public const FUENTES = [
        'Inter', 'Outfit', 'Poppins', 'Montserrat', 'Playfair Display',
        'Raleway', 'Lato', 'Nunito', 'Oswald', 'Merriweather', 'Quicksand',
        'Work Sans', 'DM Sans', 'Bebas Neue', 'Cormorant Garamond',
    ];

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['logo_path', 'favicon_path', 'cover_path'];

    protected $guarded = ['id'];

    protected $appends = ['logo_url', 'favicon_url', 'cover_url'];

    protected function casts(): array
    {
        return [
            'logo_palette' => 'array',
            'social_links' => 'array',
            'palette_from_logo' => 'boolean',
            'dark_mode' => 'boolean',
            'show_prices' => 'boolean',
            'show_stock' => 'boolean',
            'show_categories' => 'boolean',
            'show_search' => 'boolean',
            'show_bs_prices' => 'boolean',
            'show_sort' => 'boolean',
            'quick_view' => 'boolean',
            'hero_enabled' => 'boolean',
            'banners_enabled' => 'boolean',
            'banners_autoplay' => 'boolean',
            'banners_arrows' => 'boolean',
            'banners_dots' => 'boolean',
            'marquee_enabled' => 'boolean',
            'header_sticky' => 'boolean',
            'header_nav' => 'boolean',
            'scroll_progress' => 'boolean',
            'animation_stagger' => 'boolean',
            'show_product_badges' => 'boolean',
            'is_published' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Las banderas antiguas siguen a la visibilidad de su bloque, para
        // que nada que todavía las lea muestre algo que el comercio ocultó.
        static::saving(function (CatalogTheme $theme) {
            if (! $theme->isDirty('sections')) {
                return;
            }

            $secciones = $theme->sections;

            $theme->hero_enabled = SeccionesDelCatalogo::esVisible($secciones, 'hero');
            $theme->banners_enabled = SeccionesDelCatalogo::esVisible($secciones, 'banners');
            $theme->marquee_enabled = SeccionesDelCatalogo::esVisible($secciones, 'marquee');
        });
    }

    /**
     * Bloques de la página, siempre normalizados.
     *
     * Un catálogo guardado antes de que existieran las secciones no tiene
     * nada en la columna: se arma el orden por defecto respetando lo que ya
     * tenía encendido o apagado.
     */
    protected function sections(): Attribute
    {
        return Attribute::make(
            get: fn (?string $valor) => SeccionesDelCatalogo::normalizar(
                json_decode($valor ?? '[]', true) ?: [],
                $this->visibilidadHeredada(),
            ),
            set: fn ($valor) => json_encode(
                SeccionesDelCatalogo::normalizar(is_array($valor) ? $valor : [], $this->visibilidadHeredada()),
                JSON_UNESCAPED_UNICODE,
            ),
        );
    }

    /** @return array<string, bool> */
    private function visibilidadHeredada(): array
    {
        return [
            'hero' => (bool) ($this->attributes['hero_enabled'] ?? true),
            'banners' => (bool) ($this->attributes['banners_enabled'] ?? true),
            'marquee' => (bool) ($this->attributes['marquee_enabled'] ?? false),
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? asset('storage/' . $this->logo_path) : null;
    }

    public function getFaviconUrlAttribute(): ?string
    {
        return $this->favicon_path ? asset('storage/' . $this->favicon_path) : null;
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path ? asset('storage/' . $this->cover_path) : null;
    }
}
