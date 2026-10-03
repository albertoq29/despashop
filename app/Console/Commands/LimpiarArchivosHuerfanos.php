<?php

namespace App\Console\Commands;

use App\Models\CatalogBanner;
use App\Models\CatalogModal;
use App\Models\CatalogTheme;
use App\Models\Combo;
use App\Models\ComboImage;
use App\Models\FacturaItem;
use App\Models\InvoiceTemplate;
use App\Models\PrivatePhoto;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Support\Archivos;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;

/**
 * Busca archivos en storage/app/public que ya no referencia ningún registro.
 *
 * Desde que los modelos borran sus archivos al eliminarse no deberían
 * aparecer huérfanos nuevos, pero quedan los de antes y los que deje una
 * interrupción a medio camino. Por defecto solo informa: hay que pasar
 * --eliminar para que borre.
 */
class LimpiarArchivosHuerfanos extends Command
{
    protected $signature = 'archivos:limpiar
        {--eliminar : Borra los archivos en lugar de solo listarlos}
        {--ignorar=* : Rutas o carpetas que no se deben tocar}';

    protected $description = 'Encuentra archivos subidos que ya no usa ningún registro';

    /**
     * Modelos con archivos. Las columnas salen del propio modelo, así que
     * añadir una nueva al trait basta para que este comando la respete.
     *
     * @var list<class-string<Model>>
     */
    private const MODELOS = [
        Product::class,
        ProductImage::class,
        ProductVariant::class,
        PrivatePhoto::class,
        Combo::class,
        ComboImage::class,
        CatalogTheme::class,
        CatalogBanner::class,
        CatalogModal::class,
        InvoiceTemplate::class,
    ];

    public function handle(): int
    {
        $referenciados = $this->rutasReferenciadas();
        $ignorar = (array) $this->option('ignorar');

        $huerfanos = collect(Archivos::disco()->allFiles())
            ->reject(fn (string $ruta) => str_ends_with($ruta, '.gitignore'))
            ->reject(fn (string $ruta) => isset($referenciados[$ruta]))
            ->reject(function (string $ruta) use ($ignorar) {
                foreach ($ignorar as $patron) {
                    if ($ruta === $patron || str_starts_with($ruta, rtrim($patron, '/') . '/')) {
                        return true;
                    }
                }

                return false;
            })
            ->values();

        $this->line('');
        $this->info('Referenciados por algún registro: ' . count($referenciados));
        $this->info('Sin referencia: ' . $huerfanos->count());

        if ($huerfanos->isEmpty()) {
            $this->line('');
            $this->info('No hay nada que limpiar.');

            return self::SUCCESS;
        }

        $total = 0;

        $this->line('');
        $this->table(
            ['Archivo', 'Tamaño'],
            $huerfanos->map(function (string $ruta) use (&$total) {
                $bytes = Archivos::disco()->size($ruta);
                $total += $bytes;

                return [$ruta, $this->enUnidades($bytes)];
            })->all()
        );

        $this->line('Espacio ocupado: ' . $this->enUnidades($total));

        if (! $this->option('eliminar')) {
            $this->line('');
            $this->comment('Nada se ha borrado. Repite con --eliminar para hacerlo.');

            return self::SUCCESS;
        }

        $borrados = Archivos::eliminarVarias($huerfanos);

        $this->line('');
        $this->info("Archivos eliminados: {$borrados}");

        return self::SUCCESS;
    }

    /**
     * Todas las rutas que algún registro sigue usando, como claves de un
     * array para que la comprobación sea directa y no recorra la lista.
     *
     * @return array<string, true>
     */
    private function rutasReferenciadas(): array
    {
        $rutas = [];

        foreach (self::MODELOS as $clase) {
            /** @var Model $modelo */
            $modelo = new $clase;
            $columnas = method_exists($modelo, 'columnasConArchivos') ? $modelo->columnasConArchivos() : [];

            if ($columnas === []) {
                continue;
            }

            $consulta = $clase::query();

            // Sin el alcance por comercio: aquí se miran todos
            if (method_exists($modelo, 'acrossTenants')) {
                $consulta->withoutGlobalScope('tenant');
            }

            foreach ($consulta->get($columnas) as $registro) {
                foreach ($columnas as $columna) {
                    if (filled($valor = $registro->getAttribute($columna))) {
                        $rutas[$valor] = true;
                    }
                }
            }
        }

        // Las facturas emitidas conservan una copia de la imagen del producto
        foreach (FacturaItem::whereNotNull('product_image_path')->pluck('product_image_path') as $ruta) {
            $rutas[$ruta] = true;
        }

        return $rutas;
    }

    private function enUnidades(int $bytes): string
    {
        foreach (['B', 'KB', 'MB', 'GB'] as $unidad) {
            if ($bytes < 1024 || $unidad === 'GB') {
                return round($bytes, 1) . ' ' . $unidad;
            }

            $bytes /= 1024;
        }

        return $bytes . ' B';
    }
}
