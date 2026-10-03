import { useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Cabecera, Pagina, Tarjeta } from '@/Components/UI';
import { AlertTriangle, ArchiveRestore, Check, Download, FileArchive, Upload, X } from 'lucide-react';

/**
 * Respaldo del catálogo: descargarlo y volver a subirlo.
 *
 * La restauración va en dos pasos. Subir el archivo no cambia nada: primero
 * se muestra qué trae y recién después se elige qué hacer con él.
 */
export default function Index({ copias, pendiente, limiteMb }) {
    const { flash } = usePage().props;

    return (
        <AuthenticatedLayout header="Respaldo de mi catálogo">
            <Head title="Respaldo" />

            <Pagina className="max-w-3xl">
                <Cabecera
                    titulo="Respaldo de mi catálogo"
                    descripcion="Un archivo con tus productos, tus servicios, tus combos, tus imágenes y el diseño de tu catálogo. Te lo llevas y, si hace falta, lo vuelves a subir."
                />

                {flash?.success && (
                    <div className="animate-acercar rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                        {flash.success}
                    </div>
                )}

                <Tarjeta titulo="Descargar" descripcion="Guárdalo en tu computadora o en tu nube. Hazlo antes de cualquier cambio grande.">
                    <a
                        href={route('respaldo.descargar')}
                        className="pulsable inline-flex items-center gap-2 rounded-xl bg-marca-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                    >
                        <Download className="h-4 w-4" />
                        Descargar mi respaldo
                    </a>

                    <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
                        No incluye facturas ni clientes: eso se baja como planillas desde{' '}
                        <a href={route('profile.edit')} className="underline hover:no-underline">
                            Mi perfil
                        </a>
                        , y restaurar ventas viejas encima de las nuevas descuadraría tus cuentas.
                    </p>
                </Tarjeta>

                {pendiente ? <Confirmacion pendiente={pendiente} /> : <Subida limiteMb={limiteMb} />}

                {copias.length > 0 && <CopiasGuardadas copias={copias} />}
            </Pagina>
        </AuthenticatedLayout>
    );
}

function Subida({ limiteMb }) {
    const archivo = useRef(null);
    const [elegido, setElegido] = useState(null);
    const form = useForm({ respaldo: null });

    const enviar = (evento) => {
        evento.preventDefault();
        form.post(route('respaldo.subir'), { forceFormData: true, preserveScroll: true });
    };

    return (
        <Tarjeta titulo="Restaurar" descripcion="Sube el archivo que descargaste. Te mostramos qué trae antes de tocar nada.">
            <form onSubmit={enviar}>
                <label className="pulsable flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 px-6 py-10 text-center hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/60">
                    <Upload className="h-6 w-6 text-stone-400" />
                    <span className="text-sm font-medium">
                        {elegido ? elegido.name : 'Elegir el archivo de respaldo'}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                        {elegido
                            ? `${(elegido.size / 1048576).toFixed(1)} MB`
                            : `Un archivo .zip de hasta ${limiteMb} MB, tal como lo descargaste`}
                    </span>
                    <input
                        ref={archivo}
                        type="file"
                        accept=".zip,application/zip"
                        className="hidden"
                        onChange={(e) => {
                            const elegidoAhora = e.target.files?.[0] ?? null;
                            setElegido(elegidoAhora);
                            form.setData('respaldo', elegidoAhora);
                        }}
                    />
                </label>

                {form.errors.respaldo && <p className="mt-3 text-sm text-red-600">{form.errors.respaldo}</p>}

                {elegido && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="pulsable inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900"
                        >
                            <FileArchive className="h-4 w-4" />
                            {form.processing ? 'Revisando el archivo' : 'Revisar este archivo'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setElegido(null);
                                form.setData('respaldo', null);
                                if (archivo.current) archivo.current.value = '';
                            }}
                            className="pulsable rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                        >
                            Quitar
                        </button>
                    </div>
                )}
            </form>
        </Tarjeta>
    );
}

/** Paso dos: ya sabemos qué trae el archivo y hay que decidir qué hacer. */
function Confirmacion({ pendiente }) {
    const form = useForm({ modo: 'agregar', entiendo: false });
    const reemplaza = form.data.modo === 'reemplazar';

    const restaurar = (evento) => {
        evento.preventDefault();
        form.post(route('respaldo.restaurar'), { preserveScroll: true });
    };

    return (
        <Tarjeta titulo="Este es el respaldo que subiste">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <Dato titulo="Negocio" valor={pendiente.negocio} />
                <Dato titulo="Hecho el" valor={formatearFecha(pendiente.generado)} />
                <Dato titulo="Productos y servicios" valor={pendiente.productos} />
                <Dato titulo="Categorías" valor={pendiente.categorias} />
                <Dato titulo="Combos" valor={pendiente.combos} />
                <Dato titulo="Banners" valor={pendiente.banners} />
                <Dato titulo="Diseño del catálogo" valor={pendiente.tiene_diseno ? 'Incluido' : 'No incluido'} />
            </dl>

            <form onSubmit={restaurar} className="mt-6 space-y-4">
                <Opcion
                    activo={!reemplaza}
                    onClick={() => form.setData('modo', 'agregar')}
                    Icono={Check}
                    titulo="Agregar lo que falta"
                    texto="Crea lo que no tengas y deja intacto lo que ya está, incluido tu diseño actual. Es lo más seguro."
                />

                <Opcion
                    activo={reemplaza}
                    onClick={() => form.setData('modo', 'reemplazar')}
                    Icono={ArchiveRestore}
                    titulo="Reemplazar todo"
                    texto="Deja tu cuenta exactamente como estaba en el respaldo: borra el catálogo actual y restaura también el diseño y los banners."
                    peligroso
                />

                {reemplaza && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                        <p className="flex items-start gap-2 text-sm font-semibold text-red-900 dark:text-red-200">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Se borrará tu catálogo actual
                        </p>
                        <p className="mt-2 text-sm text-red-800 dark:text-red-300">
                            Tus productos, servicios, combos, categorías, banners y el diseño de ahora se pierden y
                            quedan los del respaldo. También se pierden las fotos del fichero y los ajustes de
                            ganancias que estén atados a esos productos. Tus facturas no se tocan.
                        </p>
                        <p className="mt-2 text-sm text-red-800 dark:text-red-300">
                            Antes de empezar guardamos una copia de lo que tienes hoy, por si te arrepientes.
                        </p>

                        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-red-900 dark:text-red-200">
                            <input
                                type="checkbox"
                                checked={form.data.entiendo}
                                onChange={(e) => form.setData('entiendo', e.target.checked)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-red-300 text-red-700 focus:ring-red-600"
                            />
                            Entiendo que mi catálogo actual se borra y no se puede deshacer solo.
                        </label>

                        {form.errors.entiendo && <p className="mt-2 text-sm text-red-700">{form.errors.entiendo}</p>}
                    </div>
                )}

                {form.errors.respaldo && <p className="text-sm text-red-600">{form.errors.respaldo}</p>}

                <div className="flex flex-wrap gap-2">
                    <button
                        type="submit"
                        disabled={form.processing || (reemplaza && !form.data.entiendo)}
                        className={`pulsable inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                            reemplaza ? 'bg-red-700 hover:bg-red-600' : 'bg-marca-700 hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950'
                        }`}
                    >
                        <ArchiveRestore className="h-4 w-4" />
                        {form.processing ? 'Restaurando' : reemplaza ? 'Reemplazar mi catálogo' : 'Agregar lo que falta'}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.post(route('respaldo.cancelar'), {}, { preserveScroll: true })}
                        className="pulsable inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                    >
                        <X className="h-4 w-4" />
                        Descartar el archivo
                    </button>
                </div>
            </form>
        </Tarjeta>
    );
}

function CopiasGuardadas({ copias }) {
    return (
        <Tarjeta
            titulo="Copias que guardamos por ti"
            descripcion="Cada vez que reemplazas tu catálogo guardamos cómo estaba antes. Se conservan las últimas cinco."
        >
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                {copias.map((copia) => (
                    <li key={copia.archivo} className="flex flex-wrap items-center gap-3 py-3">
                        <FileArchive className="h-4 w-4 shrink-0 text-stone-400" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{formatearFecha(copia.fecha)}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">{copia.peso}</p>
                        </div>
                        <a
                            href={route('respaldo.copia', copia.archivo)}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Descargar
                        </a>
                    </li>
                ))}
            </ul>
        </Tarjeta>
    );
}

function Opcion({ activo, onClick, Icono, titulo, texto, peligroso = false }) {
    const borde = activo
        ? peligroso
            ? 'border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/40'
            : 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
        : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={activo}
            className={`pulsable flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150 ease-salida ${borde}`}
        >
            <Icono
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                    activo ? (peligroso ? 'text-red-700 dark:text-red-400' : 'text-marca-700 dark:text-marca-400') : 'text-stone-400'
                }`}
            />
            <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-0.5 block text-sm text-stone-600 dark:text-stone-400">{texto}</span>
            </span>
        </button>
    );
}

function Dato({ titulo, valor }) {
    return (
        <div className="flex justify-between gap-3 border-b border-stone-100 py-1.5 text-sm dark:border-stone-800">
            <dt className="text-stone-500 dark:text-stone-400">{titulo}</dt>
            <dd className="font-medium">{valor}</dd>
        </div>
    );
}

function formatearFecha(valor) {
    if (!valor) {
        return '';
    }

    return new Date(valor).toLocaleString('es', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
