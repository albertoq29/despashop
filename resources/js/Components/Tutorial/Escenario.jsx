import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Escenario de un tutorial: una interfaz de mentira donde las acciones se
 * hacen solas.
 *
 * Un tutorial escrito no se lee; uno que mueve el puntero, pulsa y muestra
 * cómo reacciona la pantalla se entiende sin leer. Así que aquí no se
 * explica la app: se imita.
 *
 * Nada de esto toca la app real. El escenario pinta piezas falsas a partir
 * de un estado de mentira, y cada paso del guion declara qué acciones hacer
 * sobre esas piezas; el estado cambia y la pantalla falsa responde como
 * respondería la de verdad.
 *
 * El puntero se mueve midiendo la posición de su objetivo con
 * `getBoundingClientRect`, nunca con `requestAnimationFrame`: en algunos
 * entornos (el panel del navegador del editor, por ejemplo) los cuadros no
 * avanzan y una animación basada en ellos se quedaría congelada a medias.
 */

const EscenarioContexto = createContext(null);

export function useEscenario() {
    return useContext(EscenarioContexto) ?? { registrar: () => {}, activo: null, pulsando: false };
}

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

/** Cuánto tarda el puntero en llegar de una pieza a otra. */
const VIAJE = 520;

export default function Escenario({ acciones = [], onEstado, onListo, reproducir = true, clave, children }) {
    const lienzo = useRef(null);
    const objetivos = useRef(new Map());
    const [puntero, setPuntero] = useState(null);
    const [pulsando, setPulsando] = useState(false);
    const [activo, setActivo] = useState(null);
    const [nota, setNota] = useState(null);

    const registrar = useCallback((nombre, elemento) => {
        if (elemento) {
            objetivos.current.set(nombre, elemento);
        } else {
            objetivos.current.delete(nombre);
        }
    }, []);

    const irA = useCallback((nombre) => {
        const elemento = objetivos.current.get(nombre);
        const marco = lienzo.current;

        if (!elemento || !marco) {
            return false;
        }

        const caja = marco.getBoundingClientRect();
        const destino = elemento.getBoundingClientRect();

        setPuntero({
            x: destino.left - caja.left + destino.width / 2,
            y: destino.top - caja.top + destino.height / 2,
        });

        return true;
    }, []);

    // El guion de cada paso se ejecuta una vez. `cancelado` corta la
    // secuencia si el usuario pasa al paso siguiente a mitad de camino:
    // sin eso, las acciones del paso viejo seguirían cambiando el estado.
    useEffect(() => {
        if (!reproducir) {
            return undefined;
        }

        let cancelado = false;
        const detenido = () => cancelado;

        const correr = async () => {
            // Un instante para que las piezas del paso ya estén medidas
            await esperar(260);

            for (const accion of acciones) {
                if (detenido()) {
                    return;
                }

                setNota(accion.nota ?? null);

                if (accion.en) {
                    irA(accion.en);
                    setActivo(accion.en);
                    await esperar(VIAJE);
                }

                if (detenido()) {
                    return;
                }

                if (accion.escribir) {
                    for (let letra = 1; letra <= accion.escribir.length; letra++) {
                        if (detenido()) {
                            return;
                        }

                        const parcial = accion.escribir.slice(0, letra);
                        onEstado?.(accion.aplicar(parcial));
                        await esperar(45);
                    }
                } else if (accion.arrastrar) {
                    setPulsando(true);
                    await esperar(200);
                    irA(accion.arrastrar);
                    await esperar(VIAJE);
                    accion.clic && onEstado?.(accion.clic);
                    setPulsando(false);
                } else if (accion.clic) {
                    setPulsando(true);
                    await esperar(190);
                    onEstado?.(accion.clic);
                    setPulsando(false);
                }

                await esperar(accion.espera ?? 760);
            }

            if (!detenido()) {
                setActivo(null);
                setNota(null);
                onListo?.();
            }
        };

        correr();

        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, reproducir]);

    return (
        <EscenarioContexto.Provider value={{ registrar, activo, pulsando }}>
            <div
                ref={lienzo}
                className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 p-3 dark:border-stone-800 dark:bg-stone-950 sm:p-5"
            >
                {children}

                {puntero && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 z-20"
                        style={{
                            transform: `translate(${puntero.x}px, ${puntero.y}px)`,
                            transition: `transform ${VIAJE}ms cubic-bezier(0.33, 1, 0.3, 1)`,
                        }}
                    >
                        <span
                            className="absolute -left-1 -top-1 block h-9 w-9 rounded-full bg-marca-500/35"
                            style={{
                                transform: pulsando ? 'scale(1)' : 'scale(0)',
                                opacity: pulsando ? 1 : 0,
                                transition: 'transform 220ms ease-out, opacity 260ms ease-out',
                            }}
                        />

                        <svg viewBox="0 0 24 24" className="relative block h-6 w-6 drop-shadow" aria-hidden="true">
                            <path
                                d="M5 2.5 19 12l-6.3 1.1 3 6.4-2.6 1.2-3-6.4L5 18.8z"
                                fill="#ffffff"
                                stroke="#1c1917"
                                strokeWidth="1.3"
                                strokeLinejoin="round"
                            />
                        </svg>

                        {nota && (
                            <span className="absolute left-7 top-5 whitespace-nowrap rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
                                {nota}
                            </span>
                        )}
                    </span>
                )}
            </div>
        </EscenarioContexto.Provider>
    );
}

/* ── Piezas de la interfaz de mentira ───────────────────────────────────── */

/**
 * Envoltura de una pieza con la que el puntero puede interactuar.
 *
 * Se anuncia al escenario con su nombre para que el puntero sepa dónde
 * está, y se ilumina mientras es el objetivo del paso.
 */
export function Objetivo({ nombre, children, className = '', resaltar = true }) {
    const { registrar, activo } = useEscenario();
    const propio = useRef(null);

    useEffect(() => {
        registrar(nombre, propio.current);

        return () => registrar(nombre, null);
    }, [nombre, registrar]);

    const esActivo = activo === nombre;

    return (
        <div
            ref={propio}
            className={`relative transition-shadow duration-200 ${
                esActivo && resaltar ? 'z-10 rounded-lg ring-2 ring-marca-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-900' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}

/** Marco con barra de título, para que se lea como una pantalla de la app. */
export function Ventana({ titulo, children, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}>
            <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-950/70">
                <span className="flex gap-1">
                    <span className="block h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
                    <span className="block h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
                    <span className="block h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
                </span>
                <span className="truncate text-[11px] font-semibold text-stone-500 dark:text-stone-400">{titulo}</span>
            </div>
            {children}
        </div>
    );
}

export function Encabezado({ children }) {
    return (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {children}
        </p>
    );
}

/** Opción elegible: una tarjeta con su dibujo y su nombre. */
export function Opcion({ nombre, etiqueta, elegida = false, children }) {
    return (
        <Objetivo nombre={nombre} resaltar={false}>
            <div
                className={`overflow-hidden rounded-lg border transition-colors duration-200 ${
                    elegida
                        ? 'border-marca-600 ring-2 ring-marca-600/25 dark:border-marca-400'
                        : 'border-stone-200 dark:border-stone-700'
                }`}
            >
                <span className="block bg-stone-50 p-1.5 dark:bg-stone-950">{children}</span>
                <span
                    className={`block truncate border-t px-1.5 py-1 text-[9px] font-semibold ${
                        elegida
                            ? 'border-marca-600/30 text-marca-700 dark:text-marca-300'
                            : 'border-stone-200 text-stone-500 dark:border-stone-800 dark:text-stone-400'
                    }`}
                >
                    {etiqueta}
                </span>
            </div>
        </Objetivo>
    );
}

/** Pastilla de un grupo de opciones cortas. */
export function Pastilla({ nombre, activa = false, children }) {
    return (
        <Objetivo nombre={nombre} resaltar={false} className="min-w-0 flex-1">
            <div
                className={`truncate rounded-md px-2 py-1.5 text-center text-[10px] font-semibold transition-colors duration-200 ${
                    activa
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                }`}
            >
                {children}
            </div>
        </Objetivo>
    );
}

export function Palanca({ nombre, etiqueta, encendida = false }) {
    return (
        <Objetivo nombre={nombre} resaltar={false}>
            <div className="flex items-center gap-2">
                <span
                    className={`relative block h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${
                        encendida ? 'bg-marca-600 dark:bg-marca-500' : 'bg-stone-300 dark:bg-stone-700'
                    }`}
                >
                    <span
                        className="absolute left-0.5 top-0.5 block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200"
                        style={{ transform: encendida ? 'translateX(0.75rem)' : 'translateX(0)' }}
                    />
                </span>
                <span className="truncate text-[10px] font-medium text-stone-600 dark:text-stone-300">{etiqueta}</span>
            </div>
        </Objetivo>
    );
}

export function Muestra({ nombre, color, elegida = false }) {
    return (
        <Objetivo nombre={nombre} resaltar={false}>
            <span
                className={`block h-6 w-6 rounded-md ring-1 ring-inset ring-black/10 transition-transform duration-200 dark:ring-white/10 ${
                    elegida ? 'scale-110 ring-2 ring-marca-600' : ''
                }`}
                style={{ background: color }}
            />
        </Objetivo>
    );
}

/** Campo de texto de mentira, con cursor parpadeante mientras se escribe. */
export function CampoFalso({ nombre, etiqueta, valor, escribiendo = false, placeholder = '' }) {
    return (
        <Objetivo nombre={nombre} resaltar={false}>
            <label className="block">
                {etiqueta && (
                    <span className="mb-1 block text-[10px] font-medium text-stone-500 dark:text-stone-400">{etiqueta}</span>
                )}
                <span className="flex h-7 items-center rounded-md border border-stone-300 bg-white px-2 text-[11px] text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100">
                    <span className="truncate">{valor || <span className="text-stone-400">{placeholder}</span>}</span>
                    {escribiendo && <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-marca-600" />}
                </span>
            </label>
        </Objetivo>
    );
}

export function BotonFalso({ nombre, tono = 'primario', children, className = '' }) {
    const tonos = {
        primario: 'bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950',
        exito: 'bg-green-600 text-white',
        peligro: 'bg-red-600 text-white',
        contorno: 'border border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300',
        tenue: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
    };

    return (
        <Objetivo nombre={nombre} resaltar={false} className={className}>
            <span
                className={`block truncate rounded-md px-2.5 py-1.5 text-center text-[10px] font-bold ${tonos[tono]}`}
            >
                {children}
            </span>
        </Objetivo>
    );
}

export function Etiqueta({ tono = 'neutro', children }) {
    const tonos = {
        neutro: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
        aviso: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        marca: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300',
        alerta: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    };

    return (
        <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold ${tonos[tono]}`}>
            {children}
        </span>
    );
}

/** Franja de aviso, como las que muestra la app al guardar o al fallar. */
export function Mensaje({ tono = 'exito', children }) {
    const tonos = {
        exito: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900',
        alerta: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900',
        aviso: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
    };

    return (
        <div className={`rounded-lg border px-2.5 py-2 text-[10px] font-semibold leading-snug ${tonos[tono]}`}>
            {children}
        </div>
    );
}
