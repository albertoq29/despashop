import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, Check, MessageCircle, Receipt, RefreshCw, Repeat, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Boton, Cabecera, Insignia, Metrica, Pagina, Tarjeta, Vacio } from '@/Components/UI';
import { enlaceDeWhatsapp } from '@/utils/whatsapp';

const PERIODOS = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
};

/**
 * A quién le toca pagar su suscripción y cuándo.
 *
 * No cobra ni factura nada: es la lista de lo que viene, para escribirle
 * al cliente antes de la fecha y no después. Al marcar una como renovada
 * la fecha salta al siguiente período, que es lo único que cambia.
 */
export default function Index({ renovaciones }) {
    const vencidas = renovaciones.filter((r) => r.dias < 0);
    const estaSemana = renovaciones.filter((r) => r.dias >= 0 && r.dias <= 7);
    const proximas = renovaciones.filter((r) => r.dias > 7);

    const porCobrar = renovaciones
        .filter((r) => r.dias <= 7)
        .reduce((suma, r) => suma + r.monto_usd, 0);

    return (
        <AuthenticatedLayout header="Renovaciones">
            <Head title="Renovaciones" />

            <Pagina className="max-w-4xl">
                <Cabecera
                    titulo="Renovaciones de servicios"
                    descripcion="Los servicios que marcaste como suscripción, con la fecha que le toca a cada cliente."
                />

                {renovaciones.length === 0 ? (
                    <Tarjeta cuerpo={false}>
                        <Vacio
                            Icono={Repeat}
                            titulo="No tienes renovaciones por ahora"
                            texto="Marca un servicio como suscripción en sus datos y, al facturarlo, anota cuándo renueva ese cliente. Aparecerá aquí."
                        >
                            <Boton href={route('productos.index')} variante="contorno">
                                <Receipt className="h-4 w-4" />
                                Ver productos
                            </Boton>
                        </Vacio>
                    </Tarjeta>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Metrica
                                etiqueta="Vencidas"
                                valor={vencidas.length}
                                Icono={CalendarClock}
                                tono={vencidas.length ? 'alerta' : 'neutro'}
                            />
                            <Metrica
                                etiqueta="Esta semana"
                                valor={estaSemana.length}
                                Icono={Repeat}
                                tono={estaSemana.length ? 'marca' : 'neutro'}
                            />
                            <Metrica
                                etiqueta="Por cobrar"
                                valor={`$${porCobrar.toFixed(2)}`}
                                Icono={Receipt}
                                detalle="Vencidas y de esta semana"
                            />
                        </div>

                        <div className="space-y-5">
                            <Grupo titulo="Vencidas" renovaciones={vencidas} tono="alerta" />
                            <Grupo titulo="Esta semana" renovaciones={estaSemana} tono="marca" />
                            <Grupo titulo="Próximas" renovaciones={proximas} tono="neutro" />
                        </div>
                    </>
                )}
            </Pagina>
        </AuthenticatedLayout>
    );
}

function Grupo({ titulo, renovaciones, tono }) {
    if (renovaciones.length === 0) {
        return null;
    }

    return (
        <section>
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
                {titulo}
                <Insignia tono={tono}>{renovaciones.length}</Insignia>
            </h2>

            <div className="space-y-2.5">
                {renovaciones.map((renovacion) => (
                    <Fila key={renovacion.id} renovacion={renovacion} />
                ))}
            </div>
        </section>
    );
}

function Fila({ renovacion }) {
    const renovar = () =>
        router.patch(route('renovaciones.renovar', renovacion.id), {}, { preserveScroll: true });

    const dejarDeSeguir = () => {
        if (window.confirm('¿Dejar de seguir esta renovación? La factura queda igual.')) {
            router.delete(route('renovaciones.destroy', renovacion.id), { preserveScroll: true });
        }
    };

    return (
        <Tarjeta>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{renovacion.servicio}</p>

                    <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
                        {renovacion.cliente}
                        {renovacion.periodo && ` · ${PERIODOS[renovacion.periodo] ?? renovacion.periodo}`}
                        {renovacion.renovaciones > 0 &&
                            ` · ${renovacion.renovaciones} ${renovacion.renovaciones === 1 ? 'renovación' : 'renovaciones'}`}
                    </p>

                    <p className="mt-1.5 text-sm">
                        <span className="font-semibold tabular-nums">{enCriollo(renovacion.renueva_el)}</span>
                        <span className="text-stone-500 dark:text-stone-400"> · {cuando(renovacion.dias)}</span>
                        <span className="text-stone-500 dark:text-stone-400">
                            {' '}· ${renovacion.monto_usd.toFixed(2)}
                        </span>
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {renovacion.telefono && (
                        <a
                            href={enlaceDeWhatsapp(
                                renovacion.telefono,
                                `Hola, te escribo por la renovación de ${renovacion.servicio}.`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Avisar
                        </a>
                    )}

                    <Link
                        href={route('facturas.show', renovacion.factura_id)}
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                    >
                        <Receipt className="h-4 w-4" />
                        Factura
                    </Link>

                    {renovacion.renovable ? (
                        <button
                            type="button"
                            onClick={renovar}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-3 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                        >
                            <Check className="h-4 w-4" />
                            Renovado
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Ya no es suscripción
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={dejarDeSeguir}
                        aria-label="Dejar de seguir esta renovación"
                        title="Dejar de seguir"
                        className="pulsable grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </Tarjeta>
    );
}

/** Una fecha como se lee aquí: día primero. */
function enCriollo(iso) {
    const [anio, mes, dia] = String(iso).slice(0, 10).split('-');

    return dia ? `${dia}/${mes}/${anio}` : '';
}

function cuando(dias) {
    if (dias === 0) {
        return 'es hoy';
    }

    if (dias < 0) {
        const pasados = Math.abs(dias);

        return `venció hace ${pasados} ${pasados === 1 ? 'día' : 'días'}`;
    }

    return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
