<?php

namespace App\Http\Controllers;

use App\Support\Tenancy;

abstract class Controller
{
    /**
     * Comercio dueño de los datos de esta petición.
     *
     * No es lo mismo que auth()->id(): cuando un administrador inspecciona
     * una cuenta, sigue autenticado como él mismo pero debe ver y tocar los
     * datos del comercio observado. Este es el identificador que coincide
     * con el que aplican los modelos a través de BelongsToTenant.
     */
    protected function tenantId(): ?int
    {
        return app(Tenancy::class)->id();
    }
}
