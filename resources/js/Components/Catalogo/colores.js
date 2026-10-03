/**
 * Utilidades de color que comparten el catálogo público y su editor.
 *
 * El comercio elige sus colores con total libertad, así que nada puede dar
 * por hecho que el primario es oscuro o que el fondo es claro: cada texto
 * sobre un color de marca se decide aquí, midiendo su luminancia.
 */

export function aRgb(hex) {
    const limpio = String(hex || '').trim().replace('#', '');

    if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(limpio)) {
        return null;
    }

    const completo =
        limpio.length === 3
            ? limpio[0] + limpio[0] + limpio[1] + limpio[1] + limpio[2] + limpio[2]
            : limpio;

    return [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16));
}

/** Luminancia relativa de WCAG, de 0 (negro) a 1 (blanco). */
export function luminancia(hex) {
    const canales = aRgb(hex);

    if (!canales) {
        return 1;
    }

    return canales
        .map((canal) => {
            const c = canal / 255;

            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((total, c, i) => total + c * [0.2126, 0.7152, 0.0722][i], 0);
}

/** Blanco o casi negro, según cuál se lea mejor sobre el color dado. */
export function contrasteSobre(hex) {
    return luminancia(hex) > 0.45 ? '#1c1917' : '#ffffff';
}

export function esOscuro(hex) {
    return luminancia(hex) < 0.2;
}

/** Añade opacidad a un color hexadecimal, en formato de 8 dígitos. */
export function opacidadHex(hex, opacidad) {
    const canales = aRgb(hex) ?? [0, 0, 0];
    const alfa = Math.round(Math.min(Math.max(opacidad, 0), 1) * 255)
        .toString(16)
        .padStart(2, '0');

    return `#${canales.map((c) => c.toString(16).padStart(2, '0')).join('')}${alfa}`;
}

/** Mezcla dos colores en la proporción indicada (0 = el primero, 1 = el segundo). */
export function mezclar(unHex, otroHex, proporcion) {
    const a = aRgb(unHex) ?? [255, 255, 255];
    const b = aRgb(otroHex) ?? [0, 0, 0];

    const canales = a.map((canal, i) => Math.round(canal + (b[i] - canal) * proporcion));

    return `rgb(${canales.join(' ')})`;
}
