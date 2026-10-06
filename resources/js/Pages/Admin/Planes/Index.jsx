import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Check, Plus, Star, Trash2, Users, X } from 'lucide-react';

export default function Index({ planes }) {
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

                {creando && <Formulario onListo={() => setCreando(false)} />}

                <div className="space-y-4">
                    {planes.map((plan) => (
                        <Tarjeta key={plan.id} plan={plan} />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}

function Tarjeta({ plan }) {
    const [editando, setEditando] = useState(false);

    if (editando) {
        return <Formulario plan={plan} onListo={() => setEditando(false)} />;
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

function Formulario({ plan = null, onListo }) {
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

            <Descuento form={form} precio={form.data.price_usd} />

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
 */
function Descuento({ form, precio }) {
    const porcentaje = Number(form.data.discount_percent) || 0;
    const base = Number(precio) || 0;
    const rebajado = porcentaje > 0 ? base * (1 - porcentaje / 100) : base;

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
        </fieldset>
    );
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
