<?php

namespace App\Support;

/**
 * Contraste de colores según WCAG.
 *
 * Los colores que propone la IA se ven bien en su cabeza, no siempre en una
 * pantalla: un texto gris claro sobre crema es ilegible. Aquí se corrigen
 * acercándolos al negro o al blanco hasta que se lean.
 */
class Contraste
{
    public static function esHex(mixed $valor): bool
    {
        return is_string($valor) && preg_match('/^#[0-9a-f]{6}$/i', $valor) === 1;
    }

    public static function luminancia(string $hex): float
    {
        [$r, $g, $b] = self::rgb($hex);

        $canal = function (int $c): float {
            $c /= 255;

            return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * $canal($r) + 0.7152 * $canal($g) + 0.0722 * $canal($b);
    }

    public static function ratio(string $uno, string $otro): float
    {
        $a = self::luminancia($uno);
        $b = self::luminancia($otro);

        return (max($a, $b) + 0.05) / (min($a, $b) + 0.05);
    }

    /**
     * Ajusta `$color` hasta que tenga al menos `$minimo` de contraste sobre
     * `$fondo`, moviéndolo hacia el extremo opuesto al fondo.
     */
    public static function legibleSobre(string $fondo, string $color, float $minimo): string
    {
        $destino = self::luminancia($fondo) > 0.4 ? '#000000' : '#ffffff';

        for ($paso = 0; $paso <= 10 && self::ratio($fondo, $color) < $minimo; $paso++) {
            $color = self::mezclar($color, $destino, 0.18);
        }

        return self::ratio($fondo, $color) >= $minimo
            ? $color
            : ($destino === '#000000' ? '#1c1917' : '#fafaf9');
    }

    public static function mezclar(string $uno, string $otro, float $proporcion): string
    {
        $a = self::rgb($uno);
        $b = self::rgb($otro);

        $mezcla = array_map(
            fn ($i) => (int) round($a[$i] + ($b[$i] - $a[$i]) * $proporcion),
            [0, 1, 2],
        );

        return sprintf('#%02x%02x%02x', ...$mezcla);
    }

    /** @return array{int, int, int} */
    private static function rgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }
}
