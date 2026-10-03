import { Head, Link, router, usePage } from '@inertiajs/react';
import { Clock, LogOut, Mail, MessageCircle, ShieldAlert, ShieldX } from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';
import Marca from '@/Components/Marca';

const ESTADOS = {
    pending: {
        Icono: Clock,
        titulo: 'Tu solicitud está en revisión',
        texto: 'Un administrador la revisa a mano. En cuanto la apruebe, tu panel y tu catálogo quedan activos.',
        tono: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    },
    rejected: {
        Icono: ShieldX,
        titulo: 'Tu solicitud no fue aprobada',
        texto: 'Puedes escribirnos si crees que hubo un error o si quieres corregir los datos.',
        tono: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    },
    suspended: {
        Icono: ShieldAlert,
        titulo: 'Tu cuenta está suspendida',
        texto: 'Mientras esté suspendida, tu catálogo no es visible para tus clientes.',
        tono: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    },
};

export default function Estado({ cuenta, catalogUrl, soporte }) {
    const { plataforma } = usePage().props;
    const estado = ESTADOS[cuenta.status] ?? ESTADOS.pending;
    const { Icono } = estado;

    return (
        <>
            <Head title="Estado de tu cuenta" />

            <div className="min-h-screen bg-stone-50 px-5 py-10 dark:bg-stone-950">
                <div className="mx-auto max-w-2xl">
                    <div className="flex items-center justify-between">
                        <Link href={route('home')} aria-label={plataforma?.marca ?? 'Despashop'}>
                            <Marca marca={plataforma?.marca} className="h-6" />
                        </Link>

                        <div className="flex items-center gap-2">
                            <CambiarTema compacto />
                            <button
                                type="button"
                                onClick={() => router.post(route('logout'))}
                                className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
                            >
                                <LogOut className="h-4 w-4" />
                                Salir
                            </button>
                        </div>
                    </div>

                    <main className="mt-10 animate-aparecer rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900 sm:p-10">
                        <span className={`grid h-12 w-12 place-items-center rounded-xl ${estado.tono}`}>
                            <Icono className="h-6 w-6" />
                        </span>

                        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                            {estado.titulo}
                        </h1>
                        <p className="mt-3 max-w-[55ch] leading-relaxed text-stone-600 dark:text-stone-400">
                            {estado.texto}
                        </p>

                        {cuenta.rejection_reason && (
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                                <p className="text-sm font-medium text-red-800 dark:text-red-300">Motivo</p>
                                <p className="mt-1 text-sm leading-relaxed text-red-700 dark:text-red-400">
                                    {cuenta.rejection_reason}
                                </p>
                            </div>
                        )}

                        <dl className="mt-8 divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                            <Fila termino="Comercio" valor={cuenta.business_name} />
                            <Fila termino="Responsable" valor={cuenta.name} />
                            <Fila termino="Correo" valor={cuenta.email} />
                            <Fila
                                termino="Dirección solicitada"
                                valor={catalogUrl ? catalogUrl.replace(/^https?:\/\//, '') : `/${cuenta.username}`}
                            />
                            {cuenta.requested_plan && (
                                <Fila
                                    termino="Plan solicitado"
                                    valor={`${cuenta.requested_plan.name} (${Number(cuenta.requested_plan.price_usd).toFixed(0)} USD)`}
                                />
                            )}
                            <Fila termino="Enviada" valor={formatearFecha(cuenta.created_at)} />
                        </dl>

                        {(soporte.email || soporte.whatsapp) && (
                            <div className="mt-8 flex flex-wrap gap-3 border-t border-stone-200 pt-6 dark:border-stone-800">
                                {soporte.email && (
                                    <a
                                        href={`mailto:${soporte.email}`}
                                        className="pulsable inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Escribir por correo
                                    </a>
                                )}
                                {soporte.whatsapp && (
                                    <a
                                        href={`https://wa.me/${soporte.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="pulsable inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Escribir por WhatsApp
                                    </a>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}

function Fila({ termino, valor }) {
    if (!valor) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-sm text-stone-500 dark:text-stone-400">{termino}</dt>
            <dd className="text-sm font-medium">{valor}</dd>
        </div>
    );
}

function formatearFecha(valor) {
    if (!valor) {
        return null;
    }

    return new Date(valor).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
}
