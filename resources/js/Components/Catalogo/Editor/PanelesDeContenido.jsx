import { useEffect, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { Eye, GripVertical, Image as ImagenIcono, Plus, Trash2, Upload, X } from 'lucide-react';
import { IconoRed, NOMBRES_REDES } from '@/Components/Catalogo/Vitrina/Comunes';
import { Deslizador, Desplegable, Grupo, Segmentado, SubidaImagen, Texto } from './Controles';

const SALIDA = [0.23, 1, 0.32, 1];

/** Opciones de una petición hecha desde el editor: nunca pierde el borrador. */
const SIN_PERDER_BORRADOR = { preserveScroll: true, preserveState: true };

/* ── Marca ──────────────────────────────────────────────────────────────── */

export function PanelMarca({ editor }) {
    const { theme } = editor;

    return (
        <>
            <Grupo
                titulo="Logo"
                descripcion="Al subirlo, el catálogo toma sus colores dominantes. Después puedes ajustarlos en Estilo."
            >
                <SubidaImagen
                    actual={theme.logo_url}
                    ruta={route('catalogo.logo')}
                    campo="logo"
                    rutaBorrado={route('catalogo.imagen.destroy', 'logo')}
                    ayuda="PNG o JPG hasta 4 MB. Con fondo transparente se ve mejor."
                    onListo={editor.sincronizarColores}
                />
            </Grupo>

            <Grupo
                titulo="Imagen de portada"
                descripcion="Se usa en la portada cuando eliges fondo con imagen o el diseño dividido."
                avanzado
            >
                <SubidaImagen
                    actual={theme.cover_url}
                    ruta={route('catalogo.imagen', 'cover')}
                    campo="imagen"
                    rutaBorrado={route('catalogo.imagen.destroy', 'cover')}
                    ayuda="Horizontal, de 1600 px de ancho o más."
                />
            </Grupo>

            <Grupo
                titulo="Ícono de la pestaña"
                descripcion="El pequeño ícono que aparece en la pestaña del navegador."
                avanzado
            >
                <SubidaImagen
                    compacta
                    actual={theme.favicon_url}
                    ruta={route('catalogo.imagen', 'favicon')}
                    campo="imagen"
                    rutaBorrado={route('catalogo.imagen.destroy', 'favicon')}
                    ayuda="Cuadrado, de 64 x 64 px o más."
                />
            </Grupo>
        </>
    );
}

/* ── Banners ────────────────────────────────────────────────────────────── */

export function PanelBanners({ editor }) {
    const { banners, limites } = editor;
    const [creando, setCreando] = useState(false);
    const [orden, setOrden] = useState(banners);
    const ordenActual = useRef(orden);

    // Si el servidor trae otra lista (se agregó o borró uno), manda el servidor
    useEffect(() => {
        setOrden(banners);
        ordenActual.current = banners;
    }, [banners]);

    const alReordenar = (nuevo) => {
        setOrden(nuevo);
        ordenActual.current = nuevo;
    };

    const guardarOrden = () => {
        router.post(route('catalogo.banners.reorder'), { orden: ordenActual.current.map((b) => b.id) }, SIN_PERDER_BORRADOR);
    };

    const alLimite = limites.max_banners !== null && banners.length >= limites.max_banners;

    return (
        <>
            <Grupo
                titulo={`Banners ${limites.max_banners ? `(${banners.length} de ${limites.max_banners})` : `(${banners.length})`}`}
                descripcion="Arrastra para cambiar el orden en que pasan."
                accion={
                    !alLimite && (
                        <button
                            type="button"
                            onClick={() => setCreando((v) => !v)}
                            className="pulsable boton-elevado inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-marca-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                        >
                            {creando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {creando ? 'Cerrar' : 'Agregar'}
                        </button>
                    )
                }
            >
                {alLimite && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        Tu plan permite hasta {limites.max_banners} banners.
                    </p>
                )}

                <AnimatePresence initial={false}>
                    {creando && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.26, ease: SALIDA }}
                            className="overflow-hidden"
                        >
                            <FormularioBanner onListo={() => setCreando(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {orden.length === 0 && !creando ? (
                    <Vacio texto="Todavía no tienes banners. Suma uno para destacar una promoción." />
                ) : (
                    <Reorder.Group axis="y" values={orden} onReorder={alReordenar} className="space-y-2">
                        {orden.map((banner) => (
                            <FilaBanner key={banner.id} banner={banner} onSoltar={guardarOrden} />
                        ))}
                    </Reorder.Group>
                )}

                <button
                    type="button"
                    onClick={() => editor.editarSeccion('banners')}
                    className="pulsable w-full rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                    Configurar el carrusel
                </button>
            </Grupo>
        </>
    );
}

function FilaBanner({ banner, onSoltar }) {
    const controles = useDragControls();

    return (
        <Reorder.Item
            value={banner}
            dragListener={false}
            dragControls={controles}
            onDragEnd={onSoltar}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
            whileDrag={{ scale: 1.02, boxShadow: '0 16px 32px -12px rgb(0 0 0 / 0.3)', zIndex: 10 }}
            className="relative flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1.5 dark:border-stone-800 dark:bg-stone-900"
        >
            <button
                type="button"
                onPointerDown={(e) => controles.start(e)}
                aria-label="Arrastrar banner"
                className="grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-stone-400 hover:bg-stone-100 active:cursor-grabbing dark:hover:bg-stone-800"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            {banner.image_url ? (
                <img src={banner.image_url} alt="" className="h-11 w-20 shrink-0 rounded-md object-cover" draggable={false} />
            ) : (
                <span className="grid h-11 w-20 shrink-0 place-items-center rounded-md bg-stone-100 dark:bg-stone-800">
                    <ImagenIcono className="h-4 w-4 text-stone-400" />
                </span>
            )}

            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{banner.title || 'Sin título'}</span>
                <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">
                    {banner.is_active ? banner.subtitle || 'Sin subtítulo' : 'Inactivo'}
                </span>
            </span>

            <button
                type="button"
                onClick={() => confirmarBorrado(route('catalogo.banners.destroy', banner.id))}
                aria-label="Eliminar banner"
                className="pulsable grid h-8 w-8 shrink-0 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </Reorder.Item>
    );
}

function FormularioBanner({ onListo }) {
    const form = useForm({
        image: null,
        title: '',
        subtitle: '',
        cta_text: '',
        link: '',
        text_position: 'center',
        overlay: 'gradient',
        is_active: true,
    });

    const enviar = (evento) => {
        evento.preventDefault();
        form.post(route('catalogo.banners.store'), {
            ...SIN_PERDER_BORRADOR,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                onListo();
            },
        });
    };

    const campo = (clave) => ({ valor: form.data[clave], onCambiar: (v) => form.setData(clave, v), error: form.errors[clave] });

    return (
        <form onSubmit={enviar} className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-950/60">
            <SelectorArchivo archivo={form.data.image} onCambiar={(archivo) => form.setData('image', archivo)} error={form.errors.image} requerido />
            <Texto etiqueta="Título" {...campo('title')} maximo={120} />
            <Texto etiqueta="Subtítulo" {...campo('subtitle')} maximo={200} />
            <div className="grid grid-cols-2 gap-3">
                <Texto etiqueta="Texto del botón" {...campo('cta_text')} maximo={40} />
                <Texto etiqueta="Enlace" {...campo('link')} maximo={255} />
            </div>
            <Segmentado
                etiqueta="Posición del texto"
                valor={form.data.text_position}
                onCambiar={(v) => form.setData('text_position', v)}
                opciones={[
                    { valor: 'left', texto: 'Izquierda' },
                    { valor: 'center', texto: 'Centro' },
                    { valor: 'right', texto: 'Derecha' },
                ]}
            />
            <Segmentado
                etiqueta="Velo sobre la imagen"
                valor={form.data.overlay}
                onCambiar={(v) => form.setData('overlay', v)}
                opciones={[
                    { valor: 'none', texto: 'Ninguno' },
                    { valor: 'light', texto: 'Claro' },
                    { valor: 'dark', texto: 'Oscuro' },
                    { valor: 'gradient', texto: 'Degradado' },
                ]}
            />

            <BotonesFormulario procesando={form.processing} texto="Guardar banner" onCancelar={onListo} />
        </form>
    );
}

/* ── Modales ────────────────────────────────────────────────────────────── */

const DISPARADORES = {
    load: 'Al abrir',
    delay: 'Tras unos segundos',
    scroll: 'Al bajar',
    exit: 'Al intentar salir',
};

const FRECUENCIAS = {
    always: 'Siempre',
    once_session: 'Una vez por visita',
    once_day: 'Una vez al día',
};

export function PanelModales({ editor }) {
    const { modals } = editor;
    const [creando, setCreando] = useState(false);

    return (
        <Grupo
            titulo={`Ventanas emergentes (${modals.length})`}
            descripcion="Para anunciar una promoción. Úsalas con medida: una bien puesta rinde más que tres."
            accion={
                <button
                    type="button"
                    onClick={() => setCreando((v) => !v)}
                    className="pulsable boton-elevado inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-marca-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                >
                    {creando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {creando ? 'Cerrar' : 'Agregar'}
                </button>
            }
        >
            <AnimatePresence initial={false}>
                {creando && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: SALIDA }}
                        className="overflow-hidden"
                    >
                        <FormularioModal editor={editor} onListo={() => setCreando(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {modals.length === 0 && !creando ? (
                <Vacio texto="Sin ventanas emergentes por ahora." />
            ) : (
                <ul className="space-y-2">
                    {modals.map((modal) => (
                        <li
                            key={modal.id}
                            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2 pl-3 dark:border-stone-800 dark:bg-stone-900"
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">{modal.title || 'Sin título'}</span>
                                <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">
                                    {DISPARADORES[modal.trigger]}
                                    {modal.trigger === 'delay' ? ` (${modal.delay_seconds} s)` : ''} · {FRECUENCIAS[modal.frequency]}
                                </span>
                            </span>

                            <button
                                type="button"
                                onClick={() => editor.mostrarModal(modal)}
                                className="pulsable inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                Probar
                            </button>
                            <button
                                type="button"
                                onClick={() => confirmarBorrado(route('catalogo.modales.destroy', modal.id))}
                                aria-label="Eliminar"
                                className="pulsable grid h-8 w-8 shrink-0 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Grupo>
    );
}

function FormularioModal({ editor, onListo }) {
    const form = useForm({
        image: null,
        title: '',
        body: '',
        cta_text: '',
        cta_link: '',
        size: 'md',
        animation: 'zoom',
        trigger: 'delay',
        delay_seconds: 3,
        scroll_percent: 50,
        frequency: 'once_session',
        is_active: true,
    });

    const [imagenLocal, setImagenLocal] = useState(null);

    useEffect(() => {
        if (!form.data.image) {
            setImagenLocal(null);

            return undefined;
        }

        const url = URL.createObjectURL(form.data.image);
        setImagenLocal(url);

        return () => URL.revokeObjectURL(url);
    }, [form.data.image]);

    const probar = () => editor.mostrarModal({ ...form.data, id: null, image_url: imagenLocal });

    const enviar = (evento) => {
        evento.preventDefault();
        form.post(route('catalogo.modales.store'), {
            ...SIN_PERDER_BORRADOR,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                onListo();
            },
        });
    };

    const campo = (clave) => ({ valor: form.data[clave], onCambiar: (v) => form.setData(clave, v), error: form.errors[clave] });

    return (
        <form onSubmit={enviar} className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-950/60">
            <Texto etiqueta="Título" {...campo('title')} maximo={120} />
            <Texto etiqueta="Mensaje" {...campo('body')} maximo={1500} filas={3} />
            <SelectorArchivo archivo={form.data.image} onCambiar={(archivo) => form.setData('image', archivo)} error={form.errors.image} />
            <div className="grid grid-cols-2 gap-3">
                <Texto etiqueta="Texto del botón" {...campo('cta_text')} maximo={40} />
                <Texto etiqueta="Enlace" {...campo('cta_link')} placeholder="Solo cierra" maximo={255} />
            </div>
            <Desplegable etiqueta="Cuándo aparece" {...campo('trigger')} opciones={Object.entries(DISPARADORES)} />
            {form.data.trigger === 'delay' && (
                <Deslizador etiqueta="Espera" {...campo('delay_seconds')} min={0} max={60} formato={(v) => `${v} s`} />
            )}
            {form.data.trigger === 'scroll' && (
                <Deslizador etiqueta="Al recorrer" {...campo('scroll_percent')} min={1} max={100} formato={(v) => `${v}%`} />
            )}
            <Desplegable etiqueta="Cada cuánto" {...campo('frequency')} opciones={Object.entries(FRECUENCIAS)} />
            <Segmentado
                etiqueta="Tamaño"
                {...campo('size')}
                opciones={[
                    { valor: 'sm', texto: 'Pequeño' },
                    { valor: 'md', texto: 'Mediano' },
                    { valor: 'lg', texto: 'Grande' },
                ]}
            />
            <Segmentado
                etiqueta="Animación"
                {...campo('animation')}
                opciones={[
                    { valor: 'fade', texto: 'Fundido' },
                    { valor: 'zoom', texto: 'Acercar' },
                    { valor: 'slide-up', texto: 'Subir' },
                    { valor: 'bounce', texto: 'Rebote' },
                ]}
            />

            <button
                type="button"
                onClick={probar}
                className="pulsable flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
                <Eye className="h-3.5 w-3.5" />
                Ver en la vista previa
            </button>

            <BotonesFormulario procesando={form.processing} texto="Guardar ventana" onCancelar={onListo} />
        </form>
    );
}

/* ── Compartir ──────────────────────────────────────────────────────────── */

export function PanelCompartir({ editor }) {
    const { datos, cambiar } = editor;
    const campo = (clave) => ({ valor: datos[clave], onCambiar: (v) => cambiar(clave, v), error: editor.errores[clave] });

    return (
        <>
            <Grupo titulo="WhatsApp" descripcion="El botón flotante, la cabecera y cada producto escriben a este número.">
                <Texto etiqueta="Número" {...campo('whatsapp_number')} placeholder="+58 412 0000000" maximo={40} />
                <Texto etiqueta="Mensaje inicial" {...campo('whatsapp_message')} maximo={500} filas={2} />
            </Grupo>

            <Grupo titulo="Redes sociales" descripcion="Aparecen en el bloque de contacto y en el pie de página.">
                {Object.keys(NOMBRES_REDES).map((red) => (
                    <div key={red} className="flex items-end gap-2.5">
                        <span className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                            <IconoRed red={red} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <Texto
                                etiqueta={NOMBRES_REDES[red]}
                                valor={datos.social_links?.[red] ?? ''}
                                onCambiar={(v) => editor.cambiarRed(red, v)}
                                placeholder={`https://${red === 'x' ? 'x' : red}.com/tunegocio`}
                                maximo={255}
                            />
                        </div>
                    </div>
                ))}
            </Grupo>

            <Grupo
                titulo="Al compartir el enlace"
                descripcion="Lo que se ve en buscadores y al pegar tu enlace en un chat."
                avanzado
            >
                <Texto etiqueta="Título" {...campo('seo_title')} maximo={120} />
                <Texto etiqueta="Descripción" {...campo('seo_description')} maximo={300} filas={2} />

                <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
                    <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">{editor.catalogUrl?.replace(/^https?:\/\//, '')}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-sky-700 dark:text-sky-400">
                        {datos.seo_title || editor.comercio}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-600 dark:text-stone-400">
                        {datos.seo_description || 'Agrega una descripción para que se entienda qué vendes.'}
                    </p>
                </div>
            </Grupo>
        </>
    );
}

/* ── Piezas compartidas ─────────────────────────────────────────────────── */

function SelectorArchivo({ archivo, onCambiar, error, requerido = false }) {
    const entrada = useRef(null);

    return (
        <div>
            <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => onCambiar(e.target.files[0] ?? null)} />
            <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="pulsable flex w-full items-center gap-2.5 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-2.5 text-left hover:border-marca-500 dark:border-stone-700 dark:bg-stone-900"
            >
                <Upload className="h-4 w-4 shrink-0 text-stone-400" />
                <span className="min-w-0 flex-1 truncate text-xs text-stone-600 dark:text-stone-300">
                    {archivo ? archivo.name : requerido ? 'Elegir imagen' : 'Imagen (opcional)'}
                </span>
            </button>
            {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

function BotonesFormulario({ procesando, texto, onCancelar }) {
    return (
        <div className="flex gap-2 pt-1">
            <button
                type="submit"
                disabled={procesando}
                className="pulsable boton-elevado flex-1 rounded-lg bg-marca-700 py-2 text-xs font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
            >
                {procesando ? 'Guardando' : texto}
            </button>
            <button
                type="button"
                onClick={onCancelar}
                className="pulsable rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
                Cancelar
            </button>
        </div>
    );
}

function Vacio({ texto }) {
    return (
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
            {texto}
        </p>
    );
}

function confirmarBorrado(ruta) {
    if (window.confirm('¿Seguro que quieres eliminarlo? No se puede deshacer.')) {
        router.delete(ruta, SIN_PERDER_BORRADOR);
    }
}
