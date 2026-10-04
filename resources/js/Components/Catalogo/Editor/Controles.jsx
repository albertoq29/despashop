import { createContext, useContext, useId, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { Image as ImagenIcono, Loader2, Trash2, Upload } from 'lucide-react';
import { Interruptor as InterruptorBase } from '@/Components/UI';

/**
 * Controles del editor del catálogo.
 *
 * Son más compactos que los del resto del panel porque conviven en una
 * columna angosta junto a la vista previa. Todos reciben el valor y un
 * `onCambiar`; ninguno conoce el formulario.
 */

export const Interruptor = InterruptorBase;

/* ── Modo fácil ─────────────────────────────────────────────────────────── */

/**
 * El editor tiene muchas más opciones de las que hacen falta para dejar un
 * catálogo presentable, y en un teléfono todas juntas abruman. En modo
 * fácil los grupos marcados como avanzados y lo que envuelve
 * `SoloCompleto` dejan de dibujarse.
 *
 * Nada se borra ni se reinicia: lo que ya estaba configurado sigue
 * aplicándose en el catálogo, solo deja de ocupar la pantalla. Así volver
 * al modo completo no tiene costo ni sorpresas.
 */
const ModoFacil = createContext(false);

export function ProveedorDeModoFacil({ activo, children }) {
    return <ModoFacil.Provider value={activo}>{children}</ModoFacil.Provider>;
}

export function useModoFacil() {
    return useContext(ModoFacil);
}

/** Lo que solo tiene sentido con todas las opciones a la vista. */
export function SoloCompleto({ children }) {
    return useModoFacil() ? null : <>{children}</>;
}

const BASE_CAMPO =
    'w-full rounded-lg border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors duration-150 ease-salida placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400';

export function Grupo({ titulo, descripcion, accion, children, avanzado = false, className = '' }) {
    if (useModoFacil() && avanzado) {
        return null;
    }

    return (
        <section className={`border-b border-stone-200 px-5 py-5 last:border-b-0 dark:border-stone-800 ${className}`}>
            {(titulo || accion) && (
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {titulo && <h3 className="font-display text-[15px] font-semibold text-stone-900 dark:text-stone-100">{titulo}</h3>}
                        {descripcion && (
                            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{descripcion}</p>
                        )}
                    </div>
                    {accion}
                </div>
            )}

            <div className="space-y-4">{children}</div>
        </section>
    );
}

export function Etiqueta({ children, htmlFor, extra }) {
    return (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor={htmlFor} className="text-xs font-medium text-stone-600 dark:text-stone-400">
                {children}
            </label>
            {extra && <span className="text-[11px] tabular-nums text-stone-400 dark:text-stone-500">{extra}</span>}
        </div>
    );
}

function Ayuda({ texto, error }) {
    if (error) {
        return <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>;
    }

    return texto ? <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{texto}</p> : null;
}

export function Texto({ etiqueta, valor, onCambiar, placeholder, maximo, ayuda, error, filas = 0 }) {
    const id = useId();
    const actual = valor ?? '';
    const cuenta = maximo && actual.length > maximo * 0.7 ? `${actual.length}/${maximo}` : null;

    return (
        <div>
            {etiqueta && (
                <Etiqueta htmlFor={id} extra={cuenta}>
                    {etiqueta}
                </Etiqueta>
            )}

            {filas > 0 ? (
                <textarea
                    id={id}
                    rows={filas}
                    value={actual}
                    maxLength={maximo}
                    placeholder={placeholder}
                    onChange={(e) => onCambiar(e.target.value)}
                    className={`${BASE_CAMPO} resize-y`}
                />
            ) : (
                <input
                    id={id}
                    value={actual}
                    maxLength={maximo}
                    placeholder={placeholder}
                    onChange={(e) => onCambiar(e.target.value)}
                    className={BASE_CAMPO}
                />
            )}

            <Ayuda texto={ayuda} error={error} />
        </div>
    );
}

export function Desplegable({ etiqueta, valor, onCambiar, opciones, ayuda }) {
    const id = useId();

    return (
        <div>
            {etiqueta && <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>}
            <select id={id} value={valor ?? ''} onChange={(e) => onCambiar(e.target.value)} className={BASE_CAMPO}>
                {opciones.map(([clave, texto]) => (
                    <option key={clave} value={clave}>
                        {texto}
                    </option>
                ))}
            </select>
            <Ayuda texto={ayuda} />
        </div>
    );
}

/** Deslizador con el valor a la vista. `formato` decide cómo se muestra. */
export function Deslizador({ etiqueta, valor, onCambiar, min, max, paso = 1, formato = (v) => v, ayuda }) {
    const id = useId();
    const porcentaje = ((Number(valor) - min) / (max - min)) * 100;

    return (
        <div>
            <Etiqueta htmlFor={id} extra={formato(valor)}>
                {etiqueta}
            </Etiqueta>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={paso}
                value={valor ?? min}
                onChange={(e) => onCambiar(Number(e.target.value))}
                className="deslizador h-5 w-full cursor-pointer appearance-none bg-transparent"
                style={{ '--progreso': `${Math.min(100, Math.max(0, porcentaje))}%` }}
            />
            <Ayuda texto={ayuda} />
        </div>
    );
}

/**
 * Control segmentado. La pastilla activa se desliza hasta la opción
 * elegida en lugar de saltar, así el cambio se entiende de un vistazo.
 */
export function Segmentado({ etiqueta, valor, onCambiar, opciones, ayuda }) {
    const grupo = useId();

    return (
        <div>
            {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
            <div role="radiogroup" aria-label={etiqueta} className="flex rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800">
                {opciones.map(({ valor: clave, texto, Icono }) => {
                    const activo = String(valor) === String(clave);

                    return (
                        <button
                            key={clave}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            onClick={() => onCambiar(clave)}
                            title={Icono ? texto : undefined}
                            className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
                                activo
                                    ? 'text-stone-900 dark:text-stone-50'
                                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                            }`}
                        >
                            {activo && (
                                <motion.span
                                    layoutId={`segmento-${grupo}`}
                                    className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-stone-950"
                                    transition={{ type: 'spring', duration: 0.3, bounce: 0.12 }}
                                />
                            )}
                            <span className="relative flex min-w-0 items-center gap-1.5">
                                {Icono && <Icono className="h-3.5 w-3.5" />}
                                <span className="truncate">{texto}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            <Ayuda texto={ayuda} />
        </div>
    );
}

/**
 * Opciones con dibujo. Para decisiones de diseño un nombre no alcanza:
 * "portada dividida" se entiende mucho mejor viéndola en miniatura.
 */
export function OpcionesVisuales({ etiqueta, valor, onCambiar, opciones, columnas = 2, ayuda }) {
    const columnasClase = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columnas];

    return (
        <div>
            {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
            <div role="radiogroup" aria-label={etiqueta} className={`grid gap-2 ${columnasClase}`}>
                {opciones.map(({ valor: clave, texto, dibujo }) => {
                    const activo = String(valor) === String(clave);

                    return (
                        <button
                            key={clave}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            onClick={() => onCambiar(clave)}
                            className={`pulsable group overflow-hidden rounded-xl border text-left ${
                                activo
                                    ? 'border-marca-600 ring-2 ring-marca-600/25 dark:border-marca-400 dark:ring-marca-400/25'
                                    : 'border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600'
                            }`}
                        >
                            <span className="block bg-stone-50 p-2 dark:bg-stone-950">{dibujo}</span>
                            <span
                                className={`block truncate border-t px-2 py-1.5 text-[11px] font-medium ${
                                    activo
                                        ? 'border-marca-600/30 text-marca-800 dark:text-marca-300'
                                        : 'border-stone-200 text-stone-600 dark:border-stone-800 dark:text-stone-400'
                                }`}
                            >
                                {texto}
                            </span>
                        </button>
                    );
                })}
            </div>
            <Ayuda texto={ayuda} />
        </div>
    );
}

export function SelectorColor({ etiqueta, valor, onCambiar, opcional = false }) {
    const id = useId();
    const [texto, setTexto] = useState(null);
    const mostrado = texto ?? valor ?? '';

    return (
        <div>
            <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
            <div className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white p-1 transition-colors focus-within:border-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:focus-within:border-marca-400">
                <label
                    className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-inset ring-black/10 dark:ring-white/10"
                    style={{
                        background: valor || 'repeating-conic-gradient(#d6d3d1 0% 25%, #fafaf9 0% 50%) 50% / 10px 10px',
                    }}
                >
                    <span className="sr-only">Elegir {etiqueta}</span>
                    <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(valor ?? '') ? valor : '#000000'}
                        onChange={(e) => {
                            setTexto(null);
                            onCambiar(e.target.value);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                </label>
                <input
                    id={id}
                    value={mostrado}
                    placeholder={opcional ? 'Automático' : '#000000'}
                    onChange={(e) => {
                        const nuevo = e.target.value.trim();
                        setTexto(nuevo);

                        // Solo se aplica un color completo; mientras se escribe no se rompe la vista
                        if (/^#[0-9a-f]{6}$/i.test(nuevo) || (opcional && nuevo === '')) {
                            onCambiar(nuevo);
                        }
                    }}
                    onBlur={() => setTexto(null)}
                    className="w-full min-w-0 border-0 bg-transparent p-0 font-mono text-xs uppercase text-stone-800 focus:ring-0 dark:text-stone-200"
                />
            </div>
        </div>
    );
}

/** Rejilla de fuentes, cada una escrita en su propia tipografía. */
export function SelectorFuente({ etiqueta, valor, onCambiar, fuentes }) {
    return (
        <div>
            <Etiqueta>{etiqueta}</Etiqueta>
            <div role="radiogroup" aria-label={etiqueta} className="grid grid-cols-3 gap-1.5">
                {fuentes.map((fuente) => {
                    const activa = valor === fuente;

                    return (
                        <button
                            key={fuente}
                            type="button"
                            role="radio"
                            aria-checked={activa}
                            onClick={() => onCambiar(fuente)}
                            className={`pulsable flex flex-col items-start rounded-lg border px-2.5 py-2 text-left ${
                                activa
                                    ? 'border-marca-600 bg-marca-50 dark:border-marca-400 dark:bg-marca-950/40'
                                    : 'border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600'
                            }`}
                        >
                            <span className="text-lg leading-none text-stone-900 dark:text-stone-100" style={{ fontFamily: `"${fuente}", system-ui` }}>
                                Aa
                            </span>
                            <span className="mt-1 w-full truncate text-[10px] text-stone-500 dark:text-stone-400">{fuente}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Subida de una imagen que se guarda en el acto.
 *
 * Conserva el estado de la página (`preserveState`): sin eso, Inertia
 * volvía a montar el editor al responder y se perdían los cambios que el
 * comercio todavía no había guardado.
 */
export function SubidaImagen({ actual, ruta, campo, rutaBorrado, ayuda, onListo, compacta = false }) {
    const entrada = useRef(null);
    const [subiendo, setSubiendo] = useState(false);

    const subir = (archivo) => {
        if (!archivo) {
            return;
        }

        setSubiendo(true);
        router.post(
            ruta,
            { [campo]: archivo },
            {
                preserveScroll: true,
                preserveState: true,
                forceFormData: true,
                onSuccess: (pagina) => onListo?.(pagina),
                onFinish: () => {
                    setSubiendo(false);

                    if (entrada.current) {
                        entrada.current.value = '';
                    }
                },
            },
        );
    };

    const quitar = () =>
        router.delete(rutaBorrado, { preserveScroll: true, preserveState: true, onSuccess: (pagina) => onListo?.(pagina) });

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => entrada.current?.click()}
                className={`pulsable grid shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:border-marca-500 dark:border-stone-700 dark:bg-stone-950 ${
                    compacta ? 'h-14 w-14' : 'h-20 w-20'
                }`}
                aria-label={actual ? 'Cambiar imagen' : 'Subir imagen'}
            >
                {subiendo ? (
                    <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                ) : actual ? (
                    <img src={actual} alt="" className="h-full w-full object-contain" />
                ) : (
                    <ImagenIcono className="h-5 w-5 text-stone-400" />
                )}
            </button>

            <div className="min-w-0 flex-1">
                <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files[0])} />

                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => entrada.current?.click()}
                        disabled={subiendo}
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        {subiendo ? 'Subiendo' : actual ? 'Cambiar' : 'Subir'}
                    </button>

                    {actual && rutaBorrado && (
                        <button
                            type="button"
                            onClick={quitar}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Quitar
                        </button>
                    )}
                </div>

                {ayuda && <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{ayuda}</p>}
            </div>
        </div>
    );
}
