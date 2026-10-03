import { createContext, useContext } from 'react';
import { aire, estiloBoton } from './estilos';
import { alCargarImagen, marcarCargada, useAparecer } from './movimiento';

/**
 * Lo que comparten todos los bloques del catálogo: el tema en uso (que en
 * el editor es el borrador sin guardar), el comercio y algunas acciones.
 */
export const VitrinaContexto = createContext(null);

export function useVitrina() {
    return useContext(VitrinaContexto);
}

/** Lleva la vista a un bloque sin tocar la URL ni saltar de golpe. */
export function irASeccion(id) {
    document.getElementById(`seccion-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function EncabezadoSeccion({ titulo, subtitulo, alineacion = 'left', accion = null }) {
    const { theme } = useVitrina();
    const ref = useAparecer();

    if (!titulo && !subtitulo && !accion) {
        return null;
    }

    const centrado = alineacion === 'center';

    return (
        <div
            ref={ref}
            className={`cat-aparecer flex gap-4 ${aire(theme).encabezado} ${
                centrado ? 'flex-col items-center text-center' : 'items-end justify-between'
            }`}
        >
            <div className={`min-w-0 ${centrado ? 'max-w-2xl' : ''}`}>
                {titulo && (
                    <h2
                        className={`cat-titulo text-balance text-2xl font-semibold tracking-tight sm:text-3xl ${
                            centrado ? 'cat-titulo-centro' : ''
                        }`}
                        style={{ fontFamily: 'var(--cat-titulo)' }}
                    >
                        {titulo}
                    </h2>
                )}
                {subtitulo && (
                    <p className="mt-2 max-w-[60ch] text-pretty text-sm sm:text-base" style={{ color: 'var(--cat-tenue)' }}>
                        {subtitulo}
                    </p>
                )}
            </div>

            {accion && <div className="shrink-0">{accion}</div>}
        </div>
    );
}

/**
 * Hueco visible solo en el editor.
 *
 * Un bloque sin contenido no ocupa espacio en el catálogo público, pero en
 * el editor desaparecer sin dejar rastro hace pensar que algo se rompió.
 */
export function SinContenido({ texto }) {
    const { modoEditor } = useVitrina();

    if (!modoEditor) {
        return null;
    }

    return (
        <div className="mx-auto max-w-6xl px-5 py-6">
            <div
                className="rounded-xl border-2 border-dashed px-5 py-8 text-center text-sm"
                style={{ borderColor: 'color-mix(in srgb, var(--cat-texto) 22%, transparent)', color: 'var(--cat-tenue)' }}
            >
                {texto}
            </div>
        </div>
    );
}

/**
 * Botón del catálogo con el estilo elegido por el comercio.
 *
 * Sin enlace se comporta como botón. En el editor los enlaces externos
 * están bloqueados para no sacar al comercio de la vista previa.
 */
export function BotonCatalogo({ href, onClick, children, className = '', estilo, brillo = false, externo = false, ...resto }) {
    const { theme } = useVitrina();
    const clases = `cat-boton ${brillo ? 'cat-brillo' : ''} inline-flex items-center justify-center gap-2 font-semibold ${className}`;
    const style = estilo ?? estiloBoton(theme);

    if (href) {
        return (
            <a
                href={href}
                onClick={onClick}
                className={clases}
                style={style}
                {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}
                {...resto}
            >
                {children}
            </a>
        );
    }

    return (
        <button type="button" onClick={onClick} className={clases} style={style} {...resto}>
            {children}
        </button>
    );
}

/**
 * Imagen que entra con un fundido al terminar de cargar.
 *
 * En las rejillas se pide la versión liviana (`liviana`) y la completa queda
 * para cuando se abre el artículo. Si un catálogo viejo todavía no tiene su
 * miniatura hecha, la imagen cae sola a la original.
 */
export function Imagen({ className = '', src, liviana, ...props }) {
    const preferida = liviana || src;

    return (
        <img
            ref={marcarCargada}
            src={preferida}
            loading="lazy"
            decoding="async"
            onLoad={alCargarImagen}
            onError={(evento) => {
                if (liviana && src && evento.currentTarget.src !== src) {
                    evento.currentTarget.src = src;

                    return;
                }

                alCargarImagen(evento);
            }}
            className={`cat-imagen ${className}`}
            {...props}
        />
    );
}

/* ── Redes sociales ─────────────────────────────────────────────────────── */

const RUTAS_REDES = {
    instagram:
        'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4zm0 11a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm7-11.3a1.6 1.6 0 1 1-3.1 0 1.6 1.6 0 0 1 3.1 0z',
    facebook:
        'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z',
    tiktok:
        'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 1 1-2-2.7V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8.2 8.2 0 0 0 4.8 1.5V6.7h-1z',
    x: 'M17.8 3h3.1l-6.8 7.8 8 10.6h-6.3l-4.9-6.4-5.6 6.4H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.6h1.7L7.4 4.8H5.6l11.1 14.8z',
};

export const NOMBRES_REDES = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', x: 'X' };

export function IconoRed({ red, className = 'h-5 w-5' }) {
    const ruta = RUTAS_REDES[red];

    if (!ruta) {
        return null;
    }

    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d={ruta} />
        </svg>
    );
}

export function redesDelTema(theme) {
    return Object.entries(theme.social_links ?? {}).filter(([red, url]) => url && RUTAS_REDES[red]);
}
