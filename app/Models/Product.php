<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Support\Archivos;
use Illuminate\Database\Eloquent\Model;
use App\Models\ExchangeRate;

class Product extends Model
{
    use HasFactory, BelongsToTenant, GestionaArchivos;

    /** Qué vende esta ficha: algo que se entrega o algo que se hace. */
    public const PRODUCTO = 'producto';
    public const SERVICIO = 'servicio';

    /** Dónde se presta un servicio. La clave viaja al catálogo. */
    public const MODALIDADES = [
        'local' => 'En nuestro local',
        'domicilio' => 'A domicilio',
        'remoto' => 'En línea',
        'acordar' => 'A convenir',
    ];

    /** Columnas cuyas rutas hay que borrar del disco al eliminar el registro. */
    protected $columnasDeArchivo = ['image_path'];

    /** Hijos que se eliminan por Eloquent para que limpien sus propios archivos. */
    protected $relacionesConArchivos = ['images', 'variants', 'privatePhotos'];

    /**
     * Cada renglón de factura guarda una copia de la ruta de la imagen del
     * producto. Si alguna factura todavía la apunta, el archivo se conserva:
     * eliminar un producto no debe dejar con la imagen rota a un documento
     * ya emitido.
     */
    public function archivoEnUso(string $ruta): bool
    {
        return FacturaItem::where('product_image_path', $ruta)->exists();
    }

    protected $fillable = [
        'user_id',
        'name',
        'item_type',
        'service_duration',
        'service_mode',
        'price_usdt',
        'price_mayor_usdt',
        'price_distribuidor_usdt',
        'cost_price',
        'inversion_historica',
        'stock',
        'image_path',
        'category_id',
        'conditional_price',
        'conditional_min_quantity',
        'notes',
        'description',
        'is_hidden',
        'por_llegar',
        'show_variants_in_store',
        'display_order',
        'last_units',
    ];

    protected $casts = [
        'is_hidden'              => 'boolean',
        'por_llegar'             => 'boolean',
        'show_variants_in_store' => 'boolean',
        'last_units'             => 'boolean',
        'inversion_historica'    => 'float',
    ];

    protected $appends = ['image_url', 'thumb_url', 'price_bs', 'price_mayor_bs', 'price_distribuidor_bs', 'price_ref', 'conditional_price_bs'];

    public function getImageUrlAttribute()
    {
        return $this->image_path
            ? asset('storage/' . $this->image_path)
            : null;
    }

    /** Versión liviana para rejillas y listas; la completa se abre aparte. */
    public function getThumbUrlAttribute(): ?string
    {
        return Archivos::urlMiniatura($this->image_path);
    }

    public function getPriceBsAttribute()
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->price_usdt) return 0;
        return round($this->price_usdt * $rate->bcv, 2);
    }

    public function getPriceMayorBsAttribute()
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->price_mayor_usdt) return 0;
        return round($this->price_mayor_usdt * $rate->bcv, 2);
    }

    public function getPriceDistribuidorBsAttribute()
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->price_distribuidor_usdt) return 0;
        return round($this->price_distribuidor_usdt * $rate->bcv, 2);
    }

    public function getConditionalPriceBsAttribute()
    {
        $rate = ExchangeRate::vigente();
        if (!$rate || $rate->bcv <= 0 || !$this->conditional_price) return 0;
        return round($this->conditional_price * $rate->bcv, 2);
    }

    public function getPriceRefAttribute()
    {
        return $this->price_usdt;
    }

    // ── Servicios ──────────────────────────────────────────────────────────────

    public function esServicio(): bool
    {
        return $this->item_type === self::SERVICIO;
    }

    /** Texto listo para el catálogo: "45 min · A domicilio". */
    public function detalleDelServicio(): ?string
    {
        if (! $this->esServicio()) {
            return null;
        }

        return collect([$this->service_duration, self::MODALIDADES[$this->service_mode] ?? null])
            ->filter()
            ->implode(' · ') ?: null;
    }

    public function scopeServicios($query)
    {
        return $query->where('item_type', self::SERVICIO);
    }

    public function scopeProductos($query)
    {
        return $query->where('item_type', self::PRODUCTO);
    }

    /** Un servicio no se agota: no lleva existencias. */
    public function scopeDelTipo($query, string $tipo)
    {
        return $tipo === self::SERVICIO ? $query->servicios() : $query->productos();
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    /**
     * Fichero de fotos privadas del producto: no se publican en el catálogo,
     * solo las ve el comercio desde su panel.
     */
    public function privatePhotos()
    {
        return $this->hasMany(PrivatePhoto::class);
    }

    /**
     * Variants (colors, fragrances, types) of this product.
     */
    public function variants()
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Combos that include this product.
     */
    public function combos()
    {
        return $this->belongsToMany(Combo::class, 'combo_items');
    }
}