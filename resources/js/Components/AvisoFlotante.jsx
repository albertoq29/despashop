import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

const TONOS = {
    promo: {
        marco: 'border-marca-300 dark:border-marca-800',
        franja: 'bg-marca-700 dark:bg-marca-500',
        boton: 'bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400',
    },
    info: {
        marco: 'border-sky-300 dark:border-sky-800',
        franja: 'bg-sky-600 dark:bg-sky-500',
        boton: 'bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-stone-950',
    },
    aviso: {
        marco: 'border-amber-300 dark:border-amber-800',
        franja: 'bg-amber-500',
        boton: 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-stone-950',
    },
};

const CLAVE = 'despashop.aviso';

/**
 * Aviso flotante de la portada.
 *
 * Aparece una vez pasados unos segundos, no al instante: quien acaba de
 * llegar está leyendo el titular, y taparlo de entrada hace que cierre sin
 * mirar. Lo que ya cerró no vuelve a salirle según la frecuencia elegida,
 * y eso se guarda en su navegador, que es donde corresponde algo que solo
 * le estorba a él.
 */
export default function AvisoFlotante({ aviso }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!aviso || yaLoVio(aviso)) {
            return undefined;
        }

        const temporizador = setTimeout(() => setVisible(true), (aviso.delay_seconds ?? 2) * 1000);

        return () => clearTimeout(temporizador);
    }, [aviso]);

    if (!aviso || !visible) {
        return null;
    }

    const tono = TONOS[aviso.tone] ?? TONOS.promo;
    const alCentro = aviso.position === 'centro';

    const cerrar = () => {
        marcarVisto(aviso);
        setVisible(false);
    };

    const tarjeta = (
        <div
            role="dialog"
            aria-modal={alCentro}
            aria-label={aviso.title}
            className={`animate-acercar relative overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-stone-900 ${tono.marco} ${
                alCentro ? 'w-full max-w-md' : 'w-full max-w-sm'
            }`}
        >
            <span className={`block h-1.5 w-full ${tono.franja}`} />

            <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar el aviso"
                className="pulsable absolute right-2 top-3.5 grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
                <X className="h-4 w-4" />
            </button>

            {aviso.image_url && (
                <img
                    src={aviso.image_url}
                    alt=""
                    className="h-36 w-full object-cover sm:h-44"
                />
            )}

            <div className="p-5 pr-12 sm:p-6 sm:pr-12">
                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {aviso.title}
                </h2>

                {aviso.body && (
                    <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{aviso.body}</p>
                )}

                {aviso.cta_text && aviso.cta_link && (
                    <a
                        href={aviso.cta_link}
                        onClick={cerrar}
                        className={`pulsable boton-elevado mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold sm:w-auto ${tono.boton}`}
                    >
                        {aviso.cta_text}
                        <ArrowRight className="h-4 w-4" />
                    </a>
                )}
            </div>
        </div>
    );

    if (!alCentro) {
        return <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">{tarjeta}</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={cerrar} aria-hidden="true" />
            <div className="relative w-full max-w-md">{tarjeta}</div>
        </div>
    );
}

/* ── Memoria por navegador ──────────────────────────────────────────────── */

/**
 * Si este visitante ya lo cerró y todavía no toca volver a mostrárselo.
 *
 * Se guarda el momento en que lo cerró, no un simple «sí»: con eso la
 * frecuencia diaria se calcula sin tener que limpiar nada.
 */
function yaLoVio(aviso) {
    if (aviso.frequency === 'siempre') {
        return false;
    }

    try {
        const almacen = aviso.frequency === 'una_vez_sesion' ? sessionStorage : localStorage;
        const cerrado = Number(almacen.getItem(`${CLAVE}.${aviso.id}`));

        if (!cerrado) {
            return false;
        }

        return aviso.frequency === 'una_vez_sesion' || Date.now() - cerrado < 24 * 60 * 60 * 1000;
    } catch (e) {
        // Sin almacenamiento el aviso sale siempre; es preferible a no salir
        return false;
    }
}

function marcarVisto(aviso) {
    if (aviso.frequency === 'siempre') {
        return;
    }

    try {
        const almacen = aviso.frequency === 'una_vez_sesion' ? sessionStorage : localStorage;
        almacen.setItem(`${CLAVE}.${aviso.id}`, String(Date.now()));
    } catch (e) {
        // Que no se pueda recordar no es razón para romper la portada
    }
}
