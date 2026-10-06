import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarClock, Check, ExternalLink, X } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { fechaLarga, textoDeDias } from '@/Components/Plan/ResumenDelPlan';

const FILTROS = [
    ['pendiente', 'Sin responder'],
    ['aceptada', 'Aceptadas'],
    ['aplicada', 'Aplicadas'],
    ['rechazada', 'Rechazadas'],
    ['todas', 'Todas'],
];

const ESTADOS = {
    pendiente: { texto: 'Sin responder', clase: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' },
    aceptada: { texto: 'Aceptada, entra al renovar', clase: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300' },
    aplicada: { texto: 'Aplicada', clase: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300' },
    rechazada: { texto: 'Rechazada', clase: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
    cancelada: { texto: 'Retirada por el comercio', clase: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
};

/**
 * Cambios de plan pedidos por los comercios.
 *
 * Aceptar no mueve el plan: lo deja apuntado para la próxima renovación.
 * El cambio ocurre en la ficha del comercio, al fijar el vencimiento nuevo,
 * que es cuando de verdad empieza el período del plan nuevo.
 */
export default function Index({ solicitudes, estado, conteos }) {
    const { flash } = usePage().props;

    return (
        <AdminLayout header="Cambios de plan">
            <Head title="Cambios de plan" />

            <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
                {flash?.success && (
                    <div className="rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                        {flash.error}
                    </div>
                )}

                {conteos.en_espera > 0 && (
                    <p className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            {conteos.en_espera === 1
                                ? 'Hay 1 cambio aceptado esperando renovación.'
                                : `Hay ${conteos.en_espera} cambios aceptados esperando renovación.`}{' '}
                            Se aplican al guardar ese plan en la ficha del comercio.
                        </span>
                    </p>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {FILTROS.map(([valor, etiqueta]) => (
                        <button
                            key={valor}
                            type="button"
                            onClick={() =>
                                router.get(route('admin.cambios-plan.index'), { estado: valor }, { preserveScroll: true })
                            }
                            className={`pulsable rounded-lg px-3 py-1.5 text-sm font-medium ${
                                estado === valor
                                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                    : 'border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                            }`}
                        >
                            {etiqueta}
                            {valor === 'pendiente' && conteos.pendientes > 0 && (
                                <span className="ml-1.5 tabular-nums">({conteos.pendientes})</span>
                            )}
                        </button>
                    ))}
                </div>

                {solicitudes.data.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-12 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                        Nada por aquí.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {solicitudes.data.map((solicitud) => (
                            <Solicitud key={solicitud.id} solicitud={solicitud} />
                        ))}
                    </div>
                )}

                {solicitudes.links?.length > 3 && (
                    <div className="flex flex-wrap gap-1.5">
                        {solicitudes.links.map((enlace, i) => (
                            <Link
                                key={i}
                                href={enlace.url ?? '#'}
                                preserveScroll
                                className={`rounded-lg px-3 py-1.5 text-sm ${
                                    enlace.active
                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                        : enlace.url
                                          ? 'border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                                          : 'pointer-events-none border border-stone-200 text-stone-400 dark:border-stone-800 dark:text-stone-600'
                                }`}
                                dangerouslySetInnerHTML={{ __html: enlace.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function Solicitud({ solicitud }) {
    const [respondiendo, setRespondiendo] = useState(null);
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    const estado = ESTADOS[solicitud.status] ?? ESTADOS.pendiente;
    const comercio = solicitud.comercio;

    // Directo con `router` y no con `useForm`: la decisión se conoce al
    // pulsar, y `setData` la dejaría para el render siguiente.
    const responder = (decision) => {
        router.patch(
            route('admin.cambios-plan.update', solicitud.id),
            { status: decision, admin_note: nota },
            {
                preserveScroll: true,
                onStart: () => setEnviando(true),
                onFinish: () => {
                    setEnviando(false);
                    setRespondiendo(null);
                    setNota('');
                },
            },
        );
    };

    return (
        <article className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link
                        href={route('admin.comercios.show', comercio.id)}
                        className="inline-flex items-center gap-1.5 font-display font-semibold text-stone-900 hover:underline dark:text-stone-100"
                    >
                        {comercio.business_name || comercio.name}
                        <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                    </Link>

                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                        <span>{solicitud.plan_actual?.name ?? 'Sin plan'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <strong className="font-semibold text-stone-900 dark:text-stone-100">
                            {solicitud.plan_pedido?.name}
                        </strong>
                        {solicitud.plan_pedido && solicitud.plan_actual && (
                            <span className="text-xs text-stone-500">
                                ${Number(solicitud.plan_actual.price_usd).toFixed(2)} →{' '}
                                ${Number(solicitud.plan_pedido.price_usd).toFixed(2)}
                            </span>
                        )}
                    </p>

                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Pedido el {fechaLarga(solicitud.created_at)}
                        {comercio.plan_expires_at && ` · su plan ${textoDeDias(dias(comercio.plan_expires_at))}`}
                    </p>
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estado.clase}`}>
                    {estado.texto}
                </span>
            </div>

            {solicitud.message && (
                <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-sm leading-relaxed text-stone-700 dark:bg-stone-950 dark:text-stone-300">
                    {solicitud.message}
                </p>
            )}

            {solicitud.admin_note && (
                <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                    <span className="font-semibold">Respuesta:</span> {solicitud.admin_note}
                    {solicitud.decidio_el && (
                        <span className="text-stone-500"> — {solicitud.decidio_el.name}</span>
                    )}
                </p>
            )}

            {['pendiente', 'aceptada'].includes(solicitud.status) && (
                <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-800">
                    {respondiendo ? (
                        <div className="space-y-3">
                            <textarea
                                rows={2}
                                maxLength={500}
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                placeholder={
                                    respondiendo === 'aceptada'
                                        ? 'Opcional: el precio acordado, desde cuándo, lo que haga falta.'
                                        : 'Opcional: por qué no, y qué puede hacer.'
                                }
                                className="w-full rounded-xl border-stone-300 bg-white px-3.5 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-950"
                            />

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => responder(respondiendo)}
                                    disabled={enviando}
                                    className={`pulsable inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white ${
                                        respondiendo === 'aceptada'
                                            ? 'bg-marca-700 hover:bg-marca-600'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {respondiendo === 'aceptada' ? 'Confirmar que sí' : 'Confirmar que no'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRespondiendo(null)}
                                    className="pulsable rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {solicitud.status === 'pendiente' && (
                                <button
                                    type="button"
                                    onClick={() => setRespondiendo('aceptada')}
                                    className="pulsable inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                                >
                                    <Check className="h-4 w-4" />
                                    Aceptar
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setRespondiendo('rechazada')}
                                className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                            >
                                <X className="h-4 w-4" />
                                {solicitud.status === 'aceptada' ? 'Dar marcha atrás' : 'Rechazar'}
                            </button>

                            {solicitud.status === 'aceptada' && (
                                <Link
                                    href={route('admin.comercios.show', comercio.id)}
                                    className="pulsable inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-marca-700 hover:bg-marca-50 dark:text-marca-400 dark:hover:bg-marca-950/40"
                                >
                                    Renovar para aplicarlo
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

/** Días que faltan para una fecha, para reusar el texto del resumen del plan. */
function dias(iso) {
    const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
    const hasta = new Date(ano, mes - 1, dia);
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    return Math.round((hasta - hoy) / 86400000);
}
