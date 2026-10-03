import { useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Bug, Check, ImagePlus, Lightbulb, MessageSquare, Send, Trash2, X } from 'lucide-react';

const TONOS_ESTADO = {
    nueva: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    resuelta: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300',
    descartada: 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
};

/**
 * Buzón del comercio: proponer una mejora o avisar de un error, y leer la
 * respuesta del administrador en el mismo sitio donde lo escribió.
 */
export default function Index({ mensajes, estados, abiertas }) {
    const { flash } = usePage().props;
    const archivo = useRef(null);
    const [vistaPrevia, setVistaPrevia] = useState(null);

    const form = useForm({
        type: 'sugerencia',
        subject: '',
        body: '',
        page: '',
        image: null,
    });

    const esError = form.data.type === 'error';

    const enviar = (evento) => {
        evento.preventDefault();

        form.post(route('sugerencias.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                form.clearErrors();
                setVistaPrevia(null);

                if (archivo.current) {
                    archivo.current.value = '';
                }
            },
        });
    };

    const elegirImagen = (evento) => {
        const elegido = evento.target.files?.[0] ?? null;

        form.setData('image', elegido);
        setVistaPrevia(elegido ? URL.createObjectURL(elegido) : null);
    };

    const quitarImagen = () => {
        form.setData('image', null);
        setVistaPrevia(null);

        if (archivo.current) {
            archivo.current.value = '';
        }
    };

    return (
        <AuthenticatedLayout header="Sugerencias y errores">
            <Head title="Sugerencias" />

            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                {flash?.success && (
                    <div className="animate-acercar rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                        {flash.success}
                    </div>
                )}

                <form
                    onSubmit={enviar}
                    className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6"
                >
                    <div>
                        <h2 className="font-display text-lg font-semibold">Escríbele al equipo</h2>
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                            Cuéntanos qué te gustaría que hiciera la plataforma, o qué te salió mal mientras la usabas.
                            Leemos todo y te respondemos por aquí.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Opcion
                            activo={!esError}
                            onClick={() => form.setData('type', 'sugerencia')}
                            Icono={Lightbulb}
                            titulo="Tengo una idea"
                            texto="Algo que falta o que te haría la vida más fácil."
                        />
                        <Opcion
                            activo={esError}
                            onClick={() => form.setData('type', 'error')}
                            Icono={Bug}
                            titulo="Algo no funciona"
                            texto="Un error, una pantalla en blanco, un botón que no responde."
                        />
                    </div>

                    <div>
                        <label htmlFor="subject" className="text-sm font-medium">
                            En una línea
                        </label>
                        <input
                            id="subject"
                            value={form.data.subject}
                            onChange={(e) => form.setData('subject', e.target.value)}
                            maxLength={120}
                            placeholder={esError ? 'No puedo guardar una factura' : 'Poder duplicar un producto'}
                            className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                        />
                        {form.errors.subject && <p className="mt-1 text-sm text-red-600">{form.errors.subject}</p>}
                    </div>

                    <div>
                        <label htmlFor="body" className="text-sm font-medium">
                            {esError ? 'Qué hiciste y qué pasó' : 'Cuéntanos con calma'}
                        </label>
                        <textarea
                            id="body"
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            rows={5}
                            maxLength={2000}
                            placeholder={
                                esError
                                    ? 'Entré a Facturas, elegí dos productos, toqué Guardar y se quedó cargando.'
                                    : 'Cuando cargo productos parecidos repito todo desde cero. Me serviría copiar uno y cambiarle el nombre.'
                            }
                            className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                        />
                        <div className="mt-1 flex items-center justify-between">
                            {form.errors.body ? (
                                <p className="text-sm text-red-600">{form.errors.body}</p>
                            ) : (
                                <span />
                            )}
                            <span className="text-xs tabular-nums text-stone-400">{form.data.body.length}/2000</span>
                        </div>
                    </div>

                    {esError && (
                        <div>
                            <label htmlFor="page" className="text-sm font-medium">
                                ¿En qué pantalla pasó? <span className="font-normal text-stone-400">(opcional)</span>
                            </label>
                            <input
                                id="page"
                                value={form.data.page}
                                onChange={(e) => form.setData('page', e.target.value)}
                                maxLength={160}
                                placeholder="Facturas, Personalizar catálogo, Productos…"
                                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                            />
                            {form.errors.page && <p className="mt-1 text-sm text-red-600">{form.errors.page}</p>}
                        </div>
                    )}

                    <div>
                        <p className="text-sm font-medium">
                            Captura de pantalla <span className="font-normal text-stone-400">(opcional)</span>
                        </p>

                        {vistaPrevia ? (
                            <div className="relative mt-2 inline-block">
                                <img
                                    src={vistaPrevia}
                                    alt="Captura adjunta"
                                    className="h-28 rounded-lg border border-stone-200 object-cover dark:border-stone-700"
                                />
                                <button
                                    type="button"
                                    onClick={quitarImagen}
                                    aria-label="Quitar la captura"
                                    className="pulsable absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <label className="pulsable mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800">
                                <ImagePlus className="h-4 w-4" />
                                Adjuntar imagen
                                <input ref={archivo} type="file" accept="image/*" onChange={elegirImagen} className="hidden" />
                            </label>
                        )}

                        {form.errors.image && <p className="mt-1 text-sm text-red-600">{form.errors.image}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="pulsable inline-flex items-center gap-2 rounded-xl bg-marca-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
                        >
                            <Send className="h-4 w-4" />
                            {form.processing ? 'Enviando' : 'Enviar'}
                        </button>

                        <p className="text-xs text-stone-500 dark:text-stone-400">
                            No hace falta que escribas tus datos: ya sabemos de qué comercio viene.
                        </p>
                    </div>
                </form>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display font-semibold">Lo que has enviado</h2>
                        {abiertas > 0 && (
                            <span className="text-sm text-stone-500 dark:text-stone-400">
                                {abiertas} {abiertas === 1 ? 'sin cerrar' : 'sin cerrar'}
                            </span>
                        )}
                    </div>

                    {mensajes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 py-14 text-center dark:border-stone-700">
                            <MessageSquare className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-600" />
                            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                                Todavía no nos has escrito. Lo que envíes aparecerá aquí con su respuesta.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {mensajes.map((mensaje) => (
                                <Mensaje key={mensaje.id} mensaje={mensaje} estados={estados} />
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}

function Mensaje({ mensaje, estados }) {
    const form = useForm({});
    const esError = mensaje.type === 'error';
    const respuestaNueva = mensaje.replied_at && !mensaje.reply_seen_at;

    return (
        <li
            className={`rounded-2xl border bg-white p-5 dark:bg-stone-900 ${
                respuestaNueva
                    ? 'border-marca-300 ring-2 ring-marca-500/20 dark:border-marca-800'
                    : 'border-stone-200 dark:border-stone-800'
            }`}
        >
            <div className="flex flex-wrap items-start gap-3">
                <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                        esError
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                >
                    {esError ? <Bug className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="font-medium">{mensaje.subject}</p>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {esError ? 'Error' : 'Sugerencia'}
                        {mensaje.page ? ` · ${mensaje.page}` : ''}
                        {' · '}
                        {formatearFecha(mensaje.created_at)}
                    </p>
                </div>

                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${TONOS_ESTADO[mensaje.status]}`}>
                    {estados[mensaje.status]}
                </span>

                {mensaje.status === 'nueva' && !mensaje.read_at && (
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('¿Retirar este mensaje?')) {
                                form.delete(route('sugerencias.destroy', mensaje.id), { preserveScroll: true });
                            }
                        }}
                        aria-label="Retirar el mensaje"
                        className="pulsable grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-600 dark:hover:bg-stone-800"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <p className="mt-3 whitespace-pre-line text-sm text-stone-600 dark:text-stone-400">{mensaje.body}</p>

            {mensaje.image_url && (
                <a href={mensaje.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                    <img
                        src={mensaje.image_url}
                        alt="Captura enviada"
                        className="h-24 rounded-lg border border-stone-200 object-cover dark:border-stone-700"
                    />
                </a>
            )}

            {mensaje.reply && (
                <div className="mt-4 rounded-xl bg-marca-50 p-4 dark:bg-marca-950/40">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-marca-700 dark:text-marca-400">
                        <Check className="h-3.5 w-3.5" />
                        Respuesta del equipo
                        {respuestaNueva && (
                            <span className="ml-1 rounded-full bg-marca-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white dark:bg-marca-500 dark:text-stone-950">
                                nueva
                            </span>
                        )}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-marca-900 dark:text-marca-200">{mensaje.reply}</p>
                    <p className="mt-2 text-xs text-marca-700/70 dark:text-marca-400/70">
                        {formatearFecha(mensaje.replied_at)}
                    </p>
                </div>
            )}
        </li>
    );
}

function Opcion({ activo, onClick, Icono, titulo, texto }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={activo}
            className={`pulsable flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150 ease-salida ${
                activo
                    ? 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
                    : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800'
            }`}
        >
            <Icono
                className={`mt-0.5 h-5 w-5 shrink-0 ${activo ? 'text-marca-700 dark:text-marca-400' : 'text-stone-400'}`}
            />
            <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{texto}</span>
            </span>
        </button>
    );
}

function formatearFecha(valor) {
    if (!valor) {
        return '';
    }

    return new Date(valor).toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
