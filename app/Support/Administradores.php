<?php

namespace App\Support;

use App\Models\Setting;
use App\Models\User;

/**
 * A quién se le avisa de lo que pasa en la plataforma.
 *
 * Un aviso que no llega a nadie es peor que no mandarlo: hace creer que el
 * sistema está vigilando cuando no lo está. Por eso siempre hay un segundo
 * camino — si no hay una dirección configurada, se avisa a todos los
 * administradores.
 */
class Administradores
{
    /**
     * Correos a los que mandar un aviso de administración.
     *
     * @param  string|null  $ajuste  Clave de un ajuste de plataforma con una
     *                               dirección preferida (por ejemplo `security_email`)
     * @return list<string>
     */
    public static function correos(?string $ajuste = null): array
    {
        if ($ajuste) {
            $configurado = (string) Setting::platform($ajuste, '');

            if (filter_var($configurado, FILTER_VALIDATE_EMAIL)) {
                return [$configurado];
            }
        }

        return User::where('role', User::ROLE_ADMIN)
            ->whereNotNull('email')
            ->pluck('email')
            ->all();
    }
}
