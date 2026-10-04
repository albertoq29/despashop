import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { GraduationCap, Play, Receipt, Sparkles, X } from 'lucide-react';
import Tutorial, { marcarVisto, TUTORIALES, yaLoVio } from './Tutorial';

/**
 * Tutoriales de la app, abiertos desde cualquier pantalla.
 *
 * El proveedor vive en el layout, así que el menú lateral y cualquier
 * página pueden pedir que se abra uno con `useTutoriales().abrir('facturas')`.
 *
 * La ventana es propia y no el `Modal` compartido: el escenario necesita
 * más ancho del que ese componente permite, y aquí conviene no pelear con
 * sus clases de tamaño.
 */

const TutorialesContexto = createContext(null);

export function useTutoriales() {
    return useContext(TutorialesContexto) ?? { abrir: () => {} };
}

const ICONOS = { catalogo: Sparkles, facturas: Receipt };

const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Si la cuenta se abrio hace menos de un dia.
 *
 * El ofrecimiento grande es para quien acaba de llegar y todavia no sabe
 * que los tutoriales existen. Pasado el primer dia ya recorrio la app: el
 * tutorial sigue a un toque en el menu lateral y en el boton discreto,
 * pero deja de ocupar sitio en la pantalla.
 *
 * Sin fecha no se ofrece: mejor quedarse corto que insistirle a alguien
 * que lleva meses usando el sistema.
 */
function esCuentaNueva(usuario) {
    const creada = Date.parse(usuario?.created_at ?? '');

    return Number.isFinite(creada) && Date.now() - creada < UN_DIA;
}

export function ProveedorDeTutoriales({ children }) {
    const [abierto, setAbierto] = useState(null);

    const abrir = useCallback((nombre) => setAbierto(nombre ?? 'elegir'), []);
    const cerrar = useCallback(() => setAbierto(null), []);

    // Bloquear el fondo mientras el tutorial está abierto, y cerrarlo con Esc
    useEffect(() => {
        if (!abierto) {
            return undefined;
        }

        const anterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const alPulsar = (evento) => {
            if (evento.key === 'Escape') {
                cerrar();
            }
        };

        window.addEventListener('keydown', alPulsar);

        return () => {
            document.body.style.overflow = anterior;
            window.removeEventListener('keydown', alPulsar);
        };
    }, [abierto, cerrar]);

    return (
        <TutorialesContexto.Provider value={{ abrir }}>
            {children}

            {abierto && (
                <div className="fixed inset-0 z-[60] overflow-y-auto p-3 sm:p-6">
                    <div
                        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
                        onClick={cerrar}
                        aria-hidden="true"
                    />

                    <div className="flex min-h-full items-start justify-center sm:items-center">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={abierto === 'elegir' ? 'Tutoriales' : TUTORIALES[abierto]?.titulo}
                            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-stone-900"
                        >
                            {abierto === 'elegir' ? (
                                <Selector onElegir={setAbierto} onCerrar={cerrar} />
                            ) : (
                                <Tutorial nombre={abierto} onCerrar={cerrar} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </TutorialesContexto.Provider>
    );
}

function Selector({ onElegir, onCerrar }) {
    return (
        <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                    <GraduationCap className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">Tutoriales</h2>
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                        Las acciones se hacen solas en una pantalla de ejemplo. Nada de lo que veas aquí toca tu
                        catálogo ni tus facturas.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                    className="pulsable grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.entries(TUTORIALES).map(([nombre, tutorial]) => {
                    const Icono = ICONOS[nombre] ?? Play;

                    return (
                        <button
                            key={nombre}
                            type="button"
                            onClick={() => onElegir(nombre)}
                            className="pulsable group flex items-start gap-3 rounded-xl border border-stone-200 p-4 text-left hover:border-marca-500 hover:bg-marca-50/50 dark:border-stone-800 dark:hover:border-marca-400 dark:hover:bg-marca-950/30"
                        >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 group-hover:bg-marca-100 group-hover:text-marca-700 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:bg-marca-950 dark:group-hover:text-marca-400">
                                <Icono className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                                <span className="block font-semibold text-stone-900 dark:text-stone-100">{tutorial.titulo}</span>
                                <span className="mt-0.5 block text-sm leading-snug text-stone-500 dark:text-stone-400">
                                    {tutorial.resumen}
                                </span>
                                <span className="mt-1.5 block text-xs font-medium text-marca-700 dark:text-marca-400">
                                    {tutorial.pasos.length} pasos
                                    {yaLoVio(nombre) ? ' · ya lo viste' : ''}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Acceso al tutorial que se adapta a si ya lo vio.
 *
 * La primera vez ocupa espacio y explica; después se encoge a un botón
 * discreto que sigue estando ahí cuando haga falta.
 */
export function AccesoAlTutorial({ nombre, className = '' }) {
    const usuario = usePage().props.auth?.user;
    const [visto, setVisto] = useState(null);

    useEffect(() => setVisto(yaLoVio(nombre)), [nombre]);

    if (visto === null) {
        return null;
    }

    const ofrecer = !visto && esCuentaNueva(usuario);

    return (
        <div className={className}>
            {ofrecer ? <OfertaDeTutorial nombre={nombre} /> : <BotonDeTutorial nombre={nombre} className="w-full" />}
        </div>
    );
}

/** Botón para abrir un tutorial desde la cabecera de una pantalla. */
export function BotonDeTutorial({ nombre, children = 'Ver tutorial', className = '' }) {
    const { abrir } = useTutoriales();

    return (
        <button
            type="button"
            onClick={() => abrir(nombre)}
            className={`pulsable inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 ${className}`}
        >
            <GraduationCap className="h-4 w-4" />
            {children}
        </button>
    );
}

/**
 * Ofrecimiento para quien entra por primera vez.
 *
 * Aparece una sola vez por tutorial: si el comercio lo vio o lo descartó,
 * no vuelve a salir. Se guarda en el navegador, así que el aviso es por
 * dispositivo, que es lo que corresponde a algo que solo estorba la vista.
 *
 * Y solo durante el primer día de la cuenta. Después el acceso queda en el
 * botón discreto y en el menú lateral, sin un cartel de por medio.
 *
 * En el teléfono la caja se arma en vertical: el texto completo arriba y el
 * botón a todo lo ancho abajo. Repartido en una sola fila, a 320 px el
 * botón quedaba estrujado contra la equis.
 */
export function OfertaDeTutorial({ nombre }) {
    const { abrir } = useTutoriales();
    const usuario = usePage().props.auth?.user;
    const [mostrar, setMostrar] = useState(false);

    // Se decide después de montar: en el servidor no hay localStorage, y
    // leerlo durante el render dejaría el aviso parpadeando
    useEffect(() => setMostrar(!yaLoVio(nombre) && esCuentaNueva(usuario)), [nombre, usuario]);

    if (!mostrar) {
        return null;
    }

    const tutorial = TUTORIALES[nombre];

    return (
        <div className="rounded-xl border border-marca-200 bg-marca-50 p-3.5 dark:border-marca-900 dark:bg-marca-950/40 sm:p-4">
            <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-marca-700 dark:bg-stone-900 dark:text-marca-400">
                    <GraduationCap className="h-4 w-4" />
                </span>

                <p className="min-w-0 flex-1 text-sm leading-relaxed text-marca-900 dark:text-marca-200">
                    <strong className="block font-semibold">¿Primera vez por aquí?</strong>
                    <span className="mt-0.5 block">
                        {tutorial.resumen} En {tutorial.pasos.length} pasos, con las acciones hechas en pantalla.
                    </span>
                </p>

                <button
                    type="button"
                    onClick={() => {
                        marcarVisto(nombre);
                        setMostrar(false);
                    }}
                    aria-label="No mostrar este aviso"
                    className="pulsable -mr-1 -mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-marca-700/70 hover:bg-white/70 dark:text-marca-400 dark:hover:bg-stone-900/70"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <button
                type="button"
                onClick={() => abrir(nombre)}
                className="pulsable boton-elevado mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-marca-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 sm:ml-12 sm:mt-2.5 sm:w-auto sm:py-2"
            >
                <Play className="h-3.5 w-3.5" />
                Ver el tutorial
            </button>
        </div>
    );
}
