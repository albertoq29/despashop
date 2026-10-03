<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use ZipArchive;

/**
 * Respaldo de la base de datos y de los archivos subidos.
 *
 *   php artisan respaldo:crear            base + archivos
 *   php artisan respaldo:crear --solo-base
 *
 * Deja un .sql y un .zip con la fecha en el nombre dentro de
 * `config('respaldos.carpeta')`, y borra los más viejos según
 * `config('respaldos.conservar')`.
 *
 * Esto cubre el accidente (un borrado a destiempo, un disco que falla), no
 * el desastre: el respaldo vive en el mismo servidor. Copiarlo a otro lado
 * —un bucket, otro disco, tu máquina— es la otra mitad del trabajo.
 */
class CrearRespaldo extends Command
{
    protected $signature = 'respaldo:crear
        {--solo-base : No incluye los archivos subidos}';

    protected $description = 'Guarda una copia de la base de datos y de los archivos subidos';

    public function handle(): int
    {
        $carpeta = (string) config('respaldos.carpeta');
        File::ensureDirectoryExists($carpeta);

        $marca = now()->format('Y-m-d_His');

        $base = $this->respaldarBase($carpeta, $marca);

        if ($base === null) {
            return self::FAILURE;
        }

        $archivos = null;

        if (! $this->option('solo-base') && config('respaldos.incluir_archivos')) {
            $archivos = $this->respaldarArchivos($carpeta, $marca);
        }

        $this->limpiarViejos($carpeta);

        $this->newLine();
        $this->info('Respaldo listo:');
        $this->line('  ' . $base . '  (' . $this->peso($base) . ')');

        if ($archivos) {
            $this->line('  ' . $archivos . '  (' . $this->peso($archivos) . ')');
        }

        Log::info('Respaldo creado', ['base' => basename($base), 'archivos' => $archivos ? basename($archivos) : null]);

        return self::SUCCESS;
    }

    private function respaldarBase(string $carpeta, string $marca): ?string
    {
        $conexion = config('database.default');
        $datos = config("database.connections.{$conexion}");

        if (($datos['driver'] ?? null) !== 'mysql') {
            $this->error("Solo se sabe respaldar MySQL; la conexión activa es «{$datos['driver']}».");

            return null;
        }

        $destino = $carpeta . DIRECTORY_SEPARATOR . "base_{$marca}.sql";

        $proceso = new Process([
            (string) config('respaldos.mysqldump'),
            '--host=' . $datos['host'],
            '--port=' . $datos['port'],
            '--user=' . $datos['username'],
            '--password=' . $datos['password'],
            '--single-transaction',      // no bloquea la app mientras copia
            '--quick',
            '--default-character-set=utf8mb4',
            '--result-file=' . $destino,
            $datos['database'],
        ]);

        $proceso->setTimeout(600);
        $proceso->run();

        if (! $proceso->isSuccessful()) {
            $this->error('No se pudo respaldar la base de datos.');
            $this->line(trim($proceso->getErrorOutput()) ?: 'Revisa la ruta de mysqldump en config/respaldos.php');
            Log::error('Falló el respaldo de la base', ['salida' => $proceso->getErrorOutput()]);

            return null;
        }

        return $destino;
    }

    private function respaldarArchivos(string $carpeta, string $marca): ?string
    {
        $origen = storage_path('app/public');

        if (! File::isDirectory($origen)) {
            return null;
        }

        $destino = $carpeta . DIRECTORY_SEPARATOR . "archivos_{$marca}.zip";
        $zip = new ZipArchive();

        if ($zip->open($destino, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            $this->error('No se pudo crear el archivo comprimido.');

            return null;
        }

        $cuantos = 0;

        foreach (File::allFiles($origen) as $archivo) {
            $zip->addFile($archivo->getPathname(), $archivo->getRelativePathname());
            $cuantos++;
        }

        $zip->close();
        $this->line("Archivos incluidos: {$cuantos}");

        return $destino;
    }

    /** Conserva los últimos respaldos y borra el resto. */
    private function limpiarViejos(string $carpeta): void
    {
        $conservar = max(1, (int) config('respaldos.conservar'));

        foreach (['base_' => '.sql', 'archivos_' => '.zip'] as $prefijo => $extension) {
            $copias = collect(File::files($carpeta))
                ->filter(fn ($archivo) => str_starts_with($archivo->getFilename(), $prefijo)
                    && str_ends_with($archivo->getFilename(), $extension))
                ->sortByDesc(fn ($archivo) => $archivo->getFilename())
                ->values();

            $copias->slice($conservar)->each(function ($archivo) {
                File::delete($archivo->getPathname());
                $this->line('Se retiró el respaldo viejo ' . $archivo->getFilename());
            });
        }
    }

    private function peso(string $ruta): string
    {
        $bytes = File::size($ruta);

        return $bytes > 1048576
            ? round($bytes / 1048576, 1) . ' MB'
            : round($bytes / 1024) . ' KB';
    }
}
