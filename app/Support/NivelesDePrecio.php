<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Cómo llama cada comercio a su tercer nivel de precio.
 *
 * Es la misma columna del producto con dos nombres según el ramo: quien
 * surte a revendedores vende «al distribuidor», y quien mueve volumen
 * vende «al gran mayor». Ninguno entiende el término del otro, así que lo
 * elige el comercio.
 *
 * El nombre vive aquí y no repetido en cada pantalla porque tiene que
 * leerse igual en los tres sitios donde aparece: el formulario del
 * producto, el selector de precio de la factura y el catálogo que ve el
 * cliente. Si en uno dice «distribuidor» y en otro «gran mayor», nadie
 * sabe si son dos precios o uno.
 */
class NivelesDePrecio
{
    public const CLAVE = 'distributor_price_label';

    public const DISTRIBUIDOR = 'distribuidor';

    public const GRAN_MAYOR = 'gran_mayor';

    /** Las dos formas de llamarlo; la primera es la de siempre. */
    public const NOMBRES = [
        self::DISTRIBUIDOR => 'Distribuidor',
        self::GRAN_MAYOR => 'Gran mayor',
    ];

    /** La clave guardada, o la de siempre si no hay nada elegido. */
    public static function elegido(?int $comercioId = null): string
    {
        $valor = Setting::get(self::CLAVE, null, $comercioId);

        return array_key_exists($valor, self::NOMBRES) ? $valor : self::DISTRIBUIDOR;
    }

    public static function nombre(?int $comercioId = null): string
    {
        return self::NOMBRES[self::elegido($comercioId)];
    }

    /**
     * Lo que se le manda al navegador.
     *
     * Van las dos cosas: el nombre ya resuelto, que es lo que se pinta, y
     * la clave, para que el selector de ajustes sepa cuál está marcada.
     */
    public static function para(?int $comercioId = null): array
    {
        return [
            'elegido' => $elegido = self::elegido($comercioId),
            'distribuidor' => self::NOMBRES[$elegido],
            'opciones' => self::NOMBRES,
        ];
    }
}
