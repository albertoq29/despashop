import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Check,
    FileText,
    Gift,
    Link2,
    Package,
    Palette,
} from 'lucide-react';
import AvisoFlotante from '@/Components/AvisoFlotante';
import CambiarTema from '@/Components/CambiarTema';
import Marca from '@/Components/Marca';
import { useRevelar } from '@/hooks/useRevelar';

export default function Bienvenida({
    ajustes,
    planes,
    diasDePrueba,
    registroAbierto,
    catalogosDestacados,
    vitrina,
    auth,
    aviso,
}) {
    const marca = ajustes.brand_name;

    return (
        <>
            {/* El nombre de la plataforma ya lo agrega la plantilla del título */}
            <Head title="Catálogo, inventario y facturas para tu negocio">
                {ajustes.landing_meta_description && (
                    <meta name="description" content={ajustes.landing_meta_description} />
                )}
            </Head>

            <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
                <CintaDeAnuncio
                    texto={ajustes.landing_announcement}
                    enlace={ajustes.landing_announcement_link}
                />

                <BarraSuperior marca={marca} auth={auth} registroAbierto={registroAbierto} />

                <main>
                    <Portada ajustes={ajustes} registroAbierto={registroAbierto} auth={auth} />

                    {/* Lo elegido a mano va primero: es el argumento fuerte.
                        La tira de abajo solo dice cuántos ya publicaron. */}
                    <Escaparate
                        catalogos={vitrina}
                        titulo={ajustes.showcase_title}
                        subtitulo={ajustes.showcase_subtitle}
                    />

                    {catalogosDestacados?.length > 0 && <Vitrina catalogos={catalogosDestacados} />}

                    <Capacidades />

                    <ComoEmpezar />

                    <Facturacion />

                    <Planes
                        planes={planes}
                        diasDePrueba={diasDePrueba}
                        titulo={ajustes.plans_title}
                        subtitulo={ajustes.plans_subtitle}
                        registroAbierto={registroAbierto}
                    />

                    <LlamadaFinal ajustes={ajustes} registroAbierto={registroAbierto} auth={auth} />
                </main>

                <PieDePagina marca={marca} ajustes={ajustes} />
            </div>

            <AvisoFlotante aviso={aviso} />
        </>
    );
}

/**
 * Cinta de anuncio sobre la barra.
 *
 * Es el sitio más barato para avisar de algo —una promoción, un feriado,
 * un cambio de precios— porque no tapa nada ni hay que cerrarlo. Para algo
 * que sí tiene que detener al visitante están los avisos flotantes.
 */
function CintaDeAnuncio({ texto, enlace }) {
    if (!texto) {
        return null;
    }

    const contenido = (
        <span className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-2.5 text-center text-sm font-medium">
            {texto}
            {enlace && <ArrowRight className="h-4 w-4 shrink-0" />}
        </span>
    );

    return (
        <div className="bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950">
            {enlace ? (
                <a href={enlace} className="block transition-opacity duration-150 hover:opacity-90">
                    {contenido}
                </a>
            ) : (
                contenido
            )}
        </div>
    );
}

/* ── Navegación ─────────────────────────────────────────────────────────── */

function BarraSuperior({ marca, auth, registroAbierto }) {
    return (
        <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/85">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
                <Link href={route('home')} aria-label={marca}>
                    <Marca marca={marca} className="h-6" />
                </Link>

                <nav className="flex items-center gap-2">
                    <a
                        href="#planes"
                        className="hidden rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors duration-150 ease-salida hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100 sm:block"
                    >
                        Planes
                    </a>

                    <CambiarTema compacto />

                    {auth?.user ? (
                        <Link
                            href={auth.user.role === 'admin' ? route('admin.dashboard') : route('dashboard')}
                            className="pulsable rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                        >
                            Mi panel
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route('login')}
                                className="pulsable rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                            >
                                Entrar
                            </Link>
                            {registroAbierto && (
                                <Link
                                    href={route('register')}
                                    className="pulsable rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
                                >
                                    Crear catálogo
                                </Link>
                            )}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}

/* ── Portada: composición partida, no centrada ──────────────────────────── */

function Portada({ ajustes, registroAbierto, auth }) {
    return (
        <section className="border-b border-stone-200 dark:border-stone-800">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-24">
                <div className="animate-aparecer">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-marca-700 dark:text-marca-400">
                        Catálogo, inventario y facturación
                    </p>

                    <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">
                        {ajustes.landing_headline}
                    </h1>

                    <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                        {ajustes.landing_subheadline}
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                        {!auth?.user && registroAbierto && (
                            <Link
                                href={route('register')}
                                className="pulsable group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-marca-700 px-7 py-3.5 text-base font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
                            >
                                {ajustes.landing_cta_primary}
                                <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-salida group-hover:translate-x-0.5" />
                            </Link>
                        )}

                        {!auth?.user && (
                            <Link
                                href={route('login')}
                                className="pulsable inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-stone-300 bg-white px-7 py-3.5 text-base font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                            >
                                {ajustes.landing_cta_secondary}
                            </Link>
                        )}

                        {auth?.user && (
                            <Link
                                href={auth.user.role === 'admin' ? route('admin.dashboard') : route('dashboard')}
                                className="pulsable inline-flex items-center justify-center gap-2 rounded-xl bg-marca-700 px-7 py-3.5 text-base font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                            >
                                Ir a mi panel
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>

                    {!registroAbierto && !auth?.user && (
                        <p className="mt-6 text-sm text-amber-700 dark:text-amber-400">
                            Por ahora no aceptamos solicitudes nuevas. Vuelve pronto.
                        </p>
                    )}
                </div>

                {/* Lo que se vende es el catálogo, así que lo que se enseña es
                    el catálogo. Antes había una foto de archivo que no era de
                    esto: además de no decir nada, era una llamada a otro
                    servidor justo en lo primero que pinta la página. */}
                <figure className="relative animate-aparecer [animation-delay:120ms]">
                    <div className="rounded-2xl border border-stone-200 bg-stone-100 p-4 dark:border-stone-800 dark:bg-stone-900 sm:p-5">
                        <VistaDelCatalogo />
                    </div>

                    <figcaption className="absolute -bottom-5 left-5 right-12 rounded-xl border border-stone-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 sm:right-16">
                        <span className="flex items-center gap-2 text-sm">
                            <Link2 className="h-4 w-4 shrink-0 text-marca-700 dark:text-marca-400" />
                            <span className="truncate font-medium text-stone-500 dark:text-stone-400">
                                tusitio.com/
                                <span className="text-stone-900 dark:text-stone-100">tunegocio</span>
                            </span>
                        </span>
                    </figcaption>
                </figure>
            </div>
        </section>
    );
}

/* ── Vitrina: tira horizontal con datos reales ──────────────────────────── */

function Vitrina({ catalogos }) {
    return (
        <section className="border-b border-stone-200 bg-white py-8 dark:border-stone-800 dark:bg-stone-900/40">
            <div className="mx-auto max-w-6xl px-5">
                <h2 className="text-sm font-medium text-stone-500 dark:text-stone-500">
                    Negocios que ya publicaron su catálogo
                </h2>

                <div className="scrollbar-slim -mx-5 mt-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
                    {catalogos.map((catalogo) => (
                        <a
                            key={catalogo.username}
                            href={catalogo.url}
                            className="pulsable flex shrink-0 snap-start items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 hover:border-stone-300 hover:bg-white dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                        >
                            {catalogo.logo_url ? (
                                <img src={catalogo.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                            ) : (
                                <span
                                    className="grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-semibold text-white"
                                    style={{ backgroundColor: catalogo.color || '#047857' }}
                                >
                                    {catalogo.name.charAt(0).toUpperCase()}
                                </span>
                            )}

                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">{catalogo.name}</span>
                                <span className="block truncate text-xs text-stone-500">/{catalogo.username}</span>
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ── Escaparate: los catálogos que el admin ancla ──────────────── */

/**
 * Catálogos elegidos a mano por cómo quedaron.
 *
 * La tira de arriba se llena sola por fecha y sirve para mostrar que la
 * plataforma se usa. Esta es otra cosa: enseña lo que se puede lograr, y
 * eso no lo decide una consulta —ni el más nuevo ni el que tiene más
 * productos es el mejor armado—.
 *
 * Cada tarjeta se pinta con la paleta de su comercio y no con la nuestra,
 * porque el argumento de la sección es justo que no se parecen entre sí.
 * Sin ninguno anclado la sección no existe: mejor eso que un hueco con dos
 * ejemplos de relleno.
 */
function Escaparate({ catalogos, titulo, subtitulo }) {
    const contenedor = useRevelar({ escalonado: 80 });

    if (!catalogos?.length) {
        return null;
    }

    return (
        <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/40">
            <div ref={contenedor} className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-marca-700 dark:text-marca-400">
                    Vitrina
                </p>

                <h2 className="revelar mt-4 max-w-[24ch] font-display text-3xl font-semibold tracking-tight md:text-4xl">
                    {titulo}
                </h2>

                {subtitulo && (
                    <p className="revelar mt-3 max-w-[55ch] text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                        {subtitulo}
                    </p>
                )}

                <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {catalogos.map((catalogo) => (
                        <TarjetaDeVitrina key={catalogo.username} catalogo={catalogo} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function TarjetaDeVitrina({ catalogo }) {
    const colores = catalogo.colores ?? {};
    const primario = colores.primario || '#047857';
    const fondo = colores.fondo || '#ffffff';
    const superficie = colores.superficie || '#f5f5f4';
    const texto = colores.texto || '#1c1917';

    return (
        <a
            href={catalogo.url}
            target="_blank"
            rel="noreferrer"
            className="revelar pulsable group flex flex-col overflow-hidden rounded-2xl border border-stone-200 transition-shadow duration-300 ease-salida hover:shadow-lg dark:border-stone-800"
        >
            {/* Un adelanto con sus propios colores: la portada si la tiene, y
                si no, su paleta, que ya dice bastante */}
            <span className="relative block h-36 overflow-hidden" style={{ background: fondo }}>
                {catalogo.cover_url ? (
                    <img
                        src={catalogo.cover_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-salida group-hover:scale-[1.04]"
                    />
                ) : (
                    <span
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(135deg, ${primario} 0%, ${superficie} 100%)` }}
                    />
                )}

                {catalogo.logo_url && (
                    <img
                        src={catalogo.logo_url}
                        alt=""
                        loading="lazy"
                        className="absolute bottom-3 left-3 h-12 w-12 rounded-xl object-cover ring-2 ring-white/90 dark:ring-stone-900/90"
                    />
                )}
            </span>

            <span className="flex flex-1 flex-col gap-1 p-5" style={{ background: superficie, color: texto }}>
                <span className="font-display text-lg font-semibold">{catalogo.name}</span>

                {(catalogo.nota || catalogo.titulo) && (
                    <span className="text-sm leading-relaxed opacity-75">
                        {catalogo.nota || catalogo.titulo}
                    </span>
                )}

                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: primario }}>
                    Ver el catálogo
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-salida group-hover:translate-x-0.5" />
                </span>
            </span>
        </a>
    );
}

/* ── Capacidades: rejilla asimétrica, celdas de distinto peso ───────────── */

function Capacidades() {
    const contenedor = useRevelar();

    return (
        <section className="border-b border-stone-200 dark:border-stone-800">
            <div ref={contenedor} className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
                <h2 className="revelar max-w-[20ch] font-display text-3xl font-semibold tracking-tight md:text-4xl">
                    Un panel para lo que hoy llevas en fotos y cuadernos
                </h2>

                <div className="mt-12 grid gap-4 md:grid-cols-6">
                    {/* La celda ancha enseña de lo que habla: un logo y los
                        colores que saca de él */}
                    <article className="revelar group relative col-span-full overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 md:col-span-4 md:row-span-2">
                        <DelLogoAlColor />

                        <div className="bg-white p-7 dark:bg-stone-900">
                            <Etiqueta Icono={Palette} />
                            <h3 className="mt-4 font-display text-xl font-semibold">
                                Tu logo define el color del catálogo
                            </h3>
                            <p className="mt-2 max-w-[55ch] leading-relaxed text-stone-600 dark:text-stone-400">
                                Subes el logo y la paleta se arma sola con sus colores dominantes. Si no te convence,
                                ajustas cada color a mano, cambias tipografías, banners y modales desde el módulo de
                                personalización.
                            </p>
                        </div>
                    </article>

                    <Celda
                        Icono={Package}
                        titulo="Inventario que cuadra"
                        texto="Precios al detal, al mayor y de distribuidor. El stock baja solo cuando facturas."
                        className="md:col-span-2"
                    />

                    <Celda
                        Icono={BarChart3}
                        titulo="Ganancias por producto"
                        texto="Costo, utilidad y pérdidas. Ves qué deja dinero y qué solo ocupa espacio."
                        className="md:col-span-2"
                        acentuada
                    />

                    <Celda
                        Icono={Link2}
                        titulo="Una dirección propia"
                        texto="Tu catálogo vive en una URL con el nombre de tu negocio. La compartes y ya."
                        className="md:col-span-3"
                    />

                    <Celda
                        Icono={FileText}
                        titulo="Facturas con tu marca"
                        texto="Guardas el estilo una vez y se aplica a todas las que emitas."
                        className="md:col-span-3"
                    />
                </div>
            </div>
        </section>
    );
}

function Celda({ Icono, titulo, texto, className = '', acentuada = false }) {
    return (
        <article
            className={`revelar rounded-2xl border p-7 transition-colors duration-200 ease-salida ${
                acentuada
                    ? 'border-marca-200 bg-marca-50 dark:border-marca-900 dark:bg-marca-950/40'
                    : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
            } ${className}`}
        >
            <Etiqueta Icono={Icono} acentuada={acentuada} />
            <h3 className="mt-4 font-display text-lg font-semibold">{titulo}</h3>
            <p className="mt-2 leading-relaxed text-stone-600 dark:text-stone-400">{texto}</p>
        </article>
    );
}

function Etiqueta({ Icono, acentuada = false }) {
    return (
        <span
            className={`grid h-10 w-10 place-items-center rounded-xl ${
                acentuada
                    ? 'bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950'
                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
            }`}
        >
            <Icono className="h-5 w-5" />
        </span>
    );
}

/* ── Cómo empezar: banda numerada con línea guía ────────────────────────── */

const PASOS = [
    { titulo: 'Solicita tu cuenta', texto: 'Eliges tu dirección y cuentas qué vendes.' },
    { titulo: 'Te aprobamos', texto: 'Revisamos cada solicitud a mano y activamos tu panel.' },
    { titulo: 'Cargas tu inventario', texto: 'Productos, fotos, precios y categorías.' },
    { titulo: 'Publicas tu catálogo', texto: 'Ajustas el diseño y compartes tu dirección.' },
];

function ComoEmpezar() {
    const contenedor = useRevelar({ escalonado: 80 });

    return (
        <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/40">
            <div ref={contenedor} className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
                <h2 className="revelar font-display text-3xl font-semibold tracking-tight md:text-4xl">
                    Cómo empezar
                </h2>

                <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {/* Línea guía continua, solo en escritorio */}
                    <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 top-5 hidden h-px bg-stone-200 dark:bg-stone-800 lg:block"
                    />

                    {PASOS.map((paso, indice) => (
                        <li key={paso.titulo} className="revelar relative">
                            <span className="relative grid h-10 w-10 place-items-center rounded-full border border-stone-300 bg-white font-display text-sm font-semibold text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100">
                                {indice + 1}
                            </span>

                            <h3 className="mt-5 font-display text-lg font-semibold">{paso.titulo}</h3>
                            <p className="mt-1.5 max-w-[34ch] leading-relaxed text-stone-600 dark:text-stone-400">
                                {paso.texto}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/* ── Facturación: bloque partido con la imagen a la izquierda ───────────── */

function Facturacion() {
    const contenedor = useRevelar();

    return (
        <section className="border-b border-stone-200 dark:border-stone-800">
            <div
                ref={contenedor}
                className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28"
            >
                <figure className="revelar order-last overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 p-5 dark:border-stone-800 dark:bg-stone-900 lg:order-first sm:p-8">
                    <VistaDeLaFactura />
                </figure>

                <div className="revelar">
                    <h2 className="max-w-[18ch] font-display text-3xl font-semibold tracking-tight md:text-4xl">
                        Factura como tu negocio, no como una plantilla
                    </h2>

                    <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                        Pones tu logo, tus datos fiscales y los colores que quieras. Eliges el formato, si va en hoja
                        completa o en ticket, y qué columnas aparecen. El estilo queda guardado.
                    </p>

                    <ul className="mt-8 space-y-3">
                        {[
                            'Logo propio o el mismo del catálogo',
                            'Cuatro diseños base y colores editables',
                            'Hoja A4, carta o ticket de 80 mm',
                            'Notas, condiciones y marca de agua',
                        ].map((linea) => (
                            <li key={linea} className="flex gap-3">
                                <Check className="mt-0.5 h-5 w-5 shrink-0 text-marca-700 dark:text-marca-400" />
                                <span className="text-stone-700 dark:text-stone-300">{linea}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/* ── Planes ─────────────────────────────────────────────────────────────── */

function Planes({ planes, diasDePrueba, titulo, subtitulo, registroAbierto }) {
    const contenedor = useRevelar({ escalonado: 70 });

    if (!planes?.length) {
        return null;
    }

    return (
        <section id="planes" className="scroll-mt-20 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/40">
            <div ref={contenedor} className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-marca-700 dark:text-marca-400">
                    Precios
                </p>

                <h2 className="revelar mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                    {titulo}
                </h2>

                {subtitulo && (
                    <p className="revelar mt-3 max-w-[55ch] text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                        {subtitulo}
                    </p>
                )}

                <div className="mt-12 grid gap-5 lg:grid-cols-3">
                    {planes.map((plan) => (
                        <article
                            key={plan.id}
                            className={`revelar relative flex flex-col rounded-2xl border p-7 ${
                                plan.is_featured
                                    ? 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
                                    : 'border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900'
                            }`}
                        >
                            {plan.badge && (
                                <span className="absolute -top-3 left-7 rounded-full bg-marca-700 px-3 py-1 text-xs font-semibold text-white dark:bg-marca-500 dark:text-stone-950">
                                    {plan.badge}
                                </span>
                            )}

                            <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                            {plan.tagline && (
                                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{plan.tagline}</p>
                            )}

                            <Precio plan={plan} diasDePrueba={diasDePrueba} />

                            <ul className="mt-7 flex-1 space-y-3">
                                {(plan.features || []).map((caracteristica) => (
                                    <li key={caracteristica} className="flex gap-2.5 text-sm">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-marca-700 dark:text-marca-400" />
                                        <span className="text-stone-700 dark:text-stone-300">{caracteristica}</span>
                                    </li>
                                ))}
                            </ul>

                            {registroAbierto && (
                                <Link
                                    href={`${route('register')}?plan=${plan.id}`}
                                    className={`pulsable mt-8 rounded-xl px-5 py-3 text-center text-sm font-semibold ${
                                        plan.is_featured
                                            ? 'bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400'
                                            : 'border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700'
                                    }`}
                                >
                                    {esPrueba(plan) ? 'Probarlo gratis' : 'Solicitar este plan'}
                                </Link>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Si el plan se está regalando ahora mismo. */
function esPrueba(plan) {
    return Boolean(plan.descuento_activo && plan.es_prueba_gratis);
}

/**
 * El precio, y lo que pasa si el plan está en oferta.
 *
 * Una prueba gratis no se cuenta como descuento. «$0.00 en vez de $12.00»
 * suena a error de la página; lo que hay que decir es cuántos días sale
 * gratis y cuánto cuesta después, que es la pregunta que viene detrás.
 * Si la oferta se limita por cupos, los que quedan empujan a decidir.
 */
function Precio({ plan, diasDePrueba }) {
    if (esPrueba(plan)) {
        const dias = plan.trial_days || diasDePrueba || 30;

        return (
            <>
                <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-marca-700 px-2.5 py-1 text-xs font-bold text-white dark:bg-marca-500 dark:text-stone-950">
                    <Gift className="h-3.5 w-3.5" />
                    {plan.discount_label || 'Prueba gratis'}
                    {plan.cupos_libres !== null && (
                        <span className="font-semibold">
                            · {plan.cupos_libres === 1 ? 'queda 1 cupo' : `quedan ${plan.cupos_libres} cupos`}
                        </span>
                    )}
                </p>

                <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-semibold tracking-tight">Gratis</span>
                    <span className="text-sm text-stone-500">
                        {dias} días
                    </span>
                </p>

                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Después ${precio(plan.price_usd)}
                    {periodo(plan.billing_period)}. No se cobra nada solo: renuevas si te sirvió.
                </p>
            </>
        );
    }

    return (
        <>
            {plan.descuento_activo && (
                <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {plan.discount_label || `${plan.discount_percent}% de descuento`}
                </p>
            )}

            <p className={`flex items-baseline gap-1.5 ${plan.descuento_activo ? 'mt-2' : 'mt-6'}`}>
                <span className="font-display text-4xl font-semibold tracking-tight">
                    ${precio(plan.descuento_activo ? plan.precio_final : plan.price_usd)}
                </span>

                {plan.descuento_activo && (
                    <span className="text-lg text-stone-400 line-through dark:text-stone-500">
                        ${precio(plan.price_usd)}
                    </span>
                )}

                <span className="text-sm text-stone-500">{periodo(plan.billing_period)}</span>
            </p>
        </>
    );
}

/* ── Cierre ─────────────────────────────────────────────────────────────── */

function LlamadaFinal({ ajustes, registroAbierto, auth }) {
    if (auth?.user || !registroAbierto) {
        return null;
    }

    return (
        <section className="border-b border-stone-200 dark:border-stone-800">
            <div className="mx-auto max-w-6xl px-5 py-20">
                <div className="rounded-2xl bg-stone-900 px-8 py-14 text-center dark:bg-stone-900 sm:px-14">
                    <h2 className="mx-auto max-w-[22ch] font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
                        Tu catálogo puede estar en línea esta semana
                    </h2>

                    <p className="mx-auto mt-4 max-w-[48ch] leading-relaxed text-stone-400">
                        Solicita tu cuenta, cargamos tu inventario y compartes tu dirección con tus clientes.
                    </p>

                    <Link
                        href={route('register')}
                        className="pulsable mt-8 inline-flex items-center gap-2 rounded-xl bg-marca-500 px-7 py-3.5 font-semibold text-stone-950 hover:bg-marca-400"
                    >
                        {ajustes.landing_cta_primary}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

const REDES = [
    ['social_instagram', 'Instagram'],
    ['social_facebook', 'Facebook'],
    ['social_tiktok', 'TikTok'],
];

function PieDePagina({ marca, ajustes }) {
    return (
        <footer>
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 text-sm text-stone-500 sm:flex-row">
                <p>
                    © {new Date().getFullYear()} {marca}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-5">
                    {REDES.filter(([clave]) => ajustes[clave]).map(([clave, nombre]) => (
                        <a
                            key={clave}
                            href={ajustes[clave]}
                            target="_blank"
                            rel="noreferrer"
                            className="transition-colors duration-150 ease-salida hover:text-stone-900 dark:hover:text-stone-200"
                        >
                            {nombre}
                        </a>
                    ))}

                    {ajustes.support_email && (
                        <a
                            href={`mailto:${ajustes.support_email}`}
                            className="transition-colors duration-150 ease-salida hover:text-stone-900 dark:hover:text-stone-200"
                        >
                            {ajustes.support_email}
                        </a>
                    )}
                    {/* Sin enlace propio, van a las condiciones de la plataforma */}
                    <a
                        href={ajustes.terms_url || route('terminos')}
                        className="transition-colors duration-150 ease-salida hover:text-stone-900 dark:hover:text-stone-200"
                    >
                        Términos y condiciones
                    </a>
                    {ajustes.privacy_url && (
                        <a
                            href={ajustes.privacy_url}
                            className="transition-colors duration-150 ease-salida hover:text-stone-900 dark:hover:text-stone-200"
                        >
                            Privacidad
                        </a>
                    )}
                    <CambiarTema className="ml-1" />
                </div>
            </div>
        </footer>
    );
}

/**
 * El precio sin centavos cuando son cero.
 *
 * Los planes suelen costar cifras redondas y «$12» se lee mejor que
 * «$12.00»; pero un descuento del 15% sobre 12 da 10,20 y ahí el centavo
 * sí importa, porque es el precio que se va a cobrar.
 */
function precio(valor) {
    const numero = Number(valor) || 0;

    return Number.isInteger(numero) ? numero.toFixed(0) : numero.toFixed(2);
}

function periodo(facturacion) {
    return (
        {
            monthly: '/mes',
            yearly: '/año',
            lifetime: 'pago único',
            free: 'gratis',
        }[facturacion] ?? ''
    );
}

/* ── Lo que se enseña en la portada y en las secciones ────────────── */

/**
 * Un catálogo de mentira, dibujado con marcado.
 *
 * Aquí había una foto de archivo de un servicio externo. No enseñaba el
 * producto, se la pedía a otro servidor en lo primero que pinta la página y
 * su texto alternativo describía algo que no estaba en la imagen. Esto pesa
 * nada, carga con la página y sí enseña lo que el comercio va a tener.
 */
function VistaDelCatalogo() {
    return (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
            {/* Cabecera del catálogo */}
            <div className="flex items-center gap-2.5 border-b border-stone-200 bg-marca-700 px-4 py-3 dark:border-stone-800 dark:bg-marca-800">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/15 text-xs font-bold text-white">
                    T
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">Tu negocio</span>
                    <span className="block truncate text-[11px] text-white/70">Abierto hoy</span>
                </span>
                <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white">
                    WhatsApp
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4">
                {ARTICULOS_DE_MUESTRA.map((articulo) => (
                    <div
                        key={articulo.nombre}
                        className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                    >
                        <div
                            aria-hidden="true"
                            className="h-16 w-full sm:h-20"
                            style={{ background: articulo.fondo }}
                        />
                        <div className="p-2.5">
                            <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-100">
                                {articulo.nombre}
                            </p>
                            <p className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-sm font-bold text-marca-700 dark:text-marca-400">
                                    {articulo.dolares}
                                </span>
                                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                                    {articulo.bolivares}
                                </span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Dos artículos cualquiera: lo que importa es la forma, no el rubro. */
const ARTICULOS_DE_MUESTRA = [
    {
        nombre: 'Torta tres leches',
        dolares: '$12,00',
        bolivares: 'Bs. 438,00',
        fondo: 'linear-gradient(135deg, #f5efe3 0%, #e9ddc7 100%)',
    },
    {
        nombre: 'Café molido 500 g',
        dolares: '$9,00',
        bolivares: 'Bs. 328,50',
        fondo: 'linear-gradient(135deg, #e6e9e3 0%, #cdd5c9 100%)',
    },
];

/** El logo y los colores que salen de él: justo lo que dice el bloque. */
function DelLogoAlColor() {
    return (
        <div className="flex h-56 items-center justify-center gap-6 bg-stone-100 px-6 dark:bg-stone-950 md:h-72 md:gap-10">
            <span
                aria-hidden="true"
                className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl font-display text-3xl font-semibold text-white shadow-sm md:h-24 md:w-24 md:text-4xl"
                style={{ background: 'linear-gradient(140deg, #0f766e 0%, #065f46 100%)' }}
            >
                T
            </span>

            <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-stone-400 dark:text-stone-600" />

            <span className="flex shrink-0 flex-col gap-2">
                {['#0f766e', '#065f46', '#f59e0b', '#f5f5f4'].map((color) => (
                    <span key={color} className="flex items-center gap-2.5">
                        <span
                            aria-hidden="true"
                            className="h-7 w-7 rounded-lg ring-1 ring-inset ring-black/10 md:h-9 md:w-9"
                            style={{ background: color }}
                        />
                        <span className="font-mono text-[10px] uppercase text-stone-500 dark:text-stone-400 md:text-xs">
                            {color}
                        </span>
                    </span>
                ))}
            </span>
        </div>
    );
}

/** Una factura con la marca del comercio, que es de lo que habla el bloque. */
function VistaDeLaFactura() {
    return (
        <div className="mx-auto max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4 dark:border-stone-800">
                <span className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-marca-700 text-sm font-bold text-white dark:bg-marca-600">
                        T
                    </span>
                    <span>
                        <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">Tu negocio</span>
                        <span className="block text-[11px] text-stone-500 dark:text-stone-400">J-00000000-0</span>
                    </span>
                </span>
                <span className="text-right">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Factura</span>
                    <span className="block text-sm font-bold text-stone-900 dark:text-stone-100">#0042</span>
                </span>
            </div>

            <div className="space-y-2.5 py-4">
                {RENGLONES_DE_MUESTRA.map(([concepto, cantidad, monto]) => (
                    <div key={concepto} className="flex items-baseline gap-3 text-xs">
                        <span className="min-w-0 flex-1 truncate text-stone-700 dark:text-stone-300">{concepto}</span>
                        <span className="shrink-0 text-stone-400">{cantidad}</span>
                        <span className="w-16 shrink-0 text-right font-mono text-stone-900 dark:text-stone-100">{monto}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-baseline justify-between border-t border-stone-200 pt-4 dark:border-stone-800">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Total</span>
                <span className="text-right">
                    <span className="block font-display text-lg font-bold text-stone-900 dark:text-stone-100">$34,50</span>
                    <span className="block text-[11px] text-stone-500 dark:text-stone-400">Bs. 1.259,25</span>
                </span>
            </div>
        </div>
    );
}

const RENGLONES_DE_MUESTRA = [
    ['Torta tres leches', '1', '$12,00'],
    ['Café molido 500 g', '2', '$18,00'],
    ['Queso llanero', '0,5 kg', '$4,50'],
];
