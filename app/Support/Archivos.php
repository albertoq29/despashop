<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\ImageManager;

/**
 * Único lugar donde la app guarda y borra archivos subidos.
 *
 * Todo pasa por el disco `public`, que apunta a storage/app/public y se
 * sirve por el enlace public/storage (php artisan storage:link). Las rutas
 * que se guardan en la base son siempre relativas a ese disco, nunca
 * absolutas: así la app puede cambiar de servidor sin reescribir la base.
 *
 * Usar el disco en vez de rutas del sistema tiene una ventaja práctica:
 * confina cualquier ruta a la raíz configurada (un `../` guardado en la base
 * no puede alcanzar nada de fuera) y permite falsear el disco en las pruebas.
 */
class Archivos
{
    public const DISCO = 'public';

    public static function disco()
    {
        return Storage::disk(self::DISCO);
    }

    public static function url(?string $rutaRelativa): ?string
    {
        return $rutaRelativa ? asset('storage/' . ltrim($rutaRelativa, '/')) : null;
    }

    public static function existe(?string $rutaRelativa): bool
    {
        return filled($rutaRelativa) && self::disco()->exists($rutaRelativa);
    }

    /**
     * Guarda un archivo subido y devuelve su ruta relativa.
     *
     * El nombre original se normaliza: espacios, acentos y símbolos obligan a
     * escapar la URL y rompen los enlaces al copiarlos. Se conserva un resto
     * legible del nombre para poder reconocer el archivo en el disco.
     */
    public static function guardar(UploadedFile $archivo, string $carpeta, string $prefijo = ''): string
    {
        self::comprobarSubida($archivo);

        $carpeta = trim($carpeta, '/');
        $ruta = $carpeta . '/' . self::nombreSeguro($archivo, $prefijo);

        // Se abre el flujo con getPathname() y no con putFileAs(), porque este
        // último resuelve la ruta con realpath() y, cuando el temporal de PHP
        // no se puede resolver, pasa una cadena vacía a fopen() y revienta con
        // "Path cannot be empty" en lugar de dar un error entendible.
        $flujo = @fopen($archivo->getPathname(), 'r');

        if ($flujo === false) {
            throw ValidationException::withMessages([
                'archivo' => 'No se pudo leer el archivo subido. Vuelve a intentarlo.',
            ]);
        }

        try {
            self::disco()->put($ruta, $flujo);
        } finally {
            if (is_resource($flujo)) {
                fclose($flujo);
            }
        }

        self::optimizar($ruta);

        return $ruta;
    }

    // ── Imágenes livianas ──────────────────────────────────────────────────────

    /**
     * Formatos de imagen que se aceptan al subir.
     *
     * Sin SVG a propósito: es un documento XML que puede traer scripts, y
     * se sirve desde nuestro propio dominio, así que abrir uno subido por
     * otro ejecutaría su código con la sesión de quien lo abre. Lo que se
     * gana —un logo que escala— no paga eso.
     */
    public const FORMATOS = 'jpg,jpeg,png,webp,gif';

    /** Carpeta hermana donde vive la versión liviana de cada imagen. */
    public const CARPETA_MINIATURAS = 'mini';

    /** Lado mayor de la miniatura que se muestra en el catálogo. */
    public const LADO_MINIATURA = 600;

    /** Lado mayor de la imagen completa que se guarda al subirla. */
    public const LADO_MAXIMO = 1800;

    /**
     * Ruta de la versión liviana de una imagen. Es predecible a propósito:
     * el navegador la pide directo y, si todavía no existe, cae a la original.
     */
    public static function rutaMiniatura(?string $ruta): ?string
    {
        if (blank($ruta) || ! self::esImagen($ruta)) {
            return null;
        }

        $carpeta = trim(dirname($ruta), '/.');
        $nombre = pathinfo($ruta, PATHINFO_FILENAME);

        return ($carpeta === '' ? '' : $carpeta . '/') . self::CARPETA_MINIATURAS . '/' . $nombre . '.webp';
    }

    public static function urlMiniatura(?string $ruta): ?string
    {
        return self::url(self::rutaMiniatura($ruta)) ?? self::url($ruta);
    }

    /**
     * Deja una imagen lista para la web: la endereza según los datos de la
     * cámara, la acota a un tamaño razonable y guarda al lado una versión
     * liviana en webp para las rejillas del catálogo.
     *
     * Nunca interrumpe la subida: si la imagen no se puede procesar (formato
     * raro, archivo corrupto, poca memoria), el original queda tal cual.
     */
    public static function optimizar(string $ruta): bool
    {
        if (! self::esImagen($ruta) || ! self::existe($ruta)) {
            return false;
        }

        try {
            $original = self::disco()->get($ruta);
            $imagen = self::gestor()->make($original)->orientate();

            // Una foto de teléfono ronda los 4000 px de lado: pesa varios MB
            // y nadie la ve a ese tamaño. Se acota conservando la proporción.
            if (max($imagen->width(), $imagen->height()) > self::LADO_MAXIMO) {
                $imagen->resize(self::LADO_MAXIMO, self::LADO_MAXIMO, function ($restriccion) {
                    $restriccion->aspectRatio();
                    $restriccion->upsize();
                });
            }

            $completa = (string) $imagen->encode(self::formatoDe($ruta), 82);

            // Solo se reemplaza si el resultado pesa menos que lo subido
            if (strlen($completa) < strlen($original)) {
                self::disco()->put($ruta, $completa);
            }

            $miniatura = (string) $imagen
                ->resize(self::LADO_MINIATURA, self::LADO_MINIATURA, function ($restriccion) {
                    $restriccion->aspectRatio();
                    $restriccion->upsize();
                })
                ->encode('webp', 72);

            self::disco()->put(self::rutaMiniatura($ruta), $miniatura);

            return true;
        } catch (\Throwable $e) {
            Log::warning('No se pudo optimizar una imagen', ['ruta' => $ruta, 'error' => $e->getMessage()]);

            return false;
        }
    }

    private static function gestor(): ImageManager
    {
        return new ImageManager(['driver' => 'gd']);
    }

    /** El formato en el que se vuelve a escribir la imagen completa. */
    private static function formatoDe(string $ruta): string
    {
        $extension = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));

        return in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true) ? $extension : 'jpg';
    }

    private static function esImagen(string $ruta): bool
    {
        return in_array(strtolower(pathinfo($ruta, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'webp'], true);
    }

    /**
     * Una subida puede llegar rota sin que la validación lo note: si PHP no
     * llegó a escribir el temporal, el archivo existe como objeto pero no en
     * el disco. Conviene decirlo con palabras y no con un error 500.
     */
    private static function comprobarSubida(UploadedFile $archivo): void
    {
        if ($archivo->isValid() && is_file($archivo->getPathname())) {
            return;
        }

        $motivos = [
            UPLOAD_ERR_INI_SIZE => 'El archivo supera el tamaño máximo que admite el servidor.',
            UPLOAD_ERR_FORM_SIZE => 'El archivo supera el tamaño máximo del formulario.',
            UPLOAD_ERR_PARTIAL => 'La subida se interrumpió antes de terminar. Vuelve a intentarlo.',
            UPLOAD_ERR_NO_FILE => 'No se recibió ningún archivo.',
            UPLOAD_ERR_NO_TMP_DIR => 'El servidor no tiene carpeta temporal para subidas.',
            UPLOAD_ERR_CANT_WRITE => 'El servidor no pudo escribir el archivo en el disco.',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida.',
        ];

        throw ValidationException::withMessages([
            'archivo' => $motivos[$archivo->getError()] ?? 'La subida del archivo falló. Vuelve a intentarlo.',
        ]);
    }

    /** Borra un archivo y su miniatura. Devuelve true solo si existía y se eliminó. */
    public static function eliminar(?string $rutaRelativa): bool
    {
        if (blank($rutaRelativa) || ! self::disco()->exists($rutaRelativa)) {
            return false;
        }

        $miniatura = self::rutaMiniatura($rutaRelativa);

        if ($miniatura && self::disco()->exists($miniatura)) {
            self::disco()->delete($miniatura);
        }

        return self::disco()->delete($rutaRelativa);
    }

    /** Borra varias rutas y devuelve cuántas se eliminaron. */
    public static function eliminarVarias(iterable $rutas): int
    {
        $borrados = 0;

        foreach ($rutas as $ruta) {
            if (self::eliminar($ruta)) {
                $borrados++;
            }
        }

        return $borrados;
    }

    /** Borra una carpeta y todo su contenido. */
    public static function eliminarCarpeta(string $carpeta): bool
    {
        $carpeta = trim($carpeta, '/');

        if (blank($carpeta) || ! self::disco()->directoryExists($carpeta)) {
            return false;
        }

        return self::disco()->deleteDirectory($carpeta);
    }

    private static function nombreSeguro(UploadedFile $archivo, string $prefijo): string
    {
        $extension = strtolower($archivo->getClientOriginalExtension() ?: $archivo->guessExtension() ?: 'bin');
        $extension = preg_replace('/[^a-z0-9]/', '', $extension) ?: 'bin';

        $base = Str::slug(pathinfo($archivo->getClientOriginalName(), PATHINFO_FILENAME));
        $base = Str::limit($base, 40, '');

        $partes = array_filter([
            Str::slug($prefijo),
            $base,
            Str::lower(Str::random(8)),
        ]);

        return implode('-', $partes) . '.' . $extension;
    }
}
