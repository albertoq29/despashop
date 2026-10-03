import { useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Store } from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';

export default function Login({ status, canResetPassword }) {
    const { plataforma } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => reset('password');
    }, []);

    const enviar = (evento) => {
        evento.preventDefault();
        post(route('login'));
    };

    return (
        <>
            <Head title="Iniciar sesión" />

            <div className="flex min-h-screen flex-col bg-stone-50 px-5 py-8 dark:bg-stone-950">
                <div className="mx-auto flex w-full max-w-md items-center justify-between">
                    <Link
                        href={route('home')}
                        className="inline-flex items-center gap-2 text-sm text-stone-600 transition-colors duration-150 ease-salida hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Inicio
                    </Link>

                    <CambiarTema compacto />
                </div>

                <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
                    <div className="animate-aparecer">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950">
                            <Store className="h-5 w-5" />
                        </span>

                        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                            Entra a tu panel
                        </h1>
                        <p className="mt-2 text-stone-600 dark:text-stone-400">
                            Administra tu inventario, tu catálogo y tus facturas.
                        </p>
                    </div>

                    {status && (
                        <div className="mt-6 rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                            {status}
                        </div>
                    )}

                    <form
                        onSubmit={enviar}
                        className="mt-8 space-y-5 rounded-2xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900"
                    >
                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm font-medium text-stone-700 dark:text-stone-300">
                                Correo
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                autoComplete="username"
                                autoFocus
                                required
                                className="w-full rounded-lg border-stone-300 bg-white px-3 py-2.5 text-stone-900 transition-colors duration-150 ease-salida placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-marca-400 dark:focus:ring-marca-400"
                            />
                            {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between gap-3">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-stone-700 dark:text-stone-300"
                                >
                                    Contraseña
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm text-marca-700 hover:underline dark:text-marca-400"
                                    >
                                        ¿La olvidaste?
                                    </Link>
                                )}
                            </div>

                            <input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoComplete="current-password"
                                required
                                className="w-full rounded-lg border-stone-300 bg-white px-3 py-2.5 text-stone-900 transition-colors duration-150 ease-salida focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-marca-400 dark:focus:ring-marca-400"
                            />
                            {errors.password && (
                                <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                            )}
                        </div>

                        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="h-4 w-4 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950"
                            />
                            Mantener la sesión abierta
                        </label>

                        <button
                            type="submit"
                            disabled={processing}
                            className="pulsable w-full rounded-xl bg-marca-700 px-6 py-3 font-semibold text-white hover:bg-marca-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
                        >
                            {processing ? 'Entrando' : 'Iniciar sesión'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">
                        ¿No tienes cuenta?{' '}
                        <Link
                            href={route('register')}
                            className="font-medium text-marca-700 hover:underline dark:text-marca-400"
                        >
                            Solicita la tuya
                        </Link>
                    </p>
                </div>

                <p className="mx-auto mt-8 text-center text-xs text-stone-500">
                    {plataforma?.marca ?? 'Despashop'}
                </p>
            </div>
        </>
    );
}
