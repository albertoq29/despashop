<?php

namespace App\Support;

/**
 * Números de WhatsApp como los entiende WhatsApp.
 *
 * Aquí los números se anotan con el cero de adelante —«0424 123 4567»—
 * porque es así como se marcan dentro del país. Pero ese cero es el
 * prefijo de larga distancia nacional, no parte del número, y WhatsApp no
 * lo acepta: el enlace abre un chat con un número que no existe.
 *
 * El mismo criterio que `resources/js/utils/whatsapp.js`, porque los
 * enlaces se arman en los dos lados: en el catálogo y en los correos.
 */
class Whatsapp
{
    /** Código de Venezuela, el único país donde opera la plataforma. */
    public const PAIS = '58';

    public static function numero(?string $valor): string
    {
        $digitos = preg_replace('/\D/', '', (string) $valor);

        // El 00 de las llamadas internacionales ya trae el país detrás:
        // tomarlo por el cero local rompería un número que funcionaba.
        if (str_starts_with($digitos, '00')) {
            return substr($digitos, 2);
        }

        return str_starts_with($digitos, '0')
            ? self::PAIS . substr($digitos, 1)
            : $digitos;
    }

    /** El enlace completo, con su mensaje si lleva uno. */
    public static function enlace(?string $valor, string $mensaje = ''): string
    {
        $enlace = 'https://wa.me/' . self::numero($valor);

        return $mensaje === '' ? $enlace : $enlace . '?text=' . rawurlencode($mensaje);
    }
}
