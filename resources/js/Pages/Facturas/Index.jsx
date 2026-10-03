import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, FileText, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Aviso,
    Boton,
    Cabecera,
    Celda,
    Entrada,
    Fila,
    Insignia,
    Pagina,
    Tabla,
    Tarjeta,
    Vacio,
} from '@/Components/UI';
import { BotonDeTutorial, OfertaDeTutorial } from '@/Components/Tutorial';

const ESTADOS = [
    { valor: 'draft', etiqueta: 'Borradores', tono: 'neutro' },
    { valor: 'pending_variants', etiqueta: 'Por confirmar', tono: 'aviso' },
    { valor: 'confirmed', etiqueta: 'Confirmadas', tono: 'marca' },
];

const NOMBRES_ESTADO = {
    draft: 'Borrador',
    pending_variants: 'Por confirmar',
    confirmed: 'Confirmada',
};

const TONOS_ESTADO = {
    draft: 'neutro',
    pending_variants: 'aviso',
    confirmed: 'marca',
};

export default function Index({ facturas, filters }) {
    const { flash } = usePage().props;
    const [busqueda, setBusqueda] = useState(filters.search ?? '');

    const filtrar = (cambios) => {
        router.get(
            route('facturas.index'),
            { ...filters, ...cambios },
            { preserveState: true, replace: true },
        );
    };

    const eliminar = (factura) => {
        if (window.confirm(`¿Eliminar la factura #${factura.id}? No se puede deshacer.`)) {
            router.delete(route('facturas.destroy', factura.id), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout header="Facturas">
            <Head title="Facturas" />

            <Pagina>
                <Cabecera
                    titulo="Facturas"
                    descripcion="Los borradores no descuentan inventario: el stock baja al confirmar."
                >
                    <BotonDeTutorial nombre="facturas">
                        <span className="hidden sm:inline">Ver tutorial</span>
                        <span className="sm:hidden">Tutorial</span>
                    </BotonDeTutorial>

                    <Boton href={route('facturas.plantilla')} variante="contorno">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Estilo</span>
                    </Boton>

                    <Boton href={route('facturas.create')}>
                        <Plus className="h-4 w-4" />
                        Nueva factura
                    </Boton>
                </Cabecera>

                {flash?.success && <Aviso tono="exito">{flash.success}</Aviso>}
                {flash?.error && <Aviso tono="alerta">{flash.error}</Aviso>}

                <OfertaDeTutorial nombre="facturas" />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <form
                        onSubmit={(evento) => {
                            evento.preventDefault();
                            filtrar({ search: busqueda || undefined });
                        }}
                        className="relative flex-1"
                    >
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <Entrada
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por cliente o número"
                            aria-label="Buscar facturas"
                            className="pl-10"
                        />
                    </form>

                    <div className="scrollbar-slim flex gap-2 overflow-x-auto pb-1">
                        {ESTADOS.map((estado) => {
                            const activo = filters.status === estado.valor;

                            return (
                                <button
                                    key={estado.valor}
                                    type="button"
                                    onClick={() => filtrar({ status: estado.valor })}
                                    aria-pressed={activo}
                                    className={`pulsable shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${
                                        activo
                                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                            : 'border border-stone-300 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'
                                    }`}
                                >
                                    {estado.etiqueta}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Tarjeta cuerpo={false}>
                    {facturas.data.length === 0 ? (
                        <Vacio
                            Icono={Receipt}
                            titulo="No hay facturas aquí"
                            texto={
                                filters.search
                                    ? 'Prueba con otro nombre o número.'
                                    : 'Crea tu primera factura y el inventario se ajustará solo al confirmarla.'
                            }
                        >
                            {!filters.search && (
                                <Boton href={route('facturas.create')}>
                                    <Plus className="h-4 w-4" />
                                    Nueva factura
                                </Boton>
                            )}
                        </Vacio>
                    ) : (
                        <Tabla
                            encabezados={[
                                { texto: 'Número' },
                                { texto: 'Cliente' },
                                { texto: 'Estado' },
                                { texto: 'Total', alineacion: 'text-right' },
                                { texto: 'Fecha' },
                                { texto: '' },
                            ]}
                        >
                            {facturas.data.map((factura) => (
                                <Fila key={factura.id}>
                                    <Celda etiqueta="Número">
                                        <Link
                                            href={route('facturas.show', factura.id)}
                                            className="font-semibold tabular-nums hover:underline"
                                        >
                                            #{factura.id}
                                        </Link>
                                    </Celda>

                                    <Celda etiqueta="Cliente">
                                        <span className="truncate">{factura.client_name || 'Sin cliente'}</span>
                                    </Celda>

                                    <Celda etiqueta="Estado">
                                        <Insignia tono={TONOS_ESTADO[factura.status] ?? 'neutro'}>
                                            {NOMBRES_ESTADO[factura.status] ?? factura.status}
                                        </Insignia>
                                    </Celda>

                                    <Celda etiqueta="Total" alineacion="sm:text-right">
                                        <span className="font-semibold tabular-nums">
                                            ${Number(factura.total_usd).toFixed(2)}
                                        </span>
                                    </Celda>

                                    <Celda etiqueta="Fecha">
                                        <span className="whitespace-nowrap text-stone-500 dark:text-stone-400">
                                            {new Date(factura.created_at).toLocaleDateString('es', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: '2-digit',
                                            })}
                                        </span>
                                    </Celda>

                                    <Celda etiqueta="" alineacion="sm:text-right">
                                        <span className="flex justify-end gap-1">
                                            <Boton
                                                href={route('facturas.show', factura.id)}
                                                variante="fantasma"
                                                tamano="icono"
                                                aria-label={`Ver factura ${factura.id}`}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Boton>

                                            {factura.status !== 'confirmed' && (
                                                <Boton
                                                    href={route('facturas.edit', factura.id)}
                                                    variante="fantasma"
                                                    tamano="icono"
                                                    aria-label={`Editar factura ${factura.id}`}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Boton>
                                            )}

                                            <Boton
                                                variante="peligroSuave"
                                                tamano="icono"
                                                aria-label={`Eliminar factura ${factura.id}`}
                                                onClick={() => eliminar(factura)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Boton>
                                        </span>
                                    </Celda>
                                </Fila>
                            ))}
                        </Tabla>
                    )}
                </Tarjeta>

                {facturas.links?.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1.5" aria-label="Paginación">
                        {facturas.links.map((enlace, indice) => (
                            <Link
                                key={indice}
                                href={enlace.url ?? '#'}
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
            </Pagina>
        </AuthenticatedLayout>
    );
}
