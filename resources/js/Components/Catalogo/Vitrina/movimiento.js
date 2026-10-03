import { useEffect, useRef, useState } from 'react';

/**
 * Movimiento del catálogo público.
 *
 * El estado "ya apareció" se guarda en un atributo `data-visible` y no en
 * una clase: React reescribe `className` entero cada vez que cambia, y en
 * el editor el tema cambia con cada tecla. Con una clase, cualquier ajuste
 * volvía a esconder las tarjetas que ya estaban en pantalla.
 */

let observador = null;
const registrados = new Set();

function obtenerObservador() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        return null;
    }

    if (!observador) {
        observador = new IntersectionObserver(
            (entradas) => {
                for (const entrada of entradas) {
                    if (entrada.isIntersecting) {
                        entrada.target.dataset.visible = '';
                        observador.unobserve(entrada.target);
                    }
                }
            },
            { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
        );
    }

    return observador;
}

/** Devuelve una ref: el elemento aparece al entrar en pantalla, con el retraso indicado. */
export function useAparecer(retraso = 0) {
    const ref = useRef(null);

    useEffect(() => {
        const elemento = ref.current;
        const io = obtenerObservador();

        if (!elemento) {
            return undefined;
        }

        if (!io) {
            elemento.dataset.visible = '';

            return undefined;
        }

        elemento.style.setProperty('--retraso', `${retraso}ms`);
        registrados.add(elemento);
        io.observe(elemento);

        return () => {
            registrados.delete(elemento);
            io.unobserve(elemento);
        };
    }, [retraso]);

    return ref;
}

/**
 * Vuelve a reproducir las apariciones. Lo usa el editor al cambiar el
 * nivel de animación, para que el comercio vea lo que acaba de elegir.
 */
export function repetirApariciones() {
    const io = obtenerObservador();

    if (!io) {
        return;
    }

    registrados.forEach((elemento) => {
        // Sin transición al esconder: si no, el regreso a la vista se
        // mezcla con la salida y la animación apenas se nota.
        elemento.style.transition = 'none';
        delete elemento.dataset.visible;
        void elemento.offsetHeight;
        elemento.style.transition = '';
        io.unobserve(elemento);
        io.observe(elemento);
    });
}

/**
 * Posición del scroll resumida en dos banderas. Solo provoca un render
 * cuando alguna cambia, no en cada píxel desplazado.
 */
export function useDesplazamiento(umbralLejos = 900) {
    const [estado, setEstado] = useState({ desplazado: false, lejos: false });

    useEffect(() => {
        let pendiente = false;

        const medir = () => {
            pendiente = false;
            const y = window.scrollY;

            setEstado((anterior) => {
                const siguiente = { desplazado: y > 8, lejos: y > umbralLejos };

                return anterior.desplazado === siguiente.desplazado && anterior.lejos === siguiente.lejos
                    ? anterior
                    : siguiente;
            });
        };

        const alDesplazar = () => {
            if (!pendiente) {
                pendiente = true;
                requestAnimationFrame(medir);
            }
        };

        medir();
        window.addEventListener('scroll', alDesplazar, { passive: true });

        return () => window.removeEventListener('scroll', alDesplazar);
    }, [umbralLejos]);

    return estado;
}

/**
 * Cuánto se ha recorrido de la página, de 0 a 1.
 *
 * Se redondea a centésimas: un número con todos sus decimales provocaba un
 * render por píxel desplazado sin que se notara en pantalla.
 */
export function useProgresoDeScroll() {
    const [progreso, setProgreso] = useState(0);

    useEffect(() => {
        let pendiente = false;

        const medir = () => {
            pendiente = false;
            const alto = document.documentElement.scrollHeight - window.innerHeight;
            const valor = alto > 0 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;

            setProgreso((anterior) => {
                const redondeado = Math.round(valor * 100) / 100;

                return anterior === redondeado ? anterior : redondeado;
            });
        };

        const alDesplazar = () => {
            if (!pendiente) {
                pendiente = true;
                requestAnimationFrame(medir);
            }
        };

        medir();
        window.addEventListener('scroll', alDesplazar, { passive: true });
        window.addEventListener('resize', alDesplazar);

        return () => {
            window.removeEventListener('scroll', alDesplazar);
            window.removeEventListener('resize', alDesplazar);
        };
    }, []);

    return progreso;
}

/**
 * Marca una imagen como cargada para que entre con un fundido.
 *
 * También revisa `complete` al montarse: una imagen que ya estaba en la
 * caché puede terminar de cargar antes de que React escuche el evento, y
 * sin esta comprobación se quedaría invisible.
 */
export function marcarCargada(imagen) {
    if (imagen && imagen.complete && imagen.naturalWidth > 0) {
        imagen.dataset.cargada = '';
    }
}

export const alCargarImagen = (evento) => {
    evento.currentTarget.dataset.cargada = '';
};
