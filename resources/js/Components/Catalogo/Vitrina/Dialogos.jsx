import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { BotonCatalogo, PreciosPorVolumen, useVitrina } from './Comunes';
import { BORDE_SUAVE, enlaceWhatsapp, formatoBs, SOMBRAS } from './estilos';

/**
 * Cierre con animación de salida.
 *
 * El diálogo no se desmonta de golpe: primero marca que está saliendo, deja
 * correr la animación corta y recién ahí avisa que se cerró.
 */
function useCierreAnimado(onCerrar, duracion = 170) {
    const [saliendo, setSaliendo] = useState(false);
    const temporizador = useRef(null);

    const cerrar = useCallback(() => {
        if (temporizador.current) {
            return;
        }

        setSaliendo(true);
        temporizador.current = setTimeout(onCerrar, duracion);
    }, [onCerrar, duracion]);

    useEffect(() => () => clearTimeout(temporizador.current), []);

    return [saliendo, cerrar];
}

function useBloqueoDeScroll(cerrar) {
    useEffect(() => {
        const alPulsar = (evento) => evento.key === 'Escape' && cerrar();
        const anterior = document.body.style.overflow;

        document.addEventListener('keydown', alPulsar);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', alPulsar);
            document.body.style.overflow = anterior;
        };
    }, [cerrar]);
}

/* ── Vista rápida de un producto ────────────────────────────────────────── */

export function VistaRapida({ articulo, onCerrar }) {
    const { theme, comercio, bcvRate } = useVitrina();
    const [saliendo, cerrar] = useCierreAnimado(onCerrar);
    const botonCerrar = useRef(null);

    useBloqueoDeScroll(cerrar);
    useEffect(() => botonCerrar.current?.focus({ preventScroll: true }), []);

    // Aquí sí se muestra la foto completa; la liviana queda para los recuadros
    const fotos = [
        { full: articulo.image_url, mini: articulo.thumb_url },
        ...(articulo.images ?? []).map((imagen) => ({ full: imagen.image_url, mini: imagen.thumb_url })),
    ].filter((foto, indice, lista) => foto.full && lista.findIndex((otra) => otra.full === foto.full) === indice);
    const [fotoActual, setFotoActual] = useState(0);

    const precio = articulo.price_usdt;
    const esServicio = Boolean(articulo.esServicio);
    const agotado = !esServicio && articulo.stock !== null && Number(articulo.stock) <= 0 && !articulo.por_llegar;

    const variantesPorTipo = (articulo.variants ?? []).reduce((grupos, variante) => {
        (grupos[variante.type] ??= []).push(variante);

        return grupos;
    }, {});

    const estado = esServicio
        ? { texto: articulo.detalle ? `Servicio · ${articulo.detalle}` : 'Servicio', color: 'var(--cat-acento)' }
        : articulo.por_llegar
          ? { texto: 'Por llegar', color: 'var(--cat-acento)' }
          : agotado
            ? { texto: 'Agotado', color: 'var(--cat-tenue)' }
            : articulo.last_units && theme.show_stock
              ? { texto: 'Últimas unidades', color: 'var(--cat-acento)' }
              : { texto: 'Disponible', color: '#16a34a' };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 ${saliendo ? 'cat-saliendo' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={articulo.name}
        >
            <button type="button" aria-label="Cerrar" onClick={cerrar} className="cat-velo absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

            <div
                className="cat-dialogo relative flex max-h-[92dvh] w-full flex-col overflow-hidden sm:max-w-4xl sm:flex-row"
                style={{
                    background: 'var(--cat-fondo)',
                    color: 'var(--cat-texto)',
                    borderRadius: 'calc(var(--cat-radio) + 8px)',
                    boxShadow: SOMBRAS.lg,
                    fontFamily: 'var(--cat-cuerpo)',
                }}
            >
                <button
                    ref={botonCerrar}
                    type="button"
                    onClick={cerrar}
                    aria-label="Cerrar"
                    className="cat-boton absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Galería */}
                <div className="relative shrink-0 sm:w-1/2" style={{ background: 'color-mix(in srgb, var(--cat-primario) 8%, var(--cat-superficie))' }}>
                    <div className="relative aspect-square max-h-[46dvh] w-full overflow-hidden sm:max-h-none">
                        {fotos.length > 0 ? (
                            fotos.map((foto, indice) => (
                                <img
                                    key={foto.full}
                                    src={foto.full}
                                    alt={indice === fotoActual ? articulo.name : ''}
                                    className={`absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-salida ${
                                        theme.image_fit === 'contain' ? 'object-contain' : 'object-cover'
                                    }`}
                                    style={{
                                        opacity: indice === fotoActual ? 1 : 0,
                                        transform: indice === fotoActual ? 'scale(1)' : 'scale(1.03)',
                                    }}
                                />
                            ))
                        ) : (
                            <div className="grid h-full place-items-center">
                                <span className="text-7xl font-semibold" style={{ color: 'var(--cat-primario)', fontFamily: 'var(--cat-titulo)' }}>
                                    {articulo.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {fotos.length > 1 && (
                        <div className="cat-sin-barra absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/40 to-transparent p-3">
                            {fotos.map((foto, indice) => (
                                <button
                                    key={foto.full}
                                    type="button"
                                    onClick={() => setFotoActual(indice)}
                                    aria-label={`Foto ${indice + 1}`}
                                    aria-current={indice === fotoActual}
                                    className="cat-boton h-14 w-14 shrink-0 overflow-hidden rounded-lg transition-[outline-color] duration-200"
                                    style={{
                                        outline: `2px solid ${indice === fotoActual ? '#ffffff' : 'transparent'}`,
                                        outlineOffset: '2px',
                                    }}
                                >
                                    <img src={foto.mini ?? foto.full} alt="" loading="lazy" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Información */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: estado.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: estado.color }} />
                        {articulo.esCombo ? `Combo · ${estado.texto}` : estado.texto}
                    </span>

                    <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl" style={{ fontFamily: 'var(--cat-titulo)' }}>
                        {articulo.name}
                    </h2>

                    {theme.show_prices && (
                        <div className="mt-4">
                            {precio ? (
                                <>
                                    <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--cat-primario)' }}>
                                        ${Number(precio).toFixed(2)}
                                    </p>
                                    {theme.show_bs_prices && bcvRate > 1 && (
                                        <p className="mt-0.5 text-sm" style={{ color: 'var(--cat-tenue)' }}>
                                            Bs. {formatoBs(Number(precio) * bcvRate)}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-lg font-medium" style={{ color: 'var(--cat-tenue)' }}>
                                    Consultar precio
                                </p>
                            )}

                            <PreciosPorVolumen articulo={articulo} donde="modal" />

                            {articulo.conditional_price && articulo.conditional_min_quantity && (
                                <p
                                    className="mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-medium"
                                    style={{ background: 'color-mix(in srgb, var(--cat-acento) 14%, transparent)', color: 'var(--cat-texto)' }}
                                >
                                    Desde {articulo.conditional_min_quantity} unidades: ${Number(articulo.conditional_price).toFixed(2)} c/u
                                </p>
                            )}
                        </div>
                    )}

                    {articulo.description && (
                        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed sm:text-base" style={{ color: 'var(--cat-tenue)' }}>
                            {articulo.description}
                        </p>
                    )}

                    {articulo.incluye?.length > 0 && (
                        <div className="mt-5">
                            <p className="text-sm font-semibold">Incluye</p>
                            <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--cat-tenue)' }}>
                                {articulo.incluye.map((nombre) => (
                                    <li key={nombre} className="flex items-center gap-2">
                                        <span className="h-1 w-1 rounded-full" style={{ background: 'var(--cat-primario)' }} />
                                        {nombre}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {Object.entries(variantesPorTipo).map(([tipo, variantes]) => (
                        <div key={tipo} className="mt-5">
                            <p className="text-sm font-semibold capitalize">{tipo}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {variantes.map((variante) => (
                                    <span
                                        key={variante.id}
                                        className={`px-3 py-1.5 text-sm ${variante.agotada ? 'line-through opacity-50' : ''}`}
                                        style={{ border: `1px solid ${BORDE_SUAVE}`, borderRadius: '9999px' }}
                                    >
                                        {variante.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}

                    {comercio.whatsapp && (
                        <div className="mt-auto pt-8">
                            <BotonCatalogo
                                href={enlaceWhatsapp(comercio, articulo)}
                                externo
                                brillo
                                className="w-full py-3.5 text-base"
                            >
                                <MessageCircle className="h-5 w-5" />
                                {esServicio ? 'Pedir este servicio' : agotado ? 'Preguntar disponibilidad' : 'Pedir por WhatsApp'}
                            </BotonCatalogo>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Modales del comercio ───────────────────────────────────────────────── */

export function Modales({ modals }) {
    const [visible, setVisible] = useState(null);

    useEffect(() => {
        const candidato = modals.find((modal) => debeMostrarse(modal));

        if (!candidato) {
            return undefined;
        }

        const abrir = () => {
            setVisible(candidato);
            registrarMostrado(candidato);
        };

        if (candidato.trigger === 'load') {
            abrir();

            return undefined;
        }

        if (candidato.trigger === 'delay') {
            const temporizador = setTimeout(abrir, candidato.delay_seconds * 1000);

            return () => clearTimeout(temporizador);
        }

        if (candidato.trigger === 'scroll') {
            // Un centinela evita escuchar el scroll en cada fotograma
            const centinela = document.createElement('div');
            centinela.style.cssText = `position:absolute;top:${candidato.scroll_percent}%;height:1px;width:1px;pointer-events:none;`;
            document.body.appendChild(centinela);

            const observador = new IntersectionObserver((entradas) => {
                if (entradas.some((e) => e.isIntersecting)) {
                    abrir();
                    observador.disconnect();
                }
            });
            observador.observe(centinela);

            return () => {
                observador.disconnect();
                centinela.remove();
            };
        }

        if (candidato.trigger === 'exit') {
            const alSalir = (evento) => {
                if (evento.clientY <= 0) {
                    abrir();
                    document.removeEventListener('mouseout', alSalir);
                }
            };

            document.addEventListener('mouseout', alSalir);

            return () => document.removeEventListener('mouseout', alSalir);
        }

        return undefined;
    }, [modals]);

    if (!visible) {
        return null;
    }

    return <Modal modal={visible} onCerrar={() => setVisible(null)} />;
}

export function Modal({ modal, onCerrar }) {
    const { theme } = useVitrina();
    const [saliendo, cerrar] = useCierreAnimado(onCerrar);

    useBloqueoDeScroll(cerrar);

    const estiloBotonModal = {
        background: 'var(--cat-primario)',
        color: 'var(--cat-sobre-primario)',
        borderRadius: theme.button_style === 'pill' ? '9999px' : 'var(--cat-radio)',
    };

    return (
        <div
            className={`fixed inset-0 z-50 grid place-items-center p-5 ${saliendo ? 'cat-saliendo' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={modal.title || 'Aviso'}
        >
            <button type="button" aria-label="Cerrar" onClick={cerrar} className="cat-velo absolute inset-0 bg-black/55" />

            <div
                className={`cat-modal-${modal.animation ?? 'zoom'} relative w-full overflow-hidden ${ANCHO_MODAL[modal.size] ?? ANCHO_MODAL.md}`}
                style={{
                    background: 'var(--cat-fondo)',
                    color: 'var(--cat-texto)',
                    borderRadius: 'calc(var(--cat-radio) + 6px)',
                    boxShadow: SOMBRAS.lg,
                    fontFamily: 'var(--cat-cuerpo)',
                }}
            >
                <button
                    type="button"
                    onClick={cerrar}
                    aria-label="Cerrar"
                    className="cat-boton absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
                >
                    <X className="h-4 w-4" />
                </button>

                {modal.image_url && <img src={modal.image_url} alt="" className="aspect-[16/9] w-full object-cover" />}

                <div className="p-7 text-center">
                    {modal.title && (
                        <h2 className="text-balance text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--cat-titulo)' }}>
                            {modal.title}
                        </h2>
                    )}
                    {modal.body && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--cat-tenue)' }}>
                            {modal.body}
                        </p>
                    )}

                    {/* Sin enlace, el botón solo cierra el aviso: mandar a
                        ninguna parte confunde a quien lo pulsa. */}
                    {modal.cta_text && modal.cta_link ? (
                        <a
                            href={modal.cta_link}
                            onClick={cerrar}
                            className="cat-boton cat-brillo mt-6 inline-flex px-7 py-3 text-sm font-semibold"
                            style={estiloBotonModal}
                        >
                            {modal.cta_text}
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={cerrar}
                            className="cat-boton cat-brillo mt-6 inline-flex px-7 py-3 text-sm font-semibold"
                            style={estiloBotonModal}
                        >
                            {modal.cta_text || 'Entendido'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const ANCHO_MODAL = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

function debeMostrarse(modal) {
    if (modal.frequency === 'always') {
        return true;
    }

    try {
        const clave = `modal-${modal.id}`;

        if (modal.frequency === 'once_session') {
            return sessionStorage.getItem(clave) === null;
        }

        const guardado = localStorage.getItem(clave);

        return guardado === null || Date.now() - Number(guardado) > 86400000;
    } catch (e) {
        // Sin almacenamiento disponible se muestra una sola vez por carga
        return true;
    }
}

function registrarMostrado(modal) {
    try {
        const clave = `modal-${modal.id}`;

        if (modal.frequency === 'once_session') {
            sessionStorage.setItem(clave, '1');
        } else if (modal.frequency === 'once_day') {
            localStorage.setItem(clave, String(Date.now()));
        }
    } catch (e) {
        // El almacenamiento puede estar bloqueado; no es motivo para fallar
    }
}
