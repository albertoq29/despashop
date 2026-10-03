import { useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Image as ImagenIcono, Upload } from 'lucide-react';
import { Interruptor } from '@/Components/UI';

const COLUMNAS = [
    ['descripcion', 'Descripción'],
    ['cantidad', 'Cantidad'],
    ['precio', 'Precio'],
    ['subtotal', 'Subtotal'],
    ['variante', 'Variante'],
    ['notas', 'Notas'],
];

const FUENTES = ['Inter', 'Outfit', 'Montserrat', 'Lato', 'Merriweather', 'Work Sans', 'DM Sans'];

export default function Plantilla({ plantilla, ejemplo, permiteMarca }) {
    const { flash } = usePage().props;

    const form = useForm({
        show_logo: plantilla.show_logo,
        use_catalog_logo: plantilla.use_catalog_logo,
        logo_size: plantilla.logo_size,
        layout: plantilla.layout,
        color_primary: plantilla.color_primary,
        color_accent: plantilla.color_accent,
        color_text: plantilla.color_text,
        color_bg: plantilla.color_bg,
        font: plantilla.font,
        paper_size: plantilla.paper_size,
        zebra_rows: plantilla.zebra_rows,
        radius: plantilla.radius,
        business_name: plantilla.business_name ?? '',
        tax_id: plantilla.tax_id ?? '',
        address: plantilla.address ?? '',
        phone: plantilla.phone ?? '',
        email: plantilla.email ?? '',
        header_note: plantilla.header_note ?? '',
        footer_note: plantilla.footer_note ?? '',
        terms: plantilla.terms ?? '',
        invoice_prefix: plantilla.invoice_prefix ?? '',
        watermark_enabled: plantilla.watermark_enabled,
        watermark_text: plantilla.watermark_text ?? '',
        watermark_opacity: plantilla.watermark_opacity,
        visible_columns: plantilla.visible_columns ?? ['descripcion', 'cantidad', 'precio', 'subtotal'],
    });

    const guardar = (evento) => {
        evento.preventDefault();
        form.put(route('facturas.plantilla.update'), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header="Estilo de factura">
            <Head title="Estilo de factura" />

            <div className="mx-auto max-w-6xl p-4 sm:p-6">
                {!permiteMarca && (
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                        Tu plan actual no incluye facturas personalizadas. Puedes ajustar el estilo, pero se aplicará
                        cuando cambies de plan.
                    </div>
                )}

                {flash?.success && (
                    <div className="mb-5 rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
                    <form onSubmit={guardar} className="space-y-5">
                        <Panel titulo="Logo">
                            <div className="space-y-4">
                                <Interruptor
                                    etiqueta="Mostrar el logo en la factura"
                                    valor={form.data.show_logo}
                                    onCambiar={(v) => form.setData('show_logo', v)}
                                />
                                <Interruptor
                                    etiqueta="Usar el mismo logo del catálogo"
                                    ayuda="Al desactivarlo puedes subir un logo distinto solo para facturas."
                                    valor={form.data.use_catalog_logo}
                                    onCambiar={(v) => form.setData('use_catalog_logo', v)}
                                />

                                {!form.data.use_catalog_logo && (
                                    <SubidaImagen
                                        actual={plantilla.logo_url}
                                        ruta={route('facturas.plantilla.imagen', 'logo')}
                                        rutaBorrado={route('facturas.plantilla.imagen.destroy', 'logo')}
                                    />
                                )}

                                <Selector
                                    etiqueta="Tamaño del logo"
                                    campo="logo_size"
                                    form={form}
                                    opciones={[
                                        ['sm', 'Pequeño'],
                                        ['md', 'Mediano'],
                                        ['lg', 'Grande'],
                                    ]}
                                />
                            </div>
                        </Panel>

                        <Panel titulo="Diseño">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Selector
                                    etiqueta="Formato"
                                    campo="layout"
                                    form={form}
                                    opciones={[
                                        ['classic', 'Clásico'],
                                        ['modern', 'Moderno'],
                                        ['minimal', 'Minimalista'],
                                        ['compact', 'Compacto'],
                                    ]}
                                />
                                <Selector
                                    etiqueta="Tamaño de papel"
                                    campo="paper_size"
                                    form={form}
                                    opciones={[
                                        ['a4', 'A4'],
                                        ['letter', 'Carta'],
                                        ['ticket80', 'Ticket 80 mm'],
                                    ]}
                                />
                                <Selector etiqueta="Tipografía" campo="font" form={form} opciones={FUENTES.map((f) => [f, f])} />
                                <Selector
                                    etiqueta="Esquinas"
                                    campo="radius"
                                    form={form}
                                    opciones={[
                                        ['none', 'Rectas'],
                                        ['sm', 'Apenas redondeadas'],
                                        ['md', 'Redondeadas'],
                                        ['lg', 'Muy redondeadas'],
                                    ]}
                                />
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Color etiqueta="Color principal" campo="color_primary" form={form} />
                                <Color etiqueta="Color de acento" campo="color_accent" form={form} />
                                <Color etiqueta="Color del texto" campo="color_text" form={form} />
                                <Color etiqueta="Fondo" campo="color_bg" form={form} />
                            </div>

                            <div className="mt-4">
                                <Interruptor
                                    etiqueta="Alternar el fondo de las filas"
                                    valor={form.data.zebra_rows}
                                    onCambiar={(v) => form.setData('zebra_rows', v)}
                                />
                            </div>
                        </Panel>

                        <Panel titulo="Datos del comercio" descripcion="Aparecen en la cabecera de cada factura.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Campo etiqueta="Nombre" campo="business_name" form={form} />
                                <Campo etiqueta="RIF o cédula" campo="tax_id" form={form} />
                                <Campo etiqueta="Teléfono" campo="phone" form={form} />
                                <Campo etiqueta="Correo" campo="email" form={form} tipo="email" />
                                <Campo etiqueta="Prefijo de numeración" campo="invoice_prefix" form={form} marcador="FAC-" />
                            </div>

                            <div className="mt-4">
                                <label className="text-sm font-medium">Dirección</label>
                                <textarea
                                    value={form.data.address}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    rows={2}
                                    className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                                />
                            </div>
                        </Panel>

                        <Panel titulo="Textos">
                            <div className="space-y-4">
                                <Campo etiqueta="Nota en la cabecera" campo="header_note" form={form} />
                                <Campo etiqueta="Nota al pie" campo="footer_note" form={form} />

                                <div>
                                    <label className="text-sm font-medium">Condiciones</label>
                                    <textarea
                                        value={form.data.terms}
                                        onChange={(e) => form.setData('terms', e.target.value)}
                                        rows={3}
                                        className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                                    />
                                </div>
                            </div>
                        </Panel>

                        <Panel titulo="Columnas visibles">
                            <div className="flex flex-wrap gap-2">
                                {COLUMNAS.map(([valor, etiqueta]) => {
                                    const activa = form.data.visible_columns.includes(valor);
                                    const fija = valor === 'descripcion';

                                    return (
                                        <button
                                            key={valor}
                                            type="button"
                                            disabled={fija}
                                            aria-pressed={activa}
                                            onClick={() =>
                                                form.setData(
                                                    'visible_columns',
                                                    activa
                                                        ? form.data.visible_columns.filter((c) => c !== valor)
                                                        : [...form.data.visible_columns, valor],
                                                )
                                            }
                                            className={`pulsable rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed ${
                                                activa
                                                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                                    : 'border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800'
                                            }`}
                                        >
                                            {etiqueta}
                                        </button>
                                    );
                                })}
                            </div>
                        </Panel>

                        <Panel titulo="Marca de agua">
                            <Interruptor
                                etiqueta="Mostrar marca de agua"
                                valor={form.data.watermark_enabled}
                                onCambiar={(v) => form.setData('watermark_enabled', v)}
                            />

                            {form.data.watermark_enabled && (
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <Campo etiqueta="Texto" campo="watermark_text" form={form} marcador="PAGADO" />
                                    <Numero
                                        etiqueta="Intensidad"
                                        campo="watermark_opacity"
                                        form={form}
                                        min={1}
                                        max={40}
                                    />
                                </div>
                            )}
                        </Panel>

                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="pulsable rounded-xl bg-marca-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
                            >
                                {form.processing ? 'Guardando' : 'Guardar estilo'}
                            </button>

                            {form.recentlySuccessful && (
                                <span className="animate-acercar text-sm font-medium text-marca-700 dark:text-marca-400">
                                    Guardado
                                </span>
                            )}
                        </div>
                    </form>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <p className="mb-3 text-sm font-medium text-stone-600 dark:text-stone-400">Vista previa</p>
                        <VistaPrevia datos={form.data} ejemplo={ejemplo} logoUrl={plantilla.logo_url} />
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

/* ── Vista previa de la factura ─────────────────────────────────────────── */

const RADIOS = { none: '0', sm: '4px', md: '8px', lg: '14px' };
const TAMANOS_LOGO = { sm: '28px', md: '40px', lg: '56px' };

function VistaPrevia({ datos, ejemplo, logoUrl }) {
    const ticket = datos.paper_size === 'ticket80';

    return (
        <div
            className="relative overflow-hidden border border-stone-200 shadow-sm dark:border-stone-800"
            style={{
                background: datos.color_bg,
                color: datos.color_text,
                fontFamily: `"${datos.font}", system-ui, sans-serif`,
                borderRadius: RADIOS[datos.radius],
                maxWidth: ticket ? '300px' : '100%',
                margin: ticket ? '0 auto' : undefined,
            }}
        >
            {datos.watermark_enabled && datos.watermark_text && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 grid place-items-center text-5xl font-bold uppercase"
                    style={{
                        color: datos.color_primary,
                        opacity: datos.watermark_opacity / 100,
                        transform: 'rotate(-24deg)',
                    }}
                >
                    {datos.watermark_text}
                </span>
            )}

            <div
                className="relative px-5 py-4"
                style={
                    datos.layout === 'modern'
                        ? { background: datos.color_primary, color: contrasteSobre(datos.color_primary) }
                        : { borderBottom: `2px solid ${datos.color_primary}` }
                }
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {datos.show_logo && logoUrl && (
                            <img
                                src={logoUrl}
                                alt=""
                                className="mb-2 object-contain"
                                style={{ height: TAMANOS_LOGO[datos.logo_size] }}
                            />
                        )}

                        <p className="truncate text-sm font-semibold">
                            {datos.business_name || 'Tu comercio'}
                        </p>
                        {datos.tax_id && <p className="text-xs opacity-75">{datos.tax_id}</p>}
                        {datos.phone && <p className="text-xs opacity-75">{datos.phone}</p>}
                    </div>

                    <div className="shrink-0 text-right">
                        <p className="text-xs uppercase tracking-wide opacity-75">Factura</p>
                        <p className="text-sm font-semibold">
                            {datos.invoice_prefix}
                            {ejemplo.numero}
                        </p>
                        <p className="text-xs opacity-75">
                            {new Date(ejemplo.fecha).toLocaleDateString('es')}
                        </p>
                    </div>
                </div>

                {datos.header_note && <p className="mt-2 text-xs opacity-75">{datos.header_note}</p>}
            </div>

            <div className="relative px-5 py-4">
                <p className="text-xs opacity-60">Cliente</p>
                <p className="text-sm font-medium">{ejemplo.cliente}</p>

                <table className="mt-4 w-full text-xs">
                    <thead>
                        <tr style={{ color: datos.color_primary }}>
                            <th className="pb-2 text-left font-semibold">Descripción</th>
                            {datos.visible_columns.includes('cantidad') && (
                                <th className="pb-2 text-right font-semibold">Cant.</th>
                            )}
                            {datos.visible_columns.includes('precio') && (
                                <th className="pb-2 text-right font-semibold">Precio</th>
                            )}
                            {datos.visible_columns.includes('subtotal') && (
                                <th className="pb-2 text-right font-semibold">Total</th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {ejemplo.items.map((item, indice) => (
                            <tr
                                key={indice}
                                style={
                                    datos.zebra_rows && indice % 2 === 1
                                        ? { background: `${datos.color_primary}0d` }
                                        : undefined
                                }
                            >
                                <td className="py-1.5 pr-2">{item.descripcion}</td>
                                {datos.visible_columns.includes('cantidad') && (
                                    <td className="py-1.5 text-right tabular-nums">{item.cantidad}</td>
                                )}
                                {datos.visible_columns.includes('precio') && (
                                    <td className="py-1.5 text-right tabular-nums">
                                        ${Number(item.precio).toFixed(2)}
                                    </td>
                                )}
                                {datos.visible_columns.includes('subtotal') && (
                                    <td className="py-1.5 text-right tabular-nums">
                                        ${Number(item.subtotal).toFixed(2)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <dl className="mt-4 space-y-1 border-t pt-3 text-xs" style={{ borderColor: `${datos.color_text}22` }}>
                    <Linea termino="Subtotal" valor={`$${Number(ejemplo.subtotal_usd).toFixed(2)}`} />
                    {Number(ejemplo.descuento_usd) > 0 && (
                        <Linea termino="Descuento" valor={`-$${Number(ejemplo.descuento_usd).toFixed(2)}`} />
                    )}
                    <div
                        className="flex justify-between pt-1.5 text-sm font-semibold"
                        style={{ color: datos.color_primary }}
                    >
                        <dt>Total</dt>
                        <dd>${Number(ejemplo.total_usd).toFixed(2)}</dd>
                    </div>
                    <Linea
                        termino="En bolívares"
                        valor={`Bs. ${Number(ejemplo.total_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                    />
                </dl>

                {datos.footer_note && (
                    <p className="mt-4 text-center text-xs opacity-70">{datos.footer_note}</p>
                )}
                {datos.terms && (
                    <p className="mt-2 text-[10px] leading-relaxed opacity-55">{datos.terms}</p>
                )}
            </div>
        </div>
    );
}

function Linea({ termino, valor }) {
    return (
        <div className="flex justify-between">
            <dt className="opacity-70">{termino}</dt>
            <dd className="tabular-nums">{valor}</dd>
        </div>
    );
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

function Panel({ titulo, descripcion, children }) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display font-semibold">{titulo}</h2>
            {descripcion && (
                <p className="mb-4 mt-1 text-sm text-stone-500 dark:text-stone-400">{descripcion}</p>
            )}
            <div className={descripcion ? '' : 'mt-4'}>{children}</div>
        </section>
    );
}

function SubidaImagen({ actual, ruta, rutaBorrado }) {
    const entrada = useRef(null);
    const [subiendo, setSubiendo] = useState(false);

    return (
        <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950">
                {actual ? (
                    <img src={actual} alt="" className="h-full w-full object-contain" />
                ) : (
                    <ImagenIcono className="h-6 w-6 text-stone-400" />
                )}
            </div>

            <div>
                <input
                    ref={entrada}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                        const archivo = e.target.files[0];

                        if (!archivo) {
                            return;
                        }

                        setSubiendo(true);
                        router.post(
                            ruta,
                            { imagen: archivo },
                            { preserveScroll: true, forceFormData: true, onFinish: () => setSubiendo(false) },
                        );
                    }}
                />

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => entrada.current?.click()}
                        disabled={subiendo}
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-stone-800"
                    >
                        <Upload className="h-4 w-4" />
                        {subiendo ? 'Subiendo' : actual ? 'Cambiar' : 'Subir logo'}
                    </button>

                    {actual && (
                        <button
                            type="button"
                            onClick={() => router.delete(rutaBorrado, { preserveScroll: true })}
                            className="pulsable rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:text-red-600"
                        >
                            Quitar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Campo({ etiqueta, campo, form, tipo = 'text', marcador }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <input
                type={tipo}
                placeholder={marcador}
                value={form.data[campo] ?? ''}
                onChange={(e) => form.setData(campo, e.target.value)}
                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
            />
            {form.errors[campo] && <p className="mt-1 text-sm text-red-600">{form.errors[campo]}</p>}
        </div>
    );
}

function Numero({ etiqueta, campo, form, min, max }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <input
                type="number"
                min={min}
                max={max}
                value={form.data[campo] ?? ''}
                onChange={(e) => form.setData(campo, Number(e.target.value))}
                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
            />
        </div>
    );
}

function Selector({ etiqueta, campo, form, opciones }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <select
                value={form.data[campo] ?? ''}
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

function Color({ etiqueta, campo, form }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <div className="mt-2 flex gap-2">
                <input
                    type="color"
                    value={form.data[campo]}
                    onChange={(e) => form.setData(campo, e.target.value)}
                    aria-label={etiqueta}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-transparent p-1 dark:border-stone-700"
                />
                <input
                    value={form.data[campo]}
                    onChange={(e) => form.setData(campo, e.target.value)}
                    className="w-full rounded-lg border-stone-300 bg-white font-mono text-sm dark:border-stone-700 dark:bg-stone-950"
                />
            </div>
            {form.errors[campo] && <p className="mt-1 text-sm text-red-600">{form.errors[campo]}</p>}
        </div>
    );
}


function contrasteSobre(hex) {
    const limpio = String(hex || '').replace('#', '');

    if (limpio.length !== 6) {
        return '#ffffff';
    }

    const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255);
    const luminancia = [r, g, b]
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((total, c, i) => total + c * [0.2126, 0.7152, 0.0722][i], 0);

    return luminancia > 0.45 ? '#1c1917' : '#ffffff';
}
