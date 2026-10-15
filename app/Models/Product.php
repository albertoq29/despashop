<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;
use App\Support\UnidadesDeMedida;

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
        'price_divisa_usdt',
        'price_mayor_divisa_usdt',
        'price_distribuidor_divisa_usdt',
        'es_suscripcion',
        'periodo_suscripcion',
        'cost_price',
        'inversion_historica',
        'stock',
        'unidad',
        'controla_stock',
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
        'es_suscripcion'         => 'boolean',
        'controla_stock'         => 'boolean',
        'inversion_historica'    => 'float',
        'stock'                  => 'float',
    ];

    /**
     * Los niveles de precio, cada uno con su versión en divisas.
     *
     * La de divisas no es el precio convertido: es otro precio, más bajo,
     * para quien paga en efectivo en divisas. Quien compra al mayor y paga
     * así tampoco paga lo mismo que quien compra al mayor en bolívares, de
     * ahí que haya uno por nivel.
     */
    public const NIVELES = [
        'detal' => ['price_usdt', 'price_divisa_usdt'],
        'mayor' => ['price_mayor_usdt', 'price_mayor_divisa_usdt'],
        'distribuidor' => ['price_distribuidor_usdt', 'price_distribuidor_divisa_usdt'],
    ];

    /** Cada cuánto se renueva una suscripción, en meses. */
    public const PERIODOS = [
        'mensual' => 1,
        'trimestral' => 3,
        'semestral' => 6,
        'anual' => 12,
    ];

    protected $appends = ['image_url', 'thumb_url', 'price_bs', 'price_mayor_bs', 'price_distribuidor_bs', 'price_ref', 'conditional_price_bs', 'unidad_corta', 'admite_fraccion', 'lleva_existencias'];

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

    // ── Precios por nivel y en divisas ─────────────────────────────────────────

    /**
     * El precio de un nivel, en divisas si se pide y lo tiene.
     *
     * Un nivel sin precio en divisas se cobra normal: la promo es opcional
     * y por nivel, así que pedirla no puede dejar el renglón sin precio.
     */
    public function precioDe(string $nivel, bool $enDivisas = false): ?float
    {
        [$normal, $divisa] = self::NIVELES[$nivel] ?? self::NIVELES['detal'];

        if ($enDivisas && $this->{$divisa} !== null) {
            return (float) $this->{$divisa};
        }

        return $this->{$normal} === null ? null : (float) $this->{$normal};
    }

    /** Si este nivel tiene promo en divisas. */
    public function tienePromoEnDivisas(string $nivel = 'detal'): bool
    {
        [, $divisa] = self::NIVELES[$nivel] ?? self::NIVELES['detal'];

        return $this->{$divisa} !== null;
    }

    // ── Suscripciones ──────────────────────────────────────────────────────────

    /* ── Unidad de medida ───────────────────────────────────────────────── */

    /** La abreviatura que acompaña a los números: «kg», «L», «u». */
    public function getUnidadCortaAttribute(): string
    {
        return UnidadesDeMedida::de($this->unidad)['corto'];
    }

    /** Si se puede vender una parte: medio kilo sí, media caja no. */
    public function getAdmiteFraccionAttribute(): bool
    {
        return UnidadesDeMedida::admiteFraccion($this->unidad);
    }

    public function getLlevaExistenciasAttribute(): bool
    {
        return $this->llevaExistencias();
    }

    /** Se vende de a piezas enteras, que es el caso de siempre. */
    public function sePorUnidad(): bool
    {
        return UnidadesDeMedida::normalizar($this->unidad) === UnidadesDeMedida::POR_DEFECTO;
    }

    /** Las existencias como se leen: «2,5 kg», «12 u». */
    public function existenciaLegible(): string
    {
        return UnidadesDeMedida::formatear($this->stock, $this->unidad);
    }

    /** Un servicio por suscripción tiene período; sin él no se puede renovar. */
    public function esSuscripcion(): bool
    {
        return (bool) $this->es_suscripcion && $this->mesesDelPeriodo() > 0;
    }

    public function mesesDelPeriodo(): int
    {
        return self::PERIODOS[$this->periodo_suscripcion] ?? 0;
    }

    // ── Servicios ──────────────────────────────────────────────────────────────

    public function esServicio(): bool
    {
        return $this->item_type === self::SERVICIO;
    }

    /**
     * Si a este artículo se le lleva la cuenta.
     *
     * Un servicio nunca; un producto, solo si el comercio quiso. El pan que
     * se hornea cada mañana no se cuenta: contarlo lo único que logra es
     * que el catálogo lo muestre agotado y la factura se niegue a venderlo.
     */
    public function llevaExistencias(): bool
    {
        return ! $this->esServicio() && $this->controla_stock !== false;
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