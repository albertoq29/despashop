import { forwardRef } from 'react';
import { Link } from '@inertiajs/react';

/**
 * Piezas compartidas del panel.
 *
 * Todas nacen con el tema claro y oscuro resueltos y con el acento `marca`,
 * para que ninguna pantalla tenga que volver a decidir colores.
 */

/* ── Estructura ─────────────────────────────────────────────────────────── */

export function Pagina({ children, className = '' }) {
    return <div className={`mx-auto max-w-7xl space-y-5 p-4 sm:p-6 ${className}`}>{children}</div>;
}

export function Cabecera({ titulo, descripcion, children }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
                    {titulo}
                </h2>
                {descripcion && (
                    <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                        {descripcion}
                    </p>
                )}
            </div>

            {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}

export function Tarjeta({ titulo, descripcion, accion, className = '', cuerpo = true, children }) {
    return (
        <section
            className={`rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 ${className}`}
        >
            {(titulo || accion) && (
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-800">
                    <div className="min-w-0">
                        {titulo && <h3 className="font-display font-semibold">{titulo}</h3>}
                        {descripcion && (
                            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{descripcion}</p>
                        )}
                    </div>
                    {accion}
                </div>
            )}

            <div className={cuerpo ? 'p-5' : ''}>{children}</div>
        </section>
    );
}

/* ── Acciones ───────────────────────────────────────────────────────────── */

const VARIANTES = {
    primario:
        'boton-elevado bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400',
    neutro:
        'boton-elevado bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
    contorno:
        'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
    fantasma:
        'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
    peligro:
        'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
    peligroSuave:
        'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50',
};

const TAMANOS = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
    icono: 'h-9 w-9',
};

export const Boton = forwardRef(function Boton(
    { variante = 'primario', tamano = 'md', href, className = '', children, ...props },
    ref,
) {
    const clases = `pulsable inline-flex shrink-0 items-center justify-center rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`;

    if (href) {
        return (
            <Link ref={ref} href={href} className={clases} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button ref={ref} type="button" className={clases} {...props}>
            {children}
        </button>
    );
});

/* ── Formularios ────────────────────────────────────────────────────────── */

const BASE_CAMPO =
    'w-full rounded-lg border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 transition-colors duration-150 ease-salida placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400';

export function Campo({ etiqueta, error, ayuda, requerido = false, id, children, className = '' }) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {etiqueta && (
                <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    {etiqueta}
                    {requerido && <span className="ml-0.5 text-red-600">*</span>}
                </label>
            )}

            {children}

            {ayuda && <p className="text-xs text-stone-500 dark:text-stone-400">{ayuda}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

export const Entrada = forwardRef(function Entrada({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${BASE_CAMPO} ${className}`} {...props} />;
});

export const AreaTexto = forwardRef(function AreaTexto({ className = '', rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={`${BASE_CAMPO} ${className}`} {...props} />;
});

export const Lista = forwardRef(function Lista({ className = '', children, ...props }, ref) {
    return (
        <select ref={ref} className={`${BASE_CAMPO} ${className}`} {...props}>
            {children}
        </select>
    );
});

export function Casilla({ etiqueta, ayuda, className = '', ...props }) {
    return (
        <label className={`flex cursor-pointer items-start gap-2.5 ${className}`}>
            <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950 dark:text-marca-500"
                {...props}
            />
            <span>
                <span className="block text-sm text-stone-700 dark:text-stone-300">{etiqueta}</span>
                {ayuda && <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{ayuda}</span>}
            </span>
        </label>
    );
}

/**
 * Interruptor de encendido y apagado.
 *
 * La perilla se ancla con `left-0.5` en lugar de dejarla en su posición
 * estática: un botón centra su contenido por defecto, así que sin anclaje el
 * desplazamiento la sacaba fuera del carril. El recorrido es el ancho del
 * carril menos la perilla y sus dos márgenes: 44 - 20 - 4 = 20px.
 */
export function Interruptor({ etiqueta, ayuda, valor, onCambiar, disabled = false }) {
    return (
        <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <button
                type="button"
                role="switch"
                aria-checked={valor}
                disabled={disabled}
                onClick={() => onCambiar(!valor)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full p-0 transition-colors duration-150 ease-salida ${
                    valor ? 'bg-marca-700 dark:bg-marca-500' : 'bg-stone-300 dark:bg-stone-700'
                }`}
            >
                <span
                    className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-salida"
                    style={{ transform: valor ? 'translateX(1.25rem)' : 'translateX(0)' }}
                />
            </button>

            <span>
                <span className="block text-sm font-medium text-stone-800 dark:text-stone-200">{etiqueta}</span>
                {ayuda && <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{ayuda}</span>}
            </span>
        </label>
    );
}

/* ── Datos ──────────────────────────────────────────────────────────────── */

export function Metrica({ etiqueta, valor, detalle, Icono, tono = 'neutro' }) {
    const tonos = {
        neutro: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
        marca: 'bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400',
        aviso: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
        alerta: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    };

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
                {Icono && (
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tonos[tono]}`}>
                        <Icono className="h-4 w-4" />
                    </span>
                )}
            </div>

            <p className="mt-3 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {valor}
            </p>

            {detalle && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{detalle}</p>}
        </div>
    );
}

const TONOS_INSIGNIA = {
    neutro: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    marca: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300',
    aviso: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    alerta: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
};

export function Insignia({ tono = 'neutro', children, className = '' }) {
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${TONOS_INSIGNIA[tono]} ${className}`}
        >
            {children}
        </span>
    );
}

/**
 * Tabla que en pantallas chicas deja de ser tabla.
 *
 * Una tabla con scroll horizontal en un teléfono es incómoda de leer, así
 * que por debajo de `sm` cada fila se apila como tarjeta y cada celda muestra
 * su encabezado. Se controla solo con CSS, sin duplicar el marcado.
 */
export function Tabla({ encabezados, children, className = '' }) {
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full text-sm">
                <thead className="hidden border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500 dark:border-stone-800 sm:table-header-group">
                    <tr>
                        {encabezados.map((encabezado, indice) => (
                            <th
                                key={indice}
                                scope="col"
                                className={`px-4 py-3 font-medium ${encabezado.alineacion ?? ''}`}
                            >
                                {encabezado.texto}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">{children}</tbody>
            </table>
        </div>
    );
}

export function Fila({ children, className = '' }) {
    return (
        <tr
            className={`block border-b border-stone-200 py-2 last:border-0 transition-colors duration-150 ease-salida hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/40 sm:table-row sm:border-0 sm:py-0 ${className}`}
        >
            {children}
        </tr>
    );
}

export function Celda({ etiqueta, children, className = '', alineacion = '' }) {
    return (
        <td
            data-etiqueta={etiqueta}
            className={`flex items-baseline justify-between gap-3 px-4 py-1.5 before:text-xs before:font-medium before:uppercase before:tracking-wide before:text-stone-400 before:content-[attr(data-etiqueta)] sm:table-cell sm:py-3.5 sm:before:content-none ${alineacion} ${className}`}
        >
            <span className="min-w-0 text-right sm:text-left">{children}</span>
        </td>
    );
}

/* ── Estados ────────────────────────────────────────────────────────────── */

export function Vacio({ Icono, titulo, texto, children }) {
    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            {Icono && (
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
                    <Icono className="h-6 w-6" />
                </span>
            )}

            <p className="mt-4 font-display font-semibold text-stone-800 dark:text-stone-200">{titulo}</p>
            {texto && (
                <p className="mx-auto mt-1.5 max-w-[42ch] text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                    {texto}
                </p>
            )}

            {children && <div className="mt-5">{children}</div>}
        </div>
    );
}

export function Aviso({ tono = 'info', titulo, children, className = '' }) {
    const tonos = {
        exito: 'border-marca-200 bg-marca-50 text-marca-900 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-200',
        info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
        aviso: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
        alerta: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
    };

    return (
        <div className={`rounded-xl border px-4 py-3 text-sm ${tonos[tono]} ${className}`}>
            {titulo && <p className="font-semibold">{titulo}</p>}
            {children && <div className={titulo ? 'mt-1' : ''}>{children}</div>}
        </div>
    );
}

/** Esqueleto de carga con la forma del contenido que va a llegar. */
export function Esqueleto({ className = '' }) {
    return <div className={`animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800 ${className}`} />;
}
