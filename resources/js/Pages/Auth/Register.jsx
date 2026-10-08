import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Gift, Store } from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';

/** Si el plan se está regalando: la prueba la pone el admin al aprobar. */
function gratis(plan) {
    return Boolean(plan.descuento_activo && plan.es_prueba_gratis);
}

/**
 * Solicitud de cuenta. No crea un comercio activo: queda pendiente de que
 * un administrador la revise.
 */
export default function Register({ plans, selectedPlan, resumenLegal = [] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        business_name: '',
        username: '',
        email: '',
        phone: '',
        whatsapp: '',
        requested_plan_id: selectedPlan ?? '',
        request_message: '',
        password: '',
        password_confirmation: '',
        acepta_terminos: false,
    });

    const [usuarioEditado, setUsuarioEditado] = useState(false);

    useEffect(() => {
        return () => reset('password', 'password_confirmation');
    }, []);

    // Mientras no lo toquen a mano, el usuario se propone desde el nombre del comercio
    useEffect(() => {
        if (!usuarioEditado) {
            setData('username', aSlug(data.business_name));
        }
    }, [data.business_name, usuarioEditado]);

    const enviar = (evento) => {
        evento.preventDefault();
        post(route('register'));
    };

    const origen = typeof window !== 'undefined' ? window.location.host : '';

    return (
        <>
            <Head title="Solicitar cuenta" />

            <div className="min-h-screen bg-stone-50 px-5 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
                <div className="mx-auto max-w-5xl">
                    <div className="flex items-center justify-between">
                        <Link
                            href={route('home')}
                            className="inline-flex items-center gap-2 text-sm text-stone-600 transition-colors duration-150 ease-salida hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al inicio
                        </Link>

                        <CambiarTema compacto />
                    </div>

                    <header className="mt-10 animate-aparecer">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950">
                            <Store className="h-5 w-5" />
                        </span>

                        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                            Solicita tu catálogo
                        </h1>
                        <p className="mt-3 max-w-[58ch] leading-relaxed text-stone-600 dark:text-stone-400">
                            Revisamos cada solicitud a mano. Cuando la aprobemos te avisamos y tu panel queda activo.
                        </p>
                    </header>

                    <form onSubmit={enviar} className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_330px]">
                        <div className="space-y-8 rounded-2xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900">
                            <Seccion titulo="Tu negocio">
                                <Campo etiqueta="Nombre del comercio" error={errors.business_name} id="business_name">
                                    <Entrada
                                        id="business_name"
                                        value={data.business_name}
                                        onChange={(e) => setData('business_name', e.target.value)}
                                        placeholder="Tienda Bella"
                                        required
                                        autoFocus
                                    />
                                </Campo>

                                <Campo
                                    etiqueta="Dirección de tu catálogo"
                                    error={errors.username}
                                    ayuda="Así te encontrarán tus clientes. Solo minúsculas, números y guiones."
                                    id="username"
                                >
                                    <div className="flex items-stretch overflow-hidden rounded-lg border border-stone-300 bg-white focus-within:border-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:focus-within:border-marca-400">
                                        <span className="grid shrink-0 place-items-center border-r border-stone-200 bg-stone-50 px-3 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">
                                            {origen}/
                                        </span>
                                        <input
                                            id="username"
                                            value={data.username}
                                            onChange={(e) => {
                                                setUsuarioEditado(true);
                                                setData('username', aSlug(e.target.value));
                                            }}
                                            className="w-full min-w-0 border-0 bg-transparent px-3 py-2.5 text-stone-900 placeholder:text-stone-400 focus:ring-0 dark:text-stone-100 dark:placeholder:text-stone-600"
                                            placeholder="tiendabella"
                                            required
                                        />
                                    </div>
                                </Campo>
                            </Seccion>

                            <Seccion titulo="Tus datos">
                                <Campo etiqueta="Tu nombre" error={errors.name} id="name">
                                    <Entrada
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                    />
                                </Campo>

                                <Campo etiqueta="Correo" error={errors.email} id="email">
                                    <Entrada
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </Campo>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Campo etiqueta="Teléfono" error={errors.phone} id="phone">
                                        <Entrada
                                            id="phone"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="+58 412 0000000"
                                        />
                                    </Campo>

                                    <Campo etiqueta="WhatsApp" error={errors.whatsapp} id="whatsapp">
                                        <Entrada
                                            id="whatsapp"
                                            value={data.whatsapp}
                                            onChange={(e) => setData('whatsapp', e.target.value)}
                                            placeholder="+58 412 0000000"
                                        />
                                    </Campo>
                                </div>
                            </Seccion>

                            <Seccion titulo="Contraseña">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Campo etiqueta="Contraseña" error={errors.password} id="password">
                                        <Entrada
                                            id="password"
                                            type="password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />
                                    </Campo>

                                    <Campo
                                        etiqueta="Repite la contraseña"
                                        error={errors.password_confirmation}
                                        id="password_confirmation"
                                    >
                                        <Entrada
                                            id="password_confirmation"
                                            type="password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />
                                    </Campo>
                                </div>
                            </Seccion>

                            <Seccion titulo="Cuéntanos de tu negocio">
                                <Campo
                                    etiqueta="Opcional"
                                    error={errors.request_message}
                                    ayuda="Esto nos ayuda a revisar tu solicitud más rápido."
                                    id="request_message"
                                >
                                    <textarea
                                        id="request_message"
                                        value={data.request_message}
                                        onChange={(e) => setData('request_message', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-lg border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400"
                                        placeholder="¿Qué vendes? ¿Cuántos productos tienes?"
                                    />
                                </Campo>
                            </Seccion>
                        </div>

                        <aside className="space-y-4 lg:sticky lg:top-6">
                            <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                                <h2 className="font-display font-semibold">Plan que te interesa</h2>
                                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                    Lo confirmamos contigo al aprobar la cuenta.
                                </p>

                                <div className="mt-5 space-y-2">
                                    {plans.map((plan) => {
                                        const activo = String(data.requested_plan_id) === String(plan.id);

                                        return (
                                            <button
                                                type="button"
                                                key={plan.id}
                                                onClick={() => setData('requested_plan_id', activo ? '' : plan.id)}
                                                aria-pressed={activo}
                                                className={`pulsable flex w-full items-start gap-3 rounded-xl border p-4 text-left ${
                                                    activo
                                                        ? 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
                                                        : 'border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950 dark:hover:border-stone-700'
                                                }`}
                                            >
                                                <span
                                                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-salida ${
                                                        activo
                                                            ? 'border-marca-700 bg-marca-700 dark:border-marca-500 dark:bg-marca-500'
                                                            : 'border-stone-300 dark:border-stone-600'
                                                    }`}
                                                >
                                                    {activo && (
                                                        <Check className="h-3 w-3 text-white dark:text-stone-950" />
                                                    )}
                                                </span>

                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-baseline justify-between gap-2">
                                                        <span className="font-semibold">{plan.name}</span>
                                                        <span className="text-sm text-stone-500">
                                                            {gratis(plan) ? 'Gratis' : `$${Number(plan.price_usd).toFixed(0)}`}
                                                        </span>
                                                    </span>
                                                    {plan.tagline && (
                                                        <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                                                            {plan.tagline}
                                                        </span>
                                                    )}
                                                    {gratis(plan) && (
                                                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-marca-100 px-2 py-0.5 text-[11px] font-bold text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                                                            <Gift className="h-3 w-3" />
                                                            {plan.discount_label || 'Prueba gratis'}
                                                            {plan.cupos_libres !== null &&
                                                                ` · ${plan.cupos_libres} cupos`}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {errors.requested_plan_id && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                        {errors.requested_plan_id}
                                    </p>
                                )}
                            </div>

                            {/* Condiciones de uso: hay que leerlas y aceptarlas para pedir la cuenta */}
                            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/60">
                                <p className="text-sm font-medium">Antes de enviar</p>

                                <ul className="mt-2 space-y-1.5">
                                    {resumenLegal.map((punto) => (
                                        <li key={punto} className="flex gap-2 text-xs text-stone-600 dark:text-stone-400">
                                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                                            {punto}
                                        </li>
                                    ))}
                                </ul>

                                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.acepta_terminos}
                                        onChange={(e) => setData('acepta_terminos', e.target.checked)}
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950"
                                    />
                                    <span className="text-stone-700 dark:text-stone-300">
                                        Leí y acepto los{' '}
                                        <a
                                            href={route('terminos')}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-medium text-marca-700 underline hover:no-underline dark:text-marca-400"
                                        >
                                            términos y condiciones
                                        </a>{' '}
                                        de la plataforma.
                                    </span>
                                </label>

                                {errors.acepta_terminos && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.acepta_terminos}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !data.acepta_terminos}
                                className="pulsable w-full rounded-xl bg-marca-700 px-6 py-3.5 font-semibold text-white hover:bg-marca-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
                            >
                                {processing ? 'Enviando' : 'Enviar solicitud'}
                            </button>

                            <p className="text-center text-sm text-stone-600 dark:text-stone-400">
                                ¿Ya tienes cuenta?{' '}
                                <Link
                                    href={route('login')}
                                    className="font-medium text-marca-700 hover:underline dark:text-marca-400"
                                >
                                    Inicia sesión
                                </Link>
                            </p>
                        </aside>
                    </form>
                </div>
            </div>
        </>
    );
}

function Seccion({ titulo, children }) {
    return (
        <fieldset className="space-y-5">
            <legend className="font-display text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {titulo}
            </legend>
            {children}
        </fieldset>
    );
}

function Campo({ etiqueta, error, ayuda, id, children }) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-300">
                {etiqueta}
            </label>

            {children}

            {ayuda && <p className="text-xs text-stone-500 dark:text-stone-400">{ayuda}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

function Entrada({ className = '', ...props }) {
    return (
        <input
            {...props}
            className={`w-full rounded-lg border-stone-300 bg-white px-3 py-2.5 text-stone-900 placeholder:text-stone-400 transition-colors duration-150 ease-salida focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400 ${className}`}
        />
    );
}

function aSlug(texto) {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
}
