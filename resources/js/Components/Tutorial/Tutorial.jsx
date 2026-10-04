import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import Escenario from './Escenario';
import { INICIAL as INICIAL_CATALOGO, PASOS_CATALOGO } from './guionCatalogo';
import { INICIAL as INICIAL_FACTURAS, PASOS_FACTURAS } from './guionFacturas';

/**
 * Reproductor de tutoriales.
 *
 * A la izquierda la pantalla de mentira donde las acciones se hacen solas;
 * a la derecha lo que está pasando, en una o dos frases. El comercio avanza
 * cuando quiere: nada se adelanta sin que pulse, porque un tutorial que
 * corre por su cuenta se siente como un video que no se puede pausar.
 */

export const TUTORIALES = {
    catalogo: {
        titulo: 'Personalizar tu catálogo',
        resumen: 'Temas, colores, formas, movimiento y bloques nuevos.',
        pasos: PASOS_CATALOGO,
        inicial: INICIAL_CATALOGO,
    },
    facturas: {
        titulo: 'Facturar paso a paso',
        resumen: 'Armar la factura, confirmarla y qué hacer si no se puede.',
        pasos: PASOS_FACTURAS,
        inicial: INICIAL_FACTURAS,
    },
};

const CLAVE_VISTOS = 'despashop.tutoriales.vistos';

export function marcarVisto(nombre) {
    try {
        const vistos = JSON.parse(localStorage.getItem(CLAVE_VISTOS) ?? '{}');
        localStorage.setItem(CLAVE_VISTOS, JSON.stringify({ ...vistos, [nombre]: true }));
    } catch (e) {
        // Sin almacenamiento el tutorial funciona igual; solo se vuelve a ofrecer
    }
}

export function yaLoVio(nombre) {
    try {
        return Boolean(JSON.parse(localStorage.getItem(CLAVE_VISTOS) ?? '{}')[nombre]);
    } catch (e) {
        return true;
    }
}

export default function Tutorial({ nombre, onCerrar }) {
    const tutorial = TUTORIALES[nombre];
    const [indice, setIndice] = useState(0);
    const [vuelta, setVuelta] = useState(0);
    const [estado, setEstado] = useState(() => ({ ...tutorial.inicial, ...(tutorial.pasos[0].estadoInicial ?? {}) }));
    const [listo, setListo] = useState(false);

    const paso = tutorial.pasos[indice];
    const ultimo = indice === tutorial.pasos.length - 1;

    const ir = useCallback(
        (siguiente) => {
            const destino = Math.max(0, Math.min(tutorial.pasos.length - 1, siguiente));

            setIndice(destino);
            setListo(false);
            setVuelta((v) => v + 1);

            // Un paso puede pedir su propio punto de partida; si no, se
            // sigue con lo que el comercio ya cambió en los pasos anteriores.
            const arranque = tutorial.pasos[destino].estadoInicial;

            if (arranque) {
                setEstado((anterior) => ({ ...anterior, ...arranque }));
            }
        },
        [tutorial],
    );

    useEffect(() => {
        const alPulsar = (evento) => {
            if (evento.key === 'ArrowRight') {
                ir(indice + 1);
            }

            if (evento.key === 'ArrowLeft') {
                ir(indice - 1);
            }
        };

        window.addEventListener('keydown', alPulsar);

        return () => window.removeEventListener('keydown', alPulsar);
    }, [indice, ir]);

    useEffect(() => {
        if (ultimo && listo) {
            marcarVisto(nombre);
        }
    }, [ultimo, listo, nombre]);

    const Escena = paso.escena;
    const avance = useMemo(() => ((indice + 1) / tutorial.pasos.length) * 100, [indice, tutorial.pasos.length]);

    return (
        <div className="flex max-h-[90vh] flex-col">
            <div className="shrink-0 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900 sm:px-6">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-marca-700 dark:text-marca-400">
                            Tutorial · paso {indice + 1} de {tutorial.pasos.length}
                        </p>
                        <h2 className="truncate font-display text-base font-semibold text-stone-900 dark:text-stone-100 sm:text-lg">
                            {tutorial.titulo}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar el tutorial"
                        className="pulsable -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                    <span
                        className="block h-full rounded-full bg-marca-600 transition-[width] duration-300 ease-salida dark:bg-marca-400"
                        style={{ width: `${avance}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),16rem]">
                    <Escenario
                        clave={`${indice}-${vuelta}`}
                        acciones={paso.acciones ?? []}
                        onEstado={(cambio) => setEstado(cambio)}
                        onListo={() => setListo(true)}
                    >
                        <Escena estado={estado} />
                    </Escenario>

                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-base font-semibold text-stone-900 dark:text-stone-100">
                                {paso.titulo}
                            </h3>

                            {/* Un paso que se puede saltar lo dice, para que
                                nadie sienta que le falta hacer algo */}
                            {paso.opcional && (
                                <span className="mt-0.5 shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                                    Opcional
                                </span>
                            )}
                        </div>
                        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{paso.texto}</p>

                        {paso.consejo && (
                            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-snug text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                {paso.consejo}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() => setVuelta((v) => v + 1)}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Repetir
                        </button>
                    </div>
                </div>
            </div>

            <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900 sm:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => ir(indice - 1)}
                        disabled={indice === 0}
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                    </button>

                    <div className="hidden min-w-0 flex-1 justify-center gap-1.5 sm:flex">
                        {tutorial.pasos.map((otro, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => ir(i)}
                                aria-label={`Paso ${i + 1}: ${otro.titulo}`}
                                aria-current={i === indice}
                                title={otro.titulo}
                                className={`h-2 rounded-full transition-all duration-200 ${
                                    i === indice
                                        ? 'w-6 bg-marca-600 dark:bg-marca-400'
                                        : 'w-2 bg-stone-300 hover:bg-stone-400 dark:bg-stone-700 dark:hover:bg-stone-600'
                                }`}
                            />
                        ))}
                    </div>

                    <span className="flex-1 sm:hidden" />

                    {ultimo ? (
                        <button
                            type="button"
                            onClick={() => {
                                marcarVisto(nombre);
                                onCerrar();
                            }}
                            className="pulsable boton-elevado inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                        >
                            <Check className="h-4 w-4" />
                            Entendido
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => ir(indice + 1)}
                            className="pulsable boton-elevado inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                        >
                            Siguiente
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
