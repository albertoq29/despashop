<?php

namespace App\Http\Middleware;

use App\Support\Tenancy;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fija el tenant de la petición. Sin esto, los modelos con BelongsToTenant
 * no filtran nada, así que toda ruta de comercio debe pasar por aquí.
 *
 * El admin puede inspeccionar la cuenta de un comercio: mientras tenga
 * `impersonating_tenant` en sesión, ve la app con los datos de ese comercio.
 */
class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $tenancy = app(Tenancy::class);

        if ($user->isAdmin()) {
            $tenancy->set($request->session()->get('impersonating_tenant'));
        } else {
            $tenancy->set($user->id);
        }

        // Tenancy es un singleton: si el contexto sobrevive a la petición, la
        // siguiente que atienda el mismo proceso (un worker de colas, Octane o
        // las pruebas) resolvería sus modelos con el tenant anterior.
        try {
            return $next($request);
        } finally {
            $tenancy->reset();
        }
    }
}
