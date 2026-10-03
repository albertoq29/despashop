import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarClock,
    Boxes,
    ChevronDown,
    ExternalLink,
    FileArchive,
    FileText,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquarePlus,
    Package,
    Palette,
    Receipt,
    ShieldCheck,
    ShoppingCart,
    Tags,
    Truck,
    User as UserIcono,
    X,
} from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';
import { ProveedorDeTutoriales, useTutoriales } from '@/Components/Tutorial';
import Marca from '@/Components/Marca';
import { fechaLarga } from '@/Components/Plan/ResumenDelPlan';

export default function AuthenticatedLayout({ header, children }) {
    const { auth, plataforma, inspeccion, avisoDePlan, sugerencias } = usePage().props;
    const user = auth.user;
    const [menuAbierto, setMenuAbierto] = useState(false);

    // El proveedor envuelve el layout entero: así el menú lateral y
    // cualquier página pueden abrir un tutorial.
    return (
        <ProveedorDeTutoriales>
            <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
                {inspeccion && <BarraInspeccion inspeccion={inspeccion} />}
            {avisoDePlan && <AvisoDePlan aviso={avisoDePlan} />}

            <div className="flex">
                <BarraLateral
                    abierta={menuAbierto}
                    onCerrar={() => setMenuAbierto(false)}
                    user={user}
                    marca={plataforma?.marca}
                    respuestas={sugerencias?.respuestas ?? 0}
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
                            {user?.username && (
                                <a
                                    href={`/${user.username}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="pulsable hidden items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 sm:inline-flex"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Ver catálogo
                                </a>
                            )}

                            <CambiarTema compacto />

                            <MenuUsuario user={user} />
                        </div>
                    </header>

                    <main className="flex-1">{children}</main>
                </div>
            </div>
            </div>
        </ProveedorDeTutoriales>
    );
}

/**
 * Aviso de vencimiento en todo el panel.
 *
 * Aparece desde unos días antes y se queda mientras el plan siga vencido:
 * enterarse por la tarjeta del inicio no alcanza si el comercio trabaja
 * siempre desde Facturas o Productos.
 */
function AvisoDePlan({ aviso }) {
    const vencido = aviso.estado === 'vencido';
    const dias = aviso.dias_restantes;
    const numero = (aviso.contacto?.whatsapp ?? '').replace(/\D/g, '');
    const plan = aviso.plan ? `Tu plan ${aviso.plan}` : 'Tu plan';

    const texto = vencido
        ? aviso.dias_para_borrado > 0
            ? `${plan} venció el ${fechaLarga(aviso.vence, false)}. Tu catálogo dejó de verse y en ${aviso.dias_para_borrado} ${aviso.dias_para_borrado === 1 ? 'día' : 'días'} se eliminarán tus datos.`
            : `${plan} venció y tus datos se eliminarán hoy. Escríbenos ahora si quieres conservarlos.`
        : dias === 0
          ? `${plan} vence hoy.`
          : `${plan} vence ${dias === 1 ? 'mañana' : `en ${dias} días`}, el ${fechaLarga(aviso.vence, false)}.`;

    return (
        <div
            role="status"
            className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2.5 text-center text-sm font-medium ${
                vencido ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950'
            }`}
        >
            <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0" />
                {texto}
            </span>

            <span className="flex flex-wrap items-center gap-2">
                {numero && (
                    <a
                        href={`https://wa.me/${numero}?text=${encodeURIComponent(`Hola, quiero renovar mi plan${aviso.plan ? ` ${aviso.plan}` : ''}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`pulsable rounded-lg px-3 py-1 text-xs font-semibold ${
                            vencido ? 'bg-white text-red-700 hover:bg-red-50' : 'bg-amber-950 text-amber-50 hover:bg-amber-900'
                        }`}
                    >
                        Renovar
                    </a>
                )}
                <Link
                    href={`${route('dashboard')}#plan`}
                    className="rounded-lg px-2 py-1 text-xs font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current"
                >
                    Ver mi plan
                </Link>
            </span>
        </div>
    );
}

function BarraInspeccion({ inspeccion }) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
            <span>
                Estás viendo la cuenta de <strong>{inspeccion.nombre}</strong>
            </span>
            <button
                type="button"
                onClick={() => router.post(route('admin.inspeccion.salir'))}
                className="pulsable rounded-lg bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50"
            >
                Salir de la cuenta
            </button>
        </div>
    );
}

function BarraLateral({ abierta, onCerrar, user, marca, respuestas }) {
    const { abrir } = useTutoriales();

    return (
        <>
            {/* Velo solo en móvil */}
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
                    <Link href={route('dashboard')} className="flex min-w-0 items-center" aria-label={marca ?? 'Despashop'}>
                        <Marca marca={marca} className="h-6" />
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

                <nav className="scrollbar-slim flex-1 space-y-6 overflow-y-auto px-3 py-5">
                    <Grupo titulo="Mi negocio">
                        <Enlace href={route('dashboard')} activo={route().current('dashboard')} Icono={LayoutDashboard}>
                            Panel
                        </Enlace>
                        <Enlace
                            href={route('catalogo.personalizar')}
                            activo={route().current('catalogo.*')}
                            Icono={Palette}
                        >
                            Personalizar catálogo
                        </Enlace>
                    </Grupo>

                    <Grupo titulo="Inventario">
                        <Enlace href={route('productos.index')} activo={route().current('productos.*')} Icono={Package}>
                            Productos
                        </Enlace>
                        <Enlace href={route('categorias.index')} activo={route().current('categorias.*')} Icono={Tags}>
                            Categorías
                        </Enlace>
                        <Enlace href={route('combos.index')} activo={route().current('combos.*')} Icono={Boxes}>
                            Combos
                        </Enlace>
                        <Enlace
                            href={route('suplementos.index')}
                            activo={route().current('suplementos.*')}
                            Icono={ShoppingCart}
                        >
                            Suplementos
                        </Enlace>
                    </Grupo>

                    <Grupo titulo="Ventas">
                        <Enlace
                            href={route('facturas.index')}
                            activo={route().current('facturas.index') || route().current('facturas.create')}
                            Icono={Receipt}
                        >
                            Facturas
                        </Enlace>
                        <Enlace
                            href={route('facturas.plantilla')}
                            activo={route().current('facturas.plantilla*')}
                            Icono={FileText}
                        >
                            Estilo de factura
                        </Enlace>
                        <Enlace
                            href={route('deliveries.index')}
                            activo={route().current('deliveries.*')}
                            Icono={Truck}
                        >
                            Entregas
                        </Enlace>
                    </Grupo>

                    <Grupo titulo="Números">
                        <Enlace href={route('profits.index')} activo={route().current('profits.*')} Icono={BarChart3}>
                            Ganancias
                        </Enlace>
                        <Enlace href={route('tasas.create')} activo={route().current('tasas.*')} Icono={BarChart3}>
                            Tasas de cambio
                        </Enlace>
                        <Enlace
                            href={route('settings.index')}
                            activo={route().current('settings.*')}
                            Icono={Tags}
                        >
                            Promociones
                        </Enlace>
                    </Grupo>

                    <Grupo titulo="Mi cuenta">
                        <Enlace
                            href={route('respaldo.index')}
                            activo={route().current('respaldo.*')}
                            Icono={FileArchive}
                        >
                            Respaldo del catálogo
                        </Enlace>
                    </Grupo>

                    <Grupo titulo="Ayuda">
                        <BotonDelMenu Icono={GraduationCap} onClick={() => abrir()}>
                            Tutoriales
                        </BotonDelMenu>
                        <Enlace
                            href={route('sugerencias.index')}
                            activo={route().current('sugerencias.*')}
                            Icono={MessageSquarePlus}
                            insignia={respuestas}
                        >
                            Sugerencias y errores
                        </Enlace>
                    </Grupo>

                    {user?.role === 'admin' && (
                        <Grupo titulo="Plataforma">
                            <Enlace href={route('admin.dashboard')} activo={false} Icono={ShieldCheck}>
                                Administración
                            </Enlace>
                        </Grupo>
                    )}
                </nav>
            </aside>
        </>
    );
}

function Grupo({ titulo, children }) {
    return (
        <div>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {titulo}
            </p>
            <div className="space-y-0.5">{children}</div>
        </div>
    );
}

function BotonDelMenu({ Icono, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="pulsable flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        >
            <Icono className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">{children}</span>
        </button>
    );
}

function Enlace({ href, activo, Icono, insignia = 0, children }) {
    return (
        <Link
            href={href}
            className={`pulsable flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                activo
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
            }`}
        >
            <Icono className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{children}</span>

            {insignia > 0 && (
                <span
                    aria-label={`${insignia} sin leer`}
                    className="min-w-[1.25rem] rounded-full bg-marca-600 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-white dark:bg-marca-500 dark:text-stone-950"
                >
                    {insignia > 99 ? '99+' : insignia}
                </span>
            )}
        </Link>
    );
}

function MenuUsuario({ user }) {
    const [abierto, setAbierto] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-expanded={abierto}
                className="pulsable flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-stone-200 text-xs font-semibold dark:bg-stone-700">
                    {(user?.business_name || user?.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:block">{user?.business_name || user?.name}</span>
                <ChevronDown className="h-4 w-4" />
            </button>

            {abierto && (
                <>
                    <button
                        type="button"
                        aria-label="Cerrar menú de usuario"
                        onClick={() => setAbierto(false)}
                        className="fixed inset-0 z-10 cursor-default"
                    />

                    <div className="animate-acercar absolute right-0 top-full z-20 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900">
                        <Link
                            href={route('profile.edit')}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                            <UserIcono className="h-4 w-4" />
                            Mi perfil
                        </Link>

                        <button
                            type="button"
                            onClick={() => router.post(route('logout'))}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
