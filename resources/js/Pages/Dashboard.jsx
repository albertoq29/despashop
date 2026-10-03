import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ArrowUpRight,
    CircleDollarSign,
    Copy,
    ExternalLink,
    Eye,
    ImageOff,
    Package,
    Palette,
    Sparkles,
    Plus,
    Receipt,
    TrendingUp,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ResumenDelPlan from '@/Components/Plan/ResumenDelPlan';
import { Aviso, Boton, Cabecera, Campo, Entrada, Metrica, Pagina, Tarjeta, Vacio } from '@/Components/UI';
import { useTema } from '@/hooks/useTema';

export default function Dashboard({
    latest,
    dailySales,
    totalSalesUsd,
    totalSalesBs,
    totalOrders,
    filters,
    customStats,
    catalogo,
    plan,
    soporte,
}) {
    const [desde, setDesde] = useState(filters?.start_date || '');
    const [hasta, setHasta] = useState(filters?.end_date || '');

    const filtrar = (evento) => {
        evento.preventDefault();
        router.get(route('dashboard'), { start_date: desde, end_date: hasta }, { preserveState: true });
    };

    const limpiar = () => {
        setDesde('');
        setHasta('');
        router.get(route('dashboard'), {}, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header="Panel">
            <Head title="Panel" />

            <Pagina>
                <Cabecera
                    titulo="Tu negocio de un vistazo"
                    descripcion="Resumen de los últimos 30 días y estado de tu catálogo."
                >
                    <Boton href={route('facturas.create')} variante="primario">
                        <Plus className="h-4 w-4" />
                        Nueva factura
                    </Boton>
                </Cabecera>

                <EstadoDelCatalogo catalogo={catalogo} />

                {plan && <ResumenDelPlan id="plan" resumen={plan} pie={<ContactoParaElPlan soporte={soporte} plan={plan} />} />}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metrica
                        etiqueta="Ventas (30 días)"
                        valor={`$${Number(totalSalesUsd).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        detalle={`Bs. ${Number(totalSalesBs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}
                        Icono={CircleDollarSign}
                        tono="marca"
                    />
                    <Metrica
                        etiqueta="Facturas confirmadas"
                        valor={totalOrders}
                        detalle="Facturas confirmadas"
                        Icono={Receipt}
                    />
                    <Metrica
                        etiqueta="Productos publicados"
                        valor={catalogo?.productos ?? 0}
                        detalle="En tu inventario"
                        Icono={Package}
                    />
                    <Metrica
                        etiqueta="Visitas al catálogo"
                        valor={catalogo?.visitas_30d ?? 0}
                        detalle="Últimos 30 días"
                        Icono={Eye}
                    />
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                    <GraficoVentas datos={dailySales} />

                    <div className="space-y-5">
                        <TasaActual tasa={latest} />
                        <ConsultaPorFechas
                            desde={desde}
                            hasta={hasta}
                            setDesde={setDesde}
                            setHasta={setHasta}
                            onFiltrar={filtrar}
                            onLimpiar={limpiar}
                            resultado={customStats}
                        />
                    </div>
                </div>
            </Pagina>
        </AuthenticatedLayout>
    );
}

/* ── Estado del catálogo ────────────────────────────────────────────────── */

function EstadoDelCatalogo({ catalogo }) {
    const [copiado, setCopiado] = useState(false);

    if (!catalogo?.url) {
        return null;
    }

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(catalogo.url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch (e) {
            // Sin permiso de portapapeles el usuario puede copiar del enlace
        }
    };

    // Lo que falta para que el catálogo luzca terminado, en orden de impacto
    const pendientes = [
        !catalogo.publicado && {
            texto: 'Tu catálogo está oculto para el público',
            enlace: route('catalogo.personalizar'),
            accion: 'Publicarlo',
        },
        !catalogo.tiene_logo && {
            texto: 'Sube tu logo y el catálogo tomará sus colores',
            enlace: route('catalogo.personalizar'),
            accion: 'Subir logo',
        },
        catalogo.productos === 0 && {
            texto: 'Todavía no tienes productos cargados',
            enlace: catalogo.ia_disponible ? route('catalogo.personalizar', { ia: 1 }) : route('productos.index'),
            accion: catalogo.ia_disponible ? 'Empezar con IA' : 'Cargar productos',
        },
    ].filter(Boolean);

    return (
        <Tarjeta cuerpo={false}>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-stone-500 dark:text-stone-400">Tu catálogo</p>
                        {catalogo.publicado ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-marca-100 px-2 py-0.5 text-xs font-medium text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-marca-600 dark:bg-marca-400" />
                                En línea
                            </span>
                        ) : (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Oculto
                            </span>
                        )}
                    </div>

                    <a
                        href={catalogo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate font-display text-lg font-semibold text-marca-700 hover:underline dark:text-marca-400"
                    >
                        {catalogo.url.replace(/^https?:\/\//, '')}
                    </a>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Boton variante="contorno" tamano="sm" onClick={copiar}>
                        <Copy className="h-4 w-4" />
                        {copiado ? 'Copiado' : 'Copiar enlace'}
                    </Boton>

                    <a
                        href={catalogo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                    </a>

                    {catalogo.ia_disponible && (
                        <Boton href={route('catalogo.personalizar', { ia: 1 })} variante="contorno" tamano="sm">
                            <Sparkles className="h-4 w-4" />
                            Crear con IA
                        </Boton>
                    )}

                    <Boton href={route('catalogo.personalizar')} variante="neutro" tamano="sm">
                        <Palette className="h-4 w-4" />
                        Personalizar
                    </Boton>
                </div>
            </div>

            {pendientes.length > 0 && (
                <ul className="divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                    {pendientes.map((pendiente) => (
                        <li key={pendiente.texto}>
                            <Link
                                href={pendiente.enlace}
                                className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors duration-150 ease-salida hover:bg-stone-50 dark:hover:bg-stone-800/50"
                            >
                                <span className="flex min-w-0 items-center gap-2.5">
                                    <ImageOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <span className="truncate text-stone-700 dark:text-stone-300">
                                        {pendiente.texto}
                                    </span>
                                </span>

                                <span className="flex shrink-0 items-center gap-1 font-medium text-marca-700 dark:text-marca-400">
                                    {pendiente.accion}
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Tarjeta>
    );
}

/* ── Gráfico ────────────────────────────────────────────────────────────── */

function GraficoVentas({ datos }) {
    const { esOscuro } = useTema();

    const rejilla = esOscuro ? '#44403c' : '#e7e5e4';
    const textoEje = esOscuro ? '#a8a29e' : '#78716c';
    const linea = esOscuro ? '#34d399' : '#047857';

    return (
        <Tarjeta titulo="Ventas por día" descripcion="Últimos 30 días" cuerpo={false}>
            {!datos?.length ? (
                <Vacio
                    Icono={TrendingUp}
                    titulo="Todavía no hay ventas registradas"
                    texto="Cuando confirmes tu primera factura, verás aquí la evolución día a día."
                >
                    <Boton href={route('facturas.create')}>
                        <Plus className="h-4 w-4" />
                        Crear una factura
                    </Boton>
                </Vacio>
            ) : (
                <div className="h-72 p-3 sm:h-80 sm:p-5">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={datos} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <defs>
                                <linearGradient id="relleno" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={linea} stopOpacity={0.28} />
                                    <stop offset="100%" stopColor={linea} stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3" stroke={rejilla} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: textoEje, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: textoEje, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                width={56}
                                tickFormatter={(valor) => `$${valor}`}
                            />
                            <Tooltip
                                cursor={{ stroke: rejilla }}
                                contentStyle={{
                                    background: esOscuro ? '#1c1917' : '#ffffff',
                                    border: `1px solid ${rejilla}`,
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    color: esOscuro ? '#f5f5f4' : '#1c1917',
                                }}
                                formatter={(valor) => [`$${Number(valor).toFixed(2)}`, 'Vendido']}
                            />
                            <Area
                                type="monotone"
                                dataKey="total_usd"
                                stroke={linea}
                                strokeWidth={2}
                                fill="url(#relleno)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Tarjeta>
    );
}

/* ── Tasa y consulta por fechas ─────────────────────────────────────────── */

/** Cómo renovar o cambiar de plan: con el contacto de soporte de la plataforma. */
function ContactoParaElPlan({ soporte, plan }) {
    const numero = (soporte?.whatsapp ?? '').replace(/\D/g, '');
    const urgente = ['por_vencer', 'vencido'].includes(plan.estado);
    const mensaje = encodeURIComponent(
        plan.plan ? `Hola, quiero renovar o cambiar mi plan ${plan.plan.nombre}.` : 'Hola, quiero contratar un plan.',
    );

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-600 dark:text-stone-400">
                {urgente
                    ? 'Renueva tu plan para seguir usando todas las funciones sin interrupciones.'
                    : '¿Necesitas más espacio o funciones? Puedes cambiar de plan cuando quieras.'}
            </p>

            {(numero || soporte?.email) && (
                <div className="flex shrink-0 flex-wrap gap-2">
                    {numero && (
                        <a
                            href={`https://wa.me/${numero}?text=${mensaje}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`pulsable boton-elevado inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                                urgente
                                    ? 'bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950'
                                    : 'bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900'
                            }`}
                        >
                            {urgente ? 'Renovar por WhatsApp' : 'Escribir por WhatsApp'}
                        </a>
                    )}
                    {soporte?.email && (
                        <a
                            href={`mailto:${soporte.email}?subject=${encodeURIComponent('Mi plan en Despashop')}`}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                        >
                            Escribir un correo
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

function TasaActual({ tasa }) {
    return (
        <Tarjeta
            titulo="Tasa de cambio"
            accion={
                <Boton href={route('tasas.create')} variante="fantasma" tamano="sm">
                    Actualizar
                </Boton>
            }
        >
            {tasa ? (
                <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Dólar BCV</p>
                    <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                        Bs. {Number(tasa.bcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        Registrada el {new Date(tasa.created_at).toLocaleDateString('es', {
                            day: '2-digit',
                            month: 'long',
                        })}. Es la que se usa para los precios en bolívares.
                    </p>
                </div>
            ) : (
                <Aviso tono="aviso">
                    Todavía no has registrado una tasa. Los precios en bolívares no se calcularán hasta que lo hagas.
                </Aviso>
            )}
        </Tarjeta>
    );
}

function ConsultaPorFechas({ desde, hasta, setDesde, setHasta, onFiltrar, onLimpiar, resultado }) {
    return (
        <Tarjeta titulo="Consultar otro período">
            <form onSubmit={onFiltrar} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etiqueta="Desde" id="desde">
                        <Entrada
                            id="desde"
                            type="date"
                            value={desde}
                            onChange={(e) => setDesde(e.target.value)}
                            required
                        />
                    </Campo>

                    <Campo etiqueta="Hasta" id="hasta">
                        <Entrada
                            id="hasta"
                            type="date"
                            value={hasta}
                            onChange={(e) => setHasta(e.target.value)}
                            required
                        />
                    </Campo>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Boton type="submit" tamano="sm">
                        Consultar
                    </Boton>

                    {(desde || hasta) && (
                        <Boton variante="fantasma" tamano="sm" onClick={onLimpiar}>
                            Limpiar
                        </Boton>
                    )}
                </div>
            </form>

            {resultado && (
                <dl className="mt-5 animate-acercar space-y-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-800">
                    <div className="flex justify-between">
                        <dt className="text-stone-500 dark:text-stone-400">Vendido</dt>
                        <dd className="font-semibold tabular-nums">
                            ${Number(resultado.total_usd).toFixed(2)}
                        </dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-stone-500 dark:text-stone-400">En bolívares</dt>
                        <dd className="tabular-nums">
                            Bs. {Number(resultado.total_bs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                        </dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-stone-500 dark:text-stone-400">Ventas</dt>
                        <dd className="tabular-nums">{resultado.orders_count}</dd>
                    </div>
                </dl>
            )}
        </Tarjeta>
    );
}
