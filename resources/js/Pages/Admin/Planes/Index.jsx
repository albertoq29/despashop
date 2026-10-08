import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { CalendarRange, Check, Gift, Plus, Star, Ticket, Trash2, Users, X } from 'lucide-react';

export default function Index({ planes, diasDePrueba }) {
    const [creando, setCreando] = useState(false);

    return (
        <AdminLayout header="Planes y precios">
            <Head title="Planes" />

            <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-[60ch] text-sm text-stone-600 dark:text-stone-400">
                        Estos son los planes que aparecen en la página de bienvenida. Cambiar un precio aquí lo cambia
                        en la web al instante; no afecta a los comercios ya asignados.
                    </p>

                    <button
                        type="button"
                        onClick={() => setCreando((v) => !v)}
                        className="pulsable inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo plan
                    </button>
                </div>

                {creando && <Formulario diasDePrueba={diasDePrueba} onListo={() => setCreando(false)} />}

                <div className="space-y-4">
                    {planes.map((plan) => (
                        <Tarjeta key={plan.id} plan={plan} diasDePrueba={diasDePrueba} />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}

function Tarjeta({ plan, diasDePrueba }) {
    const [editando, setEditando] = useState(false);

    if (editando) {
        return <Formulario plan={plan} diasDePrueba={diasDePrueba} onListo={() => setEditando(false)} />;
    }

    return (
        <article className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                    <span
                        className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: plan.color }}
                    />

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-lg font-semibold">{plan.name}</h2>

                            {plan.is_featured && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-marca-100 px-2 py-0.5 text-xs font-medium text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                                    <Star className="h-3 w-3" />
                                    Destacado
                                </span>
                            )}

                            {!plan.is_active && (
                                <span className="rounded-md bg-stone-200 px-2 py-0.5 text-xs font-medium dark:bg-stone-700">
                                    Inactivo
                                </span>
                            )}
                            {plan.is_active && !plan.is_public && (
                                <span className="rounded-md bg-stone-200 px-2 py-0.5 text-xs font-medium dark:bg-stone-700">
                                    Oculto en la web
                                </span>
                            )}

                            <Oferta plan={plan} />
                        </div>

                        {plan.tagline && (
                            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{plan.tagline}</p>
                        )}

                        <p className="mt-3 flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                            <span className="inline-flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                {plan.suscriptores} {plan.suscriptores === 1 ? 'comercio' : 'comercios'}
                            </span>
                            <span>
                                {plan.max_products ? `${plan.max_products} productos` : 'Productos ilimitados'}
                            </span>
                            <span>{plan.max_banners ? `${plan.max_banners} banners` : 'Banners ilimitados'}</span>
                            <span>{plan.ai_daily_limit > 0 ? `IA: ${plan.ai_daily_limit} al día` : 'Sin IA'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-right">
                        <span className="font-display text-3xl font-semibold tracking-tight">
                            ${Number(plan.price_usd).toFixed(0)}
                        </span>
                        <span className="block text-xs text-stone-500">{PERIODOS[plan.billing_period]}</span>
                    </p>

                    <button
                        type="button"
                        onClick={() => setEditando(true)}
                        className="pulsable rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                    >
                        Editar
                    </button>
                </div>
            </div>

            {plan.features?.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-200 pt-4 dark:border-stone-800">
                    {plan.features.map((caracteristica) => (
                        <li key={caracteristica} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
                            <Check className="h-3.5 w-3.5 text-marca-600" />
                            {caracteristica}
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}

const PERIODOS = {
    monthly: 'al mes',
    yearly: 'al año',
    lifetime: 'pago único',
    free: 'gratis',
};

function Formulario({ plan = null, diasDePrueba, onListo }) {
    const esNuevo = plan === null;

    const form = useForm({
        name: plan?.name ?? '',
        slug: plan?.slug ?? '',
        tagline: plan?.tagline ?? '',
        description: plan?.description ?? '',
        price_usd: plan?.price_usd ?? 0,
        price_bs: plan?.price_bs ?? '',
        billing_period: plan?.billing_period ?? 'monthly',
        discount_percent: plan?.discount_percent ?? '',
        discount_label: plan?.discount_label ?? '',
        discount_starts_at: soloFecha(plan?.discount_starts_at),
        discount_ends_at: soloFecha(plan?.discount_ends_at),
        trial_days: plan?.trial_days ?? '',
        discount_limit: plan?.discount_limit ?? '',
        reiniciar_cupos: false,
        max_products: plan?.max_products ?? '',
        max_images_per_product: plan?.max_images_per_product ?? '',
        max_banners: plan?.max_banners ?? '',
        max_invoices_per_month: plan?.max_invoices_per_month ?? '',
        ai_daily_limit: plan?.ai_daily_limit ?? 3,
        allows_custom_domain: plan?.allows_custom_domain ?? false,
        allows_invoice_branding: plan?.allows_invoice_branding ?? true,
        allows_catalog_branding: plan?.allows_catalog_branding ?? true,
        features: plan?.features ?? [],
        badge: plan?.badge ?? '',
        color: plan?.color ?? '#047857',
        is_featured: plan?.is_featured ?? false,
        is_active: plan?.is_active ?? true,
        is_public: plan?.is_public ?? true,
        display_order: plan?.display_order ?? 0,
    });

    const [caracteristica, setCaracteristica] = useState('');

    const enviar = (evento) => {
        evento.preventDefault();

        const opciones = { preserveScroll: true, onSuccess: onListo };

        if (esNuevo) {
            form.post(route('admin.planes.store'), opciones);
        } else {
            form.put(route('admin.planes.update', plan.id), opciones);
        }
    };

    const agregarCaracteristica = () => {
        const limpia = caracteristica.trim();

        if (!limpia) {
            return;
        }

        form.setData('features', [...form.data.features, limpia]);
        setCaracteristica('');
    };

    return (
        <form
            onSubmit={enviar}
            className="animate-acercar space-y-5 rounded-2xl border border-stone-300 bg-white p-6 dark:border-stone-700 dark:bg-stone-900"
        >
            <h2 className="font-display text-lg font-semibold">{esNuevo ? 'Nuevo plan' : `Editar ${plan.name}`}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" campo="name" form={form} requerido />
                <Campo etiqueta="Frase corta" campo="tagline" form={form} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Campo etiqueta="Precio en dólares" campo="price_usd" form={form} tipo="number" paso="0.01" requerido />
                <Selector
                    etiqueta="Facturación"
                    campo="billing_period"
                    form={form}
                    opciones={Object.entries(PERIODOS)}
                />
                <Campo etiqueta="Etiqueta destacada" campo="badge" form={form} marcador="Más elegido" />
            </div>

            <Descuento form={form} plan={plan} precio={form.data.price_usd} diasPorDefecto={diasDePrueba} />

            <div>
                <label className="text-sm font-medium">Descripción</label>
                <textarea
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                />
            </div>

            <fieldset>
                <legend className="text-sm font-medium">Límites (vacío es ilimitado)</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-4">
                    <Campo etiqueta="Productos" campo="max_products" form={form} tipo="number" />
                    <Campo etiqueta="Fotos por producto" campo="max_images_per_product" form={form} tipo="number" />
                    <Campo etiqueta="Banners" campo="max_banners" form={form} tipo="number" />
                    <Campo etiqueta="Facturas al mes" campo="max_invoices_per_month" form={form} tipo="number" />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                    <Campo etiqueta="Creaciones con IA al día" campo="ai_daily_limit" form={form} tipo="number" requerido />
                    <p className="self-end pb-2 text-xs text-stone-500 dark:text-stone-400 sm:col-span-3">
                        Este sí es obligatorio: 0 desactiva el asistente para el plan. La clave gratuita de Groq se
                        reparte entre todos los comercios, así que conviene no pasar de 10.
                    </p>
                </div>
            </fieldset>

            <fieldset>
                <legend className="text-sm font-medium">Qué incluye</legend>

                <div className="mt-3 flex flex-wrap gap-2">
                    {form.data.features.map((texto, indice) => (
                        <span
                            key={`${texto}-${indice}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 py-1.5 pl-3 pr-1.5 text-sm dark:bg-stone-800"
                        >
                            {texto}
                            <button
                                type="button"
                                onClick={() =>
                                    form.setData(
                                        'features',
                                        form.data.features.filter((_, i) => i !== indice),
                                    )
                                }
                                aria-label={`Quitar ${texto}`}
                                className="grid h-5 w-5 place-items-center rounded text-stone-500 hover:text-red-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>

                <div className="mt-3 flex gap-2">
                    <input
                        value={caracteristica}
                        onChange={(e) => setCaracteristica(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                agregarCaracteristica();
                            }
                        }}
                        placeholder="Agregar una línea"
                        className="flex-1 rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                    />
                    <button
                        type="button"
                        onClick={agregarCaracteristica}
                        className="pulsable rounded-lg border border-stone-300 px-4 text-sm font-medium dark:border-stone-700"
                    >
                        Agregar
                    </button>
                </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="mt-2 flex gap-2">
                        <input
                            type="color"
                            value={form.data.color}
                            onChange={(e) => form.setData('color', e.target.value)}
                            aria-label="Color del plan"
                            className="h-10 w-12 cursor-pointer rounded-lg border border-stone-300 bg-transparent p-1 dark:border-stone-700"
                        />
                        <input
                            value={form.data.color}
                            onChange={(e) => form.setData('color', e.target.value)}
                            className="w-full rounded-lg border-stone-300 bg-white font-mono text-sm dark:border-stone-700 dark:bg-stone-950"
                        />
                    </div>
                </div>

                <Campo etiqueta="Orden en la web" campo="display_order" form={form} tipo="number" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Casilla etiqueta="Activo" campo="is_active" form={form} />
                <Casilla etiqueta="Visible en la página de bienvenida" campo="is_public" form={form} />
                <Casilla etiqueta="Destacado entre los planes" campo="is_featured" form={form} />
                <Casilla etiqueta="Permite dominio propio" campo="allows_custom_domain" form={form} />
                <Casilla etiqueta="Permite personalizar facturas" campo="allows_invoice_branding" form={form} />
                <Casilla etiqueta="Permite personalizar el catálogo" campo="allows_catalog_branding" form={form} />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-5 dark:border-stone-800">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="pulsable rounded-lg bg-marca-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
                >
                    {form.processing ? 'Guardando' : 'Guardar plan'}
                </button>

                <button
                    type="button"
                    onClick={onListo}
                    className="pulsable rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium dark:border-stone-700"
                >
                    Cancelar
                </button>

                {!esNuevo && (
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm(`¿Eliminar el plan ${plan.name}?`)) {
                                router.delete(route('admin.planes.destroy', plan.id), { preserveScroll: true });
                            }
                        }}
                        className="pulsable ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                    </button>
                )}
            </div>
        </form>
    );
}

/**
 * Descuento con fecha de inicio y de cierre.
 *
 * Se muestra el precio que va a ver el visitante mientras corra, porque el
 * porcentaje solo no dice nada: lo que se decide es a cuánto queda.
 *
 * Al 100% deja de ser un descuento y se vuelve una prueba gratis, que se
 * piensa de otra manera: no importa «a cuánto queda» sino cuántos días
 * dura y hasta cuándo se ofrece. Por eso el panel cambia entero.
 */
function Descuento({ form, plan, precio, diasPorDefecto }) {
    const porcentaje = Number(form.data.discount_percent) || 0;

    if (porcentaje === 100) {
        return <PruebaGratis form={form} plan={plan} precio={precio} diasPorDefecto={diasPorDefecto} />;
    }

    const base = Number(precio) || 0;
    const rebajado = porcentaje > 0 ? base * (1 - porcentaje / 100) : base;

    const ofrecerPrueba = () =>
        form.setData((datos) => ({
            ...datos,
            discount_percent: 100,
            discount_label: datos.discount_label || 'Prueba gratis',
        }));

    return (
        <fieldset className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
            <legend className="px-1.5 text-sm font-medium">Descuento programado</legend>

            <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                El precio del plan no se toca. Mientras corra la promoción, la web muestra el precio rebajado y
                tacha el de siempre; al terminar vuelve solo. Déjalo en blanco para no tener ninguna.
            </p>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Porcentaje" campo="discount_percent" form={form} tipo="number" marcador="20" />
                <Campo etiqueta="Nombre de la promoción" campo="discount_label" form={form} marcador="Aniversario" />
                <Campo etiqueta="Empieza" campo="discount_starts_at" form={form} tipo="date" />
                <Campo etiqueta="Termina" campo="discount_ends_at" form={form} tipo="date" />
            </div>

            {porcentaje > 0 && (
                <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm dark:bg-stone-800">
                    Mientras corra se verá{' '}
                    <strong className="font-semibold">${rebajado.toFixed(2)}</strong>{' '}
                    <span className="text-stone-500 line-through dark:text-stone-400">${base.toFixed(2)}</span>
                    {!form.data.discount_starts_at && !form.data.discount_ends_at && (
                        <span className="block text-xs text-amber-700 dark:text-amber-400">
                            Sin fechas, el descuento empieza en cuanto guardes y no termina nunca.
                        </span>
                    )}
                </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-stone-200 pt-4 dark:border-stone-800">
                <button
                    type="button"
                    onClick={ofrecerPrueba}
                    className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-marca-600 px-3.5 py-2 text-sm font-semibold text-marca-800 hover:bg-marca-50 dark:border-marca-500 dark:text-marca-300 dark:hover:bg-marca-950/40"
                >
                    <Gift className="h-4 w-4" />
                    Ofrecer prueba gratis
                </button>

                <p className="text-xs text-stone-500 dark:text-stone-400">
                    Regala el plan unos días, por tiempo limitado o por cupos.
                </p>
            </div>
        </fieldset>
    );
}

const LIMITES = [
    { id: 'tiempo', texto: 'Por un tiempo', Icono: CalendarRange, ayuda: 'Cierra en una fecha' },
    { id: 'cupos', texto: 'Por cupos', Icono: Ticket, ayuda: 'Cierra al repartirse' },
];

/**
 * La oferta de prueba gratis: cuánto dura y hasta cuándo se ofrece.
 *
 * Las dos formas de cerrarla son excluyentes a propósito. Por tiempo se
 * apaga en una fecha; por cupos se apaga al repartir los que había, que es
 * como se piensa un lanzamiento: «los primeros diez». Mezclar las dos deja
 * una oferta que nadie sabe explicar. Sin ninguna, el plan queda regalado
 * hasta que alguien se acuerde de apagarlo, y eso se avisa.
 */
function PruebaGratis({ form, plan, precio, diasPorDefecto }) {
    const [limite, setLimite] = useState(() => (plan?.discount_limit ? 'cupos' : 'tiempo'));

    const dias = Number(form.data.trial_days) || diasPorDefecto;
    const base = Number(precio) || 0;

    const cupos = Number(form.data.discount_limit) || 0;
    const tomados = plan?.discount_claimed ?? 0;
    const libres = Math.max(0, cupos - tomados);
    const sinCerrar = limite === 'cupos' ? cupos === 0 : !form.data.discount_ends_at;

    // Al cambiar de forma se limpia la otra: lo que no cierra la oferta no
    // debe quedar guardado diciendo que sí.
    const elegirLimite = (nuevo) => {
        setLimite(nuevo);

        form.setData((datos) =>
            nuevo === 'cupos'
                ? { ...datos, discount_starts_at: '', discount_ends_at: '' }
                : { ...datos, discount_limit: '', reiniciar_cupos: false },
        );
    };

    const quitar = () =>
        form.setData((datos) => ({
            ...datos,
            discount_percent: '',
            discount_label: '',
            discount_starts_at: '',
            discount_ends_at: '',
            discount_limit: '',
            trial_days: '',
            reiniciar_cupos: false,
        }));

    return (
        <fieldset className="rounded-xl border border-marca-600 bg-marca-50/40 p-4 dark:border-marca-500/60 dark:bg-marca-950/20">
            <legend className="inline-flex items-center gap-1.5 px-1.5 text-sm font-semibold text-marca-800 dark:text-marca-300">
                <Gift className="h-4 w-4" />
                Prueba gratis
            </legend>

            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Quien pida este plan y le aprueben la cuenta lo usa sin pagar{' '}
                <strong className="font-semibold">{dias} días</strong>. Al terminar vence como cualquier plan
                {base > 0 && <> y pasa a costar ${base.toFixed(2)}</>}.
            </p>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Campo
                    etiqueta="Días gratis"
                    campo="trial_days"
                    form={form}
                    tipo="number"
                    marcador={String(diasPorDefecto ?? 30)}
                />
                <Campo etiqueta="Nombre de la promoción" campo="discount_label" form={form} marcador="Prueba gratis" />
            </div>

            <div className="mt-4">
                <span className="text-sm font-medium">¿Hasta cuándo se ofrece?</span>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {LIMITES.map(({ id, texto, Icono, ayuda }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => elegirLimite(id)}
                            aria-pressed={limite === id}
                            className={`pulsable flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold ${
                                limite === id
                                    ? 'border-marca-600 bg-white text-marca-800 dark:border-marca-500 dark:bg-stone-900 dark:text-marca-300'
                                    : 'border-stone-200 text-stone-600 hover:bg-white/60 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-900/60'
                            }`}
                        >
                            <Icono className="h-4 w-4 shrink-0" />
                            <span>
                                {texto}
                                <span className="block text-xs font-normal opacity-70">{ayuda}</span>
                            </span>
                        </button>
                    ))}
                </div>

                {limite === 'tiempo' ? (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <Campo etiqueta="Empieza" campo="discount_starts_at" form={form} tipo="date" />
                        <Campo etiqueta="Termina" campo="discount_ends_at" form={form} tipo="date" />
                    </div>
                ) : (
                    <div className="mt-3 space-y-2.5">
                        <div className="sm:max-w-[11rem]">
                            <Campo etiqueta="Cupos" campo="discount_limit" form={form} tipo="number" marcador="10" />
                        </div>

                        {plan && cupos > 0 && <Cupos form={form} tomados={tomados} cupos={cupos} libres={libres} />}
                    </div>
                )}
            </div>

            {sinCerrar && (
                <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {limite === 'cupos'
                        ? 'Sin cupos la oferta no se cierra: todo el que pida este plan lo recibe gratis hasta que la quites.'
                        : 'Sin fecha de cierre la oferta queda abierta: todo el que pida este plan lo recibe gratis hasta que la quites.'}
                </p>
            )}

            <button
                type="button"
                onClick={quitar}
                className="pulsable mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
            >
                <X className="h-4 w-4" />
                Quitar la oferta
            </button>
        </fieldset>
    );
}

/**
 * Cómo van los cupos, y cómo volver a empezar.
 *
 * El conteo no se borra al cambiar el tope: si ya se repartieron tres, son
 * tres repartidos. Para repetir la promoción hay que decirlo, porque poner
 * el contador en cero regala cupos de nuevo.
 */
function Cupos({ form, tomados, cupos, libres }) {
    const agotados = libres === 0;

    return (
        <div
            className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                agotados
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-400'
            }`}
        >
            {agotados ? (
                <>Se repartieron los {cupos} cupos. La oferta ya no se muestra en la web.</>
            ) : (
                <>
                    <strong className="font-semibold">{tomados}</strong> de {cupos} repartidos · quedan{' '}
                    <strong className="font-semibold">{libres}</strong>.
                </>
            )}

            {tomados > 0 && (
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 font-medium">
                    <input
                        type="checkbox"
                        checked={Boolean(form.data.reiniciar_cupos)}
                        onChange={(e) => form.setData('reiniciar_cupos', e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600"
                    />
                    Volver el conteo a cero al guardar
                </label>
            )}
        </div>
    );
}

/**
 * La oferta del plan resumida en la ficha, para no abrir el formulario.
 *
 * Una oferta programada que todavía no empezó —o que ya se agotó— también
 * se muestra: es justo cuando conviene saber que está ahí.
 */
function Oferta({ plan }) {
    if (!plan.discount_percent) {
        return null;
    }

    const corre = plan.descuento_activo;
    const titulo = plan.es_prueba_gratis ? 'Prueba gratis' : `${plan.discount_percent}% de descuento`;

    const detalle =
        plan.cupos_libres === 0
            ? 'cupos agotados'
            : plan.cupos_libres !== null
              ? `quedan ${plan.cupos_libres} de ${plan.discount_limit}`
              : plan.discount_ends_at
                ? `hasta el ${enCriollo(plan.discount_ends_at)}`
                : !corre && plan.discount_starts_at
                  ? `desde el ${enCriollo(plan.discount_starts_at)}`
                  : null;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                corre
                    ? 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300'
                    : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
            }`}
        >
            {plan.es_prueba_gratis ? <Gift className="h-3 w-3" /> : <Ticket className="h-3 w-3" />}
            {titulo}
            {detalle && <span className="font-normal opacity-80">· {detalle}</span>}
            {!corre && <span className="font-normal opacity-80">· sin correr</span>}
        </span>
    );
}

/** Una fecha del servidor como se lee aquí: día primero. */
function enCriollo(valor) {
    const [anio, mes, dia] = soloFecha(valor).split('-');

    return dia ? `${dia}/${mes}/${anio}` : '';
}

/** Del timestamp que devuelve el servidor a lo que entiende un input date. */
function soloFecha(valor) {
    return valor ? String(valor).slice(0, 10) : '';
}

function Campo({ etiqueta, campo, form, tipo = 'text', paso, marcador, requerido = false }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <input
                type={tipo}
                step={paso}
                required={requerido}
                placeholder={marcador}
                value={form.data[campo] ?? ''}
                onChange={(e) => form.setData(campo, e.target.value)}
                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
            />
            {form.errors[campo] && <p className="mt-1 text-sm text-red-600">{form.errors[campo]}</p>}
        </div>
    );
}

function Selector({ etiqueta, campo, form, opciones }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <select
                value={form.data[campo]}
                onChange={(e) => form.setData(campo, e.target.value)}
                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
            >
                {opciones.map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                        {texto}
                    </option>
                ))}
            </select>
        </div>
    );
}

function Casilla({ etiqueta, campo, form }) {
    return (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
                type="checkbox"
                checked={Boolean(form.data[campo])}
                onChange={(e) => form.setData(campo, e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600"
            />
            {etiqueta}
        </label>
    );
}
