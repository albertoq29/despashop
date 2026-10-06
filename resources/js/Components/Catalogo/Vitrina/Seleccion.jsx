import { useCallback, useMemo, useState } from 'react';
import { Check, MessageCircle, X } from 'lucide-react';
import { SOMBRAS } from './estilos';

const TOPE = 20;

/**
 * Elegir varios productos y mandárselos todos juntos al comercio.
 *
 * Un cliente que quiere cinco cosas no debería escribir cinco veces. Se
 * marcan y sale un solo mensaje de WhatsApp con la lista.
 *
 * Qué lleva cada línea depende de cómo el comercio abre sus productos: con
 * página propia va el enlace del producto, que es una dirección que el
 * comercio puede abrir y ver todo; con ventana flotante no hay página que
 * enlazar, así que va la foto, que al menos deja claro cuál es.
 */
export function useSeleccionMultiple(theme, comercio, rutaBase) {
    const [ids, setIds] = useState([]);
    const [activa, setActiva] = useState(false);

    const disponible = theme.multi_select !== false && Boolean(comercio.whatsapp);

    const alternar = useCallback((articulo) => {
        setIds((anteriores) =>
            anteriores.includes(articulo.id)
                ? anteriores.filter((id) => id !== articulo.id)
                : anteriores.length >= TOPE
                  ? anteriores
                  : [...anteriores, articulo.id],
        );
    }, []);

    const limpiar = useCallback(() => setIds([]), []);

    const cerrar = useCallback(() => {
        setActiva(false);
        setIds([]);
    }, []);

    return useMemo(
        () => ({
            disponible,
            activa: disponible && activa,
            ids,
            tope: TOPE,
            lleno: ids.length >= TOPE,
            alternar,
            limpiar,
            cerrar,
            abrir: () => setActiva(true),
            tiene: (articulo) => ids.includes(articulo.id),
            // Los artículos marcados se recogen mientras se pintan: la
            // rejilla llega por tandas y no hay una lista completa a mano.
            enlace: (articulos) => enlaceDeLaLista(articulos, theme, comercio, rutaBase),
        }),
        [disponible, activa, ids, alternar, limpiar, cerrar, theme, comercio, rutaBase],
    );
}

function enlaceDeLaLista(articulos, theme, comercio, rutaBase) {
    const numero = (comercio.whatsapp || '').replace(/\D/g, '');
    const conPagina = theme.product_view === 'pagina';
    const origen = typeof window === 'undefined' ? '' : window.location.origin;

    const lineas = articulos.map((articulo, indice) => {
        const enlace = conPagina
            ? `${origen}${rutaBase}/p/${articulo.id}`
            : (articulo.image_url ?? articulo.thumb_url ?? '');

        return `${indice + 1}. ${articulo.name}${enlace ? `\n${enlace}` : ''}`;
    });

    const mensaje = [
        `Hola, me interesan estos productos de ${comercio.name}:`,
        '',
        lineas.join('\n\n'),
    ].join('\n');

    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Marca de selección sobre la foto de una tarjeta.
 *
 * Solo aparece con el modo encendido: mientras no lo esté, la tarjeta se
 * comporta como siempre y no hay un recuadro extra estorbando la foto.
 */
export function MarcaDeSeleccion({ articulo, seleccion }) {
    if (!seleccion?.activa) {
        return null;
    }

    const marcado = seleccion.tiene(articulo);

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={marcado}
            aria-label={`${marcado ? 'Quitar' : 'Elegir'} ${articulo.name}`}
            onClick={(evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                seleccion.alternar(articulo);
            }}
            disabled={!marcado && seleccion.lleno}
            className="cat-boton absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition-transform duration-150 disabled:opacity-40"
            style={{
                background: marcado ? 'var(--cat-primario)' : 'rgba(0,0,0,0.42)',
                color: marcado ? 'var(--cat-sobre-primario, #fff)' : '#fff',
                outline: marcado ? '2px solid var(--cat-primario)' : 'none',
                outlineOffset: '2px',
            }}
        >
            {marcado ? <Check className="h-5 w-5" /> : <span className="h-4 w-4 rounded-full ring-2 ring-white/80" />}
        </button>
    );
}

/** Botón que enciende el modo, para la cabecera de la rejilla. */
export function BotonDeSeleccion({ seleccion }) {
    if (!seleccion?.disponible || seleccion.activa) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={seleccion.abrir}
            className="cat-boton inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
            style={{
                border: '1px solid color-mix(in srgb, var(--cat-texto) 18%, transparent)',
                borderRadius: 'var(--cat-radio)',
                color: 'var(--cat-tenue)',
            }}
        >
            <Check className="h-4 w-4" />
            Elegir varios
        </button>
    );
}

/**
 * Barra de abajo mientras se eligen productos.
 *
 * Se queda fija aunque no haya nada marcado: con el modo encendido hay que
 * poder apagarlo, y si desapareciera al desmarcar el último quedaría un
 * catálogo con recuadros y sin salida.
 */
export function BarraDeSeleccion({ seleccion, articulos = [] }) {
    if (!seleccion?.activa) {
        return null;
    }

    const elegidos = articulos.filter((articulo) => seleccion.tiene(articulo));
    const cuantos = seleccion.ids.length;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
            <div
                className="cat-dialogo mx-auto flex max-w-2xl items-center gap-3 p-2.5 pl-4"
                style={{
                    background: 'var(--cat-superficie)',
                    color: 'var(--cat-texto)',
                    borderRadius: 'calc(var(--cat-radio) + 6px)',
                    boxShadow: SOMBRAS.lg,
                    border: '1px solid color-mix(in srgb, var(--cat-texto) 12%, transparent)',
                }}
            >
                <span className="min-w-0 flex-1 text-sm font-medium">
                    {cuantos === 0
                        ? 'Toca los productos que quieras'
                        : `${cuantos} ${cuantos === 1 ? 'producto elegido' : 'productos elegidos'}`}
                    {seleccion.lleno && (
                        <span className="block text-xs" style={{ color: 'var(--cat-tenue)' }}>
                            Son los {seleccion.tope} que caben en un mensaje
                        </span>
                    )}
                </span>

                {cuantos > 0 && (
                    <a
                        href={seleccion.enlace(elegidos)}
                        target="_blank"
                        rel="noreferrer"
                        className="cat-boton inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                        style={{
                            background: 'var(--cat-primario)',
                            color: 'var(--cat-sobre-primario, #fff)',
                            borderRadius: 'var(--cat-radio)',
                        }}
                    >
                        <MessageCircle className="h-4 w-4" />
                        Enviar
                    </a>
                )}

                <button
                    type="button"
                    onClick={seleccion.cerrar}
                    aria-label="Salir de elegir varios"
                    className="cat-boton grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    style={{ color: 'var(--cat-tenue)' }}
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
