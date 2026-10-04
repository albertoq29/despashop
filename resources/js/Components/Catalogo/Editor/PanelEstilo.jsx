import { router } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import {
    Deslizador,
    Desplegable,
    Grupo,
    Interruptor,
    OpcionesVisuales,
    ReversionDeColores,
    Segmentado,
    SelectorColor,
    SelectorFuente,
    SoloCompleto,
    useModoFacil,
} from './Controles';
import { DibujoAnimacion, DibujoBoton, DibujoEntrada, DibujoEsquinas, DibujoFondo, DibujoTitulo } from './Dibujos';
import { coloresDeMuestra } from './PanelSecciones';
import TemasRapidos from './TemasRapidos';

/** Animaciones de entrada ya armadas. El orden es el del panel. */
const ENTRADAS = [
    ['up', 'Desde abajo'],
    ['down', 'Desde arriba'],
    ['left', 'Izquierda'],
    ['right', 'Derecha'],
    ['fade', 'Fundido'],
    ['zoom', 'Acercar'],
    ['blur', 'Desenfoque'],
    ['flip', 'Giro'],
];

const COLORES = [
    ['color_primary', 'Principal'],
    ['color_secondary', 'Secundario'],
    ['color_accent', 'Acento'],
    ['color_bg', 'Fondo'],
    ['color_surface', 'Tarjetas'],
    ['color_text', 'Texto'],
    ['color_muted', 'Texto tenue'],
];

/**
 * Los cuatro que cambian la cara del catálogo de verdad. Los otros tres son
 * matices que, mal elegidos, dejan texto ilegible sobre las tarjetas; en
 * modo fácil se quedan con el valor del tema.
 */
const COLORES_FACILES = ['color_primary', 'color_accent', 'color_bg', 'color_text'];

export default function PanelEstilo({ editor }) {
    const { datos, cambiar, theme, fuentes } = editor;
    const campo = (clave) => ({ valor: datos[clave], onCambiar: (valor) => cambiar(clave, valor) });
    const c = coloresDeMuestra(datos);
    const facil = useModoFacil();
    const colores = facil ? COLORES.filter(([clave]) => COLORES_FACILES.includes(clave)) : COLORES;

    return (
        <>
            <Grupo
                titulo="Temas rápidos"
                descripcion="Cambian colores, letras y formas de una vez; el contenido no se toca. Mira el resultado en la vista previa y guarda si te gusta."
            >
                <TemasRapidos datos={datos} onAplicar={editor.aplicarTema} />
            </Grupo>

            <Grupo titulo="Colores">
                {/* El botón de la paleta repinta igual que subir el logo, así
                    que la salida tiene que estar también aquí */}
                {editor.coloresPrevios && (
                    <ReversionDeColores
                        onRevertir={editor.revertirColores}
                        onCerrar={editor.olvidarColoresPrevios}
                    />
                )}

                {theme.logo_palette?.length > 0 && (
                    <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-950/60">
                        <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Colores de tu logo</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {theme.logo_palette.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => cambiar('color_primary', color)}
                                    title={`Usar ${color} como principal`}
                                    className="pulsable h-7 w-7 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10"
                                    style={{ background: color }}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(route('catalogo.logo.paleta'), {}, {
                                        preserveScroll: true,
                                        preserveState: true,
                                        onSuccess: editor.sincronizarColores,
                                    })
                                }
                                className="pulsable ml-auto inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Paleta del logo
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    {colores.map(([clave, etiqueta]) => (
                        <SelectorColor key={clave} etiqueta={etiqueta} {...campo(clave)} />
                    ))}
                </div>

                <Interruptor
                    etiqueta="Seguir los colores del logo"
                    ayuda="Si subes otro logo, la paleta se vuelve a generar sola."
                    valor={datos.palette_from_logo}
                    onCambiar={(v) => cambiar('palette_from_logo', v)}
                />
            </Grupo>

            <Grupo titulo="Tipografía">
                <SelectorFuente etiqueta="Títulos" {...campo('font_heading')} fuentes={fuentes} />
                <SelectorFuente etiqueta="Texto" {...campo('font_body')} fuentes={fuentes} />

                <SoloCompleto>
                    <OpcionesVisuales
                        etiqueta="Cómo se ven los títulos de sección"
                        columnas={4}
                        {...campo('heading_style')}
                        opciones={[
                            ['normal', 'Normal'],
                            ['upper', 'Mayúsculas'],
                            ['gradient', 'Degradado'],
                            ['underline', 'Subrayado'],
                        ].map(([valor, texto]) => ({ valor, texto, dibujo: <DibujoTitulo estilo={valor} c={c} /> }))}
                        ayuda={
                            {
                                normal: 'El título tal cual, con tu tipografía.',
                                upper: 'Todo en mayúsculas y con las letras más separadas.',
                                gradient: 'Las letras se pintan con tu color principal y tu acento.',
                                underline: 'Una línea corta de acento debajo de cada título.',
                            }[datos.heading_style]
                        }
                    />
                </SoloCompleto>
            </Grupo>

            <Grupo titulo="Formas">
                <OpcionesVisuales
                    etiqueta="Esquinas"
                    columnas={3}
                    {...campo('radius')}
                    opciones={[
                        ['none', 'Rectas'],
                        ['sm', 'Mínimas'],
                        ['md', 'Suaves'],
                        ['lg', 'Redondeadas'],
                        ['xl', 'Muy redondas'],
                        ['full', 'Máximas'],
                    ].map(([valor, texto]) => ({ valor, texto, dibujo: <DibujoEsquinas radio={valor} c={c} /> }))}
                />

                <OpcionesVisuales
                    etiqueta="Botones"
                    {...campo('button_style')}
                    opciones={[
                        ['solid', 'Relleno'],
                        ['outline', 'Contorno'],
                        ['soft', 'Suave'],
                        ['pill', 'Píldora'],
                    ].map(([valor, texto]) => ({ valor, texto, dibujo: <DibujoBoton estilo={valor} c={c} /> }))}
                />

                <SoloCompleto>
                    <Segmentado
                        etiqueta="Sombras"
                        {...campo('shadow')}
                        opciones={[
                            { valor: 'none', texto: 'Ninguna' },
                            { valor: 'sm', texto: 'Suave' },
                            { valor: 'md', texto: 'Media' },
                            { valor: 'lg', texto: 'Marcada' },
                        ]}
                    />

                    <Desplegable
                        etiqueta="Al pasar el mouse por un producto"
                        {...campo('card_hover')}
                        opciones={[
                            ['none', 'Nada'],
                            ['lift', 'Se eleva'],
                            ['zoom', 'Acerca la foto'],
                            ['border', 'Borde de color'],
                            ['glow', 'Resplandor de marca'],
                            ['tilt', 'Se inclina'],
                        ]}
                        ayuda="En el teléfono no hay puntero: este efecto solo se ve en computadora."
                    />

                    <Segmentado
                        etiqueta="Fotos de producto"
                        {...campo('image_fit')}
                        opciones={[
                            { valor: 'cover', texto: 'Rellenar recuadro' },
                            { valor: 'contain', texto: 'Foto completa' },
                        ]}
                    />

                    <Segmentado
                        etiqueta="Forma del recuadro de la foto"
                        {...campo('image_ratio')}
                        opciones={[
                            { valor: 'square', texto: 'Cuadrado' },
                            { valor: 'portrait', texto: 'Vertical' },
                            { valor: 'landscape', texto: 'Horizontal' },
                        ]}
                        ayuda="Vertical le sienta bien a la ropa; horizontal, a la comida y los muebles."
                    />

                    <Segmentado
                        etiqueta="Espacio entre elementos"
                        {...campo('density')}
                        opciones={[
                            { valor: 'compact', texto: 'Compacto' },
                            { valor: 'normal', texto: 'Normal' },
                            { valor: 'airy', texto: 'Amplio' },
                        ]}
                    />

                    <Segmentado
                        etiqueta="Precio"
                        {...campo('price_style')}
                        opciones={[
                            { valor: 'discreto', texto: 'Discreto' },
                            { valor: 'normal', texto: 'Normal' },
                            { valor: 'destacado', texto: 'Destacado' },
                        ]}
                    />
                </SoloCompleto>
            </Grupo>

            <Grupo titulo="Fondo de la página" avanzado>
                <OpcionesVisuales
                    columnas={3}
                    valor={datos.background_style === 'pattern' ? datos.background_pattern : datos.background_style}
                    onCambiar={(valor) => {
                        if (['solid', 'gradient'].includes(valor)) {
                            cambiar('background_style', valor);
                        } else {
                            editor.cambiarVarios({ background_style: 'pattern', background_pattern: valor });
                        }
                    }}
                    opciones={[
                        ['solid', 'Liso'],
                        ['gradient', 'Degradado'],
                        ['dots', 'Puntos'],
                        ['grid', 'Cuadrícula'],
                        ['diagonal', 'Diagonales'],
                        ['waves', 'Ondas'],
                    ].map(([valor, texto]) => ({
                        valor,
                        texto,
                        dibujo: <DibujoFondo tipo={valor} patron={['solid', 'gradient'].includes(valor) ? null : valor} c={c} />,
                    }))}
                />

                {datos.background_style !== 'solid' && (
                    <Deslizador
                        etiqueta="Intensidad"
                        {...campo('background_intensity')}
                        min={1}
                        max={30}
                        formato={(v) => `${v}%`}
                        ayuda="Poco suele verse mejor: el fondo no debe competir con los productos."
                    />
                )}
            </Grupo>

            <Grupo
                titulo="Movimiento"
                descripcion="Cómo aparecen los bloques al bajar y cómo responden los botones."
                avanzado
            >
                <OpcionesVisuales
                    etiqueta="Cuánto se mueve"
                    columnas={3}
                    {...campo('animation_level')}
                    opciones={[
                        ['none', 'Sin animación'],
                        ['subtle', 'Sutil'],
                        ['lively', 'Viva'],
                    ].map(([valor, texto]) => ({ valor, texto, dibujo: <DibujoAnimacion nivel={valor} c={c} /> }))}
                    ayuda={
                        {
                            none: 'Todo aparece de inmediato, sin efectos.',
                            subtle: 'Aparición suave y botones que responden al tocarlos. Recomendado.',
                            lively: 'Entradas más marcadas, reflejo en los botones y detalles en movimiento.',
                        }[datos.animation_level]
                    }
                />

                {datos.animation_level !== 'none' && (
                    <>
                        <OpcionesVisuales
                            etiqueta="Cómo entra cada bloque"
                            columnas={4}
                            {...campo('animation_entrance')}
                            opciones={ENTRADAS.map(([valor, texto]) => ({
                                valor,
                                texto,
                                dibujo: <DibujoEntrada entrada={valor} c={c} />,
                            }))}
                            ayuda="Elige una y mantenla en todo el catálogo: mezclar entradas se ve inquieto."
                        />

                        <Segmentado
                            etiqueta="Velocidad"
                            {...campo('animation_speed')}
                            opciones={[
                                { valor: 'slow', texto: 'Pausada' },
                                { valor: 'normal', texto: 'Normal' },
                                { valor: 'fast', texto: 'Rápida' },
                            ]}
                        />

                        <Interruptor
                            etiqueta="Entrada en cascada"
                            ayuda="En las filas y rejillas, cada pieza entra un instante después de la anterior."
                            valor={datos.animation_stagger}
                            onCambiar={(v) => cambiar('animation_stagger', v)}
                        />
                    </>
                )}

                <Interruptor
                    etiqueta="Barra de avance arriba"
                    ayuda="Una línea delgada que se llena mientras el visitante baja por el catálogo."
                    valor={datos.scroll_progress}
                    onCambiar={(v) => cambiar('scroll_progress', v)}
                />

                <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-[11px] leading-snug text-stone-600 dark:bg-stone-950/60 dark:text-stone-400">
                    Quien tenga activado «reducir movimiento» en su teléfono verá el catálogo quieto: eso lo
                    decide su equipo y no se puede forzar desde aquí.
                </p>
            </Grupo>
        </>
    );
}
