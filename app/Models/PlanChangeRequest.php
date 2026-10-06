<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Una solicitud de cambio de plan.
 *
 * El recorrido es: pendiente → aceptada → aplicada. «Aceptada» quiere decir
 * que el administrador dio el sí pero el comercio sigue en su plan actual
 * hasta que renueve; «aplicada», que el cambio ya ocurrió.
 */
class PlanChangeRequest extends Model
{
    use HasFactory;

    public const PENDIENTE = 'pendiente';
    public const ACEPTADA = 'aceptada';
    public const RECHAZADA = 'rechazada';
    public const APLICADA = 'aplicada';
    public const CANCELADA = 'cancelada';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'decided_at' => 'datetime',
            'applied_at' => 'datetime',
        ];
    }

    public function comercio(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function planActual(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'from_plan_id');
    }

    public function planPedido(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'to_plan_id');
    }

    public function decidioEl(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    /** Las que todavía esperan respuesta del administrador. */
    public function scopePendientes($query)
    {
        return $query->where('status', self::PENDIENTE);
    }

    /** Aceptadas pero aún no aplicadas: entran en la próxima renovación. */
    public function scopeEnEspera($query)
    {
        return $query->where('status', self::ACEPTADA);
    }

    /** Mientras no la responda el admin, el comercio puede retirarla. */
    public function esRetirable(): bool
    {
        return $this->status === self::PENDIENTE;
    }

    public function estaAbierta(): bool
    {
        return in_array($this->status, [self::PENDIENTE, self::ACEPTADA], true);
    }
}
