import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    ChevronDown,
    Megaphone,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquarePlus,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Store,
    Tags,
    X,
} from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';
import Marca from '@/Components/Marca';

/**
 * Chrome del panel de plataforma. Se distingue del panel del comercio por
 * el color del encabezado: al admin le conviene saber siempre dónde está.
 */
export default function AdminLayout({ header, children }) {
    const { auth, plataforma, seguridad, sugerencias, cambiosDePlan } = usePage().props;
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
            <div className="flex">
                <BarraLateral
                    abierta={menuAbierto}
                    onCerrar={() => setMenuAbierto(false)}
                    marca={plataforma?.marca}
                    seguridad={seguridad}
                    sugerencias={sugerencias}
                    cambiosDePlan={cambiosDePlan}
                />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/90 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMenuAbierto(true)}
                                aria-label="Abrir menú"
                                className="pulsable grid h-9 w-9 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 lg:hidden"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            {header && (
                                <h1 className="truncate font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                                    {header}
                                </h1>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <CambiarTema compacto />

                            <button
                                type="button"
                                onClick={() => router.post(route('logout'))}
                                className="pulsable inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </header>

                    <main className="flex-1">
                        <Flash />
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

function BarraLateral({ abierta, onCerrar, marca, seguridad, sugerencias, cambiosDePlan }) {
    const enlaces = [
        { href: route('admin.dashboard'), etiqueta: 'Resumen', Icono: LayoutDashboard, patron: 'admin.dashboard' },
        { href: route('admin.comercios.index'), etiqueta: 'Comercios', Icono: Store, patron: 'admin.comercios.*' },
        {
            href: route('admin.sugerencias.index'),
            etiqueta: 'Sugerencias',
            Icono: MessageSquarePlus,
            patron: 'admin.sugerencias.*',
            insignia: sugerencias?.sin_leer || 0,
        },
        {
            href: route('admin.seguridad.index'),
            etiqueta: 'Seguridad',
            Icono: ShieldAlert,
            patron: 'admin.seguridad.*',
            insignia: seguridad?.sin_revisar || 0,
            urgente: (seguridad?.graves || 0) > 0,
        },
        { href: route('admin.planes.index'), etiqueta: 'Planes y precios', Icono: Tags, patron: 'admin.planes.*' },
        {
            href: route('admin.cambios-plan.index'),
            etiqueta: 'Cambios de plan',
            Icono: ArrowLeftRight,
            patron: 'admin.cambios-plan.*',
            insignia: cambiosDePlan?.pendientes || 0,
        },
        { href: route('admin.avisos.index'), etiqueta: 'Avisos de la portada', Icono: Megaphone, patron: 'admin.avisos.*' },
        { href: route('admin.ajustes'), etiqueta: 'Ajustes', Icono: Settings, patron: 'admin.ajustes*' },
    ];

    return (
        <>
            <button
                type="button"
                aria-label="Cerrar menú"
                onClick={onCerrar}
                className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 ease-salida lg:hidden ${
                    abierta ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform duration-200 ease-cajon dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
                    abierta ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-5 dark:border-stone-800">
                    <Link href={route('admin.dashboard')} className="flex min-w-0 flex-col gap-1">
                        <Marca marca={marca} className="h-5" />
                        <span className="flex items-center gap-1.5 text-xs text-stone-500">
                            <ShieldCheck className="h-3 w-3" />
                            Administración
                        </span>
                    </Link>

                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar menú"
                        className="pulsable grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 lg:hidden"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <nav className="flex-1 space-y-0.5 px-3 py-5">
                    {enlaces.map(({ href, etiqueta, Icono, patron, insignia, urgente }) => {
                        const activo = route().current(patron);

                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`pulsable flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                                    activo
                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                                }`}
                            >
                                <Icono className="h-4 w-4 shrink-0" />
                                <span className="flex-1">{etiqueta}</span>

                                {insignia > 0 && (
                                    <span
                                        aria-label={`${insignia} sin revisar`}
                                        className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                                            urgente
                                                ? 'bg-red-600 text-white'
                                                : activo
                                                  ? 'bg-white/20 text-white dark:bg-stone-900/15 dark:text-stone-900'
                                                  : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                                        }`}
                                    >
                                        {insignia > 99 ? '99+' : insignia}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}

/**
 * Los avisos del servidor, en un solo sitio.
 *
 * Cada pantalla del panel los pintaba por su cuenta —o no los pintaba, que
 * era lo más común—, así que un mensaje tras una redirección se perdía sin
 * que nadie se enterara de por qué había terminado en otra página.
 */
function Flash() {
    const { flash } = usePage().props;

    const tonos = {
        success: 'border-marca-200 bg-marca-50 text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300',
        error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
        warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
        info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300',
    };

    const aviso = Object.keys(tonos).find((clave) => flash?.[clave]);

    if (!aviso) {
        return null;
    }

    return (
        <div className="px-4 pt-4 sm:px-6">
            <p className={`mx-auto max-w-5xl rounded-xl border px-4 py-3 text-sm ${tonos[aviso]}`}>
                {flash[aviso]}
            </p>
        </div>
    );
}
