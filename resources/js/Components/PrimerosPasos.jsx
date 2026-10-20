import { Link } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';

/**
 * Los pasos que llevan de una cuenta recién abierta a un catálogo listo.
 *
 * Se ve en el panel y dentro del editor, con la misma forma en los dos
 * sitios: quien ya reconoció la lista en una pantalla la reconoce en la otra.
 *
 * Solo el primero que falta trae botón. Cuatro botones a la vez vuelven a
 * plantear la pregunta que esto viene a responder —¿y ahora qué hago?—, así
 * que el siguiente paso es uno y está señalado; los demás esperan su turno
 * sin dejar de verse.
 *
 * Cada paso lleva `enlace` (otra pantalla) o `alIr` (algo de esta misma
 * pantalla, como bajar hasta el control que toca).
 */
export default function PrimerosPasos({ pasos, hechos, total, className = '' }) {
    const siguiente = pasos.find((paso) => !paso.hecho);

    return (
        <div className={className}>
            <Progreso hechos={hechos} total={total} />

            <ol className="mt-4 space-y-1">
                {pasos.map((paso, indice) => (
                    <Paso
                        key={paso.clave}
                        paso={paso}
                        numero={indice + 1}
                        esElSiguiente={paso.clave === siguiente?.clave}
                    />
                ))}
            </ol>
        </div>
    );
}

export function Progreso({ hechos, total }) {
    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    {hechos} de {total} listos
                </p>
                {hechos < total && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                        {total - hechos === 1 ? 'Falta uno' : `Faltan ${total - hechos}`}
                    </p>
                )}
            </div>

            <div
                role="progressbar"
                aria-valuenow={hechos}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label="Avance de tu catálogo"
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
            >
                <div
                    className="h-full rounded-full bg-marca-600 transition-[width] duration-500 ease-salida dark:bg-marca-500"
                    style={{ width: `${(hechos / total) * 100}%` }}
                />
            </div>
        </div>
    );
}

function Paso({ paso, numero, esElSiguiente }) {
    const { hecho, titulo, texto, accion, enlace, alIr } = paso;

    return (
        <li
            className={`flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center ${
                esElSiguiente ? 'bg-marca-50/70 dark:bg-marca-950/30' : ''
            }`}
        >
            <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    hecho
                        ? 'bg-marca-600 text-white dark:bg-marca-500 dark:text-stone-950'
                        : esElSiguiente
                          ? 'bg-white text-marca-700 ring-2 ring-marca-600 dark:bg-stone-900 dark:text-marca-400 dark:ring-marca-500'
                          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                }`}
            >
                {hecho ? <Check className="h-4 w-4" strokeWidth={3} /> : numero}
            </span>

            <div className="min-w-0 flex-1">
                <p
                    className={`text-sm font-semibold ${
                        hecho
                            ? 'text-stone-400 line-through decoration-stone-300 dark:text-stone-500 dark:decoration-stone-700'
                            : 'text-stone-900 dark:text-stone-100'
                    }`}
                >
                    {titulo}
                </p>
                {!hecho && (
                    <p className="mt-0.5 text-[13px] leading-snug text-stone-600 dark:text-stone-400">{texto}</p>
                )}
            </div>

            {!hecho && <Accion esElSiguiente={esElSiguiente} accion={accion} enlace={enlace} alIr={alIr} />}
        </li>
    );
}

function Accion({ esElSiguiente, accion, enlace, alIr }) {
    const clases = esElSiguiente
        ? 'pulsable boton-elevado inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-marca-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400'
        : 'pulsable inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100';

    const contenido = (
        <>
            {accion}
            <ArrowRight className="h-3.5 w-3.5" />
        </>
    );

    if (alIr) {
        return (
            <button type="button" onClick={alIr} className={clases}>
                {contenido}
            </button>
        );
    }

    return (
        <Link href={enlace} className={clases}>
            {contenido}
        </Link>
    );
}
