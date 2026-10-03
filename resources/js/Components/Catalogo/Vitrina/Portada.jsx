import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { BotonCatalogo, Imagen, irASeccion, SinContenido, useVitrina } from './Comunes';
import { estiloBoton, SOMBRAS } from './estilos';

/* ── Portada ────────────────────────────────────────────────────────────── */

const ALTURAS = {
    sm: 'py-12 sm:py-16',
    md: 'py-16 sm:py-24',
    lg: 'py-24 sm:py-36',
};

/** Fondo de la portada en caja. Con imagen, un velo asegura que el texto se lea. */
function fondoPortada(theme) {
    if (theme.hero_style === 'image' && theme.cover_url) {
        return {
            conImagen: true,
            estilo: {
                backgroundImage: `url(${theme.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            },
        };
    }

    if (theme.hero_style === 'solid') {
        return { conImagen: false, estilo: { background: 'var(--cat-primario)' } };
    }

    return {
        conImagen: false,
        degradado: true,
        estilo: { background: 'linear-gradient(120deg, var(--cat-primario), var(--cat-secundario))' },
    };
}

export function Portada() {
    const { theme, comercio } = useVitrina();
    const disposicion = theme.hero_layout ?? 'centered';
    const altura = ALTURAS[theme.hero_height] ?? ALTURAS.md;

    const titulo = theme.hero_title || comercio.name;
    const fondo = fondoPortada(theme);
    const alPulsar = (evento) => {
        if (!theme.hero_cta_link || theme.hero_cta_link.startsWith('#')) {
            evento.preventDefault();
            irASeccion('products');
        }
    };

    // Se llama como función y no como componente: definido aquí dentro,
    // React lo trataría como un tipo nuevo en cada render y la animación
    // de entrada se repetiría con cada tecla en el editor.
    const textos = (claro, alineacion) => (
        <div className={`relative ${alineacion === 'center' ? 'mx-auto text-center' : ''} max-w-2xl`}>
            <h1
                className="cat-entrada text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
                style={{ fontFamily: 'var(--cat-titulo)' }}
            >
                {titulo}
            </h1>

            {theme.hero_subtitle && (
                <p
                    className={`cat-entrada mt-5 max-w-[52ch] text-pretty text-base leading-relaxed sm:text-lg ${
                        alineacion === 'center' ? 'mx-auto' : ''
                    }`}
                    style={{ '--retraso': '80ms', opacity: claro ? 0.9 : undefined, color: claro ? undefined : 'var(--cat-tenue)' }}
                >
                    {theme.hero_subtitle}
                </p>
            )}

            {theme.hero_cta_text && (
                <div className="cat-entrada mt-8" style={{ '--retraso': '160ms' }}>
                    <BotonCatalogo
                        href={theme.hero_cta_link || '#productos'}
                        onClick={alPulsar}
                        brillo
                        className="group px-7 py-3.5 text-base"
                        estilo={
                            claro && fondo.conImagen
                                ? { background: '#ffffff', color: '#1c1917', borderRadius: theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)' }
                                : claro
                                ? {
                                      background: 'var(--cat-sobre-primario)',
                                      color: 'var(--cat-primario)',
                                      borderRadius: theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)',
                                  }
                                : estiloBoton(theme)
                        }
                    >
                        {theme.hero_cta_text}
                        <ArrowRight className="cat-flecha h-4 w-4" />
                    </BotonCatalogo>
                </div>
            )}
        </div>
    );

    // Minimalista: tipografía grande directamente sobre el fondo de la página
    if (disposicion === 'minimal') {
        return (
            <section className={`mx-auto max-w-6xl px-5 ${altura}`}>
                {textos(false, 'left')}
            </section>
        );
    }

    // Dividida: texto a un lado y la imagen enmarcada al otro
    if (disposicion === 'split') {
        return (
            <section className={`mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2 ${altura}`}>
                {textos(false, 'left')}

                <div
                    className="cat-entrada relative aspect-[4/3] overflow-hidden md:aspect-[5/4]"
                    style={{ '--retraso': '120ms', borderRadius: 'var(--cat-radio)', boxShadow: SOMBRAS[theme.shadow] }}
                >
                    {theme.cover_url ? (
                        <Imagen src={theme.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <div
                            className="cat-degradado-vivo grid h-full w-full place-items-center"
                            style={{ background: 'linear-gradient(135deg, var(--cat-primario), var(--cat-secundario), var(--cat-acento))' }}
                        >
                            {theme.logo_url ? (
                                <img src={theme.logo_url} alt="" className="max-h-32 max-w-[60%] object-contain" />
                            ) : (
                                <span
                                    className="text-7xl font-semibold"
                                    style={{ color: 'var(--cat-sobre-primario)', fontFamily: 'var(--cat-titulo)' }}
                                >
                                    {comercio.name.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    // Centrada o alineada a la izquierda: una caja con fondo de marca o imagen
    const izquierda = disposicion === 'left';

    return (
        <section className="mx-auto max-w-6xl px-5 pt-6">
            <div
                className={`relative overflow-hidden px-6 sm:px-14 ${altura} ${fondo.degradado ? 'cat-degradado-vivo' : ''}`}
                style={{
                    ...fondo.estilo,
                    borderRadius: 'var(--cat-radio)',
                    color: fondo.conImagen ? '#ffffff' : 'var(--cat-sobre-primario)',
                }}
            >
                {fondo.conImagen && (
                    <span
                        className="absolute inset-0"
                        style={{
                            background: izquierda
                                ? 'linear-gradient(90deg, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.15))'
                                : 'rgb(0 0 0 / 0.45)',
                        }}
                    />
                )}

                {/* Formas decorativas suaves en los fondos de color */}
                {!fondo.conImagen && (
                    <>
                        <span
                            aria-hidden="true"
                            className="cat-flotar pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-20"
                            style={{ background: 'radial-gradient(circle, var(--cat-sobre-primario), transparent 70%)' }}
                        />
                        <span
                            aria-hidden="true"
                            className="cat-flotar pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, var(--cat-sobre-primario), transparent 70%)', animationDelay: '-4s' }}
                        />
                    </>
                )}

                {textos(true, izquierda ? 'left' : 'center')}
            </div>
        </section>
    );
}

/* ── Carrusel de banners ────────────────────────────────────────────────── */

export function Carrusel() {
    const { theme, datos } = useVitrina();
    const banners = datos.banners;
    const [actual, setActual] = useState(0);
    const total = banners.length;
    const pausado = useRef(false);
    const toque = useRef(null);

    useEffect(() => {
        if (actual >= total) {
            setActual(0);
        }
    }, [actual, total]);

    useEffect(() => {
        if (!theme.banners_autoplay || total < 2) {
            return undefined;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return undefined;
        }

        const intervalo = setInterval(() => {
            if (!pausado.current && !document.hidden) {
                setActual((indice) => (indice + 1) % total);
            }
        }, Math.max(1500, theme.banners_interval));

        return () => clearInterval(intervalo);
    }, [theme.banners_autoplay, theme.banners_interval, total]);

    if (total === 0) {
        return <SinContenido texto="Banners: todavía no subiste ninguno. Agrégalos desde la pestaña Banners." />;
    }

    const ir = (delta) => setActual((indice) => (indice + delta + total) % total);

    // Deslizar con el dedo: basta un gesto corto y decidido
    const alTocar = (evento) => {
        toque.current = { x: evento.clientX, t: Date.now() };
    };
    const alSoltar = (evento) => {
        if (!toque.current) {
            return;
        }

        const distancia = evento.clientX - toque.current.x;
        const velocidad = Math.abs(distancia) / Math.max(1, Date.now() - toque.current.t);
        toque.current = null;

        if (Math.abs(distancia) > 50 || velocidad > 0.4) {
            ir(distancia < 0 ? 1 : -1);
        }
    };

    return (
        <section
            className="relative mx-auto max-w-6xl px-5 pt-6"
            onMouseEnter={() => (pausado.current = true)}
            onMouseLeave={() => (pausado.current = false)}
            aria-roledescription="carrusel"
        >
            <div
                className="relative touch-pan-y overflow-hidden"
                style={{ borderRadius: 'var(--cat-radio)', boxShadow: SOMBRAS[theme.shadow] }}
                onPointerDown={alTocar}
                onPointerUp={alSoltar}
                onPointerCancel={() => (toque.current = null)}
            >
                {banners.map((banner, indice) => (
                    <Diapositiva
                        key={banner.id}
                        banner={banner}
                        activa={indice === actual}
                        efecto={theme.banners_effect}
                        primera={indice === 0}
                    />
                ))}

                {theme.banners_arrows && total > 1 && (
                    <>
                        <FlechaCarrusel direccion="anterior" onClick={() => ir(-1)} />
                        <FlechaCarrusel direccion="siguiente" onClick={() => ir(1)} />
                    </>
                )}
            </div>

            {theme.banners_dots && total > 1 && (
                <div className="mt-3 flex justify-center gap-2">
                    {banners.map((banner, indice) => (
                        <button
                            key={banner.id}
                            type="button"
                            onClick={() => setActual(indice)}
                            aria-label={`Ir al banner ${indice + 1}`}
                            aria-current={indice === actual}
                            className="h-2 rounded-full transition-[width,background-color] duration-300 ease-salida"
                            style={{
                                width: indice === actual ? '1.75rem' : '0.5rem',
                                background:
                                    indice === actual
                                        ? 'var(--cat-primario)'
                                        : 'color-mix(in srgb, var(--cat-texto) 22%, transparent)',
                            }}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function Diapositiva({ banner, activa, efecto, primera }) {
    // Todas las diapositivas se apilan; solo cambia opacidad y transform,
    // que es lo que el navegador puede animar sin recalcular diseño.
    const transformaciones = {
        slide: activa ? 'translateX(0)' : 'translateX(4%)',
        fade: 'none',
        zoom: activa ? 'scale(1)' : 'scale(1.06)',
    };

    return (
        <div
            className={`${primera ? 'relative' : 'absolute inset-0'} transition-[opacity,transform] duration-700 ease-salida`}
            style={{
                opacity: activa ? 1 : 0,
                transform: transformaciones[efecto] ?? 'none',
                pointerEvents: activa ? 'auto' : 'none',
            }}
            aria-hidden={!activa}
        >
            {banner.image_url ? (
                <Imagen
                    src={banner.image_url}
                    alt={banner.title || ''}
                    className="aspect-[16/9] w-full object-cover sm:aspect-[3/1]"
                    loading={primera ? 'eager' : 'lazy'}
                    draggable={false}
                />
            ) : (
                <div
                    className="aspect-[16/9] w-full sm:aspect-[3/1]"
                    style={{ background: 'linear-gradient(120deg, var(--cat-primario), var(--cat-secundario))' }}
                />
            )}

            {(banner.title || banner.subtitle || banner.cta_text) && (
                <div
                    className={`absolute inset-0 flex flex-col justify-center gap-2 p-6 sm:p-12 ${ALINEACION[banner.text_position]} ${VELO[banner.overlay]}`}
                    style={{ color: banner.text_color || '#ffffff' }}
                >
                    {banner.title && (
                        <h2
                            className="text-balance text-2xl font-semibold tracking-tight sm:text-5xl"
                            style={{ fontFamily: 'var(--cat-titulo)' }}
                        >
                            {banner.title}
                        </h2>
                    )}
                    {banner.subtitle && <p className="max-w-[46ch] text-sm sm:text-lg">{banner.subtitle}</p>}
                    {banner.cta_text && (
                        <a
                            href={banner.link || '#productos'}
                            onClick={(e) => {
                                if (!banner.link || banner.link.startsWith('#')) {
                                    e.preventDefault();
                                    irASeccion('products');
                                }
                            }}
                            className="cat-boton cat-brillo mt-3 inline-flex w-fit items-center gap-2 px-6 py-3 text-sm font-semibold"
                            style={{
                                background: 'var(--cat-primario)',
                                color: 'var(--cat-sobre-primario)',
                                borderRadius: 'var(--cat-radio)',
                            }}
                        >
                            {banner.cta_text}
                            <ArrowRight className="cat-flecha h-4 w-4" />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

const ALINEACION = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
};

const VELO = {
    none: '',
    light: 'bg-white/45',
    dark: 'bg-black/45',
    gradient: 'bg-gradient-to-t from-black/70 via-black/20 to-transparent',
};

function FlechaCarrusel({ direccion, onClick }) {
    const anterior = direccion === 'anterior';
    const Icono = anterior ? ChevronLeft : ChevronRight;

    return (
        <button
            type="button"
            onClick={onClick}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={anterior ? 'Banner anterior' : 'Banner siguiente'}
            className={`cat-boton absolute top-[calc(50%-1.375rem)] grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 ${
                anterior ? 'left-3' : 'right-3'
            }`}
        >
            <Icono className="h-5 w-5" />
        </button>
    );
}
