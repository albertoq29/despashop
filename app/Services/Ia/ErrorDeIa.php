<?php

namespace App\Services\Ia;

use RuntimeException;

/**
 * Error del asistente con un mensaje que se le puede mostrar al comercio.
 *
 * El mensaje técnico (lo que respondió Groq) queda en `getPrevious()` o en
 * el registro; al comercio le llega solo una explicación entendible.
 */
class ErrorDeIa extends RuntimeException
{
    public function __construct(
        string $mensaje,
        public readonly int $estadoHttp = 503,
        public readonly bool $cuenta = false,
        ?\Throwable $anterior = null,
    ) {
        parent::__construct($mensaje, 0, $anterior);
    }

    public static function saturada(): self
    {
        return new self('La IA está atendiendo muchas solicitudes en este momento. Intenta de nuevo en un minuto.', 503);
    }

    public static function noDisponible(): self
    {
        return new self('El asistente de IA no está disponible por ahora.', 503);
    }

    public static function fallo(?\Throwable $anterior = null): self
    {
        return new self('No pudimos generar la propuesta. Intenta de nuevo en un momento; este intento no cuenta para tu límite.', 502, false, $anterior);
    }
}
