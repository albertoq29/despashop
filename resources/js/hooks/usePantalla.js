import { useEffect, useState } from 'react';

/**
 * Si la pantalla da para algo, en tiempo real.
 *
 * Hay cosas que solo caben en una computadora —una tabla de doce columnas,
 * por ejemplo— y que en un teléfono no se arreglan achicando: hay que
 * ofrecer otra manera de hacer lo mismo.
 */
export function useConsultaDeMedios(consulta) {
    const [coincide, setCoincide] = useState(() => {
        if (typeof window === 'undefined' || ! window.matchMedia) {
            return false;
        }

        return window.matchMedia(consulta).matches;
    });

    useEffect(() => {
        if (! window.matchMedia) {
            return undefined;
        }

        const medio = window.matchMedia(consulta);
        const alCambiar = () => setCoincide(medio.matches);

        // También al redimensionar: el evento `change` de la consulta no
        // siempre llega —no llega al emular una pantalla en las herramientas
        // del navegador, por ejemplo— y entonces la interfaz se queda
        // anclada al tamaño que había al abrir la página.
        medio.addEventListener('change', alCambiar);
        window.addEventListener('resize', alCambiar);
        alCambiar();

        return () => {
            medio.removeEventListener('change', alCambiar);
            window.removeEventListener('resize', alCambiar);
        };
    }, [consulta]);

    return coincide;
}

/** El mismo corte que usa `lg:` en Tailwind, para que nada se contradiga. */
export function useEsEscritorio() {
    return useConsultaDeMedios('(min-width: 1024px)');
}
