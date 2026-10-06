<?php

namespace App\Http\Middleware;

use App\Support\Tenancy;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deja pasar al panel solo a quien tiene un comercio detrás.
 *
 * Para el comercio es su propia cuenta, y mientras la solicitud esté
 * pendiente, rechazada o suspendida solo ve la pantalla de estado.
 *
 * Para el administrador es el comercio que esté inspeccionando. Sin uno
 * elegido no hay a quién pertenece nada: las listas saldrían mezcladas de
 * todos los comercios y lo que creara se guardaría sin dueño —que es como
 * se descubrió, con un error 500 al guardar una factura—. Así que se le
 * manda a elegir en vez de dejarlo entrar a medias.
 */
class EnsureAccountIsApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->isAdmin()) {
            if (app(Tenancy::class)->id() !== null) {
                return $next($request);
            }

            return redirect()->route('admin.comercios.index')->with(
                'info',
                'Para ver el panel de un comercio entra primero a su cuenta desde su ficha.',
            );
        }

        return $user->isApproved() ? $next($request) : redirect()->route('cuenta.estado');
    }
}
