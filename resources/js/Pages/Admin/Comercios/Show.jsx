import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ArrowLeft, Check, ExternalLink, LogIn, Package, Pin, PinOff, Receipt, X } from 'lucide-react';
import { Insignia } from './Index';
import ResumenDelPlan, { fechaLarga } from '@/Components/Plan/ResumenDelPlan';

export default function Show({ comercio, theme, catalogUrl, metricas, planes, actividad, resumenPlan, venceSugerido, solicitudDePlan }) {
    const [rechazando, setRechazando] = useState(false);

    // Al aprobar, el plan dura un mes: la fecha llega rellenada y el admin
    // puede cambiarla o dejar la cuenta sin vencimiento.
    const aprobacion = useForm({
        plan_id: comercio.requested_plan_id ?? comercio.plan_id ?? '',
        plan_expires_at: venceSugerido,
        sin_vencimiento: false,
    });

    const rechazo = useForm({ rejection_reason: '' });

    const plan = useForm({
        plan_id: comercio.plan_id ?? '',
        // Fecha local calculada en el servidor: el timestamp llega en UTC y el
        // fin del día en Venezuela ya es el día siguiente en UTC.
        plan_expires_at: resumenPlan.vence ?? '',
        plan_discount_percent: comercio.plan_discount_percent ?? '',
        plan_is_trial: Boolean(comercio.plan_is_trial),
        plan_note: comercio.plan_note ?? '',
    });

    return (
        <AdminLayout header={comercio.business_name || comercio.name}>
            <Head title={comercio.business_name || comercio.name} />

            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <Link
                    href={route('admin.comercios.index')}
                    className="inline-flex items-center gap-2 text-sm text-stone-600 transition-colors duration-150 ease-salida hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a comercios
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                    <div className="flex min-w-0 items-center gap-4">
                        {theme?.logo_url ? (
                            <img
                                src={theme.logo_url}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                            />
                        ) : (
                            <span
                                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl font-display text-xl font-semibold text-white"
                                style={{ backgroundColor: theme?.color_primary || '#292524' }}
                            >
                                {(comercio.business_name || comercio.name).charAt(0).toUpperCase()}
                            </span>
                        )}

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate font-display text-xl font-semibold">
                                    {comercio.business_name || comercio.name}
                                </h2>
                                <Insignia estado={comercio.status} />
                            </div>

                            <p className="mt-1 truncate text-sm text-stone-500 dark:text-stone-400">
                                {comercio.email}
                                {comercio.phone ? ` · ${comercio.phone}` : ''}
                            </p>

                            {/* Un correo sin confirmar es una cuenta con la que no
                                se puede hablar: ni avisos ni recuperar la clave. */}
                            {comercio.email_verified_at ? (
                                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-marca-700 dark:text-marca-400">
                                    <Check className="h-3.5 w-3.5" />
                                    Correo verificado
                                </p>
                            ) : (
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                                    Correo sin verificar
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(route('admin.comercios.verificar-correo', comercio.id), {}, { preserveScroll: true })
                                        }
                                        className="pulsable rounded-md border border-amber-300 px-2 py-0.5 font-semibold hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40"
                                    >
                                        Darlo por verificado
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <a
                            href={catalogUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Ver catálogo
                        </a>

                        <button
                            type="button"
                            onClick={() => router.post(route('admin.comercios.inspeccionar', comercio.id))}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
                        >
                            <LogIn className="h-4 w-4" />
                            Entrar a su panel
                        </button>
                    </div>
                </div>

                {comercio.status === 'pending' && (
                    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/40">
                        <h3 className="font-display text-lg font-semibold text-amber-900 dark:text-amber-200">
                            Revisar solicitud
                        </h3>

                        {comercio.request_message && (
                            <blockquote className="mt-4 rounded-xl bg-white/70 p-4 text-sm leading-relaxed text-amber-900 dark:bg-stone-900/60 dark:text-amber-200">
                                {comercio.request_message}
                            </blockquote>
                        )}

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                    Plan que se le asigna
                                </label>
                                <select
                                    value={aprobacion.data.plan_id}
                                    onChange={(e) => aprobacion.setData('plan_id', e.target.value)}
                                    className="mt-2 w-full rounded-lg border-amber-300 bg-white text-sm dark:border-amber-800 dark:bg-stone-900"
                                >
                                    <option value="">Sin plan</option>
                                    {planes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (${Number(p.price_usd).toFixed(0)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                    El plan vence el
                                </label>
                                <input
                                    type="date"
                                    value={aprobacion.data.sin_vencimiento ? '' : aprobacion.data.plan_expires_at}
                                    min={new Date().toLocaleDateString('en-CA')}
                                    disabled={aprobacion.data.sin_vencimiento}
                                    onChange={(e) => aprobacion.setData('plan_expires_at', e.target.value)}
                                    className="mt-2 w-full rounded-lg border-amber-300 bg-white text-sm disabled:opacity-50 dark:border-amber-800 dark:bg-stone-900"
                                />
                                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                                    <input
                                        type="checkbox"
                                        checked={aprobacion.data.sin_vencimiento}
                                        onChange={(e) => aprobacion.setData('sin_vencimiento', e.target.checked)}
                                        className="h-4 w-4 rounded border-amber-400 text-marca-700 focus:ring-marca-600"
                                    />
                                    Sin fecha de vencimiento
                                </label>
                                {!aprobacion.data.sin_vencimiento && aprobacion.data.plan_expires_at === venceSugerido && (
                                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">Por defecto, un mes desde hoy.</p>
                                )}
                                {aprobacion.errors.plan_expires_at && (
                                    <p className="mt-1 text-xs text-red-600">{aprobacion.errors.plan_expires_at}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    aprobacion.post(route('admin.comercios.aprobar', comercio.id), {
                                        preserveScroll: true,
                                    })
                                }
                                disabled={aprobacion.processing}
                                className="pulsable inline-flex items-center gap-2 rounded-lg bg-marca-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60"
                            >
                                <Check className="h-4 w-4" />
                                Aprobar cuenta
                            </button>

                            <button
                                type="button"
                                onClick={() => setRechazando((v) => !v)}
                                className="pulsable inline-flex items-center gap-2 rounded-lg border border-amber-400 px-5 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950"
                            >
                                <X className="h-4 w-4" />
                                Rechazar
                            </button>
                        </div>

                        {rechazando && (
                            <div className="mt-4 rounded-xl bg-white p-4 dark:bg-stone-900">
                                <label className="text-sm font-medium">Motivo del rechazo</label>
                                <textarea
                                    value={rechazo.data.rejection_reason}
                                    onChange={(e) => rechazo.setData('rejection_reason', e.target.value)}
                                    rows={3}
                                    placeholder="Lo verá el solicitante en su pantalla de estado."
                                    className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                                />
                                {rechazo.errors.rejection_reason && (
                                    <p className="mt-1 text-sm text-red-600">{rechazo.errors.rejection_reason}</p>
                                )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        rechazo.post(route('admin.comercios.rechazar', comercio.id), {
                                            preserveScroll: true,
                                            onSuccess: () => setRechazando(false),
                                        })
                                    }
                                    disabled={rechazo.processing}
                                    className="pulsable mt-3 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                    Confirmar rechazo
                                </button>
                            </div>
                        )}
                    </section>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                    <Metrica etiqueta="Productos" valor={metricas.productos_total} Icono={Package} />
                    <Metrica etiqueta="Facturas" valor={metricas.facturas_total} Icono={Receipt} />
                    <Metrica
                        etiqueta="Facturado"
                        valor={`$${Number(metricas.ventas_usd).toLocaleString('es', { maximumFractionDigits: 0 })}`}
                        Icono={Receipt}
                    />
                </div>

                {comercio.status !== 'pending' && <ResumenDelPlan resumen={resumenPlan} etiqueta="Plan del comercio" />}

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <Panel titulo="Productos del comercio">
                            {metricas.productos.length === 0 ? (
                                <Vacio texto="Todavía no ha cargado productos." />
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {metricas.productos.map((producto) => (
                                        <div
                                            key={producto.id}
                                            className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800"
                                        >
                                            {producto.image_url ? (
                                                <img
                                                    src={producto.image_url}
                                                    alt=""
                                                    className="aspect-square w-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid aspect-square place-items-center bg-stone-100 text-2xl font-semibold text-stone-400 dark:bg-stone-800">
                                                    {producto.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}

                                            <div className="p-2.5">
                                                <p className="truncate text-xs font-medium">{producto.name}</p>
                                                <p className="text-xs text-stone-500">
                                                    {producto.price_usdt ? `$${producto.price_usdt}` : 'Consultar'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Panel>

                        <Panel titulo="Últimas facturas">
                            {metricas.ultimas_facturas.length === 0 ? (
                                <Vacio texto="Sin facturas emitidas." />
                            ) : (
                                <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                                    {metricas.ultimas_facturas.map((factura) => (
                                        <li key={factura.id} className="flex items-center gap-3 py-3 text-sm">
                                            <span className="w-12 shrink-0 text-stone-500">#{factura.id}</span>
                                            <span className="min-w-0 flex-1 truncate">
                                                {factura.client_name || 'Sin cliente'}
                                            </span>
                                            <span className="shrink-0 font-medium">
                                                ${Number(factura.total_usd).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel titulo="Actividad">
                            {actividad.length === 0 ? (
                                <Vacio texto="Sin actividad registrada." />
                            ) : (
                                <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                                    {actividad.map((registro) => (
                                        <li key={registro.id} className="py-2.5 text-sm">
                                            {registro.description || registro.action}
                                            <span className="ml-2 text-xs text-stone-500">
                                                {new Date(registro.created_at).toLocaleString('es', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel titulo="Plan y vigencia">
                            <div className="space-y-4">
                                {solicitudDePlan && (
                                    <CambioPedido
                                        solicitud={solicitudDePlan}
                                        elegido={String(plan.data.plan_id) === String(solicitudDePlan.to_plan_id)}
                                        onElegir={() => plan.setData('plan_id', solicitudDePlan.to_plan_id)}
                                    />
                                )}

                                <div>
                                    <label className="text-sm font-medium">Plan</label>
                                    <select
                                        value={plan.data.plan_id}
                                        onChange={(e) => plan.setData('plan_id', e.target.value)}
                                        className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                                    >
                                        <option value="">Sin plan</option>
                                        {planes.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (${Number(p.price_usd).toFixed(0)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Vence el</label>
                                    <input
                                        type="date"
                                        value={plan.data.plan_expires_at}
                                        onChange={(e) => plan.setData('plan_expires_at', e.target.value)}
                                        className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                                    />
                                    <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                                        {plan.data.plan_expires_at ? `Vence el ${fechaLarga(plan.data.plan_expires_at)}.` : 'Sin fecha de vencimiento.'}
                                    </p>

                                    {/* Renovar suma desde el vencimiento actual; si ya venció, desde hoy */}
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {[
                                            ['+1 mes', 1],
                                            ['+3 meses', 3],
                                            ['+1 año', 12],
                                        ].map(([texto, meses]) => (
                                            <button
                                                key={texto}
                                                type="button"
                                                onClick={() => plan.setData('plan_expires_at', sumarMeses(plan.data.plan_expires_at, meses))}
                                                className="pulsable rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                                            >
                                                {texto}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => plan.setData('plan_expires_at', '')}
                                            className="pulsable rounded-lg px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                        >
                                            Sin vencimiento
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Descuento</label>
                                        <div className="relative mt-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={plan.data.plan_discount_percent}
                                                onChange={(e) => plan.setData('plan_discount_percent', e.target.value)}
                                                className="w-full rounded-lg border-stone-300 bg-white pr-8 text-sm dark:border-stone-700 dark:bg-stone-950"
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">%</span>
                                        </div>
                                    </div>

                                    <div className="flex items-end">
                                        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={plan.data.plan_is_trial}
                                                onChange={(e) => plan.setData('plan_is_trial', e.target.checked)}
                                                className="h-4 w-4 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950"
                                            />
                                            Es una prueba gratis
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">
                                        Nota <span className="font-normal text-stone-400">(la ve el comercio)</span>
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={160}
                                        value={plan.data.plan_note}
                                        onChange={(e) => plan.setData('plan_note', e.target.value)}
                                        placeholder="Precio acordado por el lanzamiento"
                                        className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        plan.patch(route('admin.comercios.plan', comercio.id), { preserveScroll: true })
                                    }
                                    disabled={plan.processing}
                                    className="pulsable w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900"
                                >
                                    Guardar plan
                                </button>

                                {/* Atajo: abre un período sin cobrar con el plan elegido arriba */}
                                <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
                                    <p className="text-sm font-medium">Prueba gratis</p>
                                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                        Activa el plan seleccionado sin cobrar, contando desde hoy.
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {[15, 30, 60].map((dias) => (
                                            <button
                                                key={dias}
                                                type="button"
                                                onClick={() =>
                                                    router.post(
                                                        route('admin.comercios.prueba', comercio.id),
                                                        { plan_id: plan.data.plan_id || null, dias },
                                                        { preserveScroll: true },
                                                    )
                                                }
                                                className="pulsable rounded-lg border border-marca-600 px-2.5 py-1 text-xs font-semibold text-marca-700 hover:bg-marca-50 dark:border-marca-500 dark:text-marca-400 dark:hover:bg-marca-950/40"
                                            >
                                                {dias} días
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel titulo="Vitrina de la bienvenida">
                            <Vitrina comercio={comercio} theme={theme} />
                        </Panel>

                        <Panel titulo="Estado de la cuenta">
                            <div className="space-y-2">
                                {[
                                    ['approved', 'Activar'],
                                    ['suspended', 'Suspender'],
                                    ['pending', 'Volver a pendiente'],
                                ].map(([estado, etiqueta]) => (
                                    <button
                                        key={estado}
                                        type="button"
                                        disabled={comercio.status === estado}
                                        onClick={() =>
                                            router.patch(
                                                route('admin.comercios.estado', comercio.id),
                                                { status: estado },
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="pulsable w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
                                    >
                                        {etiqueta}
                                    </button>
                                ))}
                            </div>

                            <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                                Con la cuenta suspendida, el catálogo deja de ser visible y el comercio solo ve la
                                pantalla de estado.
                            </p>
                        </Panel>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

/**
 * Anclar este catálogo en la bienvenida.
 *
 * La tira de «negocios que ya publicaron» se llena sola por fecha; esto es
 * otra cosa y por eso se elige a mano: lo que se enseña ahí es lo que se
 * puede lograr con la plataforma, y el catálogo más nuevo no es el mejor
 * armado.
 *
 * El orden es la fecha de anclaje, el último primero. Así subir uno al
 * frente es volver a anclarlo, y no hace falta una pantalla aparte para
 * ordenarlos.
 *
 * Se manda con `router` y no con `useForm`: el valor de «anclado» lo decide
 * el botón que se pulse, y `transform()` de Inertia no devuelve el
 * formulario, así que no se puede encadenar para cambiarlo al enviar.
 */
function Vitrina({ comercio, theme }) {
    const [nota, setNota] = useState(comercio.showcase_note ?? '');
    const [enviando, setEnviando] = useState(false);

    const anclado = Boolean(comercio.showcase_at);
    const publicado = Boolean(theme?.is_published);

    const guardar = (valor) => {
        setEnviando(true);

        router.patch(
            route('admin.comercios.vitrina', comercio.id),
            { anclado: valor, showcase_note: nota },
            { preserveScroll: true, onFinish: () => setEnviando(false) },
        );
    };

    if (!publicado && !anclado) {
        return (
            <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Su catálogo no está publicado todavía. Cuando lo publique podrás anclarlo para que aparezca
                en la bienvenida.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {anclado
                    ? 'Aparece en la vitrina de la bienvenida.'
                    : 'Ancla este catálogo si destaca por su diseño: sale en la bienvenida con sus propios colores.'}
            </p>

            <div>
                <label htmlFor="showcase_note" className="text-sm font-medium">
                    Por qué destaca <span className="font-normal text-stone-500">(opcional)</span>
                </label>
                <input
                    id="showcase_note"
                    type="text"
                    maxLength={120}
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Portada con fotos propias y una paleta muy suya"
                    className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                />
                <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    Se lee debajo del nombre en la tarjeta. Vacío, se usa el título de su portada.
                </p>
            </div>

            <button
                type="button"
                disabled={enviando}
                onClick={() => guardar(!anclado)}
                className={`pulsable inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                    anclado
                        ? 'border border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
                        : 'bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950'
                }`}
            >
                {anclado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {anclado ? 'Quitar de la vitrina' : 'Anclar en la vitrina'}
            </button>

            {anclado && (
                <>
                    <button
                        type="button"
                        disabled={enviando}
                        onClick={() => guardar(true)}
                        className="pulsable w-full rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-stone-800"
                    >
                        Guardar la nota y mandarlo al frente
                    </button>

                    <p className="text-xs text-stone-500 dark:text-stone-400">
                        Anclado el {fechaLarga(comercio.showcase_at)}. Los últimos anclados salen primero.
                    </p>
                </>
            )}
        </div>
    );
}

function Metrica({ etiqueta, valor, Icono }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                <Icono className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-2xl font-semibold tracking-tight">{valor}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
        </div>
    );
}


/**
 * El cambio de plan que pidió el comercio, en la ficha donde se resuelve.
 *
 * Aceptarlo en la otra pantalla solo lo deja apuntado: el cambio ocurre
 * aquí, al guardar ese plan con su vencimiento nuevo. Por eso el botón
 * rellena el selector en vez de guardar por su cuenta — la fecha la decide
 * quien está mirando.
 */
function CambioPedido({ solicitud, elegido, onElegir }) {
    const aceptada = solicitud.status === 'aceptada';

    return (
        <div
            className={`rounded-xl border p-3.5 ${
                aceptada
                    ? 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
            }`}
        >
            <p className={`text-sm font-semibold ${aceptada ? 'text-sky-900 dark:text-sky-300' : 'text-amber-900 dark:text-amber-300'}`}>
                {aceptada ? 'Cambio aceptado, falta aplicarlo' : 'Pidió cambiar de plan'}
            </p>

            <p className={`mt-1 text-sm ${aceptada ? 'text-sky-900/80 dark:text-sky-300/80' : 'text-amber-900/80 dark:text-amber-300/80'}`}>
                {solicitud.plan_actual?.name ?? 'Sin plan'} → <strong>{solicitud.plan_pedido?.name}</strong>
            </p>

            {solicitud.message && (
                <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">«{solicitud.message}»</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                {elegido ? (
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                        Elegido abajo. Guarda con el vencimiento nuevo para aplicarlo.
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={onElegir}
                        className="pulsable rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
                    >
                        Poner {solicitud.plan_pedido?.name} abajo
                    </button>
                )}

                <Link
                    href={route('admin.cambios-plan.index')}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-stone-600 underline hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                >
                    Ver la solicitud
                </Link>
            </div>
        </div>
    );
}

function Panel({ titulo, children }) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="font-display font-semibold">{titulo}</h3>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Vacio({ texto }) {
    return <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">{texto}</p>;
}

/**
 * Suma meses a una fecha "AAAA-MM-DD". Si la fecha ya pasó o está vacía,
 * cuenta desde hoy: renovar un plan vencido no debe dejarlo vencido.
 * Un 31 que no existe en el mes destino queda en el último día del mes.
 */
function sumarMeses(iso, meses) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let base = hoy;

    if (iso) {
        const [ano, mes, dia] = iso.split('-').map(Number);
        const actual = new Date(ano, mes - 1, dia);
        base = actual > hoy ? actual : hoy;
    }

    const dia = base.getDate();
    const destino = new Date(base.getFullYear(), base.getMonth() + meses, 1);
    const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    destino.setDate(Math.min(dia, ultimoDia));

    return destino.toLocaleDateString('en-CA');
}
