import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ExternalLink, Pin, Search } from 'lucide-react';
import EstadoDeComercio from '@/Components/Admin/EstadoDeComercio';
import { fechaLarga, textoDeDias } from '@/Components/Plan/ResumenDelPlan';

const ESTADOS = [
    { valor: '', etiqueta: 'Todos', clave: null },
    { valor: 'pending', etiqueta: 'Pendientes', clave: 'pending' },
    { valor: 'approved', etiqueta: 'Activos', clave: 'approved' },
    { valor: 'suspended', etiqueta: 'Suspendidos', clave: 'suspended' },
    { valor: 'rejected', etiqueta: 'Rechazados', clave: 'rejected' },
];

export default function Index({ comercios, planes, filtros, conteos }) {
    const [busqueda, setBusqueda] = useState(filtros.buscar ?? '');

    const filtrar = (cambios) => {
        router.get(route('admin.comercios.index'), { ...filtros, ...cambios }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout header="Comercios">
            <Head title="Comercios" />

            <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
                            placeholder="Buscar por nombre, usuario o correo"
                            aria-label="Buscar comercios"
                            className="w-full rounded-xl border-stone-200 bg-white py-2.5 pl-10 text-sm dark:border-stone-800 dark:bg-stone-900"
                        />
                    </form>

                    <select
                        value={filtros.plan_id ?? ''}
                        onChange={(e) => filtrar({ plan_id: e.target.value || undefined })}
                        aria-label="Filtrar por plan"
                        className="rounded-xl border-stone-200 bg-white py-2.5 text-sm dark:border-stone-800 dark:bg-stone-900"
                    >
                        <option value="">Todos los planes</option>
                        {planes.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="scrollbar-slim flex gap-2 overflow-x-auto pb-1">
                    {ESTADOS.map(({ valor, etiqueta, clave }) => {
                        const activo = (filtros.estado ?? '') === valor;
                        const conteo = clave ? conteos[clave] : null;

                        return (
                            <button
                                key={etiqueta}
                                type="button"
                                onClick={() => filtrar({ estado: valor || undefined })}
                                aria-pressed={activo}
                                className={`pulsable shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                                    activo
                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                        : 'bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'
                                }`}
                            >
                                {etiqueta}
                                {conteo !== null && <span className="ml-1.5 opacity-60">{conteo}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                    {comercios.data.length === 0 ? (
                        <p className="py-16 text-center text-sm text-stone-500 dark:text-stone-400">
                            No hay comercios que coincidan con ese filtro.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500 dark:border-stone-800">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Comercio</th>
                                        <th className="px-5 py-3 font-medium">Estado</th>
                                        <th className="px-5 py-3 font-medium">Plan</th>
                                        <th className="px-5 py-3 text-right font-medium">Productos</th>
                                        <th className="px-5 py-3 text-right font-medium">Facturas</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                                    {comercios.data.map((comercio) => (
                                        <tr key={comercio.id} className="transition-colors duration-150 ease-salida hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <td className="px-5 py-3.5">
                                                <span className="flex items-center gap-1.5">
                                                    <Link
                                                        href={route('admin.comercios.show', comercio.id)}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {comercio.business_name || comercio.name}
                                                    </Link>

                                                    {/* Quién está en la vitrina, sin abrir cada ficha */}
                                                    {comercio.showcase_at && (
                                                        <Pin
                                                            className="h-3.5 w-3.5 shrink-0 text-marca-700 dark:text-marca-400"
                                                            title="Anclado en la vitrina"
                                                        />
                                                    )}
                                                </span>
                                                <p className="text-xs text-stone-500">/{comercio.username}</p>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <EstadoDeComercio estado={comercio.status} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {comercio.plan ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span
                                                            className="h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: comercio.plan.color }}
                                                        />
                                                        {comercio.plan.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-400">Sin plan</span>
                                                )}
                                                {comercio.status === 'approved' && <Vigencia vigencia={comercio.vigencia} />}
                                            </td>

                                            <td className="px-5 py-3.5 text-right tabular-nums">
                                                {comercio.products_count}
                                            </td>
                                            <td className="px-5 py-3.5 text-right tabular-nums">
                                                {comercio.facturas_count}
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                {comercio.status === 'approved' && (
                                                    <a
                                                        href={`/${comercio.username}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        aria-label={`Abrir catálogo de ${comercio.business_name || comercio.name}`}
                                                        className="pulsable inline-grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {comercios.links?.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1.5">
                        {comercios.links.map((enlace, indice) => (
                            <Link
                                key={indice}
                                href={enlace.url ?? '#'}
                                disabled={!enlace.url}
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

/** Vencimiento del plan en la lista: en rojo o ámbar solo cuando requiere atención. */
function Vigencia({ vigencia }) {
    if (!vigencia || vigencia.estado === 'sin_plan') {
        return null;
    }

    if (!vigencia.vence) {
        return <p className="mt-0.5 text-xs text-stone-500">Sin vencimiento</p>;
    }

    const clases = {
        vencido: 'font-medium text-red-700 dark:text-red-400',
        por_vencer: 'font-medium text-amber-700 dark:text-amber-400',
    }[vigencia.estado] ?? 'text-stone-500';

    return (
        <p className={`mt-0.5 text-xs ${clases}`}>
            {vigencia.estado === 'vencido' ? 'Venció el ' : 'Vence el '}
            {fechaLarga(vigencia.vence)}
            {vigencia.estado !== 'activo' && ` · ${textoDeDias(vigencia.dias_restantes)}`}
        </p>
    );
}
