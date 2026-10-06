import { useCallback, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { BotonWhatsapp, PieCatalogo, VolverArriba } from '@/Components/Catalogo/Vitrina/Bloques';
import { Cabecera } from '@/Components/Catalogo/Vitrina/Cabecera';
import { EncabezadoSeccion, VitrinaContexto } from '@/Components/Catalogo/Vitrina/Comunes';
import { DetalleDeProducto } from '@/Components/Catalogo/Vitrina/Dialogos';
import { aFamilia, fondoDelCatalogo, variablesDelTema } from '@/Components/Catalogo/Vitrina/estilos';
import { Tarjeta } from '@/Components/Catalogo/Vitrina/Productos';
import { BarraDeSeleccion, useSeleccionMultiple } from '@/Components/Catalogo/Vitrina/Seleccion';

/**
 * Un producto en su propia página, cuando el comercio lo prefiere así.
 *
 * Lleva la misma cabecera y el mismo pie que el catálogo para que no
 * parezca otro sitio, y el cuerpo es el mismo que el de la ventana
 * flotante. Lo que gana es una dirección propia: se comparte por WhatsApp
 * con su foto y su precio, y Google la encuentra.
 */
export default function Producto({ comercio, theme, articulo, relacionados = [], bcvRate, rutaBase }) {
    const [articuloAbierto, setArticuloAbierto] = useState(null);
    const seleccion = useSeleccionMultiple(theme, comercio, rutaBase);

    // En esta página los relacionados siempre llevan a su propia dirección:
    // si se está aquí es porque el comercio eligió páginas, no ventanas.
    const verArticulo = useCallback((otro) => setArticuloAbierto(otro), []);

    const contexto = useMemo(
        () => ({
            theme,
            comercio,
            bcvRate,
            modoEditor: false,
            seleccion: null,
            verArticulo,
            rutaBase,
            seleccionMultiple: seleccion,
            filtrar: () => {},
            datos: { productos: relacionados, categories: [], filters: {} },
        }),
        [theme, comercio, bcvRate, verArticulo, rutaBase, seleccion, relacionados],
    );

    const cabecera = (theme.sections ?? []).find((s) => s.type === 'header' && s.visible);

    return (
        <VitrinaContexto.Provider value={contexto}>
            <Head>
                {/* El título y la vista previa del enlace los escribe el
                    servidor: el robot de WhatsApp no ejecuta JavaScript. */}
                <title>{`${articulo.name} · ${comercio.name}`}</title>
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
                data-titulos={theme.heading_style ?? 'normal'}
                className="cat-raiz"
            >
                <div
                    className="flex min-h-screen flex-col antialiased"
                    style={{ color: 'var(--cat-texto)', fontFamily: 'var(--cat-cuerpo)', ...fondoDelCatalogo(theme) }}
                >
                    {cabecera && (
                        <div className={theme.header_sticky !== false ? 'sticky top-0 z-30' : ''}>
                            <Cabecera seccion={cabecera} />
                        </div>
                    )}

                    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:py-12">
                        <Link
                            href={rutaBase}
                            className="cat-boton inline-flex items-center gap-1.5 text-sm font-medium"
                            style={{ color: 'var(--cat-tenue)' }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al catálogo
                        </Link>

                        <article
                            className="mt-5 flex flex-col overflow-hidden sm:flex-row"
                            style={{
                                background: 'var(--cat-fondo)',
                                borderRadius: 'calc(var(--cat-radio) + 8px)',
                                border: '1px solid color-mix(in srgb, var(--cat-texto) 10%, transparent)',
                            }}
                        >
                            <DetalleDeProducto articulo={articulo} enPagina />
                        </article>

                        {relacionados.length > 0 && (
                            <section className="mt-12 sm:mt-16">
                                <EncabezadoSeccion titulo="También te puede servir" />

                                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {relacionados.map((otro, indice) => (
                                        <Tarjeta key={otro.id} articulo={otro} indice={indice} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>

                    <PieCatalogo />
                </div>

                {comercio.whatsapp && <BotonWhatsapp />}
                <VolverArriba />

                <BarraDeSeleccion seleccion={seleccion} articulos={[articulo, ...relacionados]} />
            </div>
        </VitrinaContexto.Provider>
    );
}
