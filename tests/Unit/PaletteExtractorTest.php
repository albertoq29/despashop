<?php

namespace Tests\Unit;

use App\Services\PaletteExtractor;
use Tests\TestCase;

/**
 * La paleta automática es lo primero que ve el comercio al subir su logo:
 * si acierta, no toca nada más. Estas pruebas fijan lo que debe cumplir.
 */
class PaletteExtractorTest extends TestCase
{
    private string $directorio;

    protected function setUp(): void
    {
        parent::setUp();

        $this->directorio = storage_path('framework/testing/paletas');

        if (! is_dir($this->directorio)) {
            mkdir($this->directorio, 0775, true);
        }
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directorio . '/*.png') ?: [] as $archivo) {
            @unlink($archivo);
        }

        parent::tearDown();
    }

    /**
     * Crea un logo de prueba: fondo blanco con bloques del color indicado.
     *
     * @param  list<array{0:int,1:int,2:int}>  $colores
     */
    private function logo(array $colores, string $nombre = 'logo'): string
    {
        $ancho = 120;
        $alto = 120;
        $imagen = imagecreatetruecolor($ancho, $alto);

        imagefill($imagen, 0, 0, imagecolorallocate($imagen, 255, 255, 255));

        $anchoBloque = (int) ($ancho / max(count($colores), 1));

        foreach ($colores as $indice => [$r, $g, $b]) {
            imagefilledrectangle(
                $imagen,
                $indice * $anchoBloque,
                20,
                ($indice + 1) * $anchoBloque,
                100,
                imagecolorallocate($imagen, $r, $g, $b)
            );
        }

        $ruta = $this->directorio . '/' . $nombre . '.png';
        imagepng($imagen, $ruta);
        imagedestroy($imagen);

        return $ruta;
    }

    public function test_detecta_el_color_dominante_del_logo(): void
    {
        // Rojo intenso ocupando la mayor parte del logo
        $ruta = $this->logo([[200, 30, 40]]);

        $paleta = (new PaletteExtractor)->fromImage($ruta);

        [$r, $g, $b] = $this->aRgb($paleta['color_primary']);

        $this->assertGreaterThan(140, $r, 'el color principal deberia ser claramente rojo');
        $this->assertLessThan(90, $g);
        $this->assertLessThan(90, $b);
    }

    public function test_devuelve_una_paleta_completa_y_en_hexadecimal(): void
    {
        $paleta = (new PaletteExtractor)->fromImage($this->logo([[20, 90, 200]]));

        foreach (['color_primary', 'color_secondary', 'color_accent', 'color_bg', 'color_surface', 'color_text', 'color_muted'] as $clave) {
            $this->assertArrayHasKey($clave, $paleta);
            $this->assertMatchesRegularExpression('/^#[0-9a-f]{6}$/', $paleta[$clave], "$clave no es un hexadecimal valido");
        }
    }

    public function test_el_texto_contrasta_con_el_fondo_generado(): void
    {
        foreach ([[20, 90, 200], [200, 30, 40], [240, 200, 20], [30, 140, 90]] as $color) {
            $paleta = (new PaletteExtractor)->fromImage($this->logo([$color], 'c' . implode('', $color)));

            $contraste = $this->contraste($paleta['color_text'], $paleta['color_bg']);

            $this->assertGreaterThan(
                7,
                $contraste,
                'el texto debe leerse sobre el fondo (contraste ' . round($contraste, 1) . ')'
            );
        }
    }

    public function test_distingue_varios_colores_de_marca(): void
    {
        $ruta = $this->logo([[200, 30, 40], [20, 90, 200]]);

        $dominantes = (new PaletteExtractor)->dominantColors($ruta);

        $this->assertGreaterThanOrEqual(2, count($dominantes), 'deberia detectar los dos colores del logo');
    }

    public function test_un_logo_sin_color_cae_en_la_paleta_por_defecto(): void
    {
        // Solo blanco: no hay color de marca que extraer
        $ruta = $this->logo([]);

        $paleta = (new PaletteExtractor)->fromImage($ruta);

        $this->assertSame([], $paleta['dominant']);
        $this->assertSame('#6366f1', $paleta['color_primary']);
    }

    public function test_un_archivo_ilegible_no_revienta(): void
    {
        $paleta = (new PaletteExtractor)->fromImage($this->directorio . '/no-existe.png');

        $this->assertSame([], $paleta['dominant']);
    }

    /** @return array{0:int,1:int,2:int} */
    private function aRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        return [
            (int) hexdec(substr($hex, 0, 2)),
            (int) hexdec(substr($hex, 2, 2)),
            (int) hexdec(substr($hex, 4, 2)),
        ];
    }

    private function contraste(string $unHex, string $otroHex): float
    {
        $luminancia = function (string $hex) {
            $canales = array_map(function ($canal) {
                $c = $canal / 255;

                return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
            }, $this->aRgb($hex));

            return 0.2126 * $canales[0] + 0.7152 * $canales[1] + 0.0722 * $canales[2];
        };

        $a = $luminancia($unHex);
        $b = $luminancia($otroHex);

        return (max($a, $b) + 0.05) / (min($a, $b) + 0.05);
    }
}
