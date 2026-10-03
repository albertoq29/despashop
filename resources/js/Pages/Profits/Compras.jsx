import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Cabecera, Pagina, Tarjeta, Vacio } from '@/Components/UI';
import { ArrowLeft, Trash2 } from 'lucide-react';

/**
 * Libro de compras de un producto: de aquí sale su inversión.
 *
 * Es la respuesta a «¿por qué dice que invertí tanto?»: cada entrada con su
 * fecha, su cantidad y lo que costó ese día.
 */
export default function Compras({ producto, compras }) {
    const total = compras.reduce((suma, compra) => suma + compra.total, 0);
    const unidades = compras.reduce((suma, compra) => suma + compra.cantidad, 0);

    const eliminar = (compra) => {
        if (window.confirm('¿Quitar esta entrada del libro? La inversión del producto baja en $' + compra.total.toFixed(2) + '.')) {
            router.delete(route('profits.compras.destroy', compra.id), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout header={`Compras de ${producto.name}`}>
            <Head title={`Compras de ${producto.name}`} />

            <Pagina className="max-w-3xl">
                <Link
                    href={route('profits.index')}
                    className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Ganancias
                </Link>

                <Cabecera
                    titulo={producto.name}
                    descripcion="Cada vez que entra mercancía queda anotada aquí con el costo de ese día. La suma es la inversión del producto."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                    <Dato titulo="Invertido" valor={`$${producto.inversion.toFixed(2)}`} destacado />
                    <Dato titulo="Unidades que entraron" valor={unidades} />
                    <Dato titulo="En inventario hoy" valor={`${producto.stock} uds`} />
                </div>

                <Tarjeta titulo="Entradas registradas">
                    {compras.length === 0 ? (
                        <Vacio texto="Todavía no hay compras registradas para este producto." />
                    ) : (
                        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                            {compras.map((compra) => (
                                <li key={compra.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                            {compra.cantidad > 0 ? '+' : ''}
                                            {compra.cantidad} uds a ${compra.costo_unitario.toFixed(2)} c/u
                                        </p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400">
                                            {new Date(compra.fecha).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            {' · '}
                                            {compra.origen}
                                            {compra.nota ? ` · ${compra.nota}` : ''}
                                        </p>
                                    </div>

                                    <span className={`font-mono text-sm font-bold ${compra.total < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                        ${compra.total.toFixed(2)}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => eliminar(compra)}
                                        aria-label="Quitar esta entrada"
                                        className="pulsable grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-600 dark:hover:bg-stone-800"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="mt-4 border-t border-stone-200 pt-3 text-right text-sm font-semibold dark:border-stone-800">
                        Total invertido: <span className="font-mono">${total.toFixed(2)}</span>
                    </p>
                </Tarjeta>
            </Pagina>
        </AuthenticatedLayout>
    );
}

function Dato({ titulo, valor, destacado = false }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm text-stone-500 dark:text-stone-400">{titulo}</p>
            <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${destacado ? 'text-marca-700 dark:text-marca-400' : ''}`}>
                {valor}
            </p>
        </div>
    );
}
