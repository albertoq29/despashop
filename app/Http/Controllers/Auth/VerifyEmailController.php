<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

/**
 * Confirma la dirección de correo desde el enlace que recibió el comercio.
 *
 * No usa `intended()` a propósito. Quien abre el enlace sin sesión pasa
 * antes por el login, y ahí queda guardada esta misma URL como destino:
 * volver a ella después de verificar mandaba al comercio de rebote a la
 * pantalla que acababa de dejar. Se va a donde le toca por el estado de su
 * cuenta, que es lo único que importa aquí.
 */
class VerifyEmailController extends Controller
{
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        $usuario = $request->user();

        if ($usuario->hasVerifiedEmail()) {
            return redirect()->route($usuario->rutaDeInicio())
                ->with('info', 'Tu correo ya estaba confirmado.');
        }

        if ($usuario->markEmailAsVerified()) {
            event(new Verified($usuario));
        }

        // Si quedó un destino guardado del login, se descarta: apunta a
        // este mismo enlace y provocaría otra vuelta.
        $request->session()->forget('url.intended');

        return redirect()->route($usuario->rutaDeInicio())
            ->with('success', 'Listo, tu correo quedó confirmado.');
    }
}
