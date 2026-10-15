import { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    ChevronRight,
    FileSpreadsheet,
    List,
    Loader2,
    MousePointerClick,
    Upload,
    X,
} from 'lucide-react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Interruptor } from '@/Components/UI';
import { useEsEscritorio } from '@/hooks/usePantalla';

/** Lo que el navegador sabe abrir. */
const FORMATOS = '.xlsx,.xls,.csv,.ods';

const CAMPO =
    'block w-full rounded-md border-stone-300 bg-white text-sm text-stone-900 shadow-sm ' +
    'focus:border-marca-600 focus:ring-marca-600 ' +
    'dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-marca-400';

/** Cuántas filas se enseñan antes de importar: ver tres basta para notar un error. */
const FILAS_DE_MUESTRA = 5;

/**
 * Traer el inventario desde una hoja de cálculo.
 *
 * El archivo se lee aquí, en el navegador: no se sube a ningún lado hasta
 * que el comercio confirma, y así tampoco hace falta un lector de Excel en
 * el servidor. Lo que sí decide el servidor es qué columna es cuál —y
 * después vuelve a validar cada valor—, porque adivinar y ejecutar sin
 * preguntar es como se arruina un inventario.
 */
export default function Importar({ campos, maximoFilas, limite }) {
    const [paso, setPaso] = useState('archivo');
    const [archivo, setArchivo] = useState(null);
    const [encabezados, setEncabezados] = useState([]);
    const [filas, setFilas] = useState([]);
    const [columnas, setColumnas] = useState({});
    const [sobrescribir, setSobrescribir] = useState(false);
    const [error, setError] = useState(null);
    const [leyendo, setLeyendo] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const entrada = useRef(null);

    // Decidir viendo el dato es mejor en cualquier pantalla; lo que cambia es
    // la forma. En computadora cabe la hoja entera y se asigna sobre ella; en
    // un teléfono no cabe, así que se le da la vuelta y va una columna a la
    // vez, a lo ancho. La lista de siempre sigue estando en las dos.
    const esEscritorio = useEsEscritorio();
    const [modo, setModo] = useState('visual');
    const esVisual = modo === 'visual';

    const leer = async (file) => {
        if (!file) {
            return;
        }

        setError(null);
        setLeyendo(true);

        try {
            // La librería solo se descarga al llegar aquí: pesa, y el resto
            // de la aplicación no tiene por qué cargar con ella.
            const XLSX = await import('xlsx');
            const libro = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
            const hoja = libro.Sheets[libro.SheetNames[0]];

            if (!hoja) {
                throw new Error('El archivo no tiene ninguna hoja con datos.');
            }

            const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: false, defval: '' });
            const [cabecera, ...resto] = matriz;

            if (!cabecera?.length || resto.length === 0) {
                throw new Error('No encontramos filas. La primera fila tiene que traer los nombres de las columnas.');
            }

            const limpias = resto.filter((fila) => fila.some((celda) => String(celda ?? '').trim() !== ''));

            setArchivo({ nombre: file.name, hoja: libro.SheetNames[0] });
            setEncabezados(cabecera.map((c) => String(c ?? '').trim()));
            setFilas(limpias);

            const { data } = await axios.post(route('productos.importar.analizar'), {
                encabezados: cabecera.map((c) => String(c ?? '').trim()),
            });

            setColumnas(data.sugerencia ?? {});
            setPaso('columnas');
        } catch (e) {
            setError(e?.message ?? 'No pudimos leer el archivo. ¿Seguro que es una hoja de cálculo?');
        } finally {
            setLeyendo(false);
        }
    };

    const importar = () => {
        setEnviando(true);

        router.post(
            route('productos.importar.store'),
            { filas: filas.slice(0, maximoFilas), columnas, sobrescribir },
            {
                onError: (errores) => {
                    setEnviando(false);
                    setError(Object.values(errores).flat().join(' '));
                },
                onFinish: () => setEnviando(false),
            },
        );
    };

    const reconocidos = Object.values(columnas).filter((v) => v !== null && v !== '').length;
    const sinNombre = columnas.nombre === undefined || columnas.nombre === null || columnas.nombre === '';
    const deMas = Math.max(0, filas.length - maximoFilas);

    return (
        <AuthenticatedLayout header="Importar desde Excel">
            <Head title="Importar desde Excel" />

            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <Link
                    href={route('productos.index')}
                    className="pulsable inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Productos y servicios
                </Link>

                <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
                    Trae tu inventario de una hoja de cálculo
                </h1>
                <p className="mt-2 max-w-[62ch] leading-relaxed text-stone-600 dark:text-stone-400">
                    Sube el Excel que ya usas. Reconocemos tus columnas aunque no se llamen como las nuestras, y
                    te las enseñamos antes de importar nada. Lo que tu archivo no traiga queda vacío y lo
                    completas después.
                </p>

                {error && (
                    <div role="alert" className="mt-6 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* ── Paso 1: el archivo ──────────────────────────────────── */}
                {paso === 'archivo' && (
                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => entrada.current?.click()}
                            disabled={leyendo}
                            className="pulsable flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 bg-white px-6 py-14 text-center hover:border-marca-500 hover:bg-marca-50/40 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-marca-600 dark:hover:bg-marca-950/30"
                        >
                            <span className="grid h-12 w-12 place-items-center rounded-xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                                {leyendo ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                            </span>
                            <span className="text-base font-semibold text-stone-800 dark:text-stone-100">
                                {leyendo ? 'Leyendo el archivo…' : 'Elige tu archivo'}
                            </span>
                            <span className="text-sm text-stone-500 dark:text-stone-400">
                                Excel (.xlsx, .xls), CSV u OpenDocument. Hasta {maximoFilas.toLocaleString('es-VE')} filas por vez.
                            </span>
                        </button>

                        <input
                            ref={entrada}
                            type="file"
                            accept={FORMATOS}
                            className="hidden"
                            onChange={(e) => leer(e.target.files?.[0])}
                        />

                        <div className="mt-6 rounded-xl bg-stone-100 px-4 py-3.5 text-sm leading-relaxed text-stone-600 dark:bg-stone-800/60 dark:text-stone-400">
                            <p className="font-semibold text-stone-700 dark:text-stone-300">Para que salga bien</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                <li>La primera fila tiene que ser la de los nombres de las columnas.</li>
                                <li>Se lee la primera hoja del libro.</li>
                                <li>Las fotos no viajan en un Excel: se suben después, producto por producto.</li>
                                <li>El archivo no sale de tu navegador hasta que confirmes.</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ── Paso 2: las columnas ────────────────────────────────── */}
                {paso === 'columnas' && (
                    <div className="mt-8 space-y-6">
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
                            <FileSpreadsheet className="h-5 w-5 shrink-0 text-marca-700 dark:text-marca-400" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                                    {archivo?.nombre}
                                </span>
                                <span className="block text-xs text-stone-500 dark:text-stone-400">
                                    Hoja «{archivo?.hoja}» · {filas.length.toLocaleString('es-VE')} filas ·{' '}
                                    {reconocidos} de {campos.length} columnas reconocidas
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setPaso('archivo');
                                    setError(null);
                                }}
                                className="pulsable shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                            >
                                Cambiar archivo
                            </button>
                        </div>

                        {deMas > 0 && (
                            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                Tu archivo trae {filas.length.toLocaleString('es-VE')} filas y en esta tanda entran{' '}
                                {maximoFilas.toLocaleString('es-VE')}. Las {deMas.toLocaleString('es-VE')} restantes
                                las subes después.
                            </p>
                        )}

                        {limite.maximo !== null && (
                            <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-stone-800/60 dark:text-stone-400">
                                Tu plan permite {limite.maximo.toLocaleString('es-VE')} productos y ya tienes{' '}
                                {limite.usados.toLocaleString('es-VE')}. Lo que pase de ahí no se importa.
                            </p>
                        )}

                        <div>
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                                        ¿Qué trae cada columna?
                                    </h2>
                                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                        {esVisual
                                            ? (esEscritorio
                                                ? 'Esto es lo que entendimos. Toca el encabezado de una columna para decir qué es.'
                                                : 'Esto es lo que entendimos. Toca una columna para decir qué es.')
                                            : 'Esto es lo que entendimos. Corrige lo que haga falta; lo que dejes en «No importar» se queda vacío.'}
                                    </p>
                                </div>

                                <div role="radiogroup" aria-label="Cómo asignar las columnas" className="flex shrink-0 gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
                                    {[
                                        { id: 'visual', texto: esEscritorio ? 'Sobre la tabla' : 'Por columna', Icono: MousePointerClick },
                                        { id: 'lista', texto: 'En lista', Icono: List },
                                    ].map(({ id, texto, Icono }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            role="radio"
                                            aria-checked={modo === id}
                                            onClick={() => setModo(id)}
                                            className={`pulsable inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                modo === id
                                                    ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-100'
                                                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'
                                            }`}
                                        >
                                            <Icono className="h-3.5 w-3.5" />
                                            {texto}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {esVisual ? (
                                <Asignador
                                    campos={campos}
                                    columnas={columnas}
                                    onColumnas={setColumnas}
                                    encabezados={encabezados}
                                    filas={filas}
                                    esEscritorio={esEscritorio}
                                />
                            ) : (
                            <div className="mt-4 space-y-2">
                                {campos.map((campo) => {
                                    const elegida = columnas[campo.clave];
                                    const tieneColumna = elegida !== undefined && elegida !== null && elegida !== '';
                                    const falta = campo.obligatorio && !tieneColumna;

                                    return (
                                        <div
                                            key={campo.clave}
                                            className={`grid gap-3 rounded-xl border px-4 py-3 sm:grid-cols-[1fr_1fr] sm:items-center ${
                                                falta
                                                    ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
                                                    : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <InputLabel
                                                    htmlFor={`col-${campo.clave}`}
                                                    value={campo.obligatorio ? `${campo.nombre} (obligatorio)` : campo.nombre}
                                                    className="!mb-0"
                                                />
                                                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{campo.ayuda}</p>
                                            </div>

                                            <div>
                                                <select
                                                    id={`col-${campo.clave}`}
                                                    className={CAMPO}
                                                    value={tieneColumna ? String(elegida) : ''}
                                                    onChange={(e) =>
                                                        setColumnas((anterior) => ({
                                                            ...anterior,
                                                            [campo.clave]: e.target.value === '' ? null : Number(e.target.value),
                                                        }))
                                                    }
                                                >
                                                    <option value="">No importar</option>
                                                    {encabezados.map((encabezado, indice) => (
                                                        <option key={indice} value={indice}>
                                                            {encabezado || `Columna ${indice + 1}`}
                                                        </option>
                                                    ))}
                                                </select>

                                                {tieneColumna && (
                                                    <p className="mt-1.5 truncate text-xs text-stone-500 dark:text-stone-400">
                                                        Ej.: {muestraDe(filas, elegida) || '(vacío)'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </div>

                        {! esVisual && <Vistazo campos={campos} columnas={columnas} filas={filas} />}

                        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 dark:border-stone-800 dark:bg-stone-900">
                            <Interruptor
                                etiqueta="Actualizar los que ya tengo"
                                ayuda="Si un nombre coincide con uno tuyo, se le escriben encima los datos del archivo. Apagado, se salta."
                                valor={sobrescribir}
                                onCambiar={setSobrescribir}
                            />
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                            <SecondaryButton type="button" onClick={() => setPaso('archivo')}>
                                Volver
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={importar} disabled={enviando || sinNombre}>
                                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                {enviando
                                    ? 'Importando…'
                                    : `Importar ${Math.min(filas.length, maximoFilas).toLocaleString('es-VE')} filas`}
                            </PrimaryButton>
                        </div>

                        {sinNombre && (
                            <p className="text-right text-sm text-red-700 dark:text-red-400">
                                Falta decir cuál columna trae el nombre del producto.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

/**
 * Las primeras filas, ya traducidas a nuestras columnas.
 *
 * Ver tres renglones como van a quedar basta para notar que el precio se
 * leyó de la columna equivocada, que es justo lo que uno no descubre hasta
 * que ya importó mil productos.
 */
function Vistazo({ campos, columnas, filas }) {
    const usados = campos.filter((campo) => {
        const columna = columnas[campo.clave];

        return columna !== undefined && columna !== null && columna !== '';
    });

    if (usados.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">Así va a quedar</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Las primeras {Math.min(FILAS_DE_MUESTRA, filas.length)} filas de tu archivo.
            </p>

            <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
                <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                        <tr>
                            {usados.map((campo) => (
                                <th key={campo.clave} className="whitespace-nowrap px-3 py-2 font-semibold">
                                    {campo.nombre}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-950">
                        {filas.slice(0, FILAS_DE_MUESTRA).map((fila, indice) => (
                            <tr key={indice}>
                                {usados.map((campo) => (
                                    <td
                                        key={campo.clave}
                                        className="max-w-[18rem] truncate px-3 py-2 text-stone-700 dark:text-stone-300"
                                    >
                                        {String(fila[columnas[campo.clave]] ?? '').trim() || (
                                            <span className="text-stone-300 dark:text-stone-600">—</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** El primer valor que no esté vacío en esa columna, para enseñar un ejemplo. */
function muestraDe(filas, indice) {
    for (const fila of filas.slice(0, 20)) {
        const valor = String(fila?.[indice] ?? '').trim();

        if (valor !== '') {
            return valor.length > 40 ? `${valor.slice(0, 40)}…` : valor;
        }
    }

    return '';
}


/* ── Asignar sobre la tabla ───────────────────────────────── */

/** Cuántas filas del archivo se enseñan debajo de cada columna. */
const FILAS_EN_LA_TABLA = 6;

/**
 * La hoja tal como viene, con cada columna asignable de un clic.
 *
 * Elegir en una lista de trece desplegables obliga a recordar qué había en
 * «PVP» mientras se busca el campo. Aquí se ve el dato y se decide encima:
 * se toca el encabezado y se dice qué es. Las que no se asignen se quedan
 * en gris y no se importan.
 *
 * Solo en computadora: una hoja de doce columnas no cabe en un teléfono.
 */
function Asignador({ campos, columnas, onColumnas, encabezados, filas, esEscritorio }) {
    const [abierta, setAbierta] = useState(null);

    // Qué campos cuelgan de cada columna; normalmente uno, a veces ninguno
    const porColumna = new Map();

    campos.forEach((campo) => {
        const indice = columnas[campo.clave];

        if (indice !== undefined && indice !== null && indice !== '') {
            porColumna.set(indice, [...(porColumna.get(indice) ?? []), campo]);
        }
    });

    const asignar = (indice, clave) => {
        onColumnas((anterior) => ({ ...anterior, [clave]: indice }));
        setAbierta(null);
    };

    const quitar = (clave) => onColumnas((anterior) => ({ ...anterior, [clave]: null }));

    const limpiarColumna = (indice) => {
        onColumnas((anterior) => {
            const siguiente = { ...anterior };

            (porColumna.get(indice) ?? []).forEach((campo) => {
                siguiente[campo.clave] = null;
            });

            return siguiente;
        });
        setAbierta(null);
    };

    if (! esEscritorio) {
        return (
            <div className="mt-4">
                <TarjetasDeColumna
                    encabezados={encabezados}
                    filas={filas}
                    porColumna={porColumna}
                    onAbrir={setAbierta}
                />

                {abierta !== null && (
                    <HojaDeCampos
                        campos={campos}
                        columnas={columnas}
                        encabezados={encabezados}
                        indice={abierta}
                        asignados={porColumna.get(abierta) ?? []}
                        onElegir={(clave) => asignar(abierta, clave)}
                        onLimpiar={() => limpiarColumna(abierta)}
                        onCerrar={() => setAbierta(null)}
                    />
                )}

                <ResumenDeCampos campos={campos} columnas={columnas} onQuitar={quitar} />
            </div>
        );
    }

    return (
        <div className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                    <thead>
                        <tr>
                            {encabezados.map((encabezado, indice) => {
                                const asignados = porColumna.get(indice) ?? [];
                                const activa = asignados.length > 0;

                                return (
                                    <th
                                        key={indice}
                                        className={`relative border-b border-r border-stone-200 p-0 align-top last:border-r-0 dark:border-stone-800 ${
                                            activa ? 'bg-marca-50/70 dark:bg-marca-950/40' : 'bg-stone-50 dark:bg-stone-900'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setAbierta(abierta === indice ? null : indice)}
                                            aria-expanded={abierta === indice}
                                            className="pulsable w-full min-w-[9rem] max-w-[16rem] px-3 py-2.5 text-left hover:bg-white/70 dark:hover:bg-stone-800/70"
                                        >
                                            <span className="block truncate text-[11px] font-normal uppercase tracking-wide text-stone-400 dark:text-stone-500">
                                                {encabezado || `Columna ${indice + 1}`}
                                            </span>

                                            <span className="mt-1 flex flex-wrap items-center gap-1">
                                                {activa ? (
                                                    asignados.map((campo) => (
                                                        <span
                                                            key={campo.clave}
                                                            className="inline-flex items-center gap-1 rounded-md bg-marca-700 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-marca-600"
                                                        >
                                                            <Check className="h-3 w-3" strokeWidth={3} />
                                                            {campo.nombre}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                                                        No se importa
                                                    </span>
                                                )}
                                            </span>
                                        </button>

                                        {abierta === indice && (
                                            <MenuDeCampos
                                                campos={campos}
                                                columnas={columnas}
                                                encabezados={encabezados}
                                                indice={indice}
                                                asignados={asignados}
                                                onElegir={(clave) => asignar(indice, clave)}
                                                onLimpiar={() => limpiarColumna(indice)}
                                                onCerrar={() => setAbierta(null)}
                                            />
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {filas.slice(0, FILAS_EN_LA_TABLA).map((fila, nf) => (
                            <tr key={nf}>
                                {encabezados.map((_, indice) => {
                                    const activa = porColumna.has(indice);

                                    return (
                                        <td
                                            key={indice}
                                            className={`max-w-[16rem] truncate border-r border-stone-100 px-3 py-2 last:border-r-0 dark:border-stone-800/70 ${
                                                activa
                                                    ? 'bg-white text-stone-700 dark:bg-stone-950 dark:text-stone-300'
                                                    : 'bg-stone-50/60 text-stone-400 dark:bg-stone-900/40 dark:text-stone-600'
                                            }`}
                                        >
                                            {String(fila?.[indice] ?? '').trim() || '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ResumenDeCampos campos={campos} columnas={columnas} onQuitar={quitar} />
        </div>
    );
}

/**
 * Qué puede ser esta columna.
 *
 * Si el campo ya está puesto en otra, se dice en cuál: elegirlo aquí lo
 * mueve, y conviene saberlo antes de tocar.
 */
function MenuDeCampos({ campos, columnas, encabezados, indice, asignados, onElegir, onLimpiar, onCerrar }) {
    useEffect(() => {
        const alPulsar = (evento) => evento.key === 'Escape' && onCerrar();

        document.addEventListener('keydown', alPulsar);

        return () => document.removeEventListener('keydown', alPulsar);
    }, [onCerrar]);

    return (
        <>
            {/* Cerrar al tocar fuera, sin tapar la tabla con un velo oscuro */}
            <button
                type="button"
                aria-label="Cerrar"
                onClick={onCerrar}
                className="fixed inset-0 z-20 cursor-default"
            />

            <div className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
                <p className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                    ¿Qué es «{encabezados[indice] || `Columna ${indice + 1}`}»?
                </p>

                <ListaDeCampos
                    campos={campos}
                    columnas={columnas}
                    encabezados={encabezados}
                    indice={indice}
                    asignados={asignados}
                    onElegir={onElegir}
                />

                {asignados.length > 0 && (
                    <button
                        type="button"
                        onClick={onLimpiar}
                        className="flex w-full items-center gap-2 border-t border-stone-200 px-3 py-2 text-left text-sm font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                        <X className="h-4 w-4" />
                        No importar esta columna
                    </button>
                )}
            </div>
        </>
    );
}

/** Lo que falta por asignar, para no tener que repasar la tabla entera. */
function ResumenDeCampos({ campos, columnas, onQuitar }) {
    const puesto = (campo) => {
        const indice = columnas[campo.clave];

        return indice !== undefined && indice !== null && indice !== '';
    };

    const faltan = campos.filter((campo) => ! puesto(campo));
    const puestos = campos.filter(puesto);

    return (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Se va a importar ({puestos.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {puestos.length === 0 && (
                        <span className="text-sm text-stone-400 dark:text-stone-500">Nada todavía.</span>
                    )}
                    {puestos.map((campo) => (
                        <button
                            key={campo.clave}
                            type="button"
                            onClick={() => onQuitar(campo.clave)}
                            title="Quitar"
                            className="pulsable inline-flex items-center gap-1 rounded-full bg-marca-100 px-2.5 py-1 text-xs font-semibold text-marca-800 hover:bg-marca-200 dark:bg-marca-950 dark:text-marca-300 dark:hover:bg-marca-900"
                        >
                            {campo.nombre}
                            <X className="h-3 w-3" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Se queda vacío ({faltan.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {faltan.length === 0 && (
                        <span className="text-sm text-stone-400 dark:text-stone-500">Nada: lo trajiste todo.</span>
                    )}
                    {faltan.map((campo) => (
                        <span
                            key={campo.clave}
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                campo.obligatorio
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                            }`}
                        >
                            {campo.nombre}
                            {campo.obligatorio && ' · hace falta'}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}


/**
 * Una columna por tarjeta, a lo ancho.
 *
 * La tabla de la computadora en un teléfono es un desastre: once columnas
 * son mil seiscientos píxeles de desplazamiento lateral, y al llegar a la
 * sexta ya no se ve de cuál era el encabezado. Dada vuelta funciona: cada
 * columna ocupa el ancho entero, con sus primeros valores a la vista, que es
 * lo único que hace falta para decidir qué es.
 */
function TarjetasDeColumna({ encabezados, filas, porColumna, onAbrir }) {
    return (
        <div className="space-y-2.5">
            {encabezados.map((encabezado, indice) => {
                const asignados = porColumna.get(indice) ?? [];
                const activa = asignados.length > 0;
                const valores = filas
                    .slice(0, 12)
                    .map((fila) => String(fila?.[indice] ?? '').trim())
                    .filter(Boolean)
                    .slice(0, 3);

                return (
                    <button
                        key={indice}
                        type="button"
                        onClick={() => onAbrir(indice)}
                        className={`pulsable flex w-full items-center gap-3 rounded-xl border p-3.5 text-left ${
                            activa
                                ? 'border-marca-300 bg-marca-50/60 dark:border-marca-800 dark:bg-marca-950/40'
                                : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
                        }`}
                    >
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                                <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                                    {encabezado || `Columna ${indice + 1}`}
                                </span>
                                <span className="shrink-0 text-[10px] text-stone-300 dark:text-stone-600">
                                    {indice + 1}/{encabezados.length}
                                </span>
                            </span>

                            {/* Los datos de verdad: es lo que permite decidir */}
                            <span className="mt-1 block truncate text-sm text-stone-600 dark:text-stone-400">
                                {valores.length > 0 ? valores.join(' · ') : 'Columna vacía'}
                            </span>

                            <span className="mt-2 flex flex-wrap items-center gap-1">
                                {activa ? (
                                    asignados.map((campo) => (
                                        <span
                                            key={campo.clave}
                                            className="inline-flex items-center gap-1 rounded-md bg-marca-700 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-marca-600"
                                        >
                                            <Check className="h-3 w-3" strokeWidth={3} />
                                            {campo.nombre}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                                        Toca para decir qué es
                                    </span>
                                )}
                            </span>
                        </span>

                        <ChevronRight className="h-5 w-5 shrink-0 text-stone-300 dark:text-stone-600" />
                    </button>
                );
            })}
        </div>
    );
}

/**
 * La lista de campos, subiendo desde abajo.
 *
 * En un teléfono un menú colgado de una tarjeta se sale de la pantalla o
 * queda debajo del teclado. Desde abajo cabe entero, se alcanza con el
 * pulgar y se cierra deslizando o tocando fuera.
 */
function HojaDeCampos({ campos, columnas, encabezados, indice, asignados, onElegir, onLimpiar, onCerrar }) {
    useEffect(() => {
        const alPulsar = (evento) => evento.key === 'Escape' && onCerrar();
        const anterior = document.body.style.overflow;

        document.addEventListener('keydown', alPulsar);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', alPulsar);
            document.body.style.overflow = anterior;
        };
    }, [onCerrar]);

    return (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
            <button
                type="button"
                aria-label="Cerrar"
                onClick={onCerrar}
                className="absolute inset-0 bg-stone-950/50"
            />

            <div className="relative flex max-h-[80dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-stone-900">
                <div className="shrink-0 border-b border-stone-200 px-5 pb-3 pt-4 dark:border-stone-800">
                    <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-700" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                        Columna {indice + 1} de {encabezados.length}
                    </p>
                    <h3 className="mt-0.5 truncate font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                        ¿Qué es «{encabezados[indice] || `Columna ${indice + 1}`}»?
                    </h3>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <ListaDeCampos
                        campos={campos}
                        columnas={columnas}
                        encabezados={encabezados}
                        indice={indice}
                        asignados={asignados}
                        onElegir={onElegir}
                        holgada
                    />
                </div>

                <div className="flex shrink-0 gap-2 border-t border-stone-200 px-4 py-3 dark:border-stone-800">
                    {asignados.length > 0 && (
                        <button
                            type="button"
                            onClick={onLimpiar}
                            className="pulsable inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
                        >
                            <X className="h-4 w-4" />
                            No importar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="pulsable flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Los campos entre los que se elige, con dónde está puesto cada uno.
 *
 * La usan el menú de la computadora y la hoja del teléfono: es la misma
 * decisión, y si se escribiera dos veces se contradirían a la primera.
 */
function ListaDeCampos({ campos, columnas, encabezados, indice, asignados, onElegir, holgada = false }) {
    const yaPuestos = asignados.map((campo) => campo.clave);

    return (
        <div className={holgada ? 'py-1' : 'max-h-72 overflow-y-auto py-1'}>
            {campos.map((campo) => {
                const donde = columnas[campo.clave];
                const enOtra = donde !== undefined && donde !== null && donde !== '' && donde !== indice;
                const aqui = yaPuestos.includes(campo.clave);

                return (
                    <button
                        key={campo.clave}
                        type="button"
                        onClick={() => onElegir(campo.clave)}
                        className={`flex w-full items-start gap-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800 ${
                            holgada ? 'px-5 py-3' : 'px-3 py-2 text-sm'
                        } ${aqui ? 'bg-marca-50 dark:bg-marca-950/50' : ''}`}
                    >
                        <span className="mt-0.5 w-4 shrink-0">
                            {aqui && <Check className="h-4 w-4 text-marca-700 dark:text-marca-400" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={`block font-medium text-stone-800 dark:text-stone-100 ${holgada ? 'text-base' : ''}`}>
                                {campo.nombre}
                                {campo.obligatorio && (
                                    <span className="ml-1 text-[10px] font-bold uppercase text-marca-700 dark:text-marca-400">
                                        obligatorio
                                    </span>
                                )}
                            </span>
                            {holgada && (
                                <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{campo.ayuda}</span>
                            )}
                            {enOtra && (
                                <span className="mt-0.5 block text-[11px] text-amber-700 dark:text-amber-500">
                                    Ahora está en «{encabezados[donde] || `Columna ${donde + 1}`}»
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
