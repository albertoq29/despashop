<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update(['password' => $validated['password']]);

        // Quien tenga una sesión abierta en otro navegador se quedó con el
        // hash viejo, y AuthenticateSession lo echa en cuanto pida algo. Esta
        // llamada no cambia la contraseña —ya está cambiada— sino que pone al
        // día la cookie de «recuérdame» de este dispositivo, que si no
        // quedaría con el hash de antes y echaría también a quien la cambió.
        Auth::logoutOtherDevices($validated['password']);

        return back()->with('status', 'Contraseña actualizada. Cerramos las sesiones abiertas en otros dispositivos.');
    }
}
