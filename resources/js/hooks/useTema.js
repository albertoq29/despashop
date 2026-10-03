import { useCallback, useEffect, useState } from 'react';

const CLAVE = 'despashop-tema';

/** Clave anterior: se sigue leyendo para no resetear el tema de quien ya eligió. */
const CLAVE_ANTERIOR = 'catalogizador-tema';

/**
 * Tema de la plataforma: claro, oscuro o el del sistema.
 *
 * El valor se aplica sobre <html class="dark"> y se guarda en el navegador.
 * El parpadeo inicial lo evita el script en línea de app.blade.php, que corre
 * antes de pintar; este hook solo mantiene el estado sincronizado.
 */
export function useTema() {
    const [tema, setTemaEstado] = useState(() => leerPreferencia());
    const [esOscuro, setEsOscuro] = useState(() => resolverOscuro(leerPreferencia()));

    const aplicar = useCallback((valor) => {
        const oscuro = resolverOscuro(valor);

        document.documentElement.classList.toggle('dark', oscuro);
        document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
        setEsOscuro(oscuro);
    }, []);

    const setTema = useCallback(
        (valor) => {
            if (valor === 'sistema') {
                localStorage.removeItem(CLAVE);
                localStorage.removeItem(CLAVE_ANTERIOR);
            } else {
                localStorage.setItem(CLAVE, valor);
            }

            setTemaEstado(valor);
            aplicar(valor);
        },
        [aplicar],
    );

    // Con "sistema" seleccionado, seguimos los cambios del sistema operativo
    useEffect(() => {
        if (tema !== 'sistema') {
            return;
        }

        const consulta = window.matchMedia('(prefers-color-scheme: dark)');
        const alCambiar = () => aplicar('sistema');

        consulta.addEventListener('change', alCambiar);

        return () => consulta.removeEventListener('change', alCambiar);
    }, [tema, aplicar]);

    return { tema, esOscuro, setTema, alternar: () => setTema(esOscuro ? 'claro' : 'oscuro') };
}

function leerPreferencia() {
    if (typeof window === 'undefined') {
        return 'sistema';
    }

    return localStorage.getItem(CLAVE) ?? localStorage.getItem(CLAVE_ANTERIOR) ?? 'sistema';
}

function resolverOscuro(valor) {
    if (typeof window === 'undefined') {
        return false;
    }

    if (valor === 'oscuro') {
        return true;
    }

    if (valor === 'claro') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
