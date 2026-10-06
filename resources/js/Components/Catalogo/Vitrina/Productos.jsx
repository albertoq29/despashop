import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowRight, ArrowUpDown, ChevronLeft, ChevronRight, Clock, MessageCircle, Plus, Search, X } from 'lucide-react';
import { BotonCatalogo, EncabezadoSeccion, Imagen, irASeccion, PreciosPorVolumen, SinContenido, useVitrina } from './Comunes';
import {
    aire,
    BORDE_SUAVE,
    COLUMNAS_ESCRITORIO,
    COLUMNAS_MOVIL,
    EFECTO_TARJETA,
    RELACION_IMAGEN,
    enlaceWhatsapp,
    estiloBoton,
    ESTILO_PRECIO,
    formatoBs,
    SOMBRAS,
} from './estilos';
import { useAparecer } from './movimiento';
import { MarcaDeSeleccion } from './Seleccion';

/* ── Tarjeta ────────────────────────────────────────────────────────────── */

export function Tarjeta({ articulo, indice = 0, enFila = false }) {
    const { theme, comercio, bcvRate, verArticulo, seleccionMultiple } = useVitrina();
    const ref = useAparecer(Math.min(indice % 4, 3) * 60);

    const lista = theme.layout === 'list' && !enFila;
    const mosaico = theme.layout === 'masonry' && !enFila;
    const superpuesta = theme.card_style === 'overlay' && !lista;
    // La proporción que eligió el comercio; la tarjeta superpuesta necesita
    // algo de alto para que el texto encima no tape el producto.
    const recuadro = RELACION_IMAGEN[theme.image_ratio] ?? (superpuesta ? RELACION_IMAGEN.portrait : RELACION_IMAGEN.square);

    const imagen = articulo.image_url ?? articulo.images?.[0]?.image_url ?? null;
    // La rejilla pide la versión liviana; la completa se carga al abrir
    const miniatura = articulo.thumb_url ?? articulo.images?.[0]?.thumb_url ?? null;
    const precio = articulo.price_usdt;
    const esServicio = Boolean(articulo.esServicio);
    const agotado = !esServicio && articulo.stock !== null && Number(articulo.stock) <= 0 && !articulo.por_llegar;
    const manera = theme.product_view ?? (theme.quick_view === false ? 'ninguna' : 'modal');
    const abrir = manera === 'ninguna' ? undefined : () => verArticulo(articulo);

    const estiloTarjeta = {
        elevated: { background: 'var(--cat-superficie)', boxShadow: SOMBRAS[theme.shadow] },
        flat: { background: 'var(--cat-superficie)' },
        bordered: { background: 'transparent', border: `1px solid ${BORDE_SUAVE}` },
        overlay: { background: 'var(--cat-superficie)', boxShadow: SOMBRAS[theme.shadow] },
    }[theme.card_style] ?? { background: 'var(--cat-superficie)' };

    const distintivos = theme.show_product_badges !== false && (
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {articulo.esCombo && <Distintivo texto="Combo" />}
            {esServicio && <Distintivo texto="Servicio" />}
            {!articulo.esCombo && articulo.por_llegar && <Distintivo texto="Por llegar" />}
            {agotado && <Distintivo texto="Agotado" apagado />}
        </div>
    );

    const foto = (
        <button
            type="button"
            onClick={abrir}
            disabled={!abrir}
            aria-label={abrir ? `Ver ${articulo.name}` : undefined}
            className={`relative block w-full overflow-hidden text-left disabled:cursor-default ${
                lista ? 'h-full w-32 shrink-0 sm:w-44' : ''
            }`}
            style={{ background: 'color-mix(in srgb, var(--cat-primario) 8%, var(--cat-superficie))' }}
        >
            {imagen ? (
                <Imagen
                    src={imagen}
                    liviana={miniatura}
                    alt={articulo.name}
                    className={`cat-foto w-full ${theme.image_fit === 'contain' ? 'object-contain' : 'object-cover'} ${
                        lista ? 'h-full' : mosaico ? 'h-auto' : recuadro
                    }`}
                />
            ) : (
                <div className={`grid place-items-center ${lista ? 'h-full' : recuadro}`}>
                    <span className="text-4xl font-semibold opacity-80" style={{ color: 'var(--cat-primario)', fontFamily: 'var(--cat-titulo)' }}>
                        {articulo.name.charAt(0).toUpperCase()}
                    </span>
                </div>
            )}

            {superpuesta && (
                <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            )}

            {distintivos}
        </button>
    );

    const botonConsultar = comercio.whatsapp && (
        <a
            href={enlaceWhatsapp(comercio, articulo)}
            target="_blank"
            rel="noreferrer"
            className="cat-boton cat-brillo mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold sm:text-sm"
            style={estiloBoton(theme)}
        >
            <MessageCircle className="h-4 w-4" />
            Consultar
        </a>
    );

    // Texto sobre la foto: nombre y precio viven dentro de la imagen
    if (superpuesta) {
        return (
            <div ref={ref} className={`cat-aparecer ${mosaico ? 'mb-4 break-inside-avoid' : ''}`}>
                <article
                    className={`group relative overflow-hidden ${EFECTO_TARJETA[theme.card_hover] ?? ''}`}
                    style={{ ...estiloTarjeta, borderRadius: 'var(--cat-radio)' }}
                >
                    {foto}
                    <MarcaDeSeleccion articulo={articulo} seleccion={seleccionMultiple} />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base" style={{ fontFamily: 'var(--cat-titulo)' }}>
                            {articulo.name}
                        </h3>
                        {theme.show_prices && precio && (
                            <>
                                <p className={`mt-1 ${ESTILO_PRECIO[theme.price_style] ?? ESTILO_PRECIO.normal}`}>
                                    ${Number(precio).toFixed(2)}
                                </p>
                                <PreciosPorVolumen articulo={articulo} />
                            </>
                        )}
                    </div>

                    {comercio.whatsapp && (
                        <a
                            href={enlaceWhatsapp(comercio, articulo)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Consultar ${articulo.name} por WhatsApp`}
                            className="cat-boton absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full"
                            style={{ background: 'var(--cat-primario)', color: 'var(--cat-sobre-primario)' }}
                        >
                            <MessageCircle className="h-4 w-4" />
                        </a>
                    )}
                </article>
            </div>
        );
    }

    return (
        <div ref={ref} className={`cat-aparecer ${mosaico ? 'mb-4 break-inside-avoid' : 'h-full'}`}>
            <article
                className={`group flex h-full overflow-hidden ${lista ? 'flex-row' : 'flex-col'} ${EFECTO_TARJETA[theme.card_hover] ?? ''}`}
                style={{ ...estiloTarjeta, borderRadius: 'var(--cat-radio)' }}
            >
                {foto}
                <MarcaDeSeleccion articulo={articulo} seleccion={seleccionMultiple} />

                <div className={`flex min-w-0 flex-1 flex-col ${aire(theme).tarjeta}`}>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-[15px]" style={{ fontFamily: 'var(--cat-titulo)' }}>
                        <button type="button" onClick={abrir} disabled={!abrir} className="text-left disabled:cursor-default">
                            {articulo.name}
                        </button>
                    </h3>

                    {articulo.esCombo && articulo.incluye?.length > 0 && (
                        <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--cat-tenue)' }}>
                            Incluye {articulo.incluye.join(', ')}
                        </p>
                    )}

                    {articulo.detalle && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--cat-tenue)' }}>
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {articulo.detalle}
                        </p>
                    )}

                    {lista && articulo.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm" style={{ color: 'var(--cat-tenue)' }}>
                            {articulo.description}
                        </p>
                    )}

                    {theme.show_stock && !agotado && articulo.last_units && (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--cat-acento)' }}>
                            <span className="cat-latido h-1.5 w-1.5 rounded-full" style={{ background: 'var(--cat-acento)' }} />
                            Últimas unidades
                        </p>
                    )}

                    <div className="mt-auto pt-3">
                        {theme.show_prices &&
                            (precio ? (
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                    <p className={ESTILO_PRECIO[theme.price_style] ?? ESTILO_PRECIO.normal} style={{ color: 'var(--cat-primario)' }}>
                                        ${Number(precio).toFixed(2)}
                                    </p>
                                    {theme.show_bs_prices && bcvRate > 1 && (
                                        <p className="text-xs" style={{ color: 'var(--cat-tenue)' }}>
                                            Bs. {formatoBs(Number(precio) * bcvRate)}
                                        </p>
                                    )}
                                    <span className="w-full"><PreciosPorVolumen articulo={articulo} /></span>
                                </div>
                            ) : (
                                <p className="text-sm font-medium" style={{ color: 'var(--cat-tenue)' }}>
                                    Consultar precio
                                </p>
                            ))}

                        {botonConsultar}
                    </div>
                </div>
            </article>
        </div>
    );
}

function Distintivo({ texto, apagado = false }) {
    return (
        <span
            className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm sm:text-[11px]"
            style={{
                background: apagado ? 'rgb(41 37 36 / 0.88)' : 'var(--cat-acento)',
                color: apagado ? '#ffffff' : 'var(--cat-sobre-acento)',
                borderRadius: 'calc(var(--cat-radio) / 2)',
            }}
        >
            {texto}
        </span>
    );
}

/* ── Rejilla y fila deslizable ──────────────────────────────────────────── */

export function Rejilla({ articulos }) {
    const { theme } = useVitrina();
    const espacio = aire(theme).rejilla;

    if (theme.layout === 'masonry') {
        return (
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
                {articulos.map((articulo, indice) => (
                    <Tarjeta key={`${articulo.esCombo ? 'c' : 'p'}-${articulo.id}`} articulo={articulo} indice={indice} />
                ))}
            </div>
        );
    }

    const clases =
        theme.layout === 'list'
            ? `grid grid-cols-1 ${espacio} lg:grid-cols-2`
            : `grid ${espacio} ${COLUMNAS_MOVIL[theme.columns_mobile] ?? 'grid-cols-2'} ${
                  COLUMNAS_ESCRITORIO[theme.columns_desktop] ?? COLUMNAS_ESCRITORIO[4]
              }`;

    return (
        <div className={clases}>
            {articulos.map((articulo, indice) => (
                <Tarjeta key={`${articulo.esCombo ? 'c' : 'p'}-${articulo.id}`} articulo={articulo} indice={indice} />
            ))}
        </div>
    );
}

/**
 * Fila que se desliza de lado, con imán en cada tarjeta.
 *
 * El desplazamiento es nativo (scroll-snap), así que en el teléfono se
 * arrastra con el dedo y conserva la inercia del sistema; las flechas solo
 * aparecen en pantallas con mouse.
 */
export function FilaDeslizable({ articulos }) {
    const { theme } = useVitrina();
    const contenedor = useRef(null);
    const [bordes, setBordes] = useState({ inicio: true, fin: false });

    const medir = () => {
        const el = contenedor.current;

        if (!el) {
            return;
        }

        setBordes({
            inicio: el.scrollLeft <= 4,
            fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
        });
    };

    useLayoutEffect(medir, [articulos.length]);

    const mover = (direccion) => {
        const el = contenedor.current;
        el?.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    return (
        <div className="group/fila relative">
            <div
                ref={contenedor}
                onScroll={medir}
                className={`cat-sin-barra -mx-5 flex snap-x snap-mandatory overflow-x-auto scroll-px-5 px-5 pb-2 ${aire(theme).rejilla}`}
            >
                {articulos.map((articulo, indice) => (
                    <div
                        key={`${articulo.esCombo ? 'c' : 'p'}-${articulo.id}`}
                        className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%]"
                    >
                        <Tarjeta articulo={articulo} indice={indice} enFila />
                    </div>
                ))}
            </div>

            {!bordes.inicio && <FlechaFila direccion={-1} onClick={() => mover(-1)} />}
            {!bordes.fin && <FlechaFila direccion={1} onClick={() => mover(1)} />}
        </div>
    );
}

function FlechaFila({ direccion, onClick }) {
    const Icono = direccion < 0 ? ChevronLeft : ChevronRight;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={direccion < 0 ? 'Anteriores' : 'Siguientes'}
            className={`cat-boton absolute top-[calc(38%-1.25rem)] hidden h-10 w-10 place-items-center rounded-full opacity-0 transition-opacity group-hover/fila:opacity-100 md:grid ${
                direccion < 0 ? '-left-4' : '-right-4'
            }`}
            style={{
                background: 'var(--cat-superficie)',
                color: 'var(--cat-texto)',
                boxShadow: SOMBRAS.lg,
                border: `1px solid ${BORDE_SUAVE}`,
            }}
        >
            <Icono className="h-5 w-5" />
        </button>
    );
}

function VerTodo({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="cat-enlace group inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold"
            style={{ color: 'var(--cat-primario)' }}
        >
            Ver todo
            <ArrowRight className="cat-flecha h-4 w-4" />
        </button>
    );
}

/* ── Bloques de productos ───────────────────────────────────────────────── */

function BloqueDeArticulos({ seccion, articulos, vacio, alVerTodo }) {
    const { theme } = useVitrina();

    if (articulos.length === 0) {
        return <SinContenido texto={vacio} />;
    }

    return (
        <section className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <EncabezadoSeccion
                titulo={seccion.title}
                subtitulo={seccion.subtitle}
                accion={alVerTodo && <VerTodo onClick={alVerTodo} />}
            />

            {seccion.style === 'grid' ? <Rejilla articulos={articulos} /> : <FilaDeslizable articulos={articulos} />}
        </section>
    );
}

export function Novedades({ seccion }) {
    const { datos } = useVitrina();

    return (
        <BloqueDeArticulos
            seccion={seccion}
            articulos={datos.novedades.slice(0, seccion.limit ?? 8)}
            vacio="Novedades: aparecerán aquí los productos que agregues."
            alVerTodo={() => irASeccion('products')}
        />
    );
}

export function Combos({ seccion }) {
    const { datos } = useVitrina();

    return (
        <BloqueDeArticulos
            seccion={seccion}
            articulos={datos.combos}
            vacio="Combos: todavía no tienes combos visibles."
        />
    );
}

/** Lo que el comercio hace, no lo que entrega: cortes, arreglos, asesorías. */
export function Servicios({ seccion }) {
    const { datos } = useVitrina();

    return (
        <BloqueDeArticulos
            seccion={seccion}
            articulos={datos.servicios ?? []}
            vacio="Servicios: marca un artículo como servicio en Productos para que aparezca aquí."
        />
    );
}

export function CategoriaDestacada({ seccion }) {
    const { datos, filtrar } = useVitrina();
    const categoria = datos.categories.find((c) => String(c.id) === String(seccion.category_id));
    const articulos = (datos.porCategoria?.[seccion.category_id] ?? []).slice(0, seccion.limit ?? 8);

    if (!categoria) {
        return <SinContenido texto="Categoría destacada: elige qué categoría mostrar en el panel." />;
    }

    return (
        <BloqueDeArticulos
            seccion={{ ...seccion, title: seccion.title || categoria.name }}
            articulos={articulos}
            vacio={`${categoria.name}: esta categoría todavía no tiene productos visibles.`}
            alVerTodo={() => {
                filtrar({ category_id: categoria.id, search: undefined });
                irASeccion('products');
            }}
        />
    );
}

/* ── Catálogo completo con filtros ──────────────────────────────────────── */

const ORDENES = [
    ['manual', 'Destacados'],
    ['newest', 'Más recientes'],
    ['price_asc', 'Menor precio'],
    ['price_desc', 'Mayor precio'],
    ['name', 'Nombre (A-Z)'],
];

export function SeccionProductos({ seccion }) {
    const { theme, datos, filtrar } = useVitrina();
    const filtrando = Boolean(datos.filters.search || datos.filters.category_id);

    // El servidor manda una tanda; el resto se pide solo si alguien lo pide
    const mostrados = datos.productos.length;
    const faltan = Math.max(0, (datos.productosTotal ?? mostrados) - mostrados);

    return (
        <section id="productos" className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <EncabezadoSeccion titulo={seccion.title} subtitulo={seccion.subtitle} />

            <BarraDeFiltros />

            <div className="mt-6">
                {mostrados > 0 ? (
                    <Rejilla articulos={datos.productos} />
                ) : (
                    <SinResultados filtrando={filtrando} />
                )}
            </div>

            {faltan > 0 && (
                <div className="mt-8 flex flex-col items-center gap-2">
                    <BotonCatalogo onClick={() => filtrar({ ver: mostrados + 24 })} className="px-7 py-3 text-sm">
                        <Plus className="h-4 w-4" />
                        Ver más
                    </BotonCatalogo>
                    <p className="text-xs" style={{ color: 'var(--cat-tenue)' }}>
                        {mostrados} de {datos.productosTotal}
                    </p>
                </div>
            )}
        </section>
    );
}

function BarraDeFiltros() {
    const { theme, datos, filtrar } = useVitrina();
    const { filters, categories } = datos;
    const [busqueda, setBusqueda] = useState(filters.search ?? '');

    useEffect(() => setBusqueda(filters.search ?? ''), [filters.search]);

    const conBuscador = theme.show_search;
    const conOrden = theme.show_sort;
    const conCategorias = theme.show_categories && categories.length > 0;

    if (!conBuscador && !conOrden && !conCategorias) {
        return null;
    }

    const estiloCampo = {
        background: 'var(--cat-superficie)',
        borderColor: BORDE_SUAVE,
        borderRadius: theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)',
        color: 'var(--cat-texto)',
    };

    return (
        <div className="space-y-4">
            {(conBuscador || conOrden) && (
                <div className="flex flex-col gap-3 sm:flex-row">
                    {conBuscador && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                filtrar({ search: busqueda || undefined });
                            }}
                            className="relative flex-1"
                        >
                            <Search
                                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                                style={{ color: 'var(--cat-tenue)' }}
                            />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar en el catálogo"
                                aria-label="Buscar productos"
                                className="cat-campo w-full border py-3 pl-11 pr-11 text-base outline-none"
                                style={estiloCampo}
                            />
                            {busqueda && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBusqueda('');
                                        filtrar({ search: undefined });
                                    }}
                                    aria-label="Limpiar búsqueda"
                                    className="cat-boton absolute right-3 top-[calc(50%-0.875rem)] grid h-7 w-7 place-items-center rounded-full"
                                    style={{ color: 'var(--cat-tenue)' }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </form>
                    )}

                    {conOrden && (
                        <label className="relative sm:w-56">
                            <span className="sr-only">Ordenar productos</span>
                            <ArrowUpDown
                                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                                style={{ color: 'var(--cat-tenue)' }}
                            />
                            <select
                                value={filters.orden ?? 'manual'}
                                onChange={(e) => filtrar({ orden: e.target.value })}
                                className="cat-campo w-full appearance-none border py-3 pl-11 pr-10 text-sm font-medium outline-none"
                                style={estiloCampo}
                            >
                                {ORDENES.map(([valor, texto]) => (
                                    <option key={valor} value={valor}>
                                        {texto}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            )}

            {conCategorias && <Categorias />}
        </div>
    );
}

/**
 * Selector de categorías en tres estilos.
 *
 * La categoría activa se marca al instante, antes de que responda el
 * servidor: esperar la recarga para mover el indicador se siente lento.
 */
function Categorias() {
    const { theme, datos, filtrar } = useVitrina();
    const { categories, filters } = datos;
    const [activa, setActiva] = useState(filters.category_id ? String(filters.category_id) : '');

    useEffect(() => setActiva(filters.category_id ? String(filters.category_id) : ''), [filters.category_id]);

    const elegir = (id) => {
        setActiva(id ? String(id) : '');
        filtrar({ category_id: id || undefined });
    };

    const opciones = [{ id: '', name: 'Todo' }, ...categories];
    const estilo = theme.category_style ?? 'pills';

    if (estilo === 'underline') {
        return <CategoriasSubrayadas opciones={opciones} activa={activa} onElegir={elegir} />;
    }

    return (
        <div className={`cat-sin-barra -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 ${estilo === 'boxes' ? 'sm:flex-wrap' : ''}`}>
            {opciones.map((categoria) => {
                const esActiva = String(categoria.id) === activa;

                return (
                    <button
                        key={categoria.id || 'todo'}
                        type="button"
                        onClick={() => elegir(categoria.id)}
                        aria-pressed={esActiva}
                        className={`cat-boton shrink-0 whitespace-nowrap border text-sm font-medium ${
                            estilo === 'boxes' ? 'px-5 py-3' : 'px-4 py-2'
                        }`}
                        style={{
                            borderRadius: estilo === 'boxes' ? 'var(--cat-radio)' : '9999px',
                            background: esActiva ? 'var(--cat-primario)' : 'var(--cat-superficie)',
                            color: esActiva ? 'var(--cat-sobre-primario)' : 'var(--cat-texto)',
                            borderColor: esActiva ? 'var(--cat-primario)' : BORDE_SUAVE,
                        }}
                    >
                        {categoria.name}
                    </button>
                );
            })}
        </div>
    );
}

function CategoriasSubrayadas({ opciones, activa, onElegir }) {
    const fila = useRef(null);
    const [indicador, setIndicador] = useState({ x: 0, ancho: 0 });

    // El indicador se desliza hasta la pestaña activa en lugar de saltar
    useLayoutEffect(() => {
        const boton = fila.current?.querySelector(`[data-categoria="${activa || 'todo'}"]`);

        if (boton) {
            setIndicador({ x: boton.offsetLeft, ancho: boton.offsetWidth });
        }
    }, [activa, opciones.length]);

    return (
        <div
            ref={fila}
            className="cat-sin-barra relative -mx-5 flex overflow-x-auto px-5"
            style={{ borderBottom: `1px solid ${BORDE_SUAVE}` }}
        >
            {opciones.map((categoria) => {
                const esActiva = String(categoria.id) === activa;

                return (
                    <button
                        key={categoria.id || 'todo'}
                        type="button"
                        data-categoria={categoria.id || 'todo'}
                        onClick={() => onElegir(categoria.id)}
                        aria-pressed={esActiva}
                        className="shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors duration-200"
                        style={{ color: esActiva ? 'var(--cat-texto)' : 'var(--cat-tenue)' }}
                    >
                        {categoria.name}
                    </button>
                );
            })}

            <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-0.5 rounded-full transition-[transform,width] duration-300 ease-suave"
                style={{
                    width: indicador.ancho,
                    transform: `translateX(${indicador.x}px)`,
                    background: 'var(--cat-primario)',
                }}
            />
        </div>
    );
}

function SinResultados({ filtrando }) {
    const { datos, filtrar } = useVitrina();

    return (
        <div
            className="px-6 py-16 text-center"
            style={{ background: 'var(--cat-superficie)', borderRadius: 'var(--cat-radio)' }}
        >
            <p className="text-lg font-semibold" style={{ fontFamily: 'var(--cat-titulo)' }}>
                {filtrando ? 'No encontramos productos con ese filtro' : 'Todavía no hay productos por aquí'}
            </p>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm" style={{ color: 'var(--cat-tenue)' }}>
                {filtrando ? 'Prueba con otra palabra o mira todas las categorías.' : 'Vuelve pronto, estamos preparando el catálogo.'}
            </p>

            {filtrando && (datos.filters.search || datos.filters.category_id) && (
                <button
                    type="button"
                    onClick={() => filtrar({ search: undefined, category_id: undefined })}
                    className="cat-boton mt-5 inline-flex px-5 py-2.5 text-sm font-semibold"
                    style={{ background: 'var(--cat-primario)', color: 'var(--cat-sobre-primario)', borderRadius: 'var(--cat-radio)' }}
                >
                    Ver todo el catálogo
                </button>
            )}
        </div>
    );
}

/** Aplica filtros recargando solo los productos, sin mover la página. */
export function crearFiltro({ rutaBase, filters, modoEditor }) {
    return (cambios) => {
        const siguiente = { ...filters, ...cambios };

        // Buscar o cambiar de categoría empieza la lista de nuevo
        if (!('ver' in cambios)) {
            delete siguiente.ver;
        }

        Object.keys(siguiente).forEach((clave) => {
            if (siguiente[clave] === undefined || siguiente[clave] === null || siguiente[clave] === '') {
                delete siguiente[clave];
            }
        });

        router.get(rutaBase, siguiente, {
            only: ['productos', 'productosTotal', 'filters'],
            preserveState: true,
            preserveScroll: true,
            // En el editor no se ensucia el historial del navegador del panel
            replace: modoEditor,
        });
    };
}
