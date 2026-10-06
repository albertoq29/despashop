import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    Copy,
    Eye,
    EyeOff,
    GripVertical,
    Lock,
    Plus,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { contrasteSobre } from '../colores';
import { FIGURAS, ICONOS_DE_BENEFICIO, nombreDeSeccion, SUPERFICIES, TIPOS_DE_SECCION } from '../secciones';
import {
    Deslizador,
    Desplegable,
    Etiqueta,
    Grupo,
    Interruptor,
    OpcionesVisuales,
    Segmentado,
    SelectorColor,
    SubidaImagen,
    Texto,
} from './Controles';
import { DibujoCabecera, DibujoCategorias, DibujoFigura, DibujoFormato, DibujoPortada, DibujoTarjeta } from './Dibujos';

/** Los fondos, en el formato de pares que pide el control Desplegable. */
const SUPERFICIES_PARES = SUPERFICIES.map(({ valor, texto }) => [valor, texto]);

const RESORTE = { type: 'spring', duration: 0.35, bounce: 0.12 };
const SALIDA = [0.23, 1, 0.32, 1];

/**
 * Estructura de la página, como las capas de un lienzo.
 *
 * Cada bloque se arrastra desde su asa para cambiar el orden, se oculta con
 * el ojo y se despliega para editar su contenido. Los bloques propios
 * (texto, beneficios, categoría) se pueden duplicar y eliminar.
 */
export default function PanelSecciones({ editor }) {
    const { datos, seleccion, categorias } = editor;
    const [arrastrando, setArrastrando] = useState(false);
    const [agregando, setAgregando] = useState(false);

    return (
        <>
            <Grupo
                titulo="Estructura de la página"
                descripcion="Arrastra un bloque por el asa para moverlo. También puedes hacer clic en cualquier parte de la vista previa para editarla."
            >
                <Reorder.Group
                    axis="y"
                    values={datos.sections}
                    onReorder={editor.reordenarSecciones}
                    className="space-y-1.5"
                >
                    {datos.sections.map((seccion, indice) => (
                        <FilaSeccion
                            key={seccion.id}
                            seccion={seccion}
                            indice={indice}
                            total={datos.sections.length}
                            abierta={!arrastrando && seleccion === seccion.id}
                            editor={editor}
                            categorias={categorias}
                            onArrastre={setArrastrando}
                        />
                    ))}
                </Reorder.Group>

                <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-stone-200 px-3 py-2.5 text-stone-400 dark:border-stone-800 dark:text-stone-500">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="text-xs">Pie de página, siempre al final</span>
                </div>

                <AgregarBloque abierto={agregando} onAlternar={setAgregando} editor={editor} />
            </Grupo>
        </>
    );
}

function FilaSeccion({ seccion, indice, total, abierta, editor, categorias, onArrastre }) {
    const controles = useDragControls();
    const fila = useRef(null);
    const tipo = TIPOS_DE_SECCION[seccion.type];
    const Icono = tipo?.Icono;

    // Al elegir un bloque desde la vista previa, la lista lo trae a la vista
    useEffect(() => {
        if (abierta) {
            const temporizador = setTimeout(
                () => fila.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
                280,
            );

            return () => clearTimeout(temporizador);
        }

        return undefined;
    }, [abierta]);

    return (
        <Reorder.Item
            ref={fila}
            value={seccion}
            dragListener={false}
            dragControls={controles}
            onDragStart={() => onArrastre(true)}
            onDragEnd={() => onArrastre(false)}
            transition={RESORTE}
            whileDrag={{ scale: 1.02, boxShadow: '0 16px 32px -12px rgb(0 0 0 / 0.3)', zIndex: 10 }}
            className={`relative rounded-xl border bg-white dark:bg-stone-900 ${
                abierta
                    ? 'border-marca-600/60 shadow-sm dark:border-marca-400/50'
                    : 'border-stone-200 dark:border-stone-800'
            }`}
        >
            <div className="flex items-center gap-0.5 p-1">
                <button
                    type="button"
                    onPointerDown={(evento) => controles.start(evento)}
                    aria-label={`Arrastrar ${tipo?.nombre ?? 'bloque'}`}
                    className="grid h-8 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.seleccionar(abierta ? null : seccion.id, { enfocar: !abierta })}
                    aria-expanded={abierta}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left ${
                        seccion.visible ? '' : 'opacity-50'
                    }`}
                >
                    <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                            abierta
                                ? 'bg-marca-600 text-white dark:bg-marca-500 dark:text-stone-950'
                                : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                        }`}
                    >
                        {Icono && <Icono className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-stone-800 dark:text-stone-100">
                            {nombreDeSeccion(seccion, categorias)}
                        </span>
                        {tipo?.repetible && nombreDeSeccion(seccion, categorias) !== tipo.nombre && (
                            <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">{tipo.nombre}</span>
                        )}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => editor.alternarSeccion(seccion.id)}
                    aria-label={seccion.visible ? 'Ocultar bloque' : 'Mostrar bloque'}
                    title={seccion.visible ? 'Ocultar' : 'Mostrar'}
                    className="pulsable grid h-8 w-8 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                    {seccion.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                <ChevronDown
                    className={`mr-1.5 h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ease-salida ${abierta ? 'rotate-180' : ''}`}
                />
            </div>

            <AnimatePresence initial={false}>
                {abierta && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: SALIDA }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4 border-t border-stone-200 px-3.5 pb-4 pt-3.5 dark:border-stone-800">
                            <AccionesDeBloque seccion={seccion} indice={indice} total={total} editor={editor} />
                            <EditorDeSeccion seccion={seccion} editor={editor} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
}

function AccionesDeBloque({ seccion, indice, total, editor }) {
    const repetible = TIPOS_DE_SECCION[seccion.type]?.repetible;
    const boton =
        'pulsable inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-stone-600 hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-40 dark:text-stone-400 dark:hover:bg-stone-800';

    return (
        <div className="-mx-1 flex flex-wrap items-center gap-0.5">
            <button type="button" className={boton} disabled={indice === 0} onClick={() => editor.moverSeccion(seccion.id, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
                Subir
            </button>
            <button type="button" className={boton} disabled={indice === total - 1} onClick={() => editor.moverSeccion(seccion.id, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
                Bajar
            </button>

            {repetible && (
                <>
                    <span className="flex-1" />
                    <button type="button" className={boton} onClick={() => editor.duplicarSeccion(seccion.id)}>
                        <Copy className="h-3.5 w-3.5" />
                        Duplicar
                    </button>
                    <button
                        type="button"
                        className={`${boton} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400`}
                        onClick={() => editor.eliminarSeccion(seccion.id)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                    </button>
                </>
            )}
        </div>
    );
}

function AgregarBloque({ abierto, onAlternar, editor }) {
    const repetibles = Object.entries(TIPOS_DE_SECCION).filter(([, tipo]) => tipo.repetible);

    return (
        <div>
            <button
                type="button"
                onClick={() => onAlternar(!abierto)}
                aria-expanded={abierto}
                className="pulsable flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 hover:border-marca-500 hover:text-marca-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-marca-400 dark:hover:text-marca-300"
            >
                {abierto ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {abierto ? 'Cerrar' : 'Agregar bloque'}
            </button>

            <AnimatePresence initial={false}>
                {abierto && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: SALIDA }}
                        className="overflow-hidden"
                    >
                        <div className="grid gap-1.5 pt-2">
                            {repetibles.map(([clave, tipo], indice) => (
                                <motion.button
                                    key={clave}
                                    type="button"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: indice * 0.04, duration: 0.22, ease: SALIDA }}
                                    onClick={() => {
                                        editor.agregarSeccion(clave);
                                        onAlternar(false);
                                    }}
                                    className="pulsable flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-marca-500 hover:bg-marca-50/50 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-marca-400 dark:hover:bg-marca-950/30"
                                >
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                                        <tipo.Icono className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[13px] font-semibold text-stone-900 dark:text-stone-100">{tipo.nombre}</span>
                                        <span className="mt-0.5 block text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                                            {tipo.descripcion}
                                        </span>
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Contenido de cada bloque ───────────────────────────────────────────── */

function EditorDeSeccion({ seccion, editor }) {
    const { datos, cambiar } = editor;
    const campo = (clave) => ({ valor: datos[clave], onCambiar: (valor) => cambiar(clave, valor) });
    const propio = (clave) => ({
        valor: seccion[clave],
        onCambiar: (valor) => editor.actualizarSeccion(seccion.id, { [clave]: valor }),
    });

    const c = coloresDeMuestra(datos);

    switch (seccion.type) {
        case 'header':
            return (
                <>
                    <OpcionesVisuales
                        etiqueta="Estilo"
                        {...campo('header_style')}
                        opciones={[
                            { valor: 'glass', texto: 'Translúcida', dibujo: <DibujoCabecera estilo="glass" c={c} /> },
                            { valor: 'solid', texto: 'Sólida', dibujo: <DibujoCabecera estilo="solid" c={c} /> },
                            { valor: 'brand', texto: 'Color de marca', dibujo: <DibujoCabecera estilo="brand" c={c} /> },
                            { valor: 'minimal', texto: 'Sin fondo', dibujo: <DibujoCabecera estilo="minimal" c={c} /> },
                        ]}
                    />
                    <Segmentado
                        etiqueta="Posición del logo"
                        {...campo('header_align')}
                        opciones={[
                            { valor: 'left', texto: 'Izquierda' },
                            { valor: 'center', texto: 'Centro' },
                        ]}
                    />
                    <Segmentado
                        etiqueta="Tamaño del logo"
                        {...campo('logo_size')}
                        opciones={[
                            { valor: 'sm', texto: 'Pequeño' },
                            { valor: 'md', texto: 'Mediano' },
                            { valor: 'lg', texto: 'Grande' },
                        ]}
                    />
                    <Interruptor
                        etiqueta="Fija al desplazar"
                        ayuda="Se queda arriba mientras recorren el catálogo."
                        valor={datos.header_sticky}
                        onCambiar={(v) => cambiar('header_sticky', v)}
                    />
                    <Interruptor
                        etiqueta="Accesos a las secciones"
                        ayuda="Enlaces a Novedades, Productos o Contacto, en computadora."
                        valor={datos.header_nav}
                        onCambiar={(v) => cambiar('header_nav', v)}
                    />
                </>
            );

        case 'marquee':
            return (
                <>
                    <Texto etiqueta="Texto" {...campo('marquee_text')} placeholder="Envío gratis desde $30" maximo={500} />
                    <Deslizador
                        etiqueta="Velocidad"
                        valor={125 - datos.marquee_speed}
                        onCambiar={(v) => cambiar('marquee_speed', 125 - v)}
                        min={5}
                        max={120}
                        formato={() => `${datos.marquee_speed} s por vuelta`}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <SelectorColor etiqueta="Fondo" {...campo('marquee_bg')} opcional />
                        <SelectorColor etiqueta="Texto" {...campo('marquee_color')} opcional />
                    </div>
                </>
            );

        case 'announcement':
            return (
                <Texto
                    etiqueta="Texto del aviso"
                    {...campo('announcement')}
                    placeholder="Abierto de lunes a sábado"
                    maximo={500}
                    filas={2}
                    ayuda="Una línea fija, sin movimiento, con el color de acento."
                />
            );

        case 'banners':
            return (
                <>
                    <Interruptor etiqueta="Pasar solos" valor={datos.banners_autoplay} onCambiar={(v) => cambiar('banners_autoplay', v)} />
                    <Deslizador
                        etiqueta="Tiempo por banner"
                        valor={datos.banners_interval}
                        onCambiar={(v) => cambiar('banners_interval', v)}
                        min={1000}
                        max={15000}
                        paso={500}
                        formato={(v) => `${(v / 1000).toLocaleString('es-VE')} s`}
                    />
                    <Segmentado
                        etiqueta="Efecto al cambiar"
                        {...campo('banners_effect')}
                        opciones={[
                            { valor: 'slide', texto: 'Deslizar' },
                            { valor: 'fade', texto: 'Fundido' },
                            { valor: 'zoom', texto: 'Acercar' },
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Interruptor etiqueta="Flechas" valor={datos.banners_arrows} onCambiar={(v) => cambiar('banners_arrows', v)} />
                        <Interruptor etiqueta="Puntos" valor={datos.banners_dots} onCambiar={(v) => cambiar('banners_dots', v)} />
                    </div>
                    <BotonIrA onClick={() => editor.irAPestana('banners')}>
                        Administrar banners ({editor.banners.length})
                    </BotonIrA>
                </>
            );

        case 'hero':
            return (
                <>
                    <OpcionesVisuales
                        etiqueta="Diseño"
                        {...campo('hero_layout')}
                        opciones={[
                            { valor: 'centered', texto: 'Centrada', dibujo: <DibujoPortada disposicion="centered" c={c} /> },
                            { valor: 'left', texto: 'A la izquierda', dibujo: <DibujoPortada disposicion="left" c={c} /> },
                            { valor: 'split', texto: 'Dividida', dibujo: <DibujoPortada disposicion="split" c={c} /> },
                            { valor: 'minimal', texto: 'Solo texto', dibujo: <DibujoPortada disposicion="minimal" c={c} /> },
                        ]}
                    />
                    {['centered', 'left'].includes(datos.hero_layout) && (
                        <Segmentado
                            etiqueta="Fondo"
                            {...campo('hero_style')}
                            opciones={[
                                { valor: 'image', texto: 'Imagen' },
                                { valor: 'gradient', texto: 'Degradado' },
                                { valor: 'solid', texto: 'Color' },
                            ]}
                        />
                    )}
                    <Segmentado
                        etiqueta="Altura"
                        {...campo('hero_height')}
                        opciones={[
                            { valor: 'sm', texto: 'Baja' },
                            { valor: 'md', texto: 'Media' },
                            { valor: 'lg', texto: 'Alta' },
                        ]}
                    />
                    {datos.hero_layout !== 'minimal' && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-stone-600 dark:text-stone-400">Imagen de portada</p>
                            <SubidaImagen
                                compacta
                                actual={editor.theme.cover_url}
                                ruta={route('catalogo.imagen', 'cover')}
                                campo="imagen"
                                rutaBorrado={route('catalogo.imagen.destroy', 'cover')}
                                ayuda="Horizontal, de 1600 px de ancho o más."
                            />
                        </div>
                    )}
                    <Texto etiqueta="Título" {...campo('hero_title')} placeholder={editor.comercio} maximo={120} />
                    <Texto etiqueta="Subtítulo" {...campo('hero_subtitle')} maximo={200} filas={2} />
                    <div className="grid grid-cols-2 gap-3">
                        <Texto etiqueta="Texto del botón" {...campo('hero_cta_text')} placeholder="Ver productos" maximo={40} />
                        <Texto etiqueta="Enlace" {...campo('hero_cta_link')} placeholder="Productos" maximo={255} />
                    </div>
                    <p className="-mt-2 text-[11px] text-stone-500 dark:text-stone-400">Sin enlace, el botón baja hasta los productos.</p>
                </>
            );

        case 'featured':
        case 'combos':
            return (
                <>
                    <Texto etiqueta="Título" {...propio('title')} maximo={120} />
                    <Texto etiqueta="Subtítulo" {...propio('subtitle')} maximo={200} />
                    <Segmentado
                        etiqueta="Presentación"
                        {...propio('style')}
                        opciones={[
                            { valor: 'carousel', texto: 'Fila deslizable' },
                            { valor: 'grid', texto: 'Cuadrícula' },
                        ]}
                    />
                    {seccion.type === 'featured' && (
                        <Deslizador etiqueta="Cuántos productos" {...propio('limit')} min={2} max={24} />
                    )}
                </>
            );

        case 'category':
            return (
                <>
                    {editor.categorias.length === 0 ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            Todavía no tienes categorías. Créalas en Inventario y vuelve aquí.
                        </p>
                    ) : (
                        <Desplegable
                            etiqueta="Categoría"
                            valor={seccion.category_id ?? ''}
                            onCambiar={(v) => editor.actualizarSeccion(seccion.id, { category_id: v ? Number(v) : null })}
                            opciones={[['', 'Elige una categoría'], ...editor.categorias.map((cat) => [cat.id, cat.name])]}
                        />
                    )}
                    <Texto
                        etiqueta="Título"
                        {...propio('title')}
                        placeholder={editor.categorias.find((cat) => String(cat.id) === String(seccion.category_id))?.name}
                        maximo={120}
                    />
                    <Segmentado
                        etiqueta="Presentación"
                        {...propio('style')}
                        opciones={[
                            { valor: 'carousel', texto: 'Fila deslizable' },
                            { valor: 'grid', texto: 'Cuadrícula' },
                        ]}
                    />
                    <Deslizador etiqueta="Cuántos productos" {...propio('limit')} min={2} max={24} />
                </>
            );

        case 'products':
            return <EditorDeProductos seccion={seccion} editor={editor} c={c} campo={campo} propio={propio} />;

        case 'contact':
            return (
                <>
                    <Desplegable etiqueta="Fondo del bloque" {...propio('style')} opciones={SUPERFICIES_PARES} />
                    <Texto etiqueta="Título" {...propio('title')} maximo={120} />
                    <Texto etiqueta="Texto" {...propio('text')} maximo={1500} filas={2} />
                    <Texto etiqueta="Texto del botón" {...propio('button_text')} placeholder="Escribir por WhatsApp" maximo={40} />
                    <BotonIrA onClick={() => editor.irAPestana('compartir')}>Configurar WhatsApp y redes</BotonIrA>
                </>
            );

        case 'text':
            return (
                <>
                    <Desplegable etiqueta="Fondo del bloque" {...propio('style')} opciones={SUPERFICIES_PARES} />
                    <Segmentado
                        etiqueta="Alineación"
                        {...propio('align')}
                        opciones={[
                            { valor: 'left', texto: 'Izquierda' },
                            { valor: 'center', texto: 'Centro' },
                        ]}
                    />
                    <Texto etiqueta="Título" {...propio('title')} maximo={120} />
                    <Texto etiqueta="Texto" {...propio('text')} maximo={1500} filas={4} />
                    <div className="grid grid-cols-2 gap-3">
                        <Texto etiqueta="Texto del botón" {...propio('button_text')} placeholder="Opcional" maximo={40} />
                        <Texto etiqueta="Enlace" {...propio('button_link')} placeholder="https://" maximo={255} />
                    </div>
                </>
            );

        case 'benefits':
            return <EditorDeBeneficios seccion={seccion} editor={editor} propio={propio} />;

        case 'faq':
            return <EditorDeFaq seccion={seccion} editor={editor} propio={propio} />;

        case 'testimonials':
            return <EditorDeTestimonios seccion={seccion} editor={editor} propio={propio} />;

        case 'stats':
            return <EditorDeCifras seccion={seccion} editor={editor} propio={propio} />;

        case 'divider':
            return (
                <OpcionesVisuales
                    etiqueta="Figura"
                    columnas={3}
                    {...propio('shape')}
                    opciones={FIGURAS.map(({ valor, texto }) => ({
                        valor,
                        texto,
                        dibujo: <DibujoFigura figura={valor} c={c} />,
                    }))}
                    ayuda="Separa dos bloques sin escribir nada. Toma el color principal de tu catálogo."
                />
            );

        default:
            return null;
    }
}

function EditorDeProductos({ editor, c, campo, propio }) {
    const { datos, cambiar } = editor;

    return (
        <>
            <Texto etiqueta="Título" {...propio('title')} maximo={120} />
            <Texto etiqueta="Subtítulo" {...propio('subtitle')} maximo={200} />

            <OpcionesVisuales
                etiqueta="Formato"
                columnas={3}
                {...campo('layout')}
                opciones={[
                    { valor: 'grid', texto: 'Cuadrícula', dibujo: <DibujoFormato formato="grid" c={c} /> },
                    { valor: 'list', texto: 'Lista', dibujo: <DibujoFormato formato="list" c={c} /> },
                    { valor: 'masonry', texto: 'Mosaico', dibujo: <DibujoFormato formato="masonry" c={c} /> },
                ]}
            />

            <OpcionesVisuales
                etiqueta="Tarjeta"
                {...campo('card_style')}
                opciones={[
                    { valor: 'elevated', texto: 'Con sombra', dibujo: <DibujoTarjeta estilo="elevated" c={c} /> },
                    { valor: 'flat', texto: 'Plana', dibujo: <DibujoTarjeta estilo="flat" c={c} /> },
                    { valor: 'bordered', texto: 'Con borde', dibujo: <DibujoTarjeta estilo="bordered" c={c} /> },
                    { valor: 'overlay', texto: 'Texto sobre foto', dibujo: <DibujoTarjeta estilo="overlay" c={c} /> },
                ]}
            />

            {datos.layout === 'grid' && (
                <>
                    <Deslizador etiqueta="Columnas en computadora" {...campo('columns_desktop')} min={2} max={6} />
                    <Deslizador etiqueta="Columnas en teléfono" {...campo('columns_mobile')} min={1} max={3} />
                </>
            )}

            <OpcionesVisuales
                etiqueta="Categorías"
                columnas={3}
                {...campo('category_style')}
                opciones={[
                    { valor: 'pills', texto: 'Píldoras', dibujo: <DibujoCategorias estilo="pills" c={c} /> },
                    { valor: 'underline', texto: 'Pestañas', dibujo: <DibujoCategorias estilo="underline" c={c} /> },
                    { valor: 'boxes', texto: 'Bloques', dibujo: <DibujoCategorias estilo="boxes" c={c} /> },
                ]}
            />

            <Desplegable
                etiqueta="Orden de los productos"
                {...campo('product_sort')}
                opciones={[
                    ['manual', 'Como los ordené en Inventario'],
                    ['newest', 'Más recientes primero'],
                    ['price_asc', 'Precio: menor a mayor'],
                    ['price_desc', 'Precio: mayor a menor'],
                    ['name', 'Nombre (A-Z)'],
                ]}
                ayuda="Es el orden con el que abre el catálogo."
            />

            <div className="space-y-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-950/60">
                <Interruptor etiqueta="Buscador" valor={datos.show_search} onCambiar={(v) => cambiar('show_search', v)} />
                <Interruptor etiqueta="Filtro por categorías" valor={datos.show_categories} onCambiar={(v) => cambiar('show_categories', v)} />
                <Interruptor
                    etiqueta="El visitante puede reordenar"
                    ayuda="Por precio, nombre o novedad."
                    valor={datos.show_sort}
                    onCambiar={(v) => cambiar('show_sort', v)}
                />
                <Segmentado
                    etiqueta="Al tocar un producto"
                    valor={datos.product_view ?? 'modal'}
                    onCambiar={(v) => cambiar('product_view', v)}
                    opciones={[
                        { valor: 'modal', texto: 'Se abre una ventana' },
                        { valor: 'ninguna', texto: 'No pasa nada' },
                    ]}
                    ayuda={
                        {
                            modal: 'Fotos, descripción y variantes encima del catálogo, sin salir de la página.',
                            ninguna: 'Las tarjetas no se abren: se ve lo que cabe en la rejilla.',
                        }[datos.product_view ?? 'modal']
                    }
                />

                <Interruptor
                    etiqueta="Elegir varios a la vez"
                    ayuda="Agrega un botón para marcar productos y mandártelos todos juntos por WhatsApp."
                    valor={datos.multi_select ?? true}
                    onCambiar={(v) => cambiar('multi_select', v)}
                />
                <Interruptor etiqueta="Precios en dólares" valor={datos.show_prices} onCambiar={(v) => cambiar('show_prices', v)} />
                <Interruptor etiqueta="Precios en bolívares" valor={datos.show_bs_prices} onCambiar={(v) => cambiar('show_bs_prices', v)} />

                <Segmentado
                    etiqueta="Precios al mayor y de distribuidor"
                    {...campo('wholesale_prices')}
                    opciones={[
                        { valor: 'off', texto: 'Ocultos' },
                        { valor: 'modal', texto: 'Al abrir' },
                        { valor: 'card', texto: 'Siempre' },
                    ]}
                    ayuda={
                        {
                            off: 'Solo se ve el precio al detal. Es lo normal si vendes al público.',
                            modal: 'Aparecen cuando el visitante abre el producto, no en la rejilla.',
                            card: 'Aparecen también en cada tarjeta. Útil si vendes a revendedores.',
                        }[datos.wholesale_prices ?? 'off']
                    }
                />
                <Interruptor etiqueta="Aviso de últimas unidades" valor={datos.show_stock} onCambiar={(v) => cambiar('show_stock', v)} />
                <Interruptor
                    etiqueta="Distintivos en las fotos"
                    ayuda="Combo, Agotado o Por llegar."
                    valor={datos.show_product_badges}
                    onCambiar={(v) => cambiar('show_product_badges', v)}
                />
            </div>
        </>
    );
}

function EditorDeBeneficios({ seccion, editor, propio }) {
    const items = seccion.items ?? [];

    const cambiarItem = (indice, cambios) =>
        editor.actualizarSeccion(seccion.id, {
            items: items.map((item, i) => (i === indice ? { ...item, ...cambios } : item)),
        });

    return (
        <>
            <Texto etiqueta="Título (opcional)" {...propio('title')} placeholder="Por qué comprarnos" maximo={120} />
            <Desplegable etiqueta="Fondo del bloque" {...propio('style')} opciones={SUPERFICIES_PARES} />

            <div className="space-y-2">
                {items.map((item, indice) => (
                    <div key={indice} className="space-y-2.5 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Beneficio {indice + 1}</span>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => editor.actualizarSeccion(seccion.id, { items: items.filter((_, i) => i !== indice) })}
                                    aria-label="Quitar beneficio"
                                    className="pulsable grid h-7 w-7 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="cat-sin-barra -mx-1 flex gap-1 overflow-x-auto px-1">
                            {Object.entries(ICONOS_DE_BENEFICIO).map(([clave, { Icono, nombre }]) => (
                                <button
                                    key={clave}
                                    type="button"
                                    onClick={() => cambiarItem(indice, { icon: clave })}
                                    aria-label={nombre}
                                    aria-pressed={item.icon === clave}
                                    title={nombre}
                                    className={`pulsable grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                                        item.icon === clave
                                            ? 'bg-marca-600 text-white dark:bg-marca-500 dark:text-stone-950'
                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                                    }`}
                                >
                                    <Icono className="h-4 w-4" />
                                </button>
                            ))}
                        </div>

                        <Texto valor={item.title} onCambiar={(v) => cambiarItem(indice, { title: v })} placeholder="Título" maximo={60} />
                        <Texto valor={item.text} onCambiar={(v) => cambiarItem(indice, { text: v })} placeholder="Descripción corta" maximo={160} />
                    </div>
                ))}
            </div>

            {items.length < 4 && (
                <button
                    type="button"
                    onClick={() =>
                        editor.actualizarSeccion(seccion.id, {
                            items: [...items, { icon: 'star', title: 'Nuevo beneficio', text: '' }],
                        })
                    }
                    className="pulsable flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2 text-xs font-medium text-stone-600 hover:border-marca-500 hover:text-marca-700 dark:border-stone-700 dark:text-stone-400"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar beneficio
                </button>
            )}
        </>
    );
}

/**
 * Lista de renglones de un bloque (preguntas, testimonios, cifras).
 *
 * Los tres bloques hacen lo mismo con sus renglones: agregar, quitar y
 * editar campos. Lo que cambia es qué campos tiene cada uno, así que eso
 * llega como funcion y el resto se comparte.
 */
function ListaDeRenglones({ seccion, editor, items, maximo, etiqueta, nuevo, children }) {
    const cambiarItem = (indice, cambios) =>
        editor.actualizarSeccion(seccion.id, {
            items: items.map((item, i) => (i === indice ? { ...item, ...cambios } : item)),
        });

    return (
        <>
            <div className="space-y-2">
                {items.map((item, indice) => (
                    <div key={indice} className="space-y-2.5 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                                {etiqueta} {indice + 1}
                            </span>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => editor.actualizarSeccion(seccion.id, { items: items.filter((_, i) => i !== indice) })}
                                    aria-label={`Quitar ${etiqueta.toLowerCase()}`}
                                    className="pulsable grid h-7 w-7 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {children(item, (cambios) => cambiarItem(indice, cambios))}
                    </div>
                ))}
            </div>

            {items.length < maximo && (
                <button
                    type="button"
                    onClick={() => editor.actualizarSeccion(seccion.id, { items: [...items, nuevo()] })}
                    className="pulsable flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2 text-xs font-medium text-stone-600 hover:border-marca-500 hover:text-marca-700 dark:border-stone-700 dark:text-stone-400"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar {etiqueta.toLowerCase()}
                </button>
            )}
        </>
    );
}

function EditorDeFaq({ seccion, editor, propio }) {
    const items = seccion.items ?? [];

    return (
        <>
            <Texto etiqueta="Título" {...propio('title')} placeholder="Preguntas frecuentes" maximo={120} />
            <Texto etiqueta="Subtítulo (opcional)" {...propio('subtitle')} maximo={200} />
            <Desplegable etiqueta="Fondo del bloque" {...propio('style')} opciones={SUPERFICIES_PARES} />

            <ListaDeRenglones
                seccion={seccion}
                editor={editor}
                items={items}
                maximo={12}
                etiqueta="Pregunta"
                nuevo={() => ({ question: '', answer: '' })}
            >
                {(item, cambiar) => (
                    <>
                        <Texto valor={item.question} onCambiar={(v) => cambiar({ question: v })} placeholder="¿Hacen envíos?" maximo={160} />
                        <Texto
                            valor={item.answer}
                            onCambiar={(v) => cambiar({ answer: v })}
                            placeholder="La respuesta, en una o dos frases."
                            maximo={800}
                            filas={3}
                        />
                    </>
                )}
            </ListaDeRenglones>

            <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-[11px] leading-snug text-stone-600 dark:bg-stone-950/60 dark:text-stone-400">
                En el catálogo se abre una pregunta a la vez. Las que contestes aquí son las que dejas de
                responder por WhatsApp.
            </p>
        </>
    );
}

function EditorDeTestimonios({ seccion, editor, propio }) {
    const items = seccion.items ?? [];

    return (
        <>
            <Texto etiqueta="Título" {...propio('title')} placeholder="Lo que dicen nuestros clientes" maximo={120} />
            <Texto etiqueta="Subtítulo (opcional)" {...propio('subtitle')} maximo={200} />
            <Desplegable etiqueta="Fondo del bloque" {...propio('style')} opciones={SUPERFICIES_PARES} />

            <ListaDeRenglones
                seccion={seccion}
                editor={editor}
                items={items}
                maximo={12}
                etiqueta="Testimonio"
                nuevo={() => ({ title: '', text: '', rating: 5 })}
            >
                {(item, cambiar) => (
                    <>
                        <Texto valor={item.title} onCambiar={(v) => cambiar({ title: v })} placeholder="Nombre de quien lo dice" maximo={60} />
                        <Texto
                            valor={item.text}
                            onCambiar={(v) => cambiar({ text: v })}
                            placeholder="Lo que te escribió o te dijo."
                            maximo={400}
                            filas={3}
                        />
                        <Estrellas valor={item.rating ?? 5} onCambiar={(v) => cambiar({ rating: v })} />
                    </>
                )}
            </ListaDeRenglones>

            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Pon solo opiniones que de verdad te dieron. Un testimonio inventado se nota y cuesta más de lo
                que suma.
            </p>
        </>
    );
}

/** Nota de un testimonio. Cero estrellas es válido: no todo elogio lleva nota. */
function Estrellas({ valor, onCambiar }) {
    return (
        <div>
            <Etiqueta>Estrellas</Etiqueta>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onCambiar(valor === n ? 0 : n)}
                        aria-label={`${n} de 5`}
                        aria-pressed={n <= valor}
                        className="pulsable grid h-8 w-8 place-items-center rounded-md hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                        <Star
                            className={`h-4 w-4 ${n <= valor ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'}`}
                            fill={n <= valor ? 'currentColor' : 'none'}
                        />
                    </button>
                ))}
                <span className="ml-1 text-[11px] text-stone-500 dark:text-stone-400">
                    {valor > 0 ? `${valor} de 5` : 'Sin estrellas'}
                </span>
            </div>
        </div>
    );
}

function EditorDeCifras({ seccion, editor, propio }) {
    const items = seccion.items ?? [];

    return (
        <>
            <Texto etiqueta="Título (opcional)" {...propio('title')} placeholder="En números" maximo={120} />
            <Texto etiqueta="Subtítulo (opcional)" {...propio('subtitle')} maximo={200} />
            <Desplegable etiqueta="Fondo del bloque" {...propio('style')} opciones={SUPERFICIES_PARES} />

            <ListaDeRenglones
                seccion={seccion}
                editor={editor}
                items={items}
                maximo={4}
                etiqueta="Cifra"
                nuevo={() => ({ value: '', title: '' })}
            >
                {(item, cambiar) => (
                    <div className="grid grid-cols-[5.5rem,1fr] gap-2.5">
                        <Texto valor={item.value} onCambiar={(v) => cambiar({ value: v })} placeholder="+500" maximo={12} />
                        <Texto valor={item.title} onCambiar={(v) => cambiar({ title: v })} placeholder="Clientes atendidos" maximo={60} />
                    </div>
                )}
            </ListaDeRenglones>

            <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-[11px] leading-snug text-stone-600 dark:bg-stone-950/60 dark:text-stone-400">
                El número va corto: «+500», «3 años», «24h». Lo largo va en la etiqueta de al lado.
            </p>
        </>
    );
}

function BotonIrA({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="pulsable w-full rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
            {children}
        </button>
    );
}

/** Colores del borrador para las miniaturas. */
export function coloresDeMuestra(datos) {
    return {
        primario: datos.color_primary,
        secundario: datos.color_secondary,
        fondo: datos.color_bg,
        superficie: datos.color_surface,
        texto: datos.color_text,
        sobrePrimario: contrasteSobre(datos.color_primary),
    };
}
