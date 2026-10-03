import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Bug, Inbox, Lightbulb, Search, Send, Trash2 } from 'lucide-react';

const TONOS_ESTADO = {
    nueva: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    resuelta: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300',
    descartada: 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
};

const FILTROS_ESTADO = [
    { valor: 'abiertas', etiqueta: 'Abiertas' },
    { valor: 'nueva', etiqueta: 'Nuevas' },
    { valor: 'en_proceso', etiqueta: 'En proceso' },
    { valor: 'cerradas', etiqueta: 'Cerradas' },
    { valor: 'todas', etiqueta: 'Todas' },
];

/**
 * Bandeja de lo que escriben los comercios. Cada mensaje se contesta desde
 * la misma fila; la respuesta le aparece al comercio en su panel.
 */
export default function Index({ mensajes, filtros, conteos, estados }) {
    const [busqueda, setBusqueda] = useState(filtros.buscar ?? '');

    const filtrar = (cambios) => {
        router.get(
            route('admin.sugerencias.index'),
            { ...filtros, ...cambios },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AdminLayout header="Sugerencias y errores">
            <Head title="Sugerencias" />

            <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    <Metrica etiqueta="Sin leer" valor={conteos.sin_leer} Icono={Inbox} alerta={conteos.sin_leer > 0} />
                    <Metrica etiqueta="Errores abiertos" valor={conteos.errores} Icono={Bug} alerta={conteos.errores > 0} />
                    <Metrica etiqueta="Recibidas en total" valor={conteos.total} Icono={Lightbulb} />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                filtrar({ buscar: busqueda || undefined });
                            }}
                            className="relative flex-1"
                        >
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar en el asunto o el mensaje"
                                aria-label="Buscar mensajes"
                                className="w-full rounded-xl border-stone-200 bg-white py-2.5 pl-10 text-sm dark:border-stone-800 dark:bg-stone-950"
                            />
                        </form>

                        <select
                            value={filtros.tipo ?? ''}
                            onChange={(e) => filtrar({ tipo: e.target.value || undefined })}
                            aria-label="Filtrar por tipo"
                            className="rounded-xl border-stone-200 bg-white py-2.5 text-sm dark:border-stone-800 dark:bg-stone-950"
                        >
                            <option value="">Ideas y errores</option>
                            <option value="sugerencia">Solo sugerencias</option>
                            <option value="error">Solo errores</option>
                        </select>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {FILTROS_ESTADO.map(({ valor, etiqueta }) => (
                            <button
                                key={valor}
                                type="button"
                                onClick={() => filtrar({ estado: valor })}
                                aria-pressed={(filtros.estado ?? 'abiertas') === valor}
                                className={`pulsable shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                                    (filtros.estado ?? 'abiertas') === valor
                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                                }`}
                            >
                                {etiqueta}
                            </button>
                        ))}
                    </div>
                </div>

                {mensajes.data.length === 0 ? (
                    <p className="rounded-2xl border border-stone-200 bg-white py-16 text-center text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                        No hay mensajes con esos filtros.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {mensajes.data.map((mensaje) => (
                            <Mensaje key={mensaje.id} mensaje={mensaje} estados={estados} />
                        ))}
                    </ul>
                )}

                {mensajes.links?.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1.5">
                        {mensajes.links.map((enlace, indice) => (
                            <Link
                                key={indice}
                                href={enlace.url ?? '#'}
                                disabled={!enlace.url}
                                preserveScroll
                                className={`rounded-lg px-3.5 py-2 text-sm ${
                                    enlace.active
                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                        : enlace.url
                                          ? 'bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'
                                          : 'cursor-default text-stone-400'
                                }`}
                                dangerouslySetInnerHTML={{ __html: enlace.label }}
                            />
                        ))}
                    </nav>
                )}
            </div>
        </AdminLayout>
    );
}

function Mensaje({ mensaje, estados }) {
    const [contestando, setContestando] = useState(false);
    const esError = mensaje.type === 'error';

    const form = useForm({ reply: mensaje.reply ?? '', status: mensaje.status });

    const responder = () => {
        form.patch(route('admin.sugerencias.update', mensaje.id), {
            preserveScroll: true,
            onSuccess: () => setContestando(false),
        });
    };

    // Cambiar solo el estado no toca la respuesta guardada
    const cambiarEstado = (status) => {
        router.patch(
            route('admin.sugerencias.update', mensaje.id),
            { status, reply: '' },
            { preserveScroll: true },
        );
    };

    return (
        <li
            className={`rounded-2xl border bg-white p-5 dark:bg-stone-900 ${
                mensaje.read_at ? 'border-stone-200 dark:border-stone-800' : 'border-marca-300 dark:border-marca-800'
            }`}
        >
            <div className="flex flex-wrap items-start gap-3">
                <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                        esError
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                >
                    {esError ? <Bug className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="font-medium">{mensaje.subject}</p>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {mensaje.user ? (
                            <Link href={route('admin.comercios.show', mensaje.user.id)} className="hover:underline">
                                {mensaje.user.business_name || mensaje.user.name}
                            </Link>
                        ) : (
                            'Comercio eliminado'
                        )}
                        {' · '}
                        {esError ? 'Error' : 'Sugerencia'}
                        {mensaje.page ? ` · ${mensaje.page}` : ''}
                        {' · '}
                        {formatearFecha(mensaje.created_at)}
                    </p>
                </div>

                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${TONOS_ESTADO[mensaje.status]}`}>
                    {estados[mensaje.status]}
                </span>
            </div>

            <p className="mt-3 whitespace-pre-line text-sm text-stone-600 dark:text-stone-400">{mensaje.body}</p>

            {mensaje.image_url && (
                <a href={mensaje.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                    <img
                        src={mensaje.image_url}
                        alt="Captura enviada por el comercio"
                        className="h-28 rounded-lg border border-stone-200 object-cover dark:border-stone-700"
                    />
                </a>
            )}

            {mensaje.user_agent && (
                <p className="mt-2 truncate font-mono text-xs text-stone-400" title={mensaje.user_agent}>
                    {mensaje.user_agent}
                </p>
            )}

            {mensaje.reply && !contestando && (
                <div className="mt-4 rounded-xl bg-stone-50 p-4 dark:bg-stone-950/60">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Respondido {formatearFecha(mensaje.replied_at)}
                        {mensaje.replier ? ` · ${mensaje.replier.name}` : ''}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm">{mensaje.reply}</p>
                </div>
            )}

            {contestando && (
                <div className="mt-4">
                    <label htmlFor={`reply-${mensaje.id}`} className="text-sm font-medium">
                        Tu respuesta
                    </label>
                    <textarea
                        id={`reply-${mensaje.id}`}
                        value={form.data.reply}
                        onChange={(e) => form.setData('reply', e.target.value)}
                        rows={4}
                        maxLength={2000}
                        placeholder="Gracias por avisar. Lo estamos revisando y te contamos apenas esté."
                        className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                    />
                    {form.errors.reply && <p className="mt-1 text-sm text-red-600">{form.errors.reply}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                            value={form.data.status}
                            onChange={(e) => form.setData('status', e.target.value)}
                            aria-label="Estado del mensaje"
                            className="rounded-lg border-stone-300 bg-white py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
                        >
                            {Object.entries(estados).map(([valor, etiqueta]) => (
                                <option key={valor} value={valor}>
                                    {etiqueta}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={responder}
                            disabled={form.processing}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
                        >
                            <Send className="h-3.5 w-3.5" />
                            Enviar respuesta
                        </button>

                        <button
                            type="button"
                            onClick={() => setContestando(false)}
                            className="pulsable rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {!contestando && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setContestando(true)}
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                    >
                        <Send className="h-3.5 w-3.5" />
                        {mensaje.reply ? 'Cambiar la respuesta' : 'Responder'}
                    </button>

                    {mensaje.status !== 'resuelta' && (
                        <Accion onClick={() => cambiarEstado('resuelta')}>Marcar resuelta</Accion>
                    )}
                    {mensaje.status === 'nueva' && (
                        <Accion onClick={() => cambiarEstado('en_proceso')}>En proceso</Accion>
                    )}
                    {mensaje.status !== 'descartada' && (
                        <Accion onClick={() => cambiarEstado('descartada')}>Descartar</Accion>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('¿Eliminar este mensaje? El comercio dejará de verlo.')) {
                                router.delete(route('admin.sugerencias.destroy', mensaje.id), { preserveScroll: true });
                            }
                        }}
                        aria-label="Eliminar el mensaje"
                        className="pulsable ml-auto grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-600 dark:hover:bg-stone-800"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}
        </li>
    );
}

function Accion({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="pulsable rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
        >
            {children}
        </button>
    );
}

function Metrica({ etiqueta, valor, Icono, alerta = false }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <span
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                    alerta
                        ? 'bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
            >
                <Icono className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-3xl font-semibold tracking-tight">{Number(valor).toLocaleString('es')}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
        </div>
    );
}

function formatearFecha(valor) {
    if (!valor) {
        return '';
    }

    return new Date(valor).toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
