import { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarClock, Check, MessageCircle, Mail, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ResumenDelPlan, { fechaLarga } from '@/Components/Plan/ResumenDelPlan';

const PERIODOS = { monthly: '/mes', yearly: '/año', lifetime: 'pago único', free: 'gratis' };

const ESTADOS = {
    pendiente: { texto: 'Esperando respuesta', clase: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' },
    aceptada: { texto: 'Aceptada', clase: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300' },
    aplicada: { texto: 'Aplicada', clase: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300' },
    rechazada: { texto: 'No aprobada', clase: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
    cancelada: { texto: 'Retirada', clase: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
};

/**
 * Mi plan.
 *
 * No se cobra solo: pedir un cambio aquí deja constancia de qué quiere el
 * comercio, y el cambio entra en la próxima renovación. Decirlo en voz alta
 * evita la decepción de esperar que el plan cambie al instante.
 */
export default function Index({ resumen, planActualId, planPendiente, planes, pruebaOculta, solicitudes, contacto }) {
    const { flash } = usePage().props;
    const abierta = solicitudes.find((s) => ['pendiente', 'aceptada'].includes(s.status));

    return (
        <AuthenticatedLayout header="Mi plan">
            <Head title="Mi plan" />

            <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
                {flash?.success && <Aviso tono="exito">{flash.success}</Aviso>}
                {flash?.error && <Aviso tono="error">{flash.error}</Aviso>}

                <ResumenDelPlan resumen={resumen} />

                {planPendiente && (
                    <div className="rounded-2xl border border-marca-300 bg-marca-50 p-5 dark:border-marca-800 dark:bg-marca-950/40">
                        <div className="flex items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-marca-700 dark:bg-stone-900 dark:text-marca-400">
                                <CalendarClock className="h-5 w-5" />
                            </span>

                            <div className="min-w-0">
                                <p className="font-display font-semibold text-marca-900 dark:text-marca-200">
                                    Tu cambio a {planPendiente.name} está aprobado
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-marca-900/80 dark:text-marca-200/80">
                                    Entra en tu próxima renovación
                                    {resumen.vence ? `, el ${fechaLarga(resumen.vence)}` : ''}. Hasta entonces sigues
                                    con lo que tienes ahora, sin perder nada.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {abierta ? (
                    <SolicitudAbierta solicitud={abierta} />
                ) : (
                    <Pedir planes={planes} planActualId={planActualId} pruebaOculta={pruebaOculta} />
                )}

                {solicitudes.length > 0 && <Historial solicitudes={solicitudes} />}

                <Contacto contacto={contacto} />
            </div>
        </AuthenticatedLayout>
    );
}

/* ── Pedir un cambio ────────────────────────────────────────────────────── */

function Pedir({ planes, planActualId, pruebaOculta }) {
    const form = useForm({ to_plan_id: '', message: '' });

    const enviar = (evento) => {
        evento.preventDefault();
        form.post(route('plan.solicitudes.store'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <form
            onSubmit={enviar}
            className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6"
        >
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                Cambiar de plan
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Elige el que quieres y lo revisamos. El cambio entra en tu próxima renovación, así no pierdes los días
                que ya pagaste.
            </p>

            {/* Si en la web hay una prueba gratis y aquí sale el precio
                normal, mejor decir por qué que dejarlo pensando. */}
            {pruebaOculta && (
                <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    Las pruebas gratis que anunciamos son para cuentas nuevas. Como ya tienes plan con nosotros, aquí
                    ves el precio de siempre.
                </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {planes.map((plan) => {
                    const actual = plan.id === planActualId;
                    const elegido = String(form.data.to_plan_id) === String(plan.id);

                    return (
                        <button
                            key={plan.id}
                            type="button"
                            disabled={actual}
                            onClick={() => form.setData('to_plan_id', plan.id)}
                            className={`pulsable rounded-xl border p-4 text-left transition-colors ${
                                actual
                                    ? 'cursor-default border-stone-200 bg-stone-50 opacity-70 dark:border-stone-800 dark:bg-stone-950'
                                    : elegido
                                      ? 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
                                      : 'border-stone-200 hover:border-marca-400 dark:border-stone-800 dark:hover:border-marca-600'
                            }`}
                        >
                            <span className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-stone-900 dark:text-stone-100">{plan.name}</span>
                                {actual && (
                                    <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                        El tuyo
                                    </span>
                                )}
                                {elegido && <Check className="h-4 w-4 shrink-0 text-marca-700 dark:text-marca-400" />}
                            </span>

                            <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">
                                {plan.descuento_activo ? (
                                    <>
                                        <strong className="font-semibold text-stone-900 dark:text-stone-100">
                                            ${Number(plan.precio_final).toFixed(2)}
                                        </strong>{' '}
                                        <span className="text-stone-400 line-through">
                                            ${Number(plan.price_usd).toFixed(2)}
                                        </span>
                                    </>
                                ) : (
                                    <strong className="font-semibold text-stone-900 dark:text-stone-100">
                                        ${Number(plan.price_usd).toFixed(2)}
                                    </strong>
                                )}{' '}
                                {PERIODOS[plan.billing_period] ?? ''}
                            </span>

                            {plan.tagline && (
                                <span className="mt-1 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                                    {plan.tagline}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {form.errors.to_plan_id && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{form.errors.to_plan_id}</p>
            )}

            <div className="mt-5">
                <label htmlFor="mensaje" className="text-sm font-medium text-stone-800 dark:text-stone-200">
                    ¿Algo que debamos saber? <span className="font-normal text-stone-500">(opcional)</span>
                </label>
                <textarea
                    id="mensaje"
                    rows={3}
                    maxLength={500}
                    value={form.data.message}
                    onChange={(e) => form.setData('message', e.target.value)}
                    placeholder="Ej.: me quedé sin espacio para productos y necesito subir antes de diciembre."
                    className="mt-2 w-full rounded-xl border-stone-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
                />
                {form.errors.message && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.errors.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={!form.data.to_plan_id || form.processing}
                className="pulsable boton-elevado mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-marca-700 px-5 py-3 text-sm font-semibold text-white hover:bg-marca-600 disabled:pointer-events-none disabled:opacity-50 dark:bg-marca-500 dark:text-stone-950 sm:w-auto"
            >
                {form.processing ? 'Enviando' : 'Enviar la solicitud'}
                <ArrowRight className="h-4 w-4" />
            </button>
        </form>
    );
}

/* ── Una solicitud en curso ─────────────────────────────────────────────── */

function SolicitudAbierta({ solicitud }) {
    const [retirando, setRetirando] = useState(false);
    const form = useForm({});

    const retirar = () =>
        form.delete(route('plan.solicitudes.destroy', solicitud.id), {
            preserveScroll: true,
            onFinish: () => setRetirando(false),
        });

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                        Tu solicitud
                    </h2>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                        {solicitud.plan_actual?.name ?? 'Sin plan'} → <strong>{solicitud.plan_pedido?.name}</strong>
                    </p>
                </div>

                <Estado status={solicitud.status} />
            </div>

            {solicitud.message && (
                <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-sm leading-relaxed text-stone-600 dark:bg-stone-950 dark:text-stone-400">
                    {solicitud.message}
                </p>
            )}

            {solicitud.admin_note && (
                <div className="mt-4 rounded-xl border border-stone-200 p-3.5 dark:border-stone-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        Nuestra respuesta
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                        {solicitud.admin_note}
                    </p>
                </div>
            )}

            {solicitud.status === 'pendiente' &&
                (retirando ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-stone-600 dark:text-stone-400">¿Retiras la solicitud?</span>
                        <button
                            type="button"
                            onClick={retirar}
                            disabled={form.processing}
                            className="pulsable rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            Sí, retirarla
                        </button>
                        <button
                            type="button"
                            onClick={() => setRetirando(false)}
                            className="pulsable rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setRetirando(true)}
                        className="pulsable mt-4 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                        <X className="h-3.5 w-3.5" />
                        Retirar la solicitud
                    </button>
                ))}
        </div>
    );
}

/* ── Lo que ya pasó ─────────────────────────────────────────────────────── */

function Historial({ solicitudes }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                Solicitudes anteriores
            </h2>

            <ul className="mt-4 divide-y divide-stone-200 dark:divide-stone-800">
                {solicitudes.map((solicitud) => (
                    <li key={solicitud.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                        <span className="text-stone-500 dark:text-stone-400">
                            {fechaLarga(solicitud.created_at)}
                        </span>
                        <span className="min-w-0 flex-1 text-stone-800 dark:text-stone-200">
                            {solicitud.plan_actual?.name ?? 'Sin plan'} → {solicitud.plan_pedido?.name}
                        </span>
                        <Estado status={solicitud.status} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Estado({ status }) {
    const estado = ESTADOS[status] ?? ESTADOS.pendiente;

    return (
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estado.clase}`}>
            {estado.texto}
        </span>
    );
}

function Contacto({ contacto }) {
    if (!contacto?.whatsapp && !contacto?.email) {
        return null;
    }

    return (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm text-stone-500 dark:text-stone-400">
            ¿Prefieres hablarlo?
            {contacto.whatsapp && (
                <a
                    href={`https://wa.me/${contacto.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-marca-700 hover:underline dark:text-marca-400"
                >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                </a>
            )}
            {contacto.email && (
                <a
                    href={`mailto:${contacto.email}`}
                    className="inline-flex items-center gap-1.5 font-medium text-marca-700 hover:underline dark:text-marca-400"
                >
                    <Mail className="h-4 w-4" />
                    {contacto.email}
                </a>
            )}
        </p>
    );
}

function Aviso({ tono, children }) {
    const tonos = {
        exito: 'border-marca-200 bg-marca-50 text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300',
        error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
    };

    return <div className={`rounded-xl border px-4 py-3 text-sm ${tonos[tono]}`}>{children}</div>;
}
