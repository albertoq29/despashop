import { useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Check, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Interruptor } from '@/Components/UI';

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
                            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                                ¿Qué trae cada columna?
                            </h2>
                            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                Esto es lo que entendimos. Corrige lo que haga falta; lo que dejes en «No importar»
                                se queda vacío.
                            </p>

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
                        </div>

                        <Vistazo campos={campos} columnas={columnas} filas={filas} />

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
