import { enlaceDeWhatsapp } from '@/utils/whatsapp';
import { contrasteSobre, mezclar, opacidadHex } from '../colores';

/**
 * Traducción del tema guardado a estilos concretos.
 *
 * Los colores de marca viajan como variables CSS sobre la raíz del
 * catálogo, así que las clases nunca dependen de la paleta y el mismo
 * marcado sirve para cualquier comercio.
 */

export const RADIOS = { none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1.25rem', full: '1.75rem' };

export const SOMBRAS = {
    none: 'none',
    sm: '0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.04)',
    md: '0 4px 14px rgb(0 0 0 / 0.08)',
    lg: '0 14px 36px rgb(0 0 0 / 0.14)',
};

/** Espaciado del catálogo, según el aire que haya pedido el comercio. */
export const DENSIDAD = {
    compact: { seccion: 'py-6 sm:py-8', rejilla: 'gap-2.5', tarjeta: 'p-2.5', encabezado: 'mb-4' },
    normal: { seccion: 'py-10 sm:py-14', rejilla: 'gap-4', tarjeta: 'p-3.5', encabezado: 'mb-6' },
    airy: { seccion: 'py-14 sm:py-20', rejilla: 'gap-6', tarjeta: 'p-5', encabezado: 'mb-8' },
};

export const aire = (theme) => DENSIDAD[theme.density] ?? DENSIDAD.normal;

/** Cómo reacciona una tarjeta al pasar el puntero. */
export const EFECTO_TARJETA = {
    none: '',
    lift: 'cat-tarjeta-eleva',
    zoom: 'cat-tarjeta-acerca',
    border: 'cat-tarjeta-borde',
    glow: 'cat-tarjeta-brilla',
    tilt: 'cat-tarjeta-inclina',
};

/** Proporción del recuadro de la foto de un producto. */
export const RELACION_IMAGEN = {
    square: 'aspect-square',
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-[4/3]',
};

export const TAMANO_LOGO = { sm: 'h-8', md: 'h-10', lg: 'h-14' };

/** Cuánto pesa visualmente el precio dentro de la tarjeta. */
export const ESTILO_PRECIO = {
    normal: 'text-base font-semibold',
    destacado: 'text-xl font-bold tracking-tight',
    discreto: 'text-sm font-medium opacity-80',
};

export const COLUMNAS_MOVIL = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };

export const COLUMNAS_ESCRITORIO = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-3 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-4 lg:grid-cols-6',
};

export const BORDE_SUAVE = 'color-mix(in srgb, var(--cat-texto) 12%, transparent)';

export function variablesDelTema(theme) {
    return {
        '--cat-primario': theme.color_primary,
        '--cat-secundario': theme.color_secondary,
        '--cat-acento': theme.color_accent,
        '--cat-fondo': theme.color_bg,
        '--cat-superficie': theme.color_surface,
        '--cat-texto': theme.color_text,
        '--cat-tenue': theme.color_muted,
        '--cat-sobre-primario': contrasteSobre(theme.color_primary),
        '--cat-sobre-acento': contrasteSobre(theme.color_accent),
        '--cat-radio': RADIOS[theme.radius] ?? '0.75rem',
        '--cat-titulo': `"${theme.font_heading}", system-ui, sans-serif`,
        '--cat-cuerpo': `"${theme.font_body}", system-ui, sans-serif`,
    };
}

/**
 * Estilo de los botones del catálogo.
 *
 * El relleno usa el color de marca; el contorno y el suave lo usan como
 * borde o como fondo tenue, para que el botón no compita con las fotos.
 */
export function estiloBoton(theme) {
    const radio = theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)';

    if (theme.button_style === 'outline') {
        return {
            background: 'transparent',
            color: 'var(--cat-primario)',
            border: '1.5px solid var(--cat-primario)',
            borderRadius: radio,
        };
    }

    if (theme.button_style === 'soft') {
        return {
            background: 'color-mix(in srgb, var(--cat-primario) 14%, transparent)',
            color: 'var(--cat-primario)',
            border: '1.5px solid transparent',
            borderRadius: radio,
        };
    }

    return {
        background: 'var(--cat-primario)',
        color: 'var(--cat-sobre-primario)',
        border: '1.5px solid var(--cat-primario)',
        borderRadius: radio,
    };
}

/**
 * Fondo de la página según lo que haya elegido el comercio.
 *
 * El patrón se dibuja con degradados CSS en lugar de una imagen: pesa cero,
 * se adapta a cualquier color de marca y no hay archivo que se pueda perder.
 */
export function fondoDelCatalogo(theme) {
    const intensidad = (theme.background_intensity ?? 6) / 100;
    const base = { backgroundColor: 'var(--cat-fondo)' };

    if (theme.background_style === 'gradient') {
        return {
            backgroundColor: theme.color_bg,
            backgroundImage: `linear-gradient(160deg, ${theme.color_bg} 0%, ${mezclar(theme.color_bg, theme.color_primary, intensidad)} 100%)`,
            backgroundAttachment: 'fixed',
        };
    }

    if (theme.background_style === 'pattern') {
        const tinte = opacidadHex(theme.color_primary, intensidad);

        const patrones = {
            dots: {
                backgroundImage: `radial-gradient(${tinte} 1.5px, transparent 1.5px)`,
                backgroundSize: '18px 18px',
            },
            grid: {
                backgroundImage: `linear-gradient(${tinte} 1px, transparent 1px), linear-gradient(90deg, ${tinte} 1px, transparent 1px)`,
                backgroundSize: '26px 26px',
            },
            diagonal: {
                backgroundImage: `repeating-linear-gradient(45deg, ${tinte} 0 2px, transparent 2px 12px)`,
            },
            waves: {
                backgroundImage: `radial-gradient(circle at 50% 100%, ${tinte} 0 12px, transparent 12px)`,
                backgroundSize: '40px 20px',
            },
        };

        return { ...base, ...(patrones[theme.background_pattern] ?? patrones.dots) };
    }

    return base;
}

export function aFamilia(fuente) {
    return (fuente || 'Inter').toLowerCase().replace(/\s+/g, '-');
}

export function formatoBs(monto) {
    return Number(monto).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function enlaceWhatsapp(comercio, articulo = null, mensajeBase = '') {
    const mensaje = articulo
        ? `Hola, me interesa "${articulo.name}" de ${comercio.name}.`
        : mensajeBase || `Hola, vi el catálogo de ${comercio.name}.`;

    return enlaceDeWhatsapp(comercio.whatsapp, mensaje);
}
