import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ArrowRight, Check, Eye, Package, Receipt, ShieldAlert, Store, TrendingUp, Users, X } from 'lucide-react';

export default function Dashboard({ resumen, solicitudes, topComercios, actividad, ingresosPorPlan, ia, seguridad }) {
    const ingresoMensual = ingresosPorPlan.reduce(
        (total, plan) => total + Number(plan.price_usd) * plan.suscriptores,
        0,
    );

    return (
        <AdminLayout header="Resumen de la plataforma">
            <Head title="Administración" />

            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                {/* Lo urgente primero: solicitudes esperando revisión */}
                {resumen.solicitudes_pendientes > 0 && (
                    <Link
                        href={route('admin.comercios.index', { estado: 'pending' })}
                        className="pulsable flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40"
                    >
                        <div>
                            <p className="font-display text-lg font-semibold text-amber-900 dark:text-amber-200">
                                {resumen.solicitudes_pendientes}{' '}
                                {resumen.solicitudes_pendientes === 1
                                    ? 'solicitud esperando revisión'
                                    : 'solicitudes esperando revisión'}
                            </p>
                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                                Cada una queda bloqueada hasta que la apruebes o la rechaces.
                            </p>
                        </div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-amber-800 dark:text-amber-300" />
                    </Link>
                )}

                {/* Seguridad: solo aparece cuando hay algo grave sin revisar */}
                {seguridad?.conteos.graves > 0 && (
                    <Link
                        href={route('admin.seguridad.index', { severidad: 'alta' })}
                        className="pulsable flex items-center justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/40"
                    >
                        <div className="flex items-center gap-4">
                            <ShieldAlert className="h-6 w-6 shrink-0 text-red-700 dark:text-red-400" />
                            <div>
                                <p className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
                                    {seguridad.conteos.graves === 1
                                        ? '1 hecho de seguridad grave sin revisar'
                                        : `${seguridad.conteos.graves} hechos de seguridad graves sin revisar`}
                                </p>
                                <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                                    Intentos de acceso, permisos o uso de la IA que conviene mirar hoy.
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-red-800 dark:text-red-300" />
                    </Link>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Metrica etiqueta="Comercios activos" valor={resumen.comercios_activos} Icono={Store} />
                    <Metrica etiqueta="Productos publicados" valor={resumen.productos_totales} Icono={Package} />
                    <Metrica etiqueta="Facturas (30 días)" valor={resumen.facturas_30d} Icono={Receipt} />
                    <Metrica etiqueta="Visitas a catálogos (30 días)" valor={resumen.visitas_30d} Icono={Eye} />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <Tarjeta titulo="Solicitudes recientes">
                        {solicitudes.length === 0 ? (
                            <Vacio texto="No hay solicitudes pendientes." />
                        ) : (
                            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                                {solicitudes.map((solicitud) => (
                                    <li key={solicitud.id} className="flex flex-wrap items-center gap-3 py-3.5">
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={route('admin.comercios.show', solicitud.id)}
                                                className="block truncate font-medium hover:underline"
                                            >
                                                {solicitud.business_name || solicitud.name}
                                            </Link>
                                            <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                                                /{solicitud.username}
                                                {solicitud.requested_plan ? ` · ${solicitud.requested_plan.name}` : ''}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.post(
                                                        route('admin.comercios.aprobar', solicitud.id),
                                                        { plan_id: solicitud.requested_plan_id },
                                                        { preserveScroll: true },
                                                    )
                                                }
                                                className="pulsable inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                Aprobar
                                            </button>

                                            <Link
                                                href={route('admin.comercios.show', solicitud.id)}
                                                className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                                            >
                                                Revisar
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Tarjeta>

                    <div className="space-y-6">
                        <Tarjeta titulo="Ingreso mensual estimado">
                            <p className="font-display text-4xl font-semibold tracking-tight">
                                ${ingresoMensual.toFixed(0)}
                            </p>
                            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                Suma del precio de cada plan por sus comercios aprobados.
                            </p>

                            <ul className="mt-5 space-y-2.5">
                                {ingresosPorPlan.map((plan) => (
                                    <li key={plan.id} className="flex items-center gap-3 text-sm">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: plan.color }}
                                        />
                                        <span className="flex-1 truncate">{plan.name}</span>
                                        <span className="text-stone-500">{plan.suscriptores}</span>
                                        <span className="w-16 text-right font-medium">
                                            ${(Number(plan.price_usd) * plan.suscriptores).toFixed(0)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Tarjeta>

                        <Tarjeta titulo="Ventas de los comercios (30 días)">
                            <p className="font-display text-3xl font-semibold tracking-tight">
                                ${Number(resumen.ventas_30d_usd).toLocaleString('es', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                Facturado por todos los comercios de la plataforma.
                            </p>
                        </Tarjeta>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Tarjeta titulo="Catálogos más visitados (30 días)">
                        {topComercios.length === 0 ? (
                            <Vacio texto="Todavía no hay visitas registradas." />
                        ) : (
                            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                                {topComercios.map((comercio) => (
                                    <li key={comercio.id} className="flex items-center gap-3 py-3">
                                        <Link
                                            href={route('admin.comercios.show', comercio.id)}
                                            className="min-w-0 flex-1 truncate font-medium hover:underline"
                                        >
                                            {comercio.business_name || comercio.name}
                                        </Link>
                                        <span className="shrink-0 text-sm text-stone-500">
                                            {comercio.products_count} productos
                                        </span>
                                        <span className="w-16 shrink-0 text-right text-sm font-medium">
                                            {comercio.visitas ?? 0} visitas
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Tarjeta>

                    {ia && (
                        <Tarjeta titulo="Asistente de IA hoy">
                            <div className="grid grid-cols-3 gap-3">
                                <DatoIa etiqueta="Creaciones" valor={`${ia.hoy} de ${ia.limite_global}`} />
                                <DatoIa etiqueta="Frenadas" valor={ia.frenadas_hoy} alerta={ia.frenadas_hoy > 0} />
                                <DatoIa etiqueta="Tokens" valor={Number(ia.tokens_hoy).toLocaleString('es')} />
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                                <div
                                    className={`h-full rounded-full ${ia.hoy / ia.limite_global > 0.8 ? 'bg-amber-500' : 'bg-marca-600 dark:bg-marca-500'}`}
                                    style={{ width: `${Math.min(100, (ia.hoy / Math.max(1, ia.limite_global)) * 100)}%` }}
                                />
                            </div>

                            <p className="mt-5 text-xs font-medium text-stone-500 dark:text-stone-400">Últimos pedidos frenados</p>
                            {ia.frenadas.length === 0 ? (
                                <Vacio texto="Nadie ha intentado usar la IA para algo no permitido." />
                            ) : (
                                <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-800">
                                    {ia.frenadas.map((registro) => (
                                        <li key={registro.id} className="py-2.5">
                                            <p className="line-clamp-2 text-sm text-stone-700 dark:text-stone-300">“{registro.prompt}”</p>
                                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                                {registro.user?.business_name || registro.user?.name}
                                                {' · '}
                                                {registro.reason}
                                                {' · '}
                                                {formatearFecha(registro.created_at)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Tarjeta>
                    )}

                    {seguridad && (
                        <Tarjeta titulo="Seguridad">
                            <div className="grid grid-cols-3 gap-3">
                                <DatoIa etiqueta="Sin revisar" valor={seguridad.conteos.sin_revisar} />
                                <DatoIa etiqueta="Graves" valor={seguridad.conteos.graves} alerta={seguridad.conteos.graves > 0} />
                                <DatoIa etiqueta="Anotados hoy" valor={seguridad.conteos.hoy} />
                            </div>

                            {seguridad.recientes.length === 0 ? (
                                <Vacio texto="Nada sospechoso pendiente de revisar." />
                            ) : (
                                <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-800">
                                    {seguridad.recientes.map((hecho) => (
                                        <li key={hecho.id} className="flex items-start gap-2.5 py-2.5">
                                            <span
                                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                                    hecho.severity === 'alta'
                                                        ? 'bg-red-600'
                                                        : hecho.severity === 'media'
                                                          ? 'bg-amber-500'
                                                          : 'bg-stone-400'
                                                }`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {seguridad.etiquetas[hecho.type] ?? hecho.type}
                                                    {hecho.hits > 1 && <span className="ml-1.5 text-xs text-stone-500">×{hecho.hits}</span>}
                                                </p>
                                                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                                                    {hecho.ip_address ?? 'sin IP'}
                                                    {hecho.user ? ` · ${hecho.user.business_name || hecho.user.name}` : ''}
                                                    {' · '}
                                                    {formatearFecha(hecho.created_at)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <Link
                                href={route('admin.seguridad.index')}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-marca-700 hover:underline dark:text-marca-400"
                            >
                                Ver el registro de seguridad
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </Tarjeta>
                    )}

                    <Tarjeta titulo="Actividad reciente">
                        {actividad.length === 0 ? (
                            <Vacio texto="Sin actividad registrada." />
                        ) : (
                            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                                {actividad.slice(0, 10).map((registro) => (
                                    <li key={registro.id} className="py-3">
                                        <p className="text-sm">
                                            {registro.description || registro.action}
                                        </p>
                                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                            {registro.user?.business_name || registro.user?.name || 'Sistema'}
                                            {' · '}
                                            {formatearFecha(registro.created_at)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Tarjeta>
                </div>
            </div>
        </AdminLayout>
    );
}

function Metrica({ etiqueta, valor, Icono }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                <Icono className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
                {Number(valor).toLocaleString('es')}
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
        </div>
    );
}

function Tarjeta({ titulo, children }) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display font-semibold">{titulo}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function DatoIa({ etiqueta, valor, alerta = false }) {
    return (
        <div className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/60">
            <p className={`font-display text-lg font-semibold tabular-nums ${alerta ? 'text-amber-700 dark:text-amber-400' : ''}`}>{valor}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{etiqueta}</p>
        </div>
    );
}

function Vacio({ texto }) {
    return <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">{texto}</p>;
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
