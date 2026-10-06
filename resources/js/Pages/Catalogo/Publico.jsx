import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    BarraDeProgreso,
    Beneficios,
    BloqueTexto,
    BotonWhatsapp,
    Cifras,
    Contacto,
    Faq,
    PieCatalogo,
    Separador,
    Testimonios,
    VolverArriba,
} from '@/Components/Catalogo/Vitrina/Bloques';
import { Anuncio, Cabecera, Marquesina } from '@/Components/Catalogo/Vitrina/Cabecera';
import { irASeccion, VitrinaContexto } from '@/Components/Catalogo/Vitrina/Comunes';
import { Modal, Modales, VistaRapida } from '@/Components/Catalogo/Vitrina/Dialogos';
import { Bloque, useCanalDelEditor } from '@/Components/Catalogo/Vitrina/Editable';
import { aFamilia, fondoDelCatalogo, variablesDelTema } from '@/Components/Catalogo/Vitrina/estilos';
import { repetirApariciones } from '@/Components/Catalogo/Vitrina/movimiento';
import { BarraDeSeleccion, useSeleccionMultiple } from '@/Components/Catalogo/Vitrina/Seleccion';
import { Carrusel, Portada } from '@/Components/Catalogo/Vitrina/Portada';
import {
    CategoriaDestacada,
    Combos,
    crearFiltro,
    Novedades,
    SeccionProductos,
    Servicios,
} from '@/Components/Catalogo/Vitrina/Productos';

/** Qué componente pinta cada tipo de bloque. */
const BLOQUES = {
    marquee: Marquesina,
    header: Cabecera,
    announcement: Anuncio,
    banners: Carrusel,
    hero: Portada,
    featured: Novedades,
    combos: Combos,
    services: Servicios,
    products: SeccionProductos,
    contact: Contacto,
    text: BloqueTexto,
    benefits: Beneficios,
    category: CategoriaDestacada,
    faq: Faq,
    testimonials: Testimonios,
    stats: Cifras,
    divider: Separador,
};

/** Campos que llegan del servidor y que el borrador del editor nunca pisa. */
const SOLO_DEL_SERVIDOR = ['logo_url', 'cover_url', 'favicon_url', 'logo_palette'];

/**
 * Catálogo público de un comercio, en /{username}.
 *
 * La página es una lista de bloques en el orden que eligió el comercio. La
 * misma página es la vista previa del editor: ahí recibe el diseño sin
 * guardar por mensajes y lo pinta encima del tema guardado.
 */
export default function Publico({
    comercio,
    theme: temaGuardado,
    banners,
    modals,
    productos,
    productosTotal = 0,
    servicios = [],
    novedades,
    porCategoria,
    combos,
    categories,
    bcvRate,
    filters,
    isPreview,
    modoEditor = false,
    rutaBase,
}) {
    const [borrador, setBorrador] = useState(null);
    const [seleccion, setSeleccion] = useState(null);
    const [modalDePrueba, setModalDePrueba] = useState(null);
    const [articuloAbierto, setArticuloAbierto] = useState(null);
    const [listo, setListo] = useState(false);
    const [enfoquePendiente, setEnfoquePendiente] = useState(null);
    const ultimoEnfoque = useRef(null);

    useCanalDelEditor(modoEditor, {
        alActualizar: (tema, seccionElegida, enfoque) => {
            setBorrador(tema);
            setSeleccion(seccionElegida);

            // Cada pedido trae un número: al reconectar se reenvía el último
            // borrador y no debe volver a mover la vista.
            if (enfoque && enfoque.n !== ultimoEnfoque.current) {
                ultimoEnfoque.current = enfoque.n;
                setEnfoquePendiente(enfoque.id);
            }
        },
        alModal: setModalDePrueba,
    });

    // Se desplaza después de pintar el borrador, con los bloques ya en su sitio
    useEffect(() => {
        if (!enfoquePendiente) {
            return undefined;
        }

        irASeccion(enfoquePendiente);
        setEnfoquePendiente(null);

        return undefined;
    }, [enfoquePendiente, borrador]);

    const theme = useMemo(() => {
        if (!borrador) {
            return temaGuardado;
        }

        const combinado = { ...temaGuardado, ...borrador };
        SOLO_DEL_SERVIDOR.forEach((campo) => (combinado[campo] = temaGuardado[campo]));

        return combinado;
    }, [temaGuardado, borrador]);

    useEffect(() => setListo(true), []);

    // En el editor, elegir otro nivel de animación la muestra en el acto.
    // Se espera al montaje: en la primera carga no hay nada que repetir.
    useEffect(() => {
        if (modoEditor && listo) {
            repetirApariciones();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme.animation_level, theme.animation_entrance, theme.animation_speed, theme.animation_stagger]);

    const verArticulo = useCallback((articulo) => setArticuloAbierto(articulo), []);
    const seleccionMultiple = useSeleccionMultiple(theme, comercio, rutaBase);

    // El mensaje necesita los artículos completos, y uno marcado puede estar
    // en cualquier bloque: se juntan todos los que la página llegó a pintar.
    const articulosALaVista = useMemo(() => {
        const todos = [
            ...productos,
            ...servicios,
            ...novedades,
            ...combos,
            ...Object.values(porCategoria ?? {}).flat(),
        ];

        return todos.filter((articulo, i, lista) => lista.findIndex((otro) => otro.id === articulo.id) === i);
    }, [productos, servicios, novedades, combos, porCategoria]);

    const contexto = useMemo(
        () => ({
            theme,
            comercio,
            bcvRate,
            modoEditor,
            seleccion,
            verArticulo,
            rutaBase,
            seleccionMultiple,
            filtrar: crearFiltro({ rutaBase, filters, modoEditor }),
            datos: { banners, productos, productosTotal, servicios, novedades, porCategoria, combos, categories, filters },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [theme, comercio, bcvRate, modoEditor, seleccion, verArticulo, seleccionMultiple, rutaBase, filters, banners, productos, productosTotal, servicios, novedades, porCategoria, combos, categories],
    );

    const visibles = (theme.sections ?? []).filter((seccion) => seccion.visible && BLOQUES[seccion.type]);

    return (
        <VitrinaContexto.Provider value={contexto}>
            <Head>
                {/* La descripción y la vista previa del enlace las escribe el
                    servidor en la plantilla: el robot de WhatsApp no ejecuta
                    JavaScript y no vería nada de lo que se ponga aquí. */}
                <title>{theme.seo_title || comercio.name}</title>
                {theme.favicon_url && <link rel="icon" href={theme.favicon_url} />}
                <link
                    href={`https://fonts.bunny.net/css?family=${aFamilia(theme.font_heading)}:400,500,600,700|${aFamilia(theme.font_body)}:400,500,600,700&display=swap`}
                    rel="stylesheet"
                />
            </Head>

            <div
                style={variablesDelTema(theme)}
                data-animacion={theme.animation_level ?? 'subtle'}
                data-entrada={theme.animation_entrance ?? 'up'}
                data-velocidad={theme.animation_speed ?? 'normal'}
                data-cascada={theme.animation_stagger === false ? 'no' : undefined}
                data-titulos={theme.heading_style ?? 'normal'}
                data-editor={modoEditor ? '' : undefined}
                className="cat-raiz"
            >
                <div
                    className="flex min-h-screen flex-col antialiased"
                    style={{ color: 'var(--cat-texto)', fontFamily: 'var(--cat-cuerpo)', ...fondoDelCatalogo(theme) }}
                >
                    {isPreview && !modoEditor && (
                        <div className="bg-amber-500 px-5 py-2 text-center text-sm font-medium text-amber-950">
                            Estás viendo tu catálogo sin publicar. Solo tú puedes verlo así.
                        </div>
                    )}

                    {visibles.map((seccion, indice) => {
                        const Componente = BLOQUES[seccion.type];
                        const cabeceraFija = seccion.type === 'header' && theme.header_sticky !== false;

                        return (
                            <Bloque
                                key={seccion.id}
                                seccion={seccion}
                                esPrimero={indice === 0}
                                esUltimo={indice === visibles.length - 1}
                                className={cabeceraFija ? 'sticky top-0 z-30' : ''}
                            >
                                <Componente seccion={seccion} />
                            </Bloque>
                        );
                    })}

                    <PieCatalogo />
                </div>

                {theme.scroll_progress && <BarraDeProgreso />}
                {comercio.whatsapp && <BotonWhatsapp />}
                <VolverArriba />

                <BarraDeSeleccion seleccion={seleccionMultiple} articulos={articulosALaVista} />

                {!modoEditor && <Modales modals={modals} />}
                {modalDePrueba && <Modal key={modalDePrueba.id ?? 'borrador'} modal={modalDePrueba} onCerrar={() => setModalDePrueba(null)} />}
                {articuloAbierto && <VistaRapida articulo={articuloAbierto} onCerrar={() => setArticuloAbierto(null)} />}
            </div>
        </VitrinaContexto.Provider>
    );
}
