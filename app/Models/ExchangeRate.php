<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tasas de cambio. A diferencia del resto de tablas del comercio, aquí
 * user_id NULL significa "tasa del sistema" (el BCV que sirve de respaldo
 * para todos), así que cada comercio ve sus propias tasas más las globales.
 */
class ExchangeRate extends Model
{
    use HasFactory;

    protected $table = 'exchange_rates';

    // Solo la tasa oficial del BCV: el paralelo se retiró de la plataforma
    protected $fillable = [
        'user_id',
        'bcv',
    ];

    protected $casts = [
        'bcv' => 'decimal:4',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = app(Tenancy::class)->id();

            if ($tenantId !== null) {
                $builder->where(function ($query) use ($tenantId) {
                    $query->where('exchange_rates.user_id', $tenantId)
                        ->orWhereNull('exchange_rates.user_id');
                });
            }
        });

        static::creating(function (ExchangeRate $rate) {
            if ($rate->user_id === null) {
                $rate->user_id = app(Tenancy::class)->id();
            }
        });

        static::saved(fn () => static::olvidarVigente());
        static::deleted(fn () => static::olvidarVigente());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Memoria de la tasa vigente por tenant, para el alcance de esta petición. */
    protected static array $vigentePorTenant = [];

    /** Última tasa visible para el comercio: la propia manda sobre la del sistema. */
    public static function current(): ?self
    {
        return self::orderByRaw('user_id IS NULL')
            ->latest('created_at')
            ->first();
    }

    /**
     * Igual que current(), pero cacheada durante la petición.
     *
     * Los accesores de precio en bolívares corren una vez por producto y por
     * campo; sin esto, un catálogo de 100 productos dispara cientos de
     * consultas idénticas para la misma tasa.
     */
    public static function vigente(): ?self
    {
        $clave = app(Tenancy::class)->id() ?? 0;

        if (! array_key_exists($clave, static::$vigentePorTenant)) {
            static::$vigentePorTenant[$clave] = static::current();
        }

        return static::$vigentePorTenant[$clave];
    }

    /** Se limpia al registrar una tasa nueva para no servir la anterior. */
    public static function olvidarVigente(): void
    {
        static::$vigentePorTenant = [];
    }
}
