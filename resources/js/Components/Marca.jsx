import { Store } from 'lucide-react';

/** Nombre con el que se dibuja el logotipo. Si el admin renombra la plataforma, se escribe en letras. */
const NOMBRE_PROPIO = 'Despashop';

/**
 * Logotipo de la plataforma.
 *
 * El archivo SVG trae el nombre dibujado, así que solo sirve mientras la
 * plataforma se llame Despashop. Si el administrador le pone otro nombre en
 * sus ajustes, se dibuja el nombre en letras para no mentir sobre la marca.
 *
 * Se usan dos archivos en vez de `currentColor` porque el punto verde del
 * logo no cambia de color con el tema: solo cambia el nombre.
 */
export default function Marca({ marca, className = 'h-7', conFondo = false }) {
    const nombre = marca || NOMBRE_PROPIO;

    if (nombre !== NOMBRE_PROPIO) {
        return (
            <span className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950">
                    <Store className="h-4 w-4" />
                </span>
                <span className="truncate font-display text-lg font-semibold tracking-tight">{nombre}</span>
            </span>
        );
    }

    if (conFondo) {
        return (
            <span className="inline-flex items-center rounded-xl bg-[#022c22] px-3 py-2">
                <img src="/marca/logo-blanco.svg" alt={nombre} className={`${className} w-auto`} />
            </span>
        );
    }

    // Se cambia por clase y no con <picture>, porque el tema lo elige la
    // persona en la app y no siempre coincide con el del sistema operativo.
    return (
        <span className="inline-flex items-center">
            <img src="/marca/logo-verde.svg" alt={nombre} className={`${className} w-auto dark:hidden`} />
            <img src="/marca/logo-blanco.svg" alt="" aria-hidden="true" className={`${className} hidden w-auto dark:block`} />
        </span>
    );
}
