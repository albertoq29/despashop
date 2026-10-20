import { MessageCircle } from 'lucide-react';
import {
    aire,
    BORDE_SUAVE,
    ESTILO_PRECIO,
    estiloBoton,
    formatoBs,
    RELACION_IMAGEN,
    SOMBRAS,
    variablesDelTema,
} from '@/Components/Catalogo/Vitrina/estilos';

/**
 * El producto como lo verá un cliente, mientras se escribe.
 *
 * Quien carga un producto está mirando un formulario, no un catálogo, y hasta
 * ahora tenía que guardar y abrir su tienda en otra pestaña para saber si la
 * foto se veía bien o si el nombre se cortaba. Eso es un viaje de ida y
 * vuelta por cada duda.
 *
 * No es una tarjeta parecida: usa el tema guardado del comercio —sus colores,
 * sus letras, sus esquinas, su estilo de precio— con las mismas piezas que
 * arman la tarjeta de verdad. Lo que no se puede reproducir aquí es el
 * contexto, así que la rejilla, los filtros y el diálogo del producto quedan
 * fuera a propósito: esto responde «¿cómo queda lo que estoy escribiendo?»,
 * no «¿cómo queda mi catálogo?», que para eso está la vista previa del editor.
 */
export default function VistaPrevia({ theme, bcv = 0, articulo }) {
    if (!theme) {
        return null;
    }

    const { name, description, precio, imagen, esServicio, detalle, porUnidad, agotado, ultimas } = articulo;

    const recuadro = RELACION_IMAGEN[theme.image_ratio] ?? RELACION_IMAGEN.square;

    const estiloTarjeta = {
        elevated: { background: 'var(--cat-superficie)', boxShadow: SOMBRAS[theme.shadow] },
        flat: { background: 'var(--cat-superficie)' },
        bordered: { background: 'transparent', border: `1px solid ${BORDE_SUAVE}` },
        overlay: { background: 'var(--cat-superficie)', boxShadow: SOMBRAS[theme.shadow] },
    }[theme.card_style] ?? { background: 'var(--cat-superficie)' };

    return (
        <div
            style={{ ...variablesDelTema(theme), background: 'var(--cat-fondo)', color: 'var(--cat-texto)' }}
            className="rounded-xl p-4"
        >
            <div className="mx-auto max-w-[230px]">
                <article
                    className="flex flex-col overflow-hidden"
                    style={{ ...estiloTarjeta, borderRadius: 'var(--cat-radio)', fontFamily: 'var(--cat-cuerpo)' }}
                >
                    <div
                        className="relative"
                        style={{ background: 'color-mix(in srgb, var(--cat-primario) 8%, var(--cat-superficie))' }}
                    >
                        {imagen ? (
                            <img
                                src={imagen}
                                alt=""
                                className={`w-full ${recuadro} ${theme.image_fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                            />
                        ) : (
                            <div className={`grid place-items-center ${recuadro}`}>
                                <span
                                    className="text-4xl font-semibold opacity-80"
                                    style={{ color: 'var(--cat-primario)', fontFamily: 'var(--cat-titulo)' }}
                                >
                                    {(name || '?').charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}

                        {theme.show_product_badges !== false && (esServicio || agotado) && (
                            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
                                {esServicio && <Distintivo texto="Servicio" />}
                                {agotado && <Distintivo texto="Agotado" apagado />}
                            </div>
                        )}
                    </div>

                    <div className={`flex min-w-0 flex-1 flex-col ${aire(theme).tarjeta}`}>
                        <h3
                            className="line-clamp-2 text-sm font-semibold leading-snug"
                            style={{ fontFamily: 'var(--cat-titulo)' }}
                        >
                            {name || 'Sin nombre todavía'}
                        </h3>

                        {detalle && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--cat-tenue)' }}>
                                {detalle}
                            </p>
                        )}

                        {description && (
                            <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: 'var(--cat-tenue)' }}>
                                {description}
                            </p>
                        )}

                        {theme.show_stock && !agotado && ultimas && (
                            <p
                                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium"
                                style={{ color: 'var(--cat-acento)' }}
                            >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--cat-acento)' }} />
                                Últimas unidades
                            </p>
                        )}

                        <div className="mt-auto pt-3">
                            {theme.show_prices &&
                                (precio > 0 ? (
                                    <div className="flex flex-wrap items-baseline gap-x-2">
                                        <p
                                            className={ESTILO_PRECIO[theme.price_style] ?? ESTILO_PRECIO.normal}
                                            style={{ color: 'var(--cat-primario)' }}
                                        >
                                            ${Number(precio).toFixed(2)}
                                            {porUnidad && (
                                                <span className="text-xs font-normal opacity-70"> /{porUnidad}</span>
                                            )}
                                        </p>
                                        {theme.show_bs_prices && bcv > 1 && (
                                            <p className="text-xs" style={{ color: 'var(--cat-tenue)' }}>
                                                Bs. {formatoBs(Number(precio) * bcv)}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium" style={{ color: 'var(--cat-tenue)' }}>
                                        Consultar precio
                                    </p>
                                ))}

                            <span
                                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold"
                                style={estiloBoton(theme)}
                            >
                                <MessageCircle className="h-4 w-4" />
                                Consultar
                            </span>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
}

function Distintivo({ texto, apagado = false }) {
    return (
        <span
            className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm"
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
