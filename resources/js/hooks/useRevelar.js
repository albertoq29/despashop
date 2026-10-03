import { useEffect, useRef } from 'react';

/**
 * Revela los hijos marcados con .revelar cuando entran en pantalla.
 *
 * Usa IntersectionObserver en lugar de escuchar el scroll: el navegador
 * agrupa las notificaciones y no se recalcula nada en cada fotograma.
 * El escalonado sale de --retraso, que se fija por índice.
 */
export function useRevelar({ escalonado = 60 } = {}) {
    const contenedor = useRef(null);

    useEffect(() => {
        const raiz = contenedor.current;

        if (!raiz) {
            return;
        }

        const elementos = Array.from(raiz.querySelectorAll('.revelar'));

        if (elementos.length === 0) {
            return;
        }

        // Sin soporte o con movimiento reducido, todo queda visible de una vez
        const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reducido || typeof IntersectionObserver === 'undefined') {
            elementos.forEach((elemento) => elemento.classList.add('visible'));

            return;
        }

        const revelar = (elemento, escalonar) => {
            if (elemento.classList.contains('visible')) {
                return;
            }

            if (escalonar) {
                const hermanos = Array.from(
                    elemento.parentElement?.querySelectorAll(':scope > .revelar') ?? [],
                );
                const indice = Math.max(hermanos.indexOf(elemento), 0);

                elemento.style.setProperty('--retraso', `${indice * escalonado}ms`);
            }

            elemento.classList.add('visible');
        };

        const observador = new IntersectionObserver(
            (entradas) => {
                entradas.forEach((entrada) => {
                    // Con un scroll rápido (o un salto de ancla) un elemento puede
                    // cruzar la pantalla sin llegar a notificarse como visible.
                    // Si ya quedó por encima, se revela sin animar: nunca debe
                    // quedar contenido invisible detrás del usuario.
                    const yaPaso = entrada.boundingClientRect.bottom < 0;

                    if (!entrada.isIntersecting && !yaPaso) {
                        return;
                    }

                    revelar(entrada.target, entrada.isIntersecting);
                    observador.unobserve(entrada.target);
                });
            },
            { threshold: 0, rootMargin: '0px 0px -8% 0px' },
        );

        elementos.forEach((elemento) => observador.observe(elemento));

        return () => observador.disconnect();
    }, [escalonado]);

    return contenedor;
}
