<?php

namespace App\Listeners;

use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\Seguridad\RegistroDeSeguridad;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\PasswordReset;

/**
 * Vigila el acceso a las cuentas.
 *
 * Un error de contraseña no es un ataque: se anota con gravedad baja y se
 * agrupa. Lo que sí importa es el patrón (muchos fallos desde una misma IP)
 * y el acceso desde una IP que esa cuenta nunca había usado.
 */
class VigilarAutenticacion
{
    public function __construct(private RegistroDeSeguridad $registro)
    {
    }

    public function fallido(Failed $evento): void
    {
        // Del intento solo se guarda el correo: la contraseña tecleada no se
        // escribe en ningún registro, ni siquiera fallida.
        $correo = (string) ($evento->credentials['email'] ?? '');
        $existe = $evento->user !== null;

        $this->registro->reportar(
            'login.fallido',
            $existe
                ? "Contraseña incorrecta para {$correo}"
                : "Intento de acceso con un correo que no existe: {$correo}",
            ['correo' => $correo, 'la_cuenta_existe' => $existe],
            usuarioId: $existe ? $evento->user->getAuthIdentifier() : null,
        );

        $this->revisarFuerzaBruta($correo);
    }

    public function bloqueado(Lockout $evento): void
    {
        $this->registro->reportar(
            'login.bloqueado',
            'Se frenaron los intentos de acceso de esta dirección por exceso de fallos',
            ['correo' => (string) $evento->request->input('email')],
        );
    }

    public function entro(Login $evento): void
    {
        $usuario = $evento->user;

        if (! $usuario instanceof User) {
            return;
        }

        $ip = request()?->ip();
        $anterior = $usuario->last_login_ip;

        if ($anterior && $ip && $anterior !== $ip) {
            $nombre = $usuario->business_name ?: $usuario->name;

            $this->registro->reportar(
                $usuario->isAdmin() ? 'sesion.admin_ip_nueva' : 'sesion.ip_nueva',
                "{$nombre} entró desde una dirección IP distinta a la anterior",
                ['ip_anterior' => $anterior, 'correo' => $usuario->email],
                usuarioId: $usuario->id,
                comercioId: $usuario->isTenant() ? $usuario->id : null,
            );
        }

        if ($ip && $anterior !== $ip) {
            $usuario->forceFill(['last_login_ip' => $ip])->saveQuietly();
        }
    }

    public function claveRestablecida(PasswordReset $evento): void
    {
        $usuario = $evento->user;

        $this->registro->reportar(
            'clave.restablecida',
            'Se restableció la contraseña de ' . ($usuario->business_name ?: $usuario->name),
            ['correo' => $usuario->email],
            usuarioId: $usuario->id,
            comercioId: $usuario->isTenant() ? $usuario->id : null,
        );
    }

    /**
     * Varios fallos seguidos desde la misma IP dejan de ser un despiste.
     */
    private function revisarFuerzaBruta(string $correo): void
    {
        $ip = request()?->ip();
        $ventana = (int) config('seguridad.ventana_fuerza_bruta');
        $umbral = (int) config('seguridad.umbral_fuerza_bruta');

        $intentos = $this->registro->golpesRecientes('login.fallido', $ip, $ventana);

        if ($intentos < $umbral) {
            return;
        }

        $this->registro->reportar(
            'login.fuerza_bruta',
            "{$intentos} intentos de acceso fallidos desde esta dirección en los últimos {$ventana} minutos",
            ['intentos' => $intentos, 'ultimo_correo' => $correo],
            usuarioId: null,
            severidad: SecurityEvent::ALTA,
        );
    }
}
