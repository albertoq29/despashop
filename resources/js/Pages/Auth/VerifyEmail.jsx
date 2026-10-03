import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, LogOut, MailCheck } from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';
import Marca from '@/Components/Marca';

/**
 * Paso intermedio del registro: confirmar el correo.
 *
 * Es importante que el correo exista de verdad: por ahí se avisa cuando el
 * administrador aprueba la cuenta, cuando el plan está por vencer y por ahí
 * se recupera la contraseña.
 */
export default function VerifyEmail({ status }) {
    const { auth, plataforma } = usePage().props;
    const { post, processing } = useForm({});

    const reenviar = (evento) => {
        evento.preventDefault();
        post(route('verification.send'));
    };

    return (
        <>
            <Head title="Confirma tu correo" />

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

                    <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                            <MailCheck className="h-6 w-6" />
                        </span>

                        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
                            Confirma tu correo
                        </h1>

                        <p className="mt-3 text-stone-600 dark:text-stone-400">
                            Te enviamos un enlace a <strong className="text-stone-900 dark:text-stone-100">{auth?.user?.email}</strong>.
                            Ábrelo para confirmar que es tuyo y seguimos con la revisión de tu cuenta.
                        </p>

                        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                            Por ahí te avisamos cuando aprobemos tu cuenta, cuando tu plan esté por vencer y por ahí
                            recuperas tu contraseña si la olvidas. Si no lo ves, revisa el correo no deseado.
                        </p>

                        {status === 'verification-link-sent' && (
                            <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-marca-50 px-4 py-2.5 text-sm font-medium text-marca-800 dark:bg-marca-950/50 dark:text-marca-300">
                                <Check className="h-4 w-4" />
                                Te enviamos un enlace nuevo.
                            </p>
                        )}

                        <form onSubmit={reenviar} className="mt-7">
                            <button
                                type="submit"
                                disabled={processing}
                                className="pulsable rounded-xl bg-marca-700 px-6 py-3 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
                            >
                                {processing ? 'Enviando' : 'Enviar el enlace de nuevo'}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
                        ¿Te equivocaste de correo? Escríbenos y lo corregimos.
                    </p>
                </div>
            </div>
        </>
    );
}
