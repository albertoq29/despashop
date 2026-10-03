import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MENSAJES } from '@/Components/Catalogo/Vitrina/Editable';

/** Ancho real con el que se dibuja el catálogo en cada dispositivo. */
const ANCHOS = { escritorio: 1280, movil: 390 };
const ALTO_TELEFONO = 844;

/**
 * Canal con la vista previa. Solo acepta mensajes del iframe propio y del
 * mismo origen; `conexion` cambia cada vez que la vista previa avisa que
 * está lista, para volver a mandarle el borrador.
 */
export function useVistaPrevia(onMensaje) {
    const iframeRef = useRef(null);
    const manejador = useRef(onMensaje);
    const [conexion, setConexion] = useState(0);

    manejador.current = onMensaje;

    useEffect(() => {
        const alRecibir = (evento) => {
            if (evento.origin !== window.location.origin || evento.source !== iframeRef.current?.contentWindow) {
                return;
            }

            if (evento.data?.tipo === MENSAJES.listo) {
                setConexion((n) => n + 1);

                return;
            }

            manejador.current?.(evento.data ?? {});
        };

        window.addEventListener('message', alRecibir);

        return () => window.removeEventListener('message', alRecibir);
    }, []);

    const enviar = useCallback((mensaje) => {
        iframeRef.current?.contentWindow?.postMessage(mensaje, window.location.origin);
    }, []);

    return { iframeRef, conexion, listo: conexion > 0, enviar };
}

/**
 * Lienzo de la vista previa.
 *
 * El catálogo se dibuja a su ancho real (1280 px en computadora, 390 en
 * teléfono) y se escala para caber en la columna. Así se ve la versión de
 * escritorio de verdad y no una versión apretada que parece de teléfono.
 */
export function Lienzo({ url, iframeRef, listo, dispositivo, completo = false }) {
    const marco = useRef(null);
    const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
    // Una vez montado, el iframe se queda: ocultar el lienzo en el teléfono
    // no debe obligar a cargar el catálogo otra vez al volver a abrirlo.
    const [montado, setMontado] = useState(false);

    useEffect(() => {
        if (medida.ancho > 0) {
            setMontado(true);
        }
    }, [medida.ancho]);

    useLayoutEffect(() => {
        const elemento = marco.current;

        if (!elemento) {
            return undefined;
        }

        // Primera medida antes de pintar: sin ella, el marco nace con el ancho
        // de escritorio completo y se ve desbordado hasta que llega el observador.
        const estilo = getComputedStyle(elemento);
        setMedida({
            ancho: elemento.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight),
            alto: elemento.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom),
        });

        const observador = new ResizeObserver(([entrada]) => {
            setMedida({ ancho: entrada.contentRect.width, alto: entrada.contentRect.height });
        });

        observador.observe(elemento);

        return () => observador.disconnect();
    }, []);

    const movil = dispositivo === 'movil';
    const anchoBase = ANCHOS[dispositivo] ?? ANCHOS.escritorio;
    // En un teléfono no tiene sentido dibujar otro teléfono: la vista ocupa toda la pantalla
    const holgura = completo ? 0 : movil ? 28 : 20;

    // La medida ya viene sin el relleno del lienzo, que es la holgura
    const anchoUtil = Math.max(0, medida.ancho);
    const altoUtil = Math.max(0, medida.alto);
    const escala = anchoUtil > 0 ? Math.min(1, anchoUtil / anchoBase) : 1;

    const anchoMarco = anchoBase * escala;
    const altoMarco = movil && !completo ? Math.min(altoUtil, ALTO_TELEFONO * escala) : altoUtil;

    return (
        <div
            ref={marco}
            className={`lienzo-fondo relative flex min-h-0 flex-1 justify-center overflow-hidden ${movil ? 'items-center' : 'items-start'}`}
            style={{ padding: holgura }}
        >
            <div
                className={`relative shrink-0 overflow-hidden bg-white transition-[width,height,border-radius] duration-500 ease-suave ${
                    completo
                        ? ''
                        : movil
                        ? 'rounded-[2.25rem] shadow-2xl ring-[6px] ring-stone-900 dark:ring-stone-700'
                        : 'rounded-xl shadow-xl ring-1 ring-stone-900/10 dark:ring-white/10'
                }`}
                style={{ width: anchoMarco || '100%', height: altoMarco || '100%' }}
            >
                {montado && (
                    <iframe
                        ref={iframeRef}
                        src={url}
                        title="Vista previa del catálogo"
                        className="absolute left-0 top-0 origin-top-left border-0"
                        style={{
                            width: anchoBase,
                            height: Math.max(altoMarco, 1) / escala,
                            transform: `scale(${escala})`,
                        }}
                    />
                )}

                {!listo && <CargandoVistaPrevia />}
            </div>
        </div>
    );
}

function CargandoVistaPrevia() {
    return (
        <div className="absolute inset-0 space-y-4 bg-white p-6 dark:bg-stone-900" aria-label="Cargando vista previa">
            <div className="h-10 w-1/3 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
            <div className="h-40 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
            <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
                ))}
            </div>
        </div>
    );
}
