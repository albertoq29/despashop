import { useCallback, useMemo, useState } from 'react';
import { Check, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { enlaceDeWhatsapp } from '@/utils/whatsapp';
import { SOMBRAS } from './estilos';

const TOPE = 20;

/**
 * Elegir varios productos y mandárselos todos juntos al comercio.
 *
 * Un cliente que quiere cinco cosas no debería escribir cinco veces. Se
 * marcan y sale un solo mensaje de WhatsApp con la lista.
 *
 * No hay un «modo selección» que haya que encender: el botón de agregar
 * está siempre en la tarjeta, y lo que ya está elegido lleva su marca
 * puesta. Así se ve de un vistazo qué llevas sin pasar el mouse por encima
 * ni acordarte de haber pulsado nada antes.
 */
export function useSeleccionMultiple(theme, comercio) {
    const [ids, setIds] = useState([]);

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

    const vaciar = useCallback(() => setIds([]), []);

    return useMemo(
        () => ({
            disponible,
            ids,
            tope: TOPE,
            lleno: ids.length >= TOPE,
            alternar,
            vaciar,
            tiene: (articulo) => ids.includes(articulo.id),
            // Los artículos se recogen mientras se pintan: la rejilla llega
            // por tandas y no hay una lista completa a mano.
            enlace: (articulos) => enlaceDeLaLista(articulos, comercio),
        }),
        [disponible, ids, alternar, vaciar, comercio],
    );
}

/**
 * El mensaje que se le manda al comercio.
 *
 * Cada línea lleva el nombre y la foto, que es lo único que identifica al
 * producto desde fuera del catálogo: así quien recibe el mensaje sabe cuál
 * es sin tener que adivinar por el nombre.
 */
function enlaceDeLaLista(articulos, comercio) {
    const lineas = articulos.map((articulo, indice) => {
        const foto = articulo.image_url ?? articulo.thumb_url ?? '';

        return `${indice + 1}. ${articulo.name}${foto ? `\n${foto}` : ''}`;
    });

    const mensaje = [
        `Hola, me interesan estos productos de ${comercio.name}:`,
        '',
        lineas.join('\n\n'),
    ].join('\n');

    return enlaceDeWhatsapp(comercio.whatsapp, mensaje);
}

/**
 * El más de la tarjeta, que se queda en check al elegirlo.
 *
 * Está siempre a la vista, no al pasar el mouse: en un teléfono no hay
 * mouse que pasar, y en una computadora obligaría a recorrer la rejilla
 * para saber qué llevas.
 */
export function MarcaDeSeleccion({ articulo, seleccion }) {
    if (!seleccion?.disponible) {
        return null;
    }

    const elegido = seleccion.tiene(articulo);

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={elegido}
            aria-label={elegido ? `Quitar ${articulo.name} de tu consulta` : `Agregar ${articulo.name} a tu consulta`}
            title={elegido ? 'Quitar de la consulta' : 'Agregar a la consulta'}
            onClick={(evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                seleccion.alternar(articulo);
            }}
            disabled={!elegido && seleccion.lleno}
            className="cat-boton absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md disabled:opacity-40"
            style={
                elegido
                    ? {
                          background: 'var(--cat-primario)',
                          color: 'var(--cat-sobre-primario, #fff)',
                          outline: '2px solid var(--cat-primario)',
                          outlineOffset: '2px',
                      }
                    : { background: 'rgba(0,0,0,0.42)', color: '#fff' }
            }
        >
            {elegido ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
    );
}

/**
 * El mismo botón dentro de la ventana del producto, junto al de WhatsApp.
 *
 * Quien abrió un producto para mirarlo de cerca es justo quien decide
 * llevárselo, y cerrar la ventana para buscar el más de la tarjeta es un
 * paso que no hace falta.
 */
export function BotonAgregarALaConsulta({ articulo, seleccion }) {
    if (!seleccion?.disponible) {
        return null;
    }

    const elegido = seleccion.tiene(articulo);
    const topado = !elegido && seleccion.lleno;

    return (
        <button
            type="button"
            onClick={() => seleccion.alternar(articulo)}
            disabled={topado}
            className="cat-boton mt-2.5 flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-50"
            style={{
                borderRadius: 'var(--cat-radio)',
                border: `1px solid ${elegido ? 'var(--cat-primario)' : 'color-mix(in srgb, var(--cat-texto) 22%, transparent)'}`,
                background: elegido ? 'color-mix(in srgb, var(--cat-primario) 12%, transparent)' : 'transparent',
                color: elegido ? 'var(--cat-primario)' : 'var(--cat-texto)',
            }}
        >
            {elegido ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {elegido ? 'Ya está en tu consulta' : topado ? `Solo caben ${seleccion.tope}` : 'Agregar a mi consulta'}
        </button>
    );
}

/**
 * Barra de abajo con lo que lleva elegido.
 *
 * Aparece sola con el primero y desaparece al vaciarla: mientras no haya
 * nada elegido no hay nada que decir, y una barra fija tapando el catálogo
 * sin contenido estorba.
 */
export function BarraDeSeleccion({ seleccion, articulos = [] }) {
    if (!seleccion?.disponible || seleccion.ids.length === 0) {
        return null;
    }

    const elegidos = articulos.filter((articulo) => seleccion.tiene(articulo));
    const cuantos = seleccion.ids.length;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
            <div
                className="cat-dialogo mx-auto flex max-w-2xl items-center gap-2 p-2.5 pl-4"
                style={{
                    background: 'var(--cat-superficie)',
                    color: 'var(--cat-texto)',
                    borderRadius: 'calc(var(--cat-radio) + 6px)',
                    boxShadow: SOMBRAS.lg,
                    border: '1px solid color-mix(in srgb, var(--cat-texto) 12%, transparent)',
                }}
            >
                <span className="min-w-0 flex-1 text-sm font-medium">
                    {/* En un teléfono la frase entera deja al botón sin sitio */}
                    {cuantos} {cuantos === 1 ? 'producto' : 'productos'}
                    <span className="hidden sm:inline"> en tu consulta</span>
                    {seleccion.lleno && (
                        <span className="block text-xs" style={{ color: 'var(--cat-tenue)' }}>
                            Son los {seleccion.tope} que caben en un mensaje
                        </span>
                    )}
                </span>

                <button
                    type="button"
                    onClick={seleccion.vaciar}
                    aria-label="Vaciar la consulta"
                    title="Vaciar"
                    className="cat-boton grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    style={{ color: 'var(--cat-tenue)' }}
                >
                    <Trash2 className="h-4 w-4" />
                </button>

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
                    Enviar consulta
                </a>
            </div>
        </div>
    );
}
