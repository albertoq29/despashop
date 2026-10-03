<?php

namespace App\Support;

use App\Models\User;
use Closure;

/**
 * Contexto de tenant de la petición actual.
 *
 * En esta app un "tenant" es un usuario con rol `tenant`: el dueño de un
 * catálogo. Mientras haya un id vigente, todos los modelos que usen el trait
 * BelongsToTenant quedan filtrados a ese usuario, tanto al leer como al crear.
 *
 * El id se resuelve en dos pasos:
 *
 *  1. Si alguien lo fijó explícitamente (el middleware SetTenantContext, o
 *     forTenant() para inspeccionar otra cuenta), manda ese valor.
 *  2. Si no, se deduce del usuario autenticado.
 *
 * El segundo paso no es un adorno: el enlace implícito de modelos de Laravel
 * (SubstituteBindings) resuelve los parámetros de ruta ANTES de que corra el
 * middleware de la aplicación. Sin este respaldo, un `{banner}` o un
 * `{producto}` se resolverían sin filtrar y un comercio podría tocar los
 * registros de otro pasando su id en la URL.
 */
class Tenancy
{
    protected ?int $tenantId = null;

    /** Distingue "nadie lo ha fijado" de "se fijó a null" (el admin ve todo). */
    protected bool $fijado = false;

    protected bool $enabled = true;

    public function set(?int $tenantId): void
    {
        $this->tenantId = $tenantId;
        $this->fijado = true;
    }

    public function id(): ?int
    {
        if (! $this->enabled) {
            return null;
        }

        if ($this->fijado) {
            return $this->tenantId;
        }

        return $this->desdeLaSesion();
    }

    public function check(): bool
    {
        return $this->id() !== null;
    }

    /**
     * Ejecuta el callback con el contexto apuntando a otro tenant y lo restaura al salir.
     * Lo usa el admin para inspeccionar la cuenta de un comercio.
     */
    public function forTenant(?int $tenantId, Closure $callback): mixed
    {
        $idPrevio = $this->tenantId;
        $fijadoPrevio = $this->fijado;
        $habilitadoPrevio = $this->enabled;

        $this->tenantId = $tenantId;
        $this->fijado = true;
        $this->enabled = true;

        try {
            return $callback();
        } finally {
            $this->tenantId = $idPrevio;
            $this->fijado = $fijadoPrevio;
            $this->enabled = $habilitadoPrevio;
        }
    }

    /**
     * Ejecuta el callback sin ningún filtro por tenant (consultas globales del admin).
     */
    public function withoutTenancy(Closure $callback): mixed
    {
        $habilitadoPrevio = $this->enabled;
        $this->enabled = false;

        try {
            return $callback();
        } finally {
            $this->enabled = $habilitadoPrevio;
        }
    }

    /** Olvida lo fijado; la próxima lectura vuelve a deducirlo de la sesión. */
    public function reset(): void
    {
        $this->tenantId = null;
        $this->fijado = false;
        $this->enabled = true;
    }

    /**
     * Tenant deducido del usuario autenticado.
     *
     * El administrador no es un tenant: para él no se filtra nada salvo que
     * esté inspeccionando una cuenta, y eso lo fija el middleware.
     */
    protected function desdeLaSesion(): ?int
    {
        if (! app()->bound('auth')) {
            return null;
        }

        $user = auth()->user();

        return $user instanceof User && $user->isTenant() ? $user->id : null;
    }
}
