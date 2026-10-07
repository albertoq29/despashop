import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Bike, CalendarClock, CalendarPlus, MapPin, MessageCircle, Phone, Receipt, Truck, User } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Boton, Cabecera, Insignia, Metrica, Pagina, Tarjeta, Vacio } from '@/Components/UI';

/**
 * Dos listas, no una.
 *
 * Una entrega personal la lleva el propio comercio y se acuerda con el
 * cliente; un delivery se manda con alguien y tiene un recorrido. Quien
 * sale a repartir no necesita ver las que se entregan en mano, y al revés
 * igual, así que cada clase tiene su pestaña y sus propios números.
 */
const PESTANAS = [
    { id: 'personal', texto: 'Entregas personales', Icono: User, vacio: 'No tienes entregas personales agendadas' },
    { id: 'delivery', texto: 'Delivery', Icono: Bike, vacio: 'No tienes deliveries agendados' },
];

export default function Index({ deliveries }) {
    const porTipo = (id) => deliveries.filter((entrega) => (entrega.type ?? 'personal') === id);

    // Arranca donde haya algo que mirar: si no hay entregas en mano pero sí
    // deliveries, abrir en una pestaña vacía sería un paso de más.
    const [pestana, setPestana] = useState(() =>
        porTipo('personal').length === 0 && porTipo('delivery').length > 0 ? 'delivery' : 'personal',
    );

    const dePestana = porTipo(pestana);
    const vencidas = dePestana.filter((entrega) => entrega.is_expired);
    const hoy = dePestana.filter((entrega) => !entrega.is_expired && esHoy(entrega.delivery_date));
    const proximas = dePestana.filter((entrega) => !entrega.is_expired && !esHoy(entrega.delivery_date));

    const actual = PESTANAS.find((p) => p.id === pestana);

    return (
        <AuthenticatedLayout header="Entregas">
            <Head title="Entregas" />

            <Pagina className="max-w-4xl">
                <Cabecera
                    titulo="Entregas agendadas"
                    descripcion="Las entregas se archivan solas tres días después de su fecha."
                />

                {deliveries.length === 0 ? (
                    <Tarjeta cuerpo={false}>
                        <Vacio
                            Icono={Truck}
                            titulo="No tienes entregas agendadas"
                            texto="Al armar una factura puedes agendarle una entrega personal o un delivery, y aparecerá aquí."
                        >
                            <Boton href={route('facturas.index')} variante="contorno">
                                <Receipt className="h-4 w-4" />
                                Ver facturas
                            </Boton>
                        </Vacio>
                    </Tarjeta>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {PESTANAS.map(({ id, texto, Icono }) => {
                                const cuantas = porTipo(id).length;
                                const activa = pestana === id;

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setPestana(id)}
                                        aria-current={activa ? 'page' : undefined}
                                        className={`pulsable inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold ${
                                            activa
                                                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                                : 'border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                                        }`}
                                    >
                                        <Icono className="h-4 w-4" />
                                        {texto}
                                        <span className="tabular-nums opacity-70">{cuantas}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Metrica etiqueta="Vencidas" valor={vencidas.length} Icono={CalendarClock} tono={vencidas.length ? 'alerta' : 'neutro'} />
                            <Metrica etiqueta="Para hoy" valor={hoy.length} Icono={Truck} tono={hoy.length ? 'marca' : 'neutro'} />
                            <Metrica etiqueta="Próximas" valor={proximas.length} Icono={CalendarPlus} />
                        </div>

                        {dePestana.length === 0 ? (
                            <Tarjeta cuerpo={false}>
                                <Vacio Icono={actual.Icono} titulo={actual.vacio} texto="Las de la otra pestaña siguen ahí." />
                            </Tarjeta>
                        ) : (
                            <div className="space-y-5">
                                <Grupo titulo="Vencidas" entregas={vencidas} tono="alerta" />
                                <Grupo titulo="Para hoy" entregas={hoy} tono="marca" />
                                <Grupo titulo="Próximas" entregas={proximas} tono="neutro" />
                            </div>
                        )}
                    </>
                )}
            </Pagina>
        </AuthenticatedLayout>
    );
}

function Grupo({ titulo, entregas, tono }) {
    if (entregas.length === 0) {
        return null;
    }

    return (
        <Tarjeta titulo={`${titulo} (${entregas.length})`} cuerpo={false}>
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                {entregas.map((entrega) => (
                    <Entrega key={entrega.id} entrega={entrega} tono={tono} />
                ))}
            </ul>
        </Tarjeta>
    );
}

function Entrega({ entrega, tono }) {
    /**
     * El servidor espera una fecha, no un número de días. Se parte de la
     * fecha actual de la entrega, salvo que ya haya pasado: en ese caso se
     * cuenta desde hoy, porque el backend exige una fecha futura.
     */
    const posponer = (dias) => {
        const base = new Date(entrega.delivery_date);
        const referencia = base.getTime() > Date.now() ? base : new Date();

        referencia.setDate(referencia.getDate() + dias);

        router.post(
            route('deliveries.postpone', entrega.id),
            { delivery_date: aFechaLocal(referencia) },
            { preserveScroll: true },
        );
    };

    const telefono = (entrega.client_phone || '').replace(/\D/g, '');

    return (
        <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={route('facturas.show', entrega.factura_id)}
                        className="truncate font-medium hover:underline"
                    >
                        {entrega.client_name}
                    </Link>

                    <Insignia tono={tono}>{formatearFecha(entrega.delivery_date)}</Insignia>
                </div>

                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
                    <span className="tabular-nums">${Number(entrega.total_usd).toFixed(2)}</span>
                    <span>Factura #{entrega.factura_id}</span>
                    {entrega.client_phone && (
                        <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {entrega.client_phone}
                        </span>
                    )}
                </p>

                {/* El recorrido, que es lo que se mira antes de salir */}
                {(entrega.point_a || entrega.point_b) && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-sm text-stone-600 dark:text-stone-300">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                        <span className="min-w-0">
                            {entrega.point_a || 'Sin punto de salida'}
                            <span className="mx-1.5 text-stone-400 dark:text-stone-500">→</span>
                            {entrega.point_b || 'Sin punto de llegada'}
                        </span>
                    </p>
                )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
                {telefono && (
                    <a
                        href={`https://wa.me/${telefono}?text=${encodeURIComponent(
                            `Hola ${entrega.client_name}, le escribo por su entrega.`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                    >
                        <MessageCircle className="h-4 w-4" />
                        Escribir
                    </a>
                )}

                <Boton variante="contorno" tamano="sm" onClick={() => posponer(1)}>
                    +1 día
                </Boton>
                <Boton variante="contorno" tamano="sm" onClick={() => posponer(7)}>
                    +1 semana
                </Boton>
            </div>
        </li>
    );
}

/** `Y-m-d H:i:s` en hora local, que es lo que valida el servidor. */
function aFechaLocal(fecha) {
    const dosDigitos = (valor) => String(valor).padStart(2, '0');

    return (
        `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
        ` ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}:00`
    );
}

function esHoy(iso) {
    const fecha = new Date(iso);
    const hoy = new Date();

    return (
        fecha.getDate() === hoy.getDate() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getFullYear() === hoy.getFullYear()
    );
}

function formatearFecha(iso) {
    return new Date(iso).toLocaleDateString('es', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });
}
