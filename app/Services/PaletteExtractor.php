<?php

namespace App\Services;

use Intervention\Image\Facades\Image;
use Throwable;

/**
 * Deriva la paleta del catálogo a partir del logo del comercio.
 *
 * Reduce el logo a una miniatura, agrupa los píxeles en cubos de color,
 * descarta fondo y píxeles sin color, y de ahí saca los colores dominantes.
 * Con eso arma una paleta completa y legible que el comercio puede aceptar
 * tal cual o ajustar a mano en el módulo de personalización.
 */
class PaletteExtractor
{
    /** Tamaño de análisis: suficiente para el color dominante y barato de procesar. */
    private const SAMPLE_SIZE = 64;

    /** Ancho del cubo de cuantización por canal. */
    private const BUCKET = 24;

    /**
     * @return array{dominant: list<string>, color_primary: string, color_secondary: string, color_accent: string, color_bg: string, color_surface: string, color_text: string, color_muted: string}
     */
    public function fromImage(string $absolutePath): array
    {
        $dominant = $this->dominantColors($absolutePath);

        if ($dominant === []) {
            return $this->fallback();
        }

        return $this->buildPalette($dominant);
    }

    /**
     * Colores dominantes del logo, del más presente al menos, en hexadecimal.
     *
     * @return list<string>
     */
    public function dominantColors(string $absolutePath, int $limit = 6): array
    {
        try {
            $image = Image::make($absolutePath)
                ->resize(self::SAMPLE_SIZE, self::SAMPLE_SIZE, function ($constraint) {
                    $constraint->aspectRatio();
                });
        } catch (Throwable) {
            return [];
        }

        $width = $image->width();
        $height = $image->height();
        $buckets = [];

        for ($x = 0; $x < $width; $x++) {
            for ($y = 0; $y < $height; $y++) {
                [$r, $g, $b, $alpha] = array_pad($image->pickColor($x, $y, 'array'), 4, 1);

                // Fuera lo transparente y lo que en la práctica es fondo
                if ($alpha < 0.6) {
                    continue;
                }

                [, $saturation, $lightness] = $this->rgbToHsl($r, $g, $b);

                if ($lightness > 0.94 || $lightness < 0.06) {
                    continue;
                }

                // Los grises muy apagados no sirven como color de marca
                if ($saturation < 0.12 && $lightness > 0.25 && $lightness < 0.85) {
                    continue;
                }

                $key = implode(',', [
                    intdiv($r, self::BUCKET),
                    intdiv($g, self::BUCKET),
                    intdiv($b, self::BUCKET),
                ]);

                if (! isset($buckets[$key])) {
                    $buckets[$key] = ['count' => 0, 'r' => 0, 'g' => 0, 'b' => 0];
                }

                $buckets[$key]['count']++;
                $buckets[$key]['r'] += $r;
                $buckets[$key]['g'] += $g;
                $buckets[$key]['b'] += $b;
            }
        }

        if ($buckets === []) {
            return [];
        }

        uasort($buckets, function ($a, $b) {
            return $b['count'] <=> $a['count'];
        });

        $colors = [];

        foreach ($buckets as $bucket) {
            $rgb = [
                (int) round($bucket['r'] / $bucket['count']),
                (int) round($bucket['g'] / $bucket['count']),
                (int) round($bucket['b'] / $bucket['count']),
            ];

            // Evita devolver seis variantes del mismo tono
            foreach ($colors as $picked) {
                if ($this->distance($rgb, $picked) < 60) {
                    continue 2;
                }
            }

            $colors[] = $rgb;

            if (count($colors) >= $limit) {
                break;
            }
        }

        return array_map(function ($rgb) {
            return $this->toHex($rgb);
        }, $colors);
    }

    /**
     * Arma la paleta completa a partir de los colores dominantes.
     *
     * @param  list<string>  $dominant
     */
    private function buildPalette(array $dominant): array
    {
        $primary = $dominant[0];
        $secondary = $dominant[1] ?? $this->shift($primary, 25);
        $accent = $dominant[2] ?? $this->complement($primary);

        [$h, $s, $l] = $this->rgbToHsl(...$this->toRgb($primary));

        // El fondo toma un rastro muy leve del color de marca para que el
        // catálogo se sienta del comercio sin perder legibilidad.
        $bg = $this->fromHsl($h, min($s, 0.35), 0.985);
        $surface = $this->fromHsl($h, min($s, 0.30), 0.955);
        $text = $l > 0.5
            ? $this->fromHsl($h, min($s, 0.45), 0.12)
            : $this->fromHsl($h, min($s, 0.35), 0.15);
        $muted = $this->fromHsl($h, min($s, 0.20), 0.45);

        return [
            'dominant' => $dominant,
            'color_primary' => $primary,
            'color_secondary' => $secondary,
            'color_accent' => $accent,
            'color_bg' => $bg,
            'color_surface' => $surface,
            'color_text' => $text,
            'color_muted' => $muted,
        ];
    }

    private function fallback(): array
    {
        return [
            'dominant' => [],
            'color_primary' => '#6366f1',
            'color_secondary' => '#8b5cf6',
            'color_accent' => '#f59e0b',
            'color_bg' => '#ffffff',
            'color_surface' => '#f8fafc',
            'color_text' => '#0f172a',
            'color_muted' => '#64748b',
        ];
    }

    // Utilidades de color

    /** Gira el tono los grados indicados manteniendo saturación y luminosidad. */
    private function shift(string $hex, float $degrees): string
    {
        [$h, $s, $l] = $this->rgbToHsl(...$this->toRgb($hex));

        return $this->fromHsl(fmod($h + ($degrees / 360) + 1, 1), $s, $l);
    }

    private function complement(string $hex): string
    {
        [$h, $s, $l] = $this->rgbToHsl(...$this->toRgb($hex));

        return $this->fromHsl(fmod($h + 0.5, 1), max($s, 0.55), min(max($l, 0.45), 0.6));
    }

    /** @return array{0:int,1:int,2:int} */
    private function toRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        return [
            (int) hexdec(substr($hex, 0, 2)),
            (int) hexdec(substr($hex, 2, 2)),
            (int) hexdec(substr($hex, 4, 2)),
        ];
    }

    private function toHex(array $rgb): string
    {
        $clamped = array_map(function ($c) {
            return max(0, min(255, (int) round($c)));
        }, $rgb);

        return sprintf('#%02x%02x%02x', $clamped[0], $clamped[1], $clamped[2]);
    }

    private function distance(array $a, array $b): float
    {
        return sqrt(
            (($a[0] - $b[0]) ** 2) +
            (($a[1] - $b[1]) ** 2) +
            (($a[2] - $b[2]) ** 2)
        );
    }

    /** @return array{0:float,1:float,2:float} matiz, saturación y luminosidad en 0..1 */
    private function rgbToHsl(int $r, int $g, int $b): array
    {
        $r /= 255;
        $g /= 255;
        $b /= 255;

        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $l = ($max + $min) / 2;
        $d = $max - $min;

        if ($d == 0) {
            return [0.0, 0.0, $l];
        }

        $s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);

        if ($max === $r) {
            $h = (($g - $b) / $d) + ($g < $b ? 6 : 0);
        } elseif ($max === $g) {
            $h = (($b - $r) / $d) + 2;
        } else {
            $h = (($r - $g) / $d) + 4;
        }

        return [$h / 6, $s, $l];
    }

    private function fromHsl(float $h, float $s, float $l): string
    {
        if ($s == 0) {
            $v = (int) round($l * 255);

            return $this->toHex([$v, $v, $v]);
        }

        $q = $l < 0.5 ? $l * (1 + $s) : $l + $s - ($l * $s);
        $p = (2 * $l) - $q;

        return $this->toHex([
            $this->hueToRgb($p, $q, $h + 1 / 3) * 255,
            $this->hueToRgb($p, $q, $h) * 255,
            $this->hueToRgb($p, $q, $h - 1 / 3) * 255,
        ]);
    }

    private function hueToRgb(float $p, float $q, float $t): float
    {
        if ($t < 0) {
            $t += 1;
        }
        if ($t > 1) {
            $t -= 1;
        }
        if ($t < 1 / 6) {
            return $p + (($q - $p) * 6 * $t);
        }
        if ($t < 1 / 2) {
            return $q;
        }
        if ($t < 2 / 3) {
            return $p + (($q - $p) * ((2 / 3) - $t) * 6);
        }

        return $p;
    }
}
