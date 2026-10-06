<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Plan extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    /** Lo que mira la web pública: el precio ya con el descuento del día. */
    protected $appends = ['descuento_activo', 'precio_final', 'precio_bs_final'];

    protected function casts(): array
    {
        return [
            'price_usd' => 'decimal:2',
            'price_bs' => 'decimal:2',
            'discount_percent' => 'integer',
            'discount_starts_at' => 'datetime',
            'discount_ends_at' => 'datetime',
            'features' => 'array',
            'allows_custom_domain' => 'boolean',
            'allows_invoice_branding' => 'boolean',
            'allows_catalog_branding' => 'boolean',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Plan $plan) {
            if (blank($plan->slug)) {
                $plan->slug = Str::slug($plan->name);
            }
        });
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function scopePublic($query)
    {
        return $query->where('is_active', true)
            ->where('is_public', true)
            ->orderBy('display_order')
            ->orderBy('price_usd');
    }

    /** null = ilimitado */
    public function allows(string $limit, int $current): bool
    {
        $max = $this->{$limit};

        return $max === null || $current < $max;
    }

    /* ── Descuento programado ──────────────────────────────────────────────── */

    /**
     * Si el descuento corre en este momento.
     *
     * Sin fecha de inicio se entiende que ya empezó; sin fecha de fin, que no
     * termina. Un porcentaje vacío o en cero es «sin descuento» aunque las
     * fechas sigan puestas: así se apaga una promoción sin perder cuándo fue.
     */
    public function descuentoVigente(): bool
    {
        if (! $this->discount_percent) {
            return false;
        }

        $ahora = now();

        return ! ($this->discount_starts_at?->isAfter($ahora) ?? false)
            && ! ($this->discount_ends_at?->isBefore($ahora) ?? false);
    }

    public function getDescuentoActivoAttribute(): bool
    {
        return $this->descuentoVigente();
    }

    /**
     * El precio final, o nada si el plan vino sin precio.
     *
     * Una consulta puede traer solo `id` y `name` —en una relación, por
     * ejemplo— y entonces `price_usd` no existe. Devolver 0 ahí sería
     * anunciar un plan gratis que no lo es.
     */
    public function getPrecioFinalAttribute(): ?float
    {
        return $this->tienePrecio('price_usd') ? $this->conDescuento((float) $this->price_usd) : null;
    }

    public function getPrecioBsFinalAttribute(): ?float
    {
        return $this->tienePrecio('price_bs') ? $this->conDescuento((float) $this->price_bs) : null;
    }

    private function tienePrecio(string $columna): bool
    {
        return array_key_exists($columna, $this->attributes) && $this->attributes[$columna] !== null;
    }

    private function conDescuento(float $precio): float
    {
        return round(
            $this->descuentoVigente() ? $precio * (100 - $this->discount_percent) / 100 : $precio,
            2,
        );
    }
}
