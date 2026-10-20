import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Eye, Package, Plus, Receipt, TrendingUp } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Aviso, Boton, Cabecera, Campo, Entrada, Metrica, Pagina, Tarjeta, Vacio } from '@/Components/UI';
import { useTema } from '@/hooks/useTema';

/**
 * Cómo va el negocio.
 *
 * Esto abría el panel hasta que se mudó aquí. El gráfico y las cifras no son
 * lo que alguien viene a hacer al entrar a la app, y a quien está armando su
 * catálogo un mes de ventas en cero no le dice nada bueno. Puestas en su
 * propia pantalla, se miran cuando se las quiere mirar.
 */
export default function Estadisticas({
    latest,
    dailySales,
    totalSalesUsd,
    totalSalesBs,
    totalOrders,
    filters,
    customStats,
    productos,
    visitas30d,
}) {
    const [desde, setDesde] = useState(filters?.start_date || '');
    const [hasta, setHasta] = useState(filters?.end_date || '');

    const filtrar = (evento) => {
        evento.preventDefault();
        router.get(route('estadisticas.index'), { start_date: desde, end_date: hasta }, { preserveState: true });
    };

    const limpiar = () => {
        setDesde('');
        setHasta('');
        router.get(route('estadisticas.index'), {}, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header="Estadísticas">
            <Head title="Estadísticas" />

            <Pagina>
                <Cabecera
                    titulo="Cómo va el negocio"
                    descripcion="Los últimos 30 días de ventas y visitas a tu catálogo."
                />

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
                        detalle="Últimos 30 días"
                        Icono={Receipt}
                    />
                    <Metrica
                        etiqueta="Productos y servicios"
                        valor={productos ?? 0}
                        detalle="En tu inventario"
                        Icono={Package}
                    />
                    <Metrica
                        etiqueta="Visitas al catálogo"
                        valor={visitas30d ?? 0}
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
