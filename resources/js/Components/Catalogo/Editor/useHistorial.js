import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * Deshacer y rehacer para el editor del catálogo.
 *
 * Cada cambio no se guarda al instante: se espera a que el comercio deje
 * de tocar un momento. Así escribir un título o arrastrar un color cuenta
 * como un solo paso y no como cincuenta.
 */
export function useHistorial(datos, reemplazar, { espera = 450, limite = 60 } = {}) {
    const pasado = useRef([]);
    const futuro = useRef([]);
    const confirmado = useRef(datos);
    const aplicando = useRef(false);
    const [, refrescar] = useReducer((n) => n + 1, 0);

    useEffect(() => {
        if (aplicando.current) {
            aplicando.current = false;
            confirmado.current = datos;
            refrescar();

            return undefined;
        }

        const temporizador = setTimeout(() => {
            if (datos === confirmado.current) {
                return;
            }

            pasado.current = [...pasado.current.slice(-(limite - 1)), confirmado.current];
            futuro.current = [];
            confirmado.current = datos;
            refrescar();
        }, espera);

        return () => clearTimeout(temporizador);
    }, [datos, espera, limite]);

    // Un cambio aún sin confirmar también se puede deshacer: vuelve al
    // último estado confirmado, que es justo el anterior a ese cambio.
    const pendiente = datos !== confirmado.current;

    const deshacer = useCallback(() => {
        const objetivo = pendiente ? confirmado.current : pasado.current.pop();

        if (!objetivo) {
            return;
        }

        futuro.current.push(datos);
        aplicando.current = true;
        reemplazar(objetivo);
    }, [datos, pendiente, reemplazar]);

    const rehacer = useCallback(() => {
        const objetivo = futuro.current.pop();

        if (!objetivo) {
            return;
        }

        pasado.current.push(datos);
        aplicando.current = true;
        reemplazar(objetivo);
    }, [datos, reemplazar]);

    return {
        deshacer,
        rehacer,
        puedeDeshacer: pendiente || pasado.current.length > 0,
        puedeRehacer: futuro.current.length > 0,
    };
}
