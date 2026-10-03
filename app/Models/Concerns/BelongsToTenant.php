<?php

namespace App\Models\Concerns;

use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Aísla el modelo por comercio: filtra las consultas al tenant activo y
 * rellena user_id al crear. Ver App\Support\Tenancy.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = app(Tenancy::class)->id();

            if ($tenantId !== null) {
                $builder->where($builder->getModel()->getTable().'.user_id', $tenantId);
            }
        });

        static::creating(function ($model) {
            if ($model->user_id === null) {
                $model->user_id = app(Tenancy::class)->id();
            }
        });
    }

    public function scopeOfTenant(Builder $query, int $tenantId): Builder
    {
        return $query->withoutGlobalScope('tenant')
            ->where($query->getModel()->getTable().'.user_id', $tenantId);
    }

    public function scopeAcrossTenants(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
