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
    protected $appends = ['descuento_activo', 'precio_final', 'precio_bs_final', 'es_prueba_gratis', 'cupos_libres'];

    protected function casts(): array
    {
        return [
            'price_usd' => 'decimal:2',
            'price_bs' => 'decimal:2',
            'discount_percent' => 'integer',
            'discount_starts_at' => 'datetime',
            'discount_ends_at' => 'datetime',
            'trial_days' => 'integer',
            'discount_limit' => 'integer',
            'discount_claimed' => 'integer',
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
        if (! $this->discount_percent || $this->cuposAgotados()) {
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

    /* ── Prueba gratis ─────────────────────────────────────────────────────── */

    /**
     * Un descuento del 100% no es un descuento: es regalar el plan.
     *
     * Se trata aparte porque se cuenta distinto. «$0 en vez de $20» no le
     * dice nada a nadie; «prueba gratis 30 días, luego $20» sí.
     */
    public function esPruebaGratis(): bool
    {
        return (int) $this->discount_percent === 100;
    }

    public function getEsPruebaGratisAttribute(): bool
    {
        return $this->esPruebaGratis();
    }

    /** Cuánto dura el período gratis. Sin valor propio, el de la plataforma. */
    public function diasDePrueba(): int
    {
        return $this->trial_days ?: Setting::platformInt('trial_days', (int) config('planes.dias_de_prueba'));
    }

    /**
     * Cupos que quedan, o null si la oferta no se limita por cupos.
     *
     * Nunca da negativo: si alguien baja el tope por debajo de lo ya
     * repartido, la oferta queda cerrada y no debiendo cupos.
     */
    public function getCuposLibresAttribute(): ?int
    {
        if ($this->discount_limit === null) {
            return null;
        }

        return max(0, (int) $this->discount_limit - (int) $this->discount_claimed);
    }

    public function cuposAgotados(): bool
    {
        return $this->cupos_libres === 0;
    }

    /**
     * Aparta un cupo. Devuelve false si ya no quedaba ninguno.
     *
     * La cuenta la hace la base de datos y no PHP: dos aprobaciones a la vez
     * no pueden repartir el mismo cupo, y «los primeros diez» son diez de
     * verdad. Sin tope no hay nada que apartar.
     */
    public function tomarCupo(): bool
    {
        if ($this->discount_limit === null) {
            return true;
        }

        $apartado = static::whereKey($this->getKey())
            ->where('discount_claimed', '<', $this->discount_limit)
            ->increment('discount_claimed');

        if ($apartado === 0) {
            return false;
        }

        $this->discount_claimed = (int) $this->discount_claimed + 1;

        return true;
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
