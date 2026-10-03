<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un uso del asistente de IA de un comercio.
 */
class AiGeneration extends Model
{
    use BelongsToTenant;

    public const COMPLETADA = 'completada';

    /** La IA o el clasificador dijeron que no: cuenta para el límite. */
    public const RECHAZADA = 'rechazada';

    /** El filtro local la frenó antes de llamar a la IA: no cuenta. */
    public const BLOQUEADA = 'bloqueada';

    /** Falló la IA o la red: no es culpa del comercio, no cuenta. */
    public const FALLIDA = 'fallida';

    /** Estados que gastan cupo diario. */
    public const CUENTAN = [self::COMPLETADA, self::RECHAZADA];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'result' => 'array',
            'inventory_applied_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeQueCuentan(Builder $query): Builder
    {
        return $query->whereIn('status', self::CUENTAN);
    }

    public function scopeDeHoy(Builder $query): Builder
    {
        return $query->where('created_at', '>=', now()->startOfDay());
    }
}
