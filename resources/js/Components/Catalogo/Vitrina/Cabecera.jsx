import { MessageCircle } from 'lucide-react';
import { contrasteSobre } from '../colores';
import { irASeccion, SinContenido, useVitrina } from './Comunes';
import { BORDE_SUAVE, enlaceWhatsapp, TAMANO_LOGO } from './estilos';
import { useDesplazamiento } from './movimiento';

/* ── Cinta en movimiento ────────────────────────────────────────────────── */

export function Marquesina() {
    const { theme } = useVitrina();
    const texto = theme.marquee_text;

    if (!texto) {
        return <SinContenido texto="Cinta en movimiento: escribe su texto en el panel." />;
    }

    return (
        <div
            className="marquesina-pausa overflow-hidden py-2"
            style={{
                background: theme.marquee_bg || 'var(--cat-primario)',
                color:
                    theme.marquee_color ||
                    (theme.marquee_bg ? contrasteSobre(theme.marquee_bg) : 'var(--cat-sobre-primario)'),
            }}
        >
            <div
                className="marquesina flex w-max gap-10 whitespace-nowrap text-sm font-medium"
                style={{ '--velocidad': `${theme.marquee_speed}s` }}
            >
                {/* Se duplica el contenido para que el bucle no deje huecos */}
                {[0, 1].map((copia) => (
                    <span key={copia} className="flex gap-10" aria-hidden={copia === 1}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <span key={i} className="flex items-center gap-10">
                                {texto}
                                <span aria-hidden="true" className="opacity-50">
                                    ·
                                </span>
                            </span>
                        ))}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ── Aviso fijo ─────────────────────────────────────────────────────────── */

export function Anuncio() {
    const { theme } = useVitrina();

    if (!theme.announcement) {
        return <SinContenido texto="Aviso fijo: escribe el texto del aviso en el panel." />;
    }

    return (
        <div
            className="px-5 py-2.5 text-center text-sm font-medium"
            style={{ background: 'var(--cat-acento)', color: 'var(--cat-sobre-acento)' }}
        >
            {theme.announcement}
        </div>
    );
}

/* ── Cabecera ───────────────────────────────────────────────────────────── */

/** Accesos de la cabecera: solo a bloques visibles que tengan contenido. */
function accesos(theme, datos) {
    const nombres = {
        featured: (s) => (datos.novedades.length ? s.title || 'Novedades' : null),
        combos: (s) => (datos.combos.length ? s.title || 'Combos' : null),
        products: () => 'Productos',
        contact: () => 'Contacto',
    };

    return theme.sections
        .filter((s) => s.visible && nombres[s.type])
        .map((s) => ({ id: s.id, nombre: nombres[s.type](s) }))
        .filter((acceso) => acceso.nombre)
        .slice(0, 4);
}

export function Cabecera() {
    const { theme, comercio, datos } = useVitrina();
    const { desplazado } = useDesplazamiento();

    const centrada = theme.header_align === 'center';
    const estilo = theme.header_style ?? 'glass';
    const enlaces = theme.header_nav === false ? [] : accesos(theme, datos);

    // La cabecera mínima es transparente arriba y se vuelve sólida al
    // desplazar: sin fondo, el contenido pasaría ilegible por debajo.
    const fondos = {
        glass: {
            background: 'color-mix(in srgb, var(--cat-fondo) 82%, transparent)',
            backdropFilter: 'blur(14px) saturate(1.4)',
            borderBottom: `1px solid ${BORDE_SUAVE}`,
        },
        solid: { background: 'var(--cat-superficie)', borderBottom: `1px solid ${BORDE_SUAVE}` },
        brand: { background: 'var(--cat-primario)', color: 'var(--cat-sobre-primario)' },
        minimal: desplazado
            ? {
                  background: 'color-mix(in srgb, var(--cat-fondo) 90%, transparent)',
                  backdropFilter: 'blur(14px)',
                  borderBottom: `1px solid ${BORDE_SUAVE}`,
              }
            : { background: 'transparent', borderBottom: '1px solid transparent' },
    };

    const esMarca = estilo === 'brand';

    return (
        <header
            className="cat-cabecera"
            data-desplazado={desplazado && theme.header_sticky !== false ? '' : undefined}
            style={fondos[estilo] ?? fondos.glass}
        >
            <div
                className={`mx-auto flex max-w-6xl items-center gap-4 px-5 ${
                    centrada ? 'flex-col justify-center gap-3 py-4 text-center' : 'h-16 justify-between sm:h-[4.5rem]'
                }`}
            >
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex min-w-0 items-center gap-3 ${centrada ? 'flex-col' : ''}`}
                >
                    {theme.logo_url ? (
                        <img
                            src={theme.logo_url}
                            alt={comercio.name}
                            className={`w-auto max-w-[200px] object-contain ${TAMANO_LOGO[theme.logo_size] ?? 'h-10'}`}
                        />
                    ) : (
                        <span
                            className="grid h-10 w-10 shrink-0 place-items-center text-lg font-semibold"
                            style={{
                                background: esMarca ? 'var(--cat-sobre-primario)' : 'var(--cat-primario)',
                                color: esMarca ? 'var(--cat-primario)' : 'var(--cat-sobre-primario)',
                                borderRadius: 'var(--cat-radio)',
                                fontFamily: 'var(--cat-titulo)',
                            }}
                        >
                            {comercio.name.charAt(0).toUpperCase()}
                        </span>
                    )}

                    <span
                        className={`text-lg font-semibold tracking-tight ${centrada ? '' : 'truncate'}`}
                        style={{ fontFamily: 'var(--cat-titulo)' }}
                    >
                        {comercio.name}
                    </span>
                </a>

                {(enlaces.length > 0 || comercio.whatsapp) && (
                    <nav className={`hidden items-center gap-1 md:flex ${centrada ? '' : 'ml-auto'}`}>
                        {enlaces.map((enlace) => (
                            <a
                                key={enlace.id}
                                href={`#seccion-${enlace.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    irASeccion(enlace.id);
                                }}
                                className="cat-enlace rounded-full px-3.5 py-2 text-sm font-medium"
                            >
                                {enlace.nombre}
                            </a>
                        ))}

                        {comercio.whatsapp && !centrada && (
                            <a
                                href={enlaceWhatsapp(comercio)}
                                target="_blank"
                                rel="noreferrer"
                                className="cat-boton ml-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                                style={
                                    esMarca
                                        ? { background: 'var(--cat-sobre-primario)', color: 'var(--cat-primario)' }
                                        : { background: 'var(--cat-primario)', color: 'var(--cat-sobre-primario)' }
                                }
                            >
                                <MessageCircle className="h-4 w-4" />
                                Escríbenos
                            </a>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
}
