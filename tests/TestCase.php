<?php

namespace Tests;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Cambiar de usuario arranca una sesión nueva.
     *
     * `AuthenticateSession` ata la sesión a la contraseña con la que se
     * abrió. En la vida real cada usuario trae su propio navegador, pero una
     * prueba que llama a `actingAs` dos veces reutiliza la misma sesión: la
     * del segundo usuario llegaría con el hash del primero y el middleware la
     * cerraría, que es exactamente para lo que está.
     *
     * Limpiar aquí deja a las pruebas hablando de personas distintas sin
     * tener que acordarse de esto en cada una.
     */
    public function actingAs(Authenticatable $user, $guard = null)
    {
        if (auth($guard)->id() !== $user->getAuthIdentifier()) {
            $this->flushSession();
        }

        return parent::actingAs($user, $guard);
    }
}
