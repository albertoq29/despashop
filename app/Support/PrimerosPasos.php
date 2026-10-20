<?php

namespace App\Support;

use App\Models\CatalogTheme;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;

/**
 * Qué le falta al comercio para tener un catálogo presentable.
 *
 * Quien entra por primera vez no necesita números: necesita saber qué hacer
 * ahora. Estos son los cuatro pasos que separan una cuenta recién abierta de
 * un catálogo que se puede mandar por WhatsApp sin vergüenza, en el orden en
 * que conviene darlos.
 *
 * Son pocos a propósito. Una lista de diez cosas pendientes no guía a nadie:
 * agobia. Y cuando los cuatro están hechos la guía desaparece sola, porque a
 * quien ya sabe moverse una lista de tareas cumplidas solo le estorba.
 */
class PrimerosPasos
{
    /**
     * Los pasos con su estado, en orden.
     *
     * @return array{pasos: list<array<string, mixed>>, hechos: int, total: int, listo: bool}
     */
    public static function de(User $comercio, ?CatalogTheme $tema): array
    {
        $productos = Product::count();

        $pasos = [
            [
                'clave' => 'productos',
                'titulo' => 'Carga lo que vendes',
                'texto' => 'Con un producto ya tienes catálogo. Los demás los agregas cuando quieras.',
                'hecho' => $productos > 0,
                'enlace' => route('productos.index'),
                'accion' => 'Cargar un producto',
            ],
            [
                'clave' => 'logo',
                'titulo' => 'Sube tu logo',
                'texto' => 'El catálogo toma sus colores solo. Es el cambio que más se nota con menos esfuerzo.',
                'hecho' => (bool) $tema?->logo_path,
                'enlace' => route('catalogo.personalizar'),
                'accion' => 'Subir el logo',
            ],
            [
                'clave' => 'portada',
                'titulo' => 'Escribe tu portada',
                'texto' => 'Lo primero que se lee al entrar. La IA te la propone si no sabes por dónde empezar.',
                'hecho' => self::portadaPropia($comercio, $tema),
                'enlace' => route('catalogo.personalizar'),
                'accion' => 'Escribir la portada',
            ],
            [
                'clave' => 'publicado',
                'titulo' => 'Déjalo en línea',
                'texto' => 'Tu catálogo nace publicado. Si alguna vez lo escondes, se enciende desde aquí.',
                'hecho' => (bool) $tema?->is_published,
                'enlace' => route('catalogo.personalizar'),
                'accion' => 'Revisar',
            ],
        ];

        $hechos = count(array_filter($pasos, fn (array $paso) => $paso['hecho']));

        return [
            'pasos' => $pasos,
            'hechos' => $hechos,
            'total' => count($pasos),
            'listo' => $hechos === count($pasos),
        ];
    }

    /**
     * Si la portada ya la escribió el comercio o sigue siendo la de fábrica.
     *
     * El catálogo nace con un título —el nombre del negocio— y un subtítulo
     * genérico, para que no abra vacío. Contarlos como portada escrita
     * tacharía el paso el primer día y lo volvería un adorno.
     *
     * Basta con que haya tocado uno de los dos: quien escribió su propio
     * subtítulo y dejó arriba el nombre del negocio también escribió su
     * portada, y volver a pedirsela sería no estar mirando.
     */
    private static function portadaPropia(User $comercio, ?CatalogTheme $tema): bool
    {
        $titulo = trim((string) $tema?->hero_title);
        $subtitulo = trim((string) $tema?->hero_subtitle);
        $suNombre = $comercio->business_name ?: $comercio->name;

        return ($titulo !== '' && $titulo !== $suNombre)
            || ($subtitulo !== '' && $subtitulo !== CatalogProvisioner::SUBTITULO_DE_FABRICA);
    }
}
