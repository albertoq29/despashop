<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Las cuentas se revisan a mano: mientras la solicitud esté pendiente,
 * rechazada o suspendida, el comercio solo ve la pantalla de estado.
 */
class EnsureAccountIsApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isAdmin() || $user->isApproved()) {
            return $next($request);
        }

        return redirect()->route('cuenta.estado');
    }
}
