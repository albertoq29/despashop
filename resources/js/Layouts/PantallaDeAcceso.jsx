import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Store } from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';

/**
 * Envoltura de las pantallas de entrada, recuperación y verificación.
 *
 * Antes solo el login tenía esta cara: las de recuperar contraseña venían
 * de la plantilla original, en inglés y con otra tipografía, y se notaba
 * justo en el momento en que alguien ya está nervioso porque no puede
 * entrar. Teniéndola en un componente, ninguna se puede quedar atrás.
 */
export default function PantallaDeAcceso({
    titulo,
    encabezado,
    descripcion,
    aviso,
    Icono = Store,
    children,
    pie,
}) {
    const { plataforma } = usePage().props;

    return (
        <>
            <Head title={titulo ?? encabezado} />

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
                            <Icono className="h-5 w-5" />
                        </span>

                        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                            {encabezado}
                        </h1>

                        {descripcion && <p className="mt-2 text-stone-600 dark:text-stone-400">{descripcion}</p>}
                    </div>

                    {aviso && (
                        <div className="mt-6 rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                            {aviso}
                        </div>
                    )}

                    {children}

                    {pie && <div className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">{pie}</div>}
                </div>

                <p className="mx-auto mt-8 text-center text-xs text-stone-500">{plataforma?.marca ?? 'Despashop'}</p>
            </div>
        </>
    );
}

/** Tarjeta blanca donde van los campos. */
export function TarjetaDeAcceso({ children, ...props }) {
    return (
        <form
            {...props}
            className="mt-8 space-y-5 rounded-2xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900"
        >
            {children}
        </form>
    );
}

/** Campo con su etiqueta y su error, como los del login. */
export function CampoDeAcceso({ id, etiqueta, error, extra, ...props }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    {etiqueta}
                </label>
                {extra}
            </div>

            <input
                id={id}
                {...props}
                className="w-full rounded-lg border-stone-300 bg-white px-3 py-2.5 text-stone-900 transition-colors duration-150 ease-salida placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400"
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/** Botón principal, ancho completo. */
export function BotonDeAcceso({ procesando, children, ...props }) {
    return (
        <button
            type="submit"
            disabled={procesando}
            {...props}
            className="pulsable w-full rounded-xl bg-marca-700 px-6 py-3 font-semibold text-white hover:bg-marca-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
        >
            {children}
        </button>
    );
}
