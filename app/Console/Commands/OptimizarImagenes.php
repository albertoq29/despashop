<?php

namespace App\Console\Commands;

use App\Support\Archivos;
use Illuminate\Console\Command;

/**
 * Genera la versión liviana de las imágenes que ya estaban subidas.
 *
 * Desde ahora cada subida crea su miniatura sola; este comando es para
 * ponerse al día con lo cargado antes, o para rehacerlas si se cambia el
 * tamaño. No borra nada: solo escribe las miniaturas que falten.
 */
class OptimizarImagenes extends Command
{
    protected $signature = 'imagenes:optimizar
        {--rehacer : Rehace también las miniaturas que ya existen}
        {--carpeta=* : Limita el trabajo a estas carpetas (products, catalogo, combos...)}';

    protected $description = 'Crea las miniaturas de las imágenes ya subidas para que el catálogo cargue liviano';

    public function handle(): int
    {
        $disco = Archivos::disco();
        $carpetas = $this->option('carpeta') ?: $disco->directories();
        $rehacer = (bool) $this->option('rehacer');

        $hechas = 0;
        $saltadas = 0;
        $fallidas = 0;

        foreach ($carpetas as $carpeta) {
            foreach ($disco->allFiles($carpeta) as $ruta) {
                // Las miniaturas viven dentro de una carpeta `mini`: no se miniaturizan
                if (str_contains($ruta, '/' . Archivos::CARPETA_MINIATURAS . '/')) {
                    continue;
                }

                $miniatura = Archivos::rutaMiniatura($ruta);

                if ($miniatura === null) {
                    continue;
                }

                if (! $rehacer && $disco->exists($miniatura)) {
                    $saltadas++;

                    continue;
                }

                if (Archivos::optimizar($ruta)) {
                    $hechas++;
                    $this->output->write('.');
                } else {
                    $fallidas++;
                    $this->output->write('x');
                }
            }
        }

        $this->newLine(2);
        $this->info("Miniaturas creadas: {$hechas}");

        if ($saltadas > 0) {
            $this->line("Ya estaban hechas: {$saltadas}");
        }

        if ($fallidas > 0) {
            $this->warn("No se pudieron procesar: {$fallidas} (quedaron con su imagen original)");
        }

        return self::SUCCESS;
    }
}
