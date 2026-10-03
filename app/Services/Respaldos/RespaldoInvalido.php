<?php

namespace App\Services\Respaldos;

use RuntimeException;

/**
 * El archivo que subieron no sirve como respaldo.
 *
 * El mensaje está escrito para que lo lea el comercio, no un programador:
 * se muestra tal cual en la pantalla.
 */
class RespaldoInvalido extends RuntimeException
{
}
