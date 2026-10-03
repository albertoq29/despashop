<?php

namespace App\Models\Concerns;

use App\Support\Archivos;

/**
 * Borra del disco los archivos de un registro cuando el registro se elimina.
 *
 * El modelo declara qué columnas guardan rutas en `$columnasDeArchivo`.
 *
 * `$relacionesConArchivos` existe por un detalle importante: las claves
 * foráneas con ON DELETE CASCADE borran las filas hijas directamente en la
 * base, sin pasar por Eloquent, así que sus eventos nunca se disparan y sus
 * archivos quedarían huérfanos. Por eso los hijos se eliminan aquí a mano,
 * antes de que la base haga su cascada.
 */
trait GestionaArchivos
{
    public static function bootGestionaArchivos(): void
    {
        static::deleting(function ($modelo) {
            // Primero los hijos, para que cada uno limpie lo suyo
            foreach ($modelo->hijosConArchivos() as $relacion) {
                if (! method_exists($modelo, $relacion)) {
                    continue;
                }

                $modelo->{$relacion}()->get()->each->delete();
            }

            foreach ($modelo->columnasConArchivos() as $columna) {
                $ruta = $modelo->getAttribute($columna);

                if (blank($ruta) || $modelo->archivoEnUso($ruta)) {
                    continue;
                }

                Archivos::eliminar($ruta);
            }
        });
    }

    /**
     * Columnas del modelo que guardan rutas de archivos.
     *
     * Se consulta con property_exists a propósito: leer una propiedad que el
     * modelo no declaró pasaría por el __get de Eloquent, que intentaría
     * resolverla como una relación y lanzaría una excepción.
     *
     * @return list<string>
     */
    public function columnasConArchivos(): array
    {
        return property_exists($this, 'columnasDeArchivo') ? $this->columnasDeArchivo : [];
    }

    /** @return list<string> */
    public function hijosConArchivos(): array
    {
        return property_exists($this, 'relacionesConArchivos') ? $this->relacionesConArchivos : [];
    }

    /**
     * Permite que un modelo proteja un archivo que otro registro todavía usa.
     * Por defecto no hay nada que proteger.
     */
    public function archivoEnUso(string $ruta): bool
    {
        return false;
    }

    /**
     * Cambia el archivo de una columna y borra el anterior solo si el cambio
     * llegó a guardarse.
     */
    public function reemplazarArchivo(string $columna, ?string $rutaNueva): void
    {
        $anterior = $this->getAttribute($columna);

        $this->setAttribute($columna, $rutaNueva);
        $this->save();

        if (filled($anterior) && $anterior !== $rutaNueva && ! $this->archivoEnUso($anterior)) {
            Archivos::eliminar($anterior);
        }
    }
}
