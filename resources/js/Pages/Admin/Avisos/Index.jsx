import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Eye, Image as ImagenIcono, Pencil, Plus, Trash2, X } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';

const TONOS = [
    ['promo', 'Promoción'],
    ['info', 'Informativo'],
    ['aviso', 'Atención'],
];

const POSICIONES = [
    ['centro', 'Ventana en el centro'],
    ['esquina', 'Tarjeta en la esquina'],
];

const FRECUENCIAS = [
    ['una_vez_dia', 'Una vez al día'],
    ['una_vez_sesion', 'Una vez por visita'],
    ['siempre', 'Siempre'],
];

const COLORES = {
    promo: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    aviso: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
};

/**
 * Avisos flotantes de la portada.
 *
 * Solo sale el primero vigente de la lista. Se dice en pantalla porque lo
 * natural es suponer que salen todos y después no entender por qué el
 * segundo no aparece.
 */
export default function Index({ avisos, vigenteId }) {
    const { flash } = usePage().props;
    const [editando, setEditando] = useState(null);

    return (
        <AdminLayout header="Avisos de la portada">
            <Head title="Avisos de la portada" />

            <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
                {flash?.success && (
                    <div className="rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                        {flash.success}
                    </div>
                )}

                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    Lo que ve quien entra a la página principal. Sale uno solo —el primero de la lista que esté
                    vigente— porque varias ventanas al entrar no se leen, se cierran.
                </p>

                {editando === 'nuevo' ? (
                    <Formulario onListo={() => setEditando(null)} />
                ) : (
                    <button
                        type="button"
                        onClick={() => setEditando('nuevo')}
                        className="pulsable inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo aviso
                    </button>
                )}

                {avisos.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-12 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                        Todavía no hay ninguno.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {avisos.map((aviso) =>
                            editando === aviso.id ? (
                                <Formulario key={aviso.id} aviso={aviso} onListo={() => setEditando(null)} />
                            ) : (
                                <Tarjeta
                                    key={aviso.id}
                                    aviso={aviso}
                                    enPortada={aviso.id === vigenteId}
                                    onEditar={() => setEditando(aviso.id)}
                                />
                            ),
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function Tarjeta({ aviso, enPortada, onEditar }) {
    const [borrando, setBorrando] = useState(false);

    return (
        <article className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            {aviso.image_url ? (
                <img src={aviso.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-800">
                    <ImagenIcono className="h-5 w-5" />
                </span>
            )}

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">{aviso.title}</h2>

                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLORES[aviso.tone]}`}>
                        {Object.fromEntries(TONOS)[aviso.tone]}
                    </span>

                    {enPortada ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-marca-100 px-2 py-0.5 text-[11px] font-semibold text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                            <Eye className="h-3 w-3" />
                            En la portada
                        </span>
                    ) : (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                            {aviso.is_active ? 'Fuera de fecha' : 'Desactivado'}
                        </span>
                    )}
                </div>

                {aviso.body && (
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{aviso.body}</p>
                )}

                <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                    {Object.fromEntries(POSICIONES)[aviso.position]} · a los {aviso.delay_seconds}s ·{' '}
                    {Object.fromEntries(FRECUENCIAS)[aviso.frequency]}
                    {aviso.starts_at && ` · desde ${aviso.starts_at.slice(0, 10)}`}
                    {aviso.ends_at && ` · hasta ${aviso.ends_at.slice(0, 10)}`}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onEditar}
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                    </button>

                    {borrando ? (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    router.delete(route('admin.avisos.destroy', aviso.id), { preserveScroll: true })
                                }
                                className="pulsable rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                                Sí, eliminarlo
                            </button>
                            <button
                                type="button"
                                onClick={() => setBorrando(false)}
                                className="pulsable rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300"
                            >
                                No
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setBorrando(true)}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

function Formulario({ aviso = null, onListo }) {
    const esNuevo = aviso === null;

    const form = useForm({
        title: aviso?.title ?? '',
        body: aviso?.body ?? '',
        cta_text: aviso?.cta_text ?? '',
        cta_link: aviso?.cta_link ?? '',
        tone: aviso?.tone ?? 'promo',
        position: aviso?.position ?? 'centro',
        delay_seconds: aviso?.delay_seconds ?? 2,
        frequency: aviso?.frequency ?? 'una_vez_dia',
        is_active: aviso?.is_active ?? true,
        starts_at: aviso?.starts_at?.slice(0, 10) ?? '',
        ends_at: aviso?.ends_at?.slice(0, 10) ?? '',
        image: null,
        quitar_imagen: false,
    });

    const enviar = (evento) => {
        evento.preventDefault();

        // Con archivo adjunto todo viaja como multipart, también al editar
        form.post(esNuevo ? route('admin.avisos.store') : route('admin.avisos.update', aviso.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: onListo,
        });
    };

    return (
        <form
            onSubmit={enviar}
            className="animate-acercar space-y-4 rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-700 dark:bg-stone-900"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{esNuevo ? 'Nuevo aviso' : 'Editar aviso'}</h2>
                <button
                    type="button"
                    onClick={onListo}
                    aria-label="Cerrar"
                    className="pulsable grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <Campo etiqueta="Título" campo="title" form={form} requerido marcador="20% en el plan anual" />

            <div>
                <label className="text-sm font-medium">Texto</label>
                <textarea
                    rows={3}
                    maxLength={400}
                    value={form.data.body}
                    onChange={(e) => form.setData('body', e.target.value)}
                    className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                />
                {form.errors.body && <p className="mt-1 text-sm text-red-600">{form.errors.body}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Texto del botón" campo="cta_text" form={form} marcador="Ver los planes" />
                <Campo etiqueta="A dónde lleva" campo="cta_link" form={form} marcador="#planes" />
            </div>

            <div>
                <label className="text-sm font-medium">Imagen</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => form.setData('image', e.target.files[0] ?? null)}
                    className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-semibold dark:text-stone-300 dark:file:bg-stone-800 dark:file:text-stone-200"
                />
                {form.errors.image && <p className="mt-1 text-sm text-red-600">{form.errors.image}</p>}

                {aviso?.image_url && !form.data.image && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                        <input
                            type="checkbox"
                            checked={form.data.quitar_imagen}
                            onChange={(e) => form.setData('quitar_imagen', e.target.checked)}
                            className="rounded border-stone-300 text-marca-700 dark:border-stone-600 dark:bg-stone-950"
                        />
                        Quitar la imagen actual
                    </label>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Selector etiqueta="Estilo" campo="tone" form={form} opciones={TONOS} />
                <Selector etiqueta="Dónde sale" campo="position" form={form} opciones={POSICIONES} />
                <Campo etiqueta="Aparece a los (seg.)" campo="delay_seconds" form={form} tipo="number" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Selector etiqueta="Cada cuánto" campo="frequency" form={form} opciones={FRECUENCIAS} />
                <Campo etiqueta="Desde" campo="starts_at" form={form} tipo="date" />
                <Campo etiqueta="Hasta" campo="ends_at" form={form} tipo="date" />
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.data.is_active}
                    onChange={(e) => form.setData('is_active', e.target.checked)}
                    className="rounded border-stone-300 text-marca-700 dark:border-stone-600 dark:bg-stone-950"
                />
                Activo
            </label>

            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="pulsable rounded-xl bg-marca-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-50 dark:bg-marca-500 dark:text-stone-950"
                >
                    {form.processing ? 'Guardando' : 'Guardar'}
                </button>
                <button
                    type="button"
                    onClick={onListo}
                    className="pulsable rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}

function Campo({ etiqueta, campo, form, tipo = 'text', marcador, requerido = false }) {
    return (
        <div>
            <label className="text-sm font-medium">
                {etiqueta}
                {requerido && <span className="text-red-500"> *</span>}
            </label>
            <input
                type={tipo}
                value={form.data[campo]}
                onChange={(e) => form.setData(campo, e.target.value)}
                placeholder={marcador}
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
            {form.errors[campo] && <p className="mt-1 text-sm text-red-600">{form.errors[campo]}</p>}
        </div>
    );
}
