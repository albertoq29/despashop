import { useId, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ArrowRight, ArrowUp, ChevronDown, MessageCircle, Star } from 'lucide-react';
import { ICONOS_DE_BENEFICIO } from '../secciones';
import {
    BotonCatalogo,
    EncabezadoSeccion,
    IconoRed,
    irASeccion,
    NOMBRES_REDES,
    redesDelTema,
    SinContenido,
    useVitrina,
} from './Comunes';
import { aire, BORDE_SUAVE, enlaceWhatsapp, SOMBRAS } from './estilos';
import { useAparecer, useDesplazamiento, useProgresoDeScroll } from './movimiento';

/**
 * Envoltura con el fondo elegido para un bloque de contenido.
 *
 * "brand" pinta una franja con el color principal, "card" una tarjeta sobre
 * el fondo de la página, "glass" un cristal translúcido, "outline" solo un
 * contorno de marca y "plain" deja el contenido directamente encima.
 */
export function Superficie({ estilo, children, className = '' }) {
    const { theme } = useVitrina();
    const ref = useAparecer();

    const estilos = {
        brand: {
            background: 'linear-gradient(135deg, var(--cat-primario), color-mix(in srgb, var(--cat-primario) 70%, var(--cat-secundario)))',
            color: 'var(--cat-sobre-primario)',
            borderRadius: 'var(--cat-radio)',
        },
        card: {
            background: 'var(--cat-superficie)',
            border: `1px solid ${BORDE_SUAVE}`,
            borderRadius: 'var(--cat-radio)',
            boxShadow: SOMBRAS[theme.shadow],
        },
        glass: {
            // El desenfoque necesita algo detrás: sobre fondo liso se nota
            // poco, así que el cristal lleva además un tinte de marca.
            background: 'color-mix(in srgb, var(--cat-superficie) 55%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid color-mix(in srgb, var(--cat-texto) 10%, transparent)',
            borderRadius: 'var(--cat-radio)',
            boxShadow: SOMBRAS[theme.shadow],
        },
        outline: {
            background: 'transparent',
            border: '1.5px solid color-mix(in srgb, var(--cat-primario) 35%, transparent)',
            borderRadius: 'var(--cat-radio)',
        },
        plain: {},
    };

    const marca = estilo === 'brand';

    return (
        <div
            ref={ref}
            className={`cat-aparecer relative ${marca ? 'cat-sobre-marca' : ''} ${
                estilo === 'glass' ? '' : 'overflow-hidden'
            } ${estilo === 'plain' ? '' : 'px-6 py-10 sm:px-12 sm:py-14'} ${className}`}
            style={estilos[estilo] ?? {}}
        >
            {children}
        </div>
    );
}

/** Color del texto secundario según el fondo donde esté. */
function tenue(marca) {
    return marca ? { opacity: 0.88 } : { color: 'var(--cat-tenue)' };
}

/* ── Texto libre ────────────────────────────────────────────────────────── */

export function BloqueTexto({ seccion }) {
    const { theme } = useVitrina();

    if (!seccion.title && !seccion.text) {
        return <SinContenido texto="Bloque de texto vacío: escribe un título o un párrafo en el panel." />;
    }

    const centrado = seccion.align !== 'left';
    const marca = seccion.style === 'brand';
    const enlace = seccion.button_link;

    return (
        <section className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <Superficie estilo={seccion.style}>
                <div className={`${centrado ? 'mx-auto text-center' : ''} max-w-3xl`}>
                    {seccion.title && (
                        <h2
                            className={`cat-titulo text-balance text-2xl font-semibold tracking-tight sm:text-4xl ${
                                centrado ? 'cat-titulo-centro' : ''
                            }`}
                            style={{ fontFamily: 'var(--cat-titulo)' }}
                        >
                            {seccion.title}
                        </h2>
                    )}

                    {seccion.text && (
                        <p
                            className={`mt-4 whitespace-pre-line text-pretty text-base leading-relaxed sm:text-lg ${centrado ? 'mx-auto' : ''} max-w-[65ch]`}
                            style={{ color: marca ? undefined : 'var(--cat-tenue)', opacity: marca ? 0.9 : undefined }}
                        >
                            {seccion.text}
                        </p>
                    )}

                    {seccion.button_text && (
                        <div className="mt-7">
                            <BotonCatalogo
                                href={enlace || '#productos'}
                                externo={Boolean(enlace && !enlace.startsWith('#'))}
                                onClick={(e) => {
                                    if (!enlace || enlace.startsWith('#')) {
                                        e.preventDefault();
                                        irASeccion('products');
                                    }
                                }}
                                brillo
                                className="px-6 py-3 text-sm"
                                estilo={
                                    marca
                                        ? {
                                              background: 'var(--cat-sobre-primario)',
                                              color: 'var(--cat-primario)',
                                              borderRadius: theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)',
                                          }
                                        : undefined
                                }
                            >
                                {seccion.button_text}
                                <ArrowRight className="cat-flecha h-4 w-4" />
                            </BotonCatalogo>
                        </div>
                    )}
                </div>
            </Superficie>
        </section>
    );
}

/* ── Beneficios ─────────────────────────────────────────────────────────── */

const COLUMNAS_BENEFICIOS = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };

export function Beneficios({ seccion }) {
    const { theme } = useVitrina();
    const items = (seccion.items ?? []).filter((item) => item.title || item.text);

    if (items.length === 0) {
        return <SinContenido texto="Beneficios: agrega al menos uno en el panel." />;
    }

    const marca = seccion.style === 'brand';
    const tarjetas = seccion.style === 'card';

    return (
        <section className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <EncabezadoSeccion titulo={seccion.title} alineacion="center" />

            <Superficie estilo={marca ? 'brand' : 'plain'}>
                <div className={`grid gap-4 sm:gap-6 ${COLUMNAS_BENEFICIOS[items.length] ?? 'sm:grid-cols-3'}`}>
                    {items.map((item, indice) => (
                        <Beneficio key={indice} item={item} indice={indice} marca={marca} tarjeta={tarjetas} />
                    ))}
                </div>
            </Superficie>
        </section>
    );
}

function Beneficio({ item, indice, marca, tarjeta }) {
    const { theme } = useVitrina();
    const ref = useAparecer(indice * 70);
    const Icono = ICONOS_DE_BENEFICIO[item.icon]?.Icono ?? ICONOS_DE_BENEFICIO.star.Icono;

    return (
        <div
            ref={ref}
            className={`cat-aparecer flex items-start gap-4 ${tarjeta ? 'p-5' : ''}`}
            style={
                tarjeta
                    ? {
                          background: 'var(--cat-superficie)',
                          border: `1px solid ${BORDE_SUAVE}`,
                          borderRadius: 'var(--cat-radio)',
                          boxShadow: SOMBRAS[theme.shadow],
                      }
                    : undefined
            }
        >
            <span
                className="cat-icono-beneficio grid h-12 w-12 shrink-0 place-items-center"
                style={{
                    borderRadius: 'calc(var(--cat-radio) + 4px)',
                    background: marca
                        ? 'color-mix(in srgb, var(--cat-sobre-primario) 16%, transparent)'
                        : 'color-mix(in srgb, var(--cat-primario) 12%, transparent)',
                    color: marca ? 'var(--cat-sobre-primario)' : 'var(--cat-primario)',
                }}
            >
                <Icono className="h-5 w-5" />
            </span>

            <div className="min-w-0">
                {item.title && (
                    <h3 className="font-semibold leading-snug" style={{ fontFamily: 'var(--cat-titulo)' }}>
                        {item.title}
                    </h3>
                )}
                {item.text && (
                    <p
                        className="mt-1 text-sm leading-relaxed"
                        style={{ color: marca ? undefined : 'var(--cat-tenue)', opacity: marca ? 0.85 : undefined }}
                    >
                        {item.text}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Contacto ───────────────────────────────────────────────────────────── */

export function Contacto({ seccion }) {
    const { theme, comercio } = useVitrina();
    const redes = redesDelTema(theme);

    if (!comercio.whatsapp && redes.length === 0) {
        return <SinContenido texto="Contacto: agrega tu WhatsApp o tus redes en la pestaña Compartir." />;
    }

    const marca = seccion.style === 'brand';

    return (
        <section className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <Superficie estilo={seccion.style}>
                {marca && (
                    <span
                        aria-hidden="true"
                        className="cat-flotar pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, var(--cat-sobre-primario), transparent 70%)' }}
                    />
                )}

                <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
                    {seccion.title && (
                        <h2
                            className="cat-titulo cat-titulo-centro text-balance text-2xl font-semibold tracking-tight sm:text-4xl"
                            style={{ fontFamily: 'var(--cat-titulo)' }}
                        >
                            {seccion.title}
                        </h2>
                    )}
                    {seccion.text && (
                        <p
                            className="mt-3 max-w-[52ch] text-pretty text-base sm:text-lg"
                            style={{ color: marca ? undefined : 'var(--cat-tenue)', opacity: marca ? 0.9 : undefined }}
                        >
                            {seccion.text}
                        </p>
                    )}

                    {comercio.whatsapp && (
                        <BotonCatalogo
                            href={enlaceWhatsapp(comercio, null, theme.whatsapp_message)}
                            externo
                            brillo
                            className="mt-8 px-7 py-3.5 text-base"
                            estilo={
                                marca
                                    ? {
                                          background: 'var(--cat-sobre-primario)',
                                          color: 'var(--cat-primario)',
                                          borderRadius: theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)',
                                      }
                                    : undefined
                            }
                        >
                            <MessageCircle className="h-5 w-5" />
                            {seccion.button_text || 'Escribir por WhatsApp'}
                        </BotonCatalogo>
                    )}

                    {redes.length > 0 && (
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {redes.map(([red, url]) => (
                                <a
                                    key={red}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={NOMBRES_REDES[red]}
                                    className="cat-boton grid h-11 w-11 place-items-center rounded-full"
                                    style={{
                                        background: marca
                                            ? 'color-mix(in srgb, var(--cat-sobre-primario) 16%, transparent)'
                                            : 'color-mix(in srgb, var(--cat-primario) 10%, transparent)',
                                        color: marca ? 'var(--cat-sobre-primario)' : 'var(--cat-primario)',
                                    }}
                                >
                                    <IconoRed red={red} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </Superficie>
        </section>
    );
}

/* ── Preguntas frecuentes ───────────────────────────────────────────────── */

/**
 * Lista de preguntas que se abren al tocarlas.
 *
 * Solo una abierta a la vez: con varias desplegadas la página crece y el
 * visitante pierde de vista lo que estaba leyendo. El panel se abre
 * midiendo su propio alto con una rejilla de 0fr a 1fr, para no calcular
 * alturas en JavaScript ni cortar el texto en pantallas angostas.
 */
export function Faq({ seccion }) {
    const { theme } = useVitrina();
    const [abierta, setAbierta] = useState(0);
    const items = (seccion.items ?? []).filter((item) => item.question || item.answer);

    if (items.length === 0) {
        return <SinContenido texto="Preguntas frecuentes: escribe al menos una pregunta en el panel." />;
    }

    const marca = seccion.style === 'brand';

    return (
        <section className={`mx-auto max-w-4xl px-5 ${aire(theme).seccion}`}>
            <EncabezadoSeccion titulo={seccion.title} subtitulo={seccion.subtitle} alineacion="center" />

            <Superficie estilo={seccion.style === 'plain' ? 'plain' : seccion.style}>
                <ul className="divide-y" style={{ borderColor: marca ? 'color-mix(in srgb, var(--cat-sobre-primario) 20%, transparent)' : BORDE_SUAVE }}>
                    {items.map((item, indice) => (
                        <Pregunta
                            key={indice}
                            item={item}
                            abierta={abierta === indice}
                            marca={marca}
                            onAlternar={() => setAbierta(abierta === indice ? -1 : indice)}
                        />
                    ))}
                </ul>
            </Superficie>
        </section>
    );
}

function Pregunta({ item, abierta, marca, onAlternar }) {
    const panel = useId();

    return (
        <li className={abierta ? 'cat-fila-abierta' : ''}>
            <button
                type="button"
                onClick={onAlternar}
                aria-expanded={abierta}
                aria-controls={panel}
                className="cat-boton flex w-full items-center gap-4 py-4 text-left"
            >
                <span className="min-w-0 flex-1 font-semibold leading-snug" style={{ fontFamily: 'var(--cat-titulo)' }}>
                    {item.question || 'Pregunta sin escribir'}
                </span>
                <ChevronDown className="cat-signo h-5 w-5 shrink-0" style={{ color: marca ? 'currentColor' : 'var(--cat-primario)' }} />
            </button>

            <div id={panel} className="cat-desplegable" data-abierto={abierta ? '' : undefined} role="region">
                <div>
                    <p className="whitespace-pre-line pb-5 pr-10 text-sm leading-relaxed sm:text-base" style={tenue(marca)}>
                        {item.answer}
                    </p>
                </div>
            </div>
        </li>
    );
}

/* ── Testimonios ────────────────────────────────────────────────────────── */

export function Testimonios({ seccion }) {
    const { theme } = useVitrina();
    const items = (seccion.items ?? []).filter((item) => item.text || item.title);

    if (items.length === 0) {
        return <SinContenido texto="Testimonios: agrega al menos uno en el panel." />;
    }

    const marca = seccion.style === 'brand';
    const columnas = items.length === 1 ? 'sm:grid-cols-1' : items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

    return (
        <section className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <EncabezadoSeccion titulo={seccion.title} subtitulo={seccion.subtitle} alineacion="center" />

            <Superficie estilo={marca ? 'brand' : 'plain'}>
                <div className={`grid gap-4 sm:gap-6 ${columnas}`}>
                    {items.map((item, indice) => (
                        <Testimonio key={indice} item={item} indice={indice} marca={marca} estilo={seccion.style} />
                    ))}
                </div>
            </Superficie>
        </section>
    );
}

function Testimonio({ item, indice, marca, estilo }) {
    const { theme } = useVitrina();
    const ref = useAparecer(indice * 80);

    const fondos = {
        card: {
            background: 'var(--cat-superficie)',
            border: `1px solid ${BORDE_SUAVE}`,
            boxShadow: SOMBRAS[theme.shadow],
        },
        glass: {
            background: 'color-mix(in srgb, var(--cat-superficie) 55%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid color-mix(in srgb, var(--cat-texto) 10%, transparent)',
        },
        outline: { border: '1.5px solid color-mix(in srgb, var(--cat-primario) 32%, transparent)' },
        brand: { background: 'color-mix(in srgb, var(--cat-sobre-primario) 12%, transparent)' },
    };

    const caja = fondos[estilo];

    return (
        <figure
            ref={ref}
            className={`cat-aparecer flex h-full flex-col ${caja ? 'p-5' : ''}`}
            style={caja ? { ...caja, borderRadius: 'var(--cat-radio)' } : undefined}
        >
            {item.rating > 0 && (
                <div className="mb-3 flex gap-0.5" aria-label={`${item.rating} de 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                            key={n}
                            className="h-4 w-4"
                            style={{
                                color: marca ? 'var(--cat-sobre-primario)' : 'var(--cat-acento)',
                                fill: n <= item.rating ? 'currentColor' : 'transparent',
                                opacity: n <= item.rating ? 1 : 0.35,
                            }}
                        />
                    ))}
                </div>
            )}

            {item.text && (
                <blockquote className="flex-1 text-pretty text-sm leading-relaxed sm:text-base" style={tenue(marca)}>
                    “{item.text}”
                </blockquote>
            )}

            {item.title && (
                <figcaption className="mt-4 flex items-center gap-2.5">
                    <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold"
                        style={{
                            background: marca
                                ? 'color-mix(in srgb, var(--cat-sobre-primario) 20%, transparent)'
                                : 'color-mix(in srgb, var(--cat-primario) 14%, transparent)',
                            color: marca ? 'var(--cat-sobre-primario)' : 'var(--cat-primario)',
                        }}
                    >
                        {item.title.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold">{item.title}</span>
                </figcaption>
            )}
        </figure>
    );
}

/* ── Cifras ─────────────────────────────────────────────────────────────── */

const COLUMNAS_CIFRAS = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
};

export function Cifras({ seccion }) {
    const { theme } = useVitrina();
    const items = (seccion.items ?? []).filter((item) => item.value || item.title);

    if (items.length === 0) {
        return <SinContenido texto="Cifras: escribe al menos un número y su etiqueta en el panel." />;
    }

    const marca = seccion.style === 'brand';

    return (
        <section className={`mx-auto max-w-6xl px-5 ${aire(theme).seccion}`}>
            <EncabezadoSeccion titulo={seccion.title} subtitulo={seccion.subtitle} alineacion="center" />

            <Superficie estilo={seccion.style}>
                <div className={`grid gap-6 ${COLUMNAS_CIFRAS[Math.min(items.length, 4)] ?? COLUMNAS_CIFRAS[3]}`}>
                    {items.map((item, indice) => (
                        <Cifra key={indice} item={item} indice={indice} marca={marca} />
                    ))}
                </div>
            </Superficie>
        </section>
    );
}

function Cifra({ item, indice, marca }) {
    const ref = useAparecer(indice * 90);

    return (
        <div ref={ref} className="cat-aparecer text-center">
            <p
                className="font-bold leading-none tabular-nums"
                style={{
                    fontFamily: 'var(--cat-titulo)',
                    fontSize: 'clamp(2rem, 6vw, 3.25rem)',
                    color: marca ? 'var(--cat-sobre-primario)' : 'var(--cat-primario)',
                }}
            >
                {item.value}
            </p>
            {item.title && (
                <p className="mt-2 text-xs uppercase tracking-wide sm:text-sm" style={tenue(marca)}>
                    {item.title}
                </p>
            )}
        </div>
    );
}

/* ── Separador decorativo ───────────────────────────────────────────────── */

/**
 * Figura entre dos bloques.
 *
 * Se dibuja con SVG y color de marca, no con una imagen: pesa nada, toma
 * la paleta del comercio y no hay archivo que se pueda perder.
 */
export function Separador({ seccion }) {
    const ref = useAparecer();
    const figura = seccion.shape ?? 'wave';

    if (figura === 'line') {
        return (
            <div ref={ref} className="cat-aparecer px-5 py-8">
                <span className="cat-separador-linea block" />
            </div>
        );
    }

    if (figura === 'dots') {
        return (
            <div ref={ref} className="cat-aparecer cat-separador-puntos px-5 py-8">
                <span />
                <span />
                <span />
            </div>
        );
    }

    const figuras = {
        wave: 'M0,40 C240,96 480,-16 720,24 C960,64 1200,96 1440,48 L1440,96 L0,96 Z',
        slant: 'M0,96 L1440,0 L1440,96 Z',
        curve: 'M0,96 C360,8 1080,8 1440,96 Z',
        zigzag: 'M0,96 L180,24 L360,96 L540,24 L720,96 L900,24 L1080,96 L1260,24 L1440,96 Z',
    };

    return (
        <div ref={ref} className="cat-aparecer">
            <svg viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true" className="cat-separador">
                <path d={figuras[figura] ?? figuras.wave} fill="currentColor" />
            </svg>
        </div>
    );
}

/* ── Pie, WhatsApp flotante y volver arriba ─────────────────────────────── */

export function PieCatalogo() {
    const { theme, comercio } = useVitrina();
    const { plataforma } = usePage().props;
    const redes = redesDelTema(theme);
    // El nombre de la plataforma lo decide el admin en sus ajustes
    const marca = plataforma?.marca ?? 'Despashop';

    return (
        <footer className="mt-auto" style={{ borderTop: `1px solid ${BORDE_SUAVE}` }}>
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-3">
                    {theme.logo_url && <img src={theme.logo_url} alt="" className="h-8 w-auto max-w-[120px] object-contain" />}
                    <p className="font-semibold" style={{ fontFamily: 'var(--cat-titulo)' }}>
                        {comercio.name}
                    </p>
                </div>

                {redes.length > 0 && (
                    <div className="flex gap-1">
                        {redes.map(([red, url]) => (
                            <a
                                key={red}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={NOMBRES_REDES[red]}
                                className="cat-enlace grid h-10 w-10 place-items-center rounded-full"
                                style={{ color: 'var(--cat-tenue)' }}
                            >
                                <IconoRed red={red} className="h-[18px] w-[18px]" />
                            </a>
                        ))}
                    </div>
                )}

                <p className="text-xs" style={{ color: 'var(--cat-tenue)' }}>
                    © {new Date().getFullYear()} {comercio.name} · Hecho con {marca}
                </p>
            </div>
        </footer>
    );
}

export function BotonWhatsapp() {
    const { comercio, theme } = useVitrina();

    return (
        <a
            href={enlaceWhatsapp(comercio, null, theme.whatsapp_message)}
            target="_blank"
            rel="noreferrer"
            aria-label="Escribir por WhatsApp"
            className="cat-boton cat-pulso fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg"
            style={{ background: '#25D366' }}
        >
            <MessageCircle className="h-6 w-6" />
        </a>
    );
}

export function VolverArriba() {
    const { comercio } = useVitrina();
    const { lejos } = useDesplazamiento();

    return (
        <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Volver arriba"
            tabIndex={lejos ? 0 : -1}
            className={`cat-volver fixed right-6 z-40 grid h-11 w-11 place-items-center rounded-full ${
                comercio.whatsapp ? 'bottom-[5.5rem]' : 'bottom-5'
            }`}
            data-visible={lejos ? '' : undefined}
            style={{
                background: 'var(--cat-superficie)',
                color: 'var(--cat-texto)',
                border: `1px solid ${BORDE_SUAVE}`,
                boxShadow: SOMBRAS.lg,
            }}
        >
            <ArrowUp className="h-5 w-5" />
        </button>
    );
}

/** Barra delgada arriba que muestra cuánto se ha recorrido de la página. */
export function BarraDeProgreso() {
    const progreso = useProgresoDeScroll();

    return (
        <div
            aria-hidden="true"
            className="cat-progreso"
            style={{ transform: `scaleX(${progreso})` }}
        />
    );
}
