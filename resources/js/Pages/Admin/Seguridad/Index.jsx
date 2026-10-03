import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    AlertTriangle,
    BellRing,
    Check,
    ChevronDown,
    Clock,
    Globe,
    RotateCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    User,
} from 'lucide-react';

const TONOS = {
    alta: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    media: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    baja: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
};

const NOMBRES_SEVERIDAD = { alta: 'Grave', media: 'Media', baja: 'Leve' };

const ESTADOS = [
    { valor: 'sin_revisar', etiqueta: 'Sin revisar' },
    { valor: 'revisados', etiqueta: 'Revisados' },
    { valor: 'todos', etiqueta: 'Todos' },
];

const PERIODOS = [
    { valor: 1, etiqueta: 'Hoy' },
    { valor: 7, etiqueta: '7 días' },
    { valor: 30, etiqueta: '30 días' },
    { valor: 0, etiqueta: 'Todo' },
];

/**
 * Registro de seguridad. Funciona como bandeja: lo de arriba es lo que
 * todavía nadie miró, y cada fila se puede abrir para ver el detalle crudo.
 */
export default function Index({ eventos, filtros, conteos, tipos, porTipo, avisos }) {
    const [busqueda, setBusqueda] = useState(filtros.buscar ?? '');

    const filtrar = (cambios) => {
        router.get(
            route('admin.seguridad.index'),
            { ...filtros, ...cambios },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const revisarTodo = () => {
        router.post(
            route('admin.seguridad.revisar-todo'),
            { tipo: filtros.tipo || undefined, severidad: filtros.severidad || undefined },
            { preserveScroll: true },
        );
    };

    return (
        <AdminLayout header="Registro de seguridad">
            <Head title="Seguridad" />

            <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
                {conteos.graves > 0 ? (
                    <div className="flex flex-col gap-4 rounded-2xl border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/40 sm:flex-row sm:items-center">
                        <ShieldAlert className="h-6 w-6 shrink-0 text-red-700 dark:text-red-400" />
                        <div className="flex-1">
                            <p className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
                                {conteos.graves === 1
                                    ? 'Hay 1 hecho grave sin revisar'
                                    : `Hay ${conteos.graves} hechos graves sin revisar`}
                            </p>
                            <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                                Revisa de dónde vienen. Si una dirección IP insiste, conviene bloquearla en el servidor;
                                si es un comercio, puedes suspender su cuenta desde su ficha.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => filtrar({ estado: 'sin_revisar', severidad: 'alta' })}
                            className="pulsable shrink-0 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                        >
                            Ver solo los graves
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 rounded-2xl border border-marca-200 bg-marca-50 p-5 dark:border-marca-900 dark:bg-marca-950/40">
                        <ShieldCheck className="h-6 w-6 shrink-0 text-marca-700 dark:text-marca-400" />
                        <div>
                            <p className="font-display font-semibold text-marca-900 dark:text-marca-200">
                                Nada grave pendiente
                            </p>
                            <p className="mt-0.5 text-sm text-marca-800 dark:text-marca-300">
                                Se vigilan los accesos, los permisos, el sondeo de rutas y el uso de la IA.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                    <Metrica etiqueta="Sin revisar" valor={conteos.sin_revisar} Icono={ShieldAlert} />
                    <Metrica etiqueta="Graves sin revisar" valor={conteos.graves} Icono={AlertTriangle} alerta={conteos.graves > 0} />
                    <Metrica etiqueta="Anotados hoy" valor={conteos.hoy} Icono={Clock} />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                                placeholder="Buscar por IP, descripción o ruta"
                                aria-label="Buscar en el registro"
                                className="w-full rounded-xl border-stone-200 bg-white py-2.5 pl-10 text-sm dark:border-stone-800 dark:bg-stone-950"
                            />
                        </form>

                        <select
                            value={filtros.tipo ?? ''}
                            onChange={(e) => filtrar({ tipo: e.target.value || undefined })}
                            aria-label="Filtrar por tipo"
                            className="rounded-xl border-stone-200 bg-white py-2.5 text-sm dark:border-stone-800 dark:bg-stone-950"
                        >
                            <option value="">Todos los tipos</option>
                            {Object.entries(tipos).map(([clave, tipo]) => (
                                <option key={clave} value={clave}>
                                    {tipo.etiqueta}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtros.severidad ?? ''}
                            onChange={(e) => filtrar({ severidad: e.target.value || undefined })}
                            aria-label="Filtrar por gravedad"
                            className="rounded-xl border-stone-200 bg-white py-2.5 text-sm dark:border-stone-800 dark:bg-stone-950"
                        >
                            <option value="">Cualquier gravedad</option>
                            <option value="alta">Graves</option>
                            <option value="media">Medias</option>
                            <option value="baja">Leves</option>
                        </select>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {ESTADOS.map(({ valor, etiqueta }) => (
                            <Pildora
                                key={valor}
                                activo={(filtros.estado ?? 'sin_revisar') === valor}
                                onClick={() => filtrar({ estado: valor })}
                            >
                                {etiqueta}
                            </Pildora>
                        ))}

                        <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-800" />

                        {PERIODOS.map(({ valor, etiqueta }) => (
                            <Pildora
                                key={valor}
                                activo={Number(filtros.dias ?? 30) === valor}
                                onClick={() => filtrar({ dias: valor })}
                            >
                                {etiqueta}
                            </Pildora>
                        ))}

                        {conteos.sin_revisar > 0 && (
                            <button
                                type="button"
                                onClick={revisarTodo}
                                className="pulsable ml-auto inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Marcar {filtros.tipo || filtros.severidad ? 'lo filtrado' : 'todo'} como revisado
                            </button>
                        )}
                    </div>

                    {porTipo.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-4 dark:border-stone-800">
                            {porTipo.map(({ tipo, total, golpes }) => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => filtrar({ tipo, estado: 'sin_revisar' })}
                                    className="pulsable inline-flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                    {tipos[tipo]?.etiqueta ?? tipo}
                                    <span className="tabular-nums opacity-60">
                                        {total}
                                        {golpes > total ? ` · ${golpes} veces` : ''}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                    {eventos.data.length === 0 ? (
                        <p className="py-16 text-center text-sm text-stone-500 dark:text-stone-400">
                            Nada por aquí con esos filtros.
                        </p>
                    ) : (
                        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                            {eventos.data.map((evento) => (
                                <Hecho key={evento.id} evento={evento} tipo={tipos[evento.type]} />
                            ))}
                        </ul>
                    )}
                </div>

                <Avisos avisos={avisos} />

                {eventos.links?.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1.5">
                        {eventos.links.map((enlace, indice) => (
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

function Hecho({ evento, tipo }) {
    const [abierto, setAbierto] = useState(false);
    const revisado = Boolean(evento.reviewed_at);

    const alternar = () =>
        router.patch(route('admin.seguridad.revisar', evento.id), {}, { preserveScroll: true, preserveState: true });

    return (
        <li className={`px-5 py-4 ${revisado ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-xs font-medium ${TONOS[evento.severity]}`}>
                    {NOMBRES_SEVERIDAD[evento.severity]}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="font-medium">
                        {tipo?.etiqueta ?? evento.type}
                        {evento.hits > 1 && (
                            <span className="ml-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                ×{evento.hits}
                            </span>
                        )}
                    </p>

                    <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{evento.description}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                        <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatearFecha(evento.last_seen_at ?? evento.created_at)}
                        </span>

                        {evento.ip_address && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                                <Globe className="h-3 w-3" />
                                {evento.ip_address}
                            </span>
                        )}

                        {evento.user &&
                            (evento.user.role === 'tenant' ? (
                                <Link
                                    href={route('admin.comercios.show', evento.user.id)}
                                    className="inline-flex items-center gap-1 hover:underline"
                                >
                                    <User className="h-3 w-3" />
                                    {evento.user.business_name || evento.user.name}
                                </Link>
                            ) : (
                                <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {evento.user.name} (admin)
                                </span>
                            ))}

                        {evento.path && (
                            <span className="truncate font-mono">
                                {evento.method} {evento.path}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setAbierto((v) => !v)}
                        aria-expanded={abierto}
                        className="pulsable inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                    >
                        Detalle
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ease-salida ${abierto ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                        type="button"
                        onClick={alternar}
                        className={`pulsable inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            revisado
                                ? 'border border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                                : 'bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950'
                        }`}
                    >
                        {revisado ? (
                            <>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reabrir
                            </>
                        ) : (
                            <>
                                <Check className="h-3.5 w-3.5" />
                                Revisado
                            </>
                        )}
                    </button>
                </div>
            </div>

            {abierto && (
                <div className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3.5 text-xs dark:bg-stone-950/60">
                    {tipo?.pista && <p className="text-stone-600 dark:text-stone-400">{tipo.pista}</p>}

                    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                        <Dato titulo="Tipo" valor={evento.type} />
                        <Dato titulo="Primera vez" valor={formatearFecha(evento.created_at)} />
                        {evento.hits > 1 && <Dato titulo="Última vez" valor={formatearFecha(evento.last_seen_at)} />}
                        {evento.user_agent && <Dato titulo="Navegador" valor={evento.user_agent} />}
                        {evento.notified_at && <Dato titulo="Avisado por correo" valor={formatearFecha(evento.notified_at)} />}
                        {evento.reviewed_at && (
                            <Dato
                                titulo="Revisado"
                                valor={`${formatearFecha(evento.reviewed_at)}${evento.reviewer ? ` · ${evento.reviewer.name}` : ''}`}
                            />
                        )}
                        {Object.entries(evento.properties ?? {}).map(([clave, valor]) => (
                            <Dato
                                key={clave}
                                titulo={clave.replace(/_/g, ' ')}
                                valor={typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}
                            />
                        ))}
                    </dl>
                </div>
            )}
        </li>
    );
}

function Avisos({ avisos }) {
    if (!avisos.activos) {
        return (
            <p className="text-xs text-stone-500 dark:text-stone-400">
                Los avisos por correo están apagados (SEGURIDAD_AVISOS). Todo se sigue anotando aquí.
            </p>
        );
    }

    return (
        <p className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400">
            <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
                Los hechos graves avisan por correo{avisos.correo ? ` a ${avisos.correo}` : ' a todos los administradores'}, como
                máximo uno por hora de cada tipo.{' '}
                <Link href={route('admin.ajustes')} className="font-medium underline">
                    Cambiar el correo de seguridad
                </Link>
            </span>
        </p>
    );
}

function Metrica({ etiqueta, valor, Icono, alerta = false }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <span
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                    alerta
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
            >
                <Icono className="h-4 w-4" />
            </span>
            <p className={`mt-4 font-display text-3xl font-semibold tracking-tight ${alerta ? 'text-red-700 dark:text-red-400' : ''}`}>
                {Number(valor).toLocaleString('es')}
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
        </div>
    );
}

function Pildora({ activo, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={activo}
            className={`pulsable shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                activo
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
            }`}
        >
            {children}
        </button>
    );
}

function Dato({ titulo, valor }) {
    return (
        <div className="flex gap-2">
            <dt className="shrink-0 text-stone-500 dark:text-stone-400">{titulo}:</dt>
            <dd className="min-w-0 break-words font-medium text-stone-700 dark:text-stone-300">{valor}</dd>
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
