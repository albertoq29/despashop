<?php

namespace App\Support;

/**
 * Cómo se mide lo que vende el comercio.
 *
 * Un producto se vendía siempre «por unidad», y eso dejaba fuera a la
 * charcutería, la ferretería y cualquiera que venda al peso o por metro. La
 * unidad vive en el producto y la arrastra todo lo que lo nombre: su
 * existencia, su precio, lo que se factura y lo que ve el cliente.
 *
 * `fraccion` dice si tiene sentido vender media: medio kilo sí, media caja
 * no. Decide el paso de los campos y si la cantidad se escribe con decimales.
 */
class UnidadesDeMedida
{
    public const POR_DEFECTO = 'unidad';

    /**
     * La clave se guarda en la base; `corto` es lo que acompaña a un número
     * («2,5 kg») y `nombre` lo que se lee en un selector.
     */
    public const UNIDADES = [
        'unidad' => ['nombre' => 'Unidades', 'corto' => 'u', 'uno' => 'unidad', 'fraccion' => false, 'grupo' => 'Por pieza'],
        'par' => ['nombre' => 'Pares', 'corto' => 'par', 'uno' => 'par', 'fraccion' => false, 'grupo' => 'Por pieza'],
        'docena' => ['nombre' => 'Docenas', 'corto' => 'doc', 'uno' => 'docena', 'fraccion' => true, 'grupo' => 'Por pieza'],
        'caja' => ['nombre' => 'Cajas', 'corto' => 'caja', 'uno' => 'caja', 'fraccion' => false, 'grupo' => 'Por bulto'],
        'paquete' => ['nombre' => 'Paquetes', 'corto' => 'paq', 'uno' => 'paquete', 'fraccion' => false, 'grupo' => 'Por bulto'],
        'bulto' => ['nombre' => 'Bultos', 'corto' => 'bulto', 'uno' => 'bulto', 'fraccion' => false, 'grupo' => 'Por bulto'],
        'kg' => ['nombre' => 'Kilogramos', 'corto' => 'kg', 'uno' => 'kilo', 'fraccion' => true, 'grupo' => 'Por peso'],
        'g' => ['nombre' => 'Gramos', 'corto' => 'g', 'uno' => 'gramo', 'fraccion' => false, 'grupo' => 'Por peso'],
        'lb' => ['nombre' => 'Libras', 'corto' => 'lb', 'uno' => 'libra', 'fraccion' => true, 'grupo' => 'Por peso'],
        'l' => ['nombre' => 'Litros', 'corto' => 'L', 'uno' => 'litro', 'fraccion' => true, 'grupo' => 'Por volumen'],
        'ml' => ['nombre' => 'Mililitros', 'corto' => 'ml', 'uno' => 'mililitro', 'fraccion' => false, 'grupo' => 'Por volumen'],
        'm' => ['nombre' => 'Metros', 'corto' => 'm', 'uno' => 'metro', 'fraccion' => true, 'grupo' => 'Por medida'],
        'cm' => ['nombre' => 'Centímetros', 'corto' => 'cm', 'uno' => 'centímetro', 'fraccion' => false, 'grupo' => 'Por medida'],
        'm2' => ['nombre' => 'Metros cuadrados', 'corto' => 'm²', 'uno' => 'metro cuadrado', 'fraccion' => true, 'grupo' => 'Por medida'],
    ];

    /** @return list<string> */
    public static function claves(): array
    {
        return array_keys(self::UNIDADES);
    }

    public static function existe(?string $unidad): bool
    {
        return $unidad !== null && array_key_exists($unidad, self::UNIDADES);
    }

    public static function normalizar(?string $unidad): string
    {
        return self::existe($unidad) ? $unidad : self::POR_DEFECTO;
    }

    /** @return array{nombre: string, corto: string, uno: string, fraccion: bool, grupo: string} */
    public static function de(?string $unidad): array
    {
        return self::UNIDADES[self::normalizar($unidad)];
    }

    /** Si tiene sentido vender una parte: medio kilo sí, media caja no. */
    public static function admiteFraccion(?string $unidad): bool
    {
        return self::de($unidad)['fraccion'];
    }

    /**
     * Una cantidad con su unidad, lista para leerse: «2,5 kg», «3 u».
     *
     * Los ceros de la derecha se van porque 2,500 kg no dice nada que no
     * diga 2,5 kg, y la coma es la decimal de aquí.
     */
    public static function formatear(float|int|string|null $cantidad, ?string $unidad = null): string
    {
        return self::numero($cantidad) . ' ' . self::de($unidad)['corto'];
    }

    /** Solo el número, sin la unidad, con coma decimal y sin ceros de más. */
    public static function numero(float|int|string|null $cantidad): string
    {
        $valor = (float) ($cantidad ?? 0);

        if ($valor === floor($valor)) {
            return number_format($valor, 0, ',', '.');
        }

        return rtrim(rtrim(number_format($valor, 3, ',', '.'), '0'), ',');
    }

    /**
     * Las unidades agrupadas, como las pide un selector.
     *
     * @return array<string, list<array{valor: string, nombre: string, corto: string, fraccion: bool}>>
     */
    public static function porGrupo(): array
    {
        $grupos = [];

        foreach (self::UNIDADES as $clave => $unidad) {
            $grupos[$unidad['grupo']][] = [
                'valor' => $clave,
                'nombre' => $unidad['nombre'],
                'corto' => $unidad['corto'],
                'fraccion' => $unidad['fraccion'],
            ];
        }

        return $grupos;
    }
}
