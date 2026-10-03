import {
    BotonFalso,
    CampoFalso,
    Encabezado,
    Etiqueta,
    Mensaje,
    Muestra,
    Objetivo,
    Opcion,
    Pastilla,
    Palanca,
    Ventana,
} from './Escenario';

/**
 * Guion del tutorial de personalización del catálogo.
 *
 * Cada paso trae un texto corto, la pantalla de mentira que se va a ver y
 * la lista de acciones que el puntero hará solo. El estado `e` es el
 * catálogo imaginario: al cambiarlo, la vista previa de la derecha
 * reacciona igual que la de verdad.
 */

export const INICIAL = {
    pestana: 'estilo',
    tema: {
        id: 'sobrio',
        primario: '#292524',
        acento: '#b45309',
        fondo: '#ffffff',
        superficie: '#fafaf9',
        texto: '#1c1917',
        fuente: 'Inter',
        radio: 8,
        sombra: true,
        titulos: 'normal',
        fondoTipo: 'solid',
        relacion: 'square',
        nivel: 'subtle',
        entrada: 'up',
        velocidad: 'normal',
        cascada: true,
        barra: false,
    },
    bloques: [
        { id: 'marquee', nombre: 'Cinta en movimiento', visible: true, fijo: true },
        { id: 'header', nombre: 'Cabecera', visible: true, fijo: true },
        { id: 'hero', nombre: 'Portada', visible: true, fijo: true },
        { id: 'banners', nombre: 'Banners', visible: true, fijo: true },
        { id: 'products', nombre: 'Productos', visible: true, fijo: true },
    ],
    agregando: false,
    faqAbierta: null,
    guardado: false,
    publicado: false,
};

const TEMAS = {
    sobrio: {
        id: 'sobrio',
        primario: '#292524',
        acento: '#b45309',
        fondo: '#ffffff',
        superficie: '#fafaf9',
        texto: '#1c1917',
        fuente: 'Inter',
        radio: 8,
        titulos: 'normal',
        relacion: 'square',
    },
    cobalto: {
        id: 'cobalto',
        primario: '#1d4ed8',
        acento: '#f97316',
        fondo: '#ffffff',
        superficie: '#f1f5f9',
        texto: '#0f172a',
        fuente: 'Outfit',
        radio: 12,
        titulos: 'gradient',
        relacion: 'square',
    },
    editorial: {
        id: 'editorial',
        primario: '#1c1917',
        acento: '#9f1239',
        fondo: '#faf7f0',
        superficie: '#f2ede1',
        texto: '#1c1917',
        fuente: 'Playfair Display',
        radio: 0,
        titulos: 'upper',
        relacion: 'portrait',
    },
    medianoche: {
        id: 'medianoche',
        primario: '#e0b25c',
        acento: '#5eead4',
        fondo: '#0c0a09',
        superficie: '#1c1917',
        texto: '#f5f5f4',
        fuente: 'Outfit',
        radio: 20,
        titulos: 'gradient',
        relacion: 'portrait',
    },
};

const conTema = (clave) => (e) => ({ ...e, tema: { ...e.tema, ...TEMAS[clave] }, guardado: false });
const con = (cambios) => (e) => ({ ...e, tema: { ...e.tema, ...cambios }, guardado: false });

/* ── La vista previa del catálogo ───────────────────────────────────────── */

function fondoDeLaPagina(t) {
    if (t.fondoTipo === 'gradient') {
        return { background: `linear-gradient(160deg, ${t.fondo}, ${t.primario}22)` };
    }

    if (t.fondoTipo === 'dots') {
        return {
            backgroundColor: t.fondo,
            backgroundImage: `radial-gradient(${t.primario}33 1.2px, transparent 1.2px)`,
            backgroundSize: '9px 9px',
        };
    }

    return { backgroundColor: t.fondo };
}

function Titulo({ t, children, className = '' }) {
    const estilo = { fontFamily: `"${t.fuente}", system-ui, sans-serif`, color: t.texto };

    if (t.titulos === 'gradient') {
        estilo.backgroundImage = `linear-gradient(100deg, ${t.primario}, ${t.acento})`;
        estilo.WebkitBackgroundClip = 'text';
        estilo.backgroundClip = 'text';
        estilo.color = 'transparent';
    }

    if (t.titulos === 'upper') {
        estilo.textTransform = 'uppercase';
        estilo.letterSpacing = '0.08em';
    }

    return (
        <span className={`block font-bold ${className}`} style={estilo}>
            {children}
            {t.titulos === 'underline' && (
                <span className="mt-1 block h-[2px] w-6 rounded-full" style={{ background: t.acento }} />
            )}
        </span>
    );
}

/** El catálogo visto desde un teléfono. Se repinta con cada cambio del tema. */
export function VistaCatalogo({ estado }) {
    const t = estado.tema;
    const visible = (id) => estado.bloques.find((b) => b.id === id)?.visible;
    const tiene = (id) => estado.bloques.some((b) => b.id === id && b.visible);
    const alto = t.relacion === 'portrait' ? 'h-12' : 'h-9';

    return (
        <div className="mx-auto w-[168px] shrink-0 overflow-hidden rounded-[1.1rem] border-[5px] border-stone-800 bg-white shadow-lg dark:border-stone-700">
            <div className="h-[310px] overflow-hidden text-[7px]" style={fondoDeLaPagina(t)}>
                {t.barra && <span className="block h-[3px]" style={{ background: `linear-gradient(90deg, ${t.primario}, ${t.acento})`, width: '45%' }} />}

                {visible('marquee') && (
                    <div className="truncate px-1.5 py-[3px] text-center text-[6px] font-bold text-white" style={{ background: t.primario }}>
                        Envíos a todo el país · Pago móvil
                    </div>
                )}

                {visible('header') && (
                    <div className="flex items-center justify-between px-2 py-1.5" style={{ borderBottom: `1px solid ${t.texto}18` }}>
                        <Titulo t={t} className="text-[8px]">
                            Mi tienda
                        </Titulo>
                        <span className="flex gap-1">
                            <span className="block h-2 w-2 rounded-full" style={{ background: `${t.texto}22` }} />
                            <span className="block h-2 w-2 rounded-full" style={{ background: `${t.texto}22` }} />
                        </span>
                    </div>
                )}

                {visible('hero') && (
                    <div className="px-2 py-2.5 text-center" style={{ background: `${t.primario}0f` }}>
                        <Titulo t={t} className="text-[9px]">
                            Lo nuevo de la semana
                        </Titulo>
                        <span
                            className="mt-1.5 inline-block px-2 py-[3px] text-[6px] font-bold text-white"
                            style={{ background: t.primario, borderRadius: t.radio }}
                        >
                            Ver catálogo
                        </span>
                    </div>
                )}

                {visible('banners') && (
                    <div className="px-2 pt-2">
                        <div className="h-7" style={{ background: `${t.acento}44`, borderRadius: t.radio }} />
                    </div>
                )}

                {visible('products') && (
                    <div className="px-2 pt-2">
                        <Titulo t={t} className="mb-1 text-[7px]">
                            Productos
                        </Titulo>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: t.superficie,
                                        borderRadius: t.radio,
                                        boxShadow: t.sombra ? '0 2px 6px rgb(0 0 0 / 0.1)' : 'none',
                                    }}
                                >
                                    <div className={`${alto} rounded-t`} style={{ background: `${t.texto}14`, borderRadius: `${t.radio}px ${t.radio}px 0 0` }} />
                                    <div className="px-1 py-1">
                                        <span className="block h-[3px] w-10 rounded" style={{ background: `${t.texto}33` }} />
                                        <span className="mt-1 block text-[6px] font-bold" style={{ color: t.primario }}>
                                            $12,00
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tiene('faq') && (
                    <div className="mt-2 px-2">
                        <div style={{ background: t.superficie, borderRadius: t.radio }} className="px-1.5 py-1.5">
                            <Titulo t={t} className="mb-1 text-[7px]">
                                Preguntas frecuentes
                            </Titulo>
                            {['¿Hacen envíos?', '¿Cómo puedo pagar?'].map((pregunta, i) => (
                                <Objetivo key={pregunta} nombre={`faq-${i}`} resaltar={false}>
                                    <div style={{ borderTop: i > 0 ? `1px solid ${t.texto}14` : 'none' }} className="py-[3px]">
                                        <span className="flex items-center justify-between">
                                            <span className="text-[6.5px] font-bold" style={{ color: t.texto }}>
                                                {pregunta}
                                            </span>
                                            <span
                                                className="text-[7px] leading-none transition-transform duration-300"
                                                style={{
                                                    color: t.primario,
                                                    transform: estado.faqAbierta === i ? 'rotate(180deg)' : 'none',
                                                }}
                                            >
                                                ⌄
                                            </span>
                                        </span>
                                        <span
                                            className="grid overflow-hidden transition-all duration-300"
                                            style={{
                                                gridTemplateRows: estado.faqAbierta === i ? '1fr' : '0fr',
                                                opacity: estado.faqAbierta === i ? 1 : 0,
                                            }}
                                        >
                                            <span className="min-h-0">
                                                <span className="block pt-1 text-[6px] leading-snug" style={{ color: `${t.texto}aa` }}>
                                                    Sí, a todo el país. Escríbenos y te decimos el costo hasta tu zona.
                                                </span>
                                            </span>
                                        </span>
                                    </div>
                                </Objetivo>
                            ))}
                        </div>
                    </div>
                )}

                {tiene('stats') && (
                    <div className="mt-2 flex justify-around px-2 py-2" style={{ background: t.primario }}>
                        {[['+500', 'Clientes'], ['3', 'Años'], ['24h', 'Respuesta']].map(([n, l]) => (
                            <span key={l} className="text-center">
                                <span className="block text-[10px] font-bold text-white">{n}</span>
                                <span className="block text-[5px] uppercase tracking-wide text-white/80">{l}</span>
                            </span>
                        ))}
                    </div>
                )}

                {tiene('divider') && (
                    <svg viewBox="0 0 72 14" preserveAspectRatio="none" className="mt-1 block h-3 w-full" style={{ color: `${t.primario}33` }}>
                        <path d="M0,8 C12,14 24,2 36,6 C48,10 60,14 72,7 L72,14 L0,14 Z" fill="currentColor" />
                    </svg>
                )}

                {tiene('testimonials') && (
                    <div className="mt-1 px-2 pb-2">
                        <div className="px-1.5 py-1.5" style={{ background: t.superficie, borderRadius: t.radio }}>
                            <span className="block text-[7px]" style={{ color: t.acento }}>
                                ★★★★★
                            </span>
                            <span className="mt-0.5 block text-[6px] leading-snug" style={{ color: `${t.texto}aa` }}>
                                “Todo llegó tal cual y rapidísimo.”
                            </span>
                            <span className="mt-0.5 block text-[6px] font-bold" style={{ color: t.texto }}>
                                María G.
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── El panel de la izquierda, distinto en cada paso ────────────────────── */

function Marco({ children, estado, pestanas = true }) {
    return (
        <Ventana titulo="Despashop · Personalizar catálogo">
            <div className="flex flex-col gap-3 p-2.5 sm:flex-row">
                <div className="min-w-0 flex-1 space-y-2.5">
                    {pestanas && (
                        <div className="flex gap-1">
                            {[
                                ['secciones', 'Secciones'],
                                ['estilo', 'Estilo'],
                                ['banners', 'Banners'],
                                ['modales', 'Ventanas'],
                            ].map(([id, texto]) => (
                                <Pastilla key={id} nombre={`pestana-${id}`} activa={estado.pestana === id}>
                                    {texto}
                                </Pastilla>
                            ))}
                        </div>
                    )}
                    {children}
                </div>

                <VistaCatalogo estado={estado} />
            </div>
        </Ventana>
    );
}

function PanelTemas({ estado }) {
    return (
        <Marco estado={estado}>
            <Encabezado>Temas rápidos</Encabezado>
            <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(TEMAS).map(([clave, tema]) => (
                    <Opcion
                        key={clave}
                        nombre={`tema-${clave}`}
                        etiqueta={{ sobrio: 'Sobrio', cobalto: 'Cobalto', editorial: 'Editorial', medianoche: 'Medianoche' }[clave]}
                        elegida={estado.tema.id === clave}
                    >
                        <span className="flex h-7 items-end gap-0.5 rounded p-1" style={{ background: tema.fondo }}>
                            <span className="block h-full w-3 rounded-sm" style={{ background: tema.primario }} />
                            <span className="block h-2/3 w-3 rounded-sm" style={{ background: tema.acento }} />
                            <span className="block h-1/2 w-3 rounded-sm" style={{ background: tema.superficie }} />
                        </span>
                    </Opcion>
                ))}
            </div>
        </Marco>
    );
}

function PanelColores({ estado }) {
    return (
        <Marco estado={estado}>
            <Encabezado>Colores</Encabezado>
            <div className="flex flex-wrap gap-1.5">
                {['#1d4ed8', '#be185d', '#0f766e', '#dc2626', '#7c3aed', '#ca8a04'].map((color) => (
                    <Muestra key={color} nombre={`color-${color}`} color={color} elegida={estado.tema.primario === color} />
                ))}
            </div>
            <Objetivo nombre="paleta-logo" resaltar={false}>
                <span className="block rounded-md bg-stone-100 px-2 py-1.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    ✦ Usar la paleta de mi logo
                </span>
            </Objetivo>
            <Encabezado>Tipografía</Encabezado>
            <div className="flex gap-1">
                {['Inter', 'Outfit', 'Playfair Display'].map((fuente) => (
                    <Pastilla key={fuente} nombre={`fuente-${fuente}`} activa={estado.tema.fuente === fuente}>
                        {fuente.split(' ')[0]}
                    </Pastilla>
                ))}
            </div>
            <Encabezado>Títulos de sección</Encabezado>
            <div className="flex gap-1">
                {[
                    ['normal', 'Normal'],
                    ['upper', 'Mayúsc.'],
                    ['gradient', 'Degradado'],
                    ['underline', 'Subrayado'],
                ].map(([id, texto]) => (
                    <Pastilla key={id} nombre={`titulos-${id}`} activa={estado.tema.titulos === id}>
                        {texto}
                    </Pastilla>
                ))}
            </div>
        </Marco>
    );
}

function PanelFormas({ estado }) {
    return (
        <Marco estado={estado}>
            <Encabezado>Esquinas</Encabezado>
            <div className="flex gap-1">
                {[
                    [0, 'Rectas'],
                    [8, 'Suaves'],
                    [20, 'Muy redondas'],
                ].map(([radio, texto]) => (
                    <Pastilla key={radio} nombre={`radio-${radio}`} activa={estado.tema.radio === radio}>
                        {texto}
                    </Pastilla>
                ))}
            </div>
            <Encabezado>Sombra de las tarjetas</Encabezado>
            <Palanca nombre="sombra" etiqueta="Con sombra" encendida={estado.tema.sombra} />
            <Encabezado>Forma del recuadro de la foto</Encabezado>
            <div className="flex gap-1">
                {[
                    ['square', 'Cuadrado'],
                    ['portrait', 'Vertical'],
                    ['landscape', 'Horizontal'],
                ].map(([id, texto]) => (
                    <Pastilla key={id} nombre={`relacion-${id}`} activa={estado.tema.relacion === id}>
                        {texto}
                    </Pastilla>
                ))}
            </div>
            <Encabezado>Fondo de la página</Encabezado>
            <div className="grid grid-cols-3 gap-1.5">
                {[
                    ['solid', 'Liso'],
                    ['gradient', 'Degradado'],
                    ['dots', 'Puntos'],
                ].map(([id, texto]) => (
                    <Opcion key={id} nombre={`fondo-${id}`} etiqueta={texto} elegida={estado.tema.fondoTipo === id}>
                        <span className="block h-6 rounded" style={fondoDeLaPagina({ ...estado.tema, fondoTipo: id })} />
                    </Opcion>
                ))}
            </div>
        </Marco>
    );
}

function PanelMovimiento({ estado }) {
    return (
        <Marco estado={estado}>
            <Encabezado>Cuánto se mueve</Encabezado>
            <div className="flex gap-1">
                {[
                    ['none', 'Nada'],
                    ['subtle', 'Sutil'],
                    ['lively', 'Viva'],
                ].map(([id, texto]) => (
                    <Pastilla key={id} nombre={`nivel-${id}`} activa={estado.tema.nivel === id}>
                        {texto}
                    </Pastilla>
                ))}
            </div>
            <Encabezado>Cómo entra cada bloque</Encabezado>
            <div className="grid grid-cols-4 gap-1.5">
                {[
                    ['up', 'Abajo'],
                    ['right', 'Derecha'],
                    ['zoom', 'Acercar'],
                    ['blur', 'Desenfoque'],
                ].map(([id, texto]) => (
                    <Opcion key={id} nombre={`entrada-${id}`} etiqueta={texto} elegida={estado.tema.entrada === id}>
                        <span className="grid h-5 place-items-center overflow-hidden rounded">
                            <span
                                className="block h-2.5 w-6 rounded-sm"
                                style={{
                                    background: `${estado.tema.primario}cc`,
                                    animation: 'dibujo-entra 2.6s cubic-bezier(0.23,1,0.32,1) infinite',
                                    '--desde-transform':
                                        { up: 'translateY(6px)', right: 'translateX(8px)', zoom: 'scale(0.6)', blur: 'none' }[id],
                                    '--desde-filtro': id === 'blur' ? 'blur(2px)' : 'none',
                                }}
                            />
                        </span>
                    </Opcion>
                ))}
            </div>
            <Encabezado>Velocidad</Encabezado>
            <div className="flex gap-1">
                {[
                    ['slow', 'Pausada'],
                    ['normal', 'Normal'],
                    ['fast', 'Rápida'],
                ].map(([id, texto]) => (
                    <Pastilla key={id} nombre={`velocidad-${id}`} activa={estado.tema.velocidad === id}>
                        {texto}
                    </Pastilla>
                ))}
            </div>
            <div className="space-y-1.5 pt-1">
                <Palanca nombre="cascada" etiqueta="Entrada en cascada" encendida={estado.tema.cascada} />
                <Palanca nombre="barra" etiqueta="Barra de avance arriba" encendida={estado.tema.barra} />
            </div>
        </Marco>
    );
}

function PanelSecciones({ estado }) {
    return (
        <Marco estado={estado}>
            <Encabezado>Estructura de la página</Encabezado>
            <div className="space-y-1">
                {estado.bloques.map((bloque) => (
                    <Objetivo key={bloque.id} nombre={`bloque-${bloque.id}`} resaltar={false}>
                        <div
                            className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 transition-opacity duration-200 ${
                                bloque.visible ? 'border-stone-200 dark:border-stone-700' : 'border-dashed border-stone-300 opacity-50 dark:border-stone-700'
                            }`}
                        >
                            <Objetivo nombre={`asa-${bloque.id}`} resaltar={false}>
                                <span className="block cursor-grab text-[9px] leading-none text-stone-400">⠿</span>
                            </Objetivo>
                            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-stone-700 dark:text-stone-200">
                                {bloque.nombre}
                            </span>
                            {!bloque.fijo && <Etiqueta tono="marca">nuevo</Etiqueta>}
                            <Objetivo nombre={`ojo-${bloque.id}`} resaltar={false}>
                                <span className="block text-[9px] leading-none text-stone-400">{bloque.visible ? '👁' : '🚫'}</span>
                            </Objetivo>
                        </div>
                    </Objetivo>
                ))}
            </div>

            {estado.agregando ? (
                <div className="space-y-1 rounded-md border border-stone-200 p-1.5 dark:border-stone-700">
                    {[
                        ['faq', 'Preguntas frecuentes'],
                        ['testimonials', 'Testimonios'],
                        ['stats', 'Cifras'],
                        ['divider', 'Separador'],
                    ].map(([id, nombre]) => (
                        <Objetivo key={id} nombre={`nuevo-${id}`} resaltar={false}>
                            <span className="block rounded px-1.5 py-1 text-[10px] font-semibold text-stone-700 ring-1 ring-stone-200 dark:text-stone-200 dark:ring-stone-700">
                                {nombre}
                            </span>
                        </Objetivo>
                    ))}
                </div>
            ) : (
                <BotonFalso nombre="agregar-bloque" tono="contorno">
                    + Agregar bloque
                </BotonFalso>
            )}
        </Marco>
    );
}

function PanelGuardar({ estado }) {
    return (
        <Marco estado={estado}>
            {estado.guardado && <Mensaje tono="exito">Todo guardado</Mensaje>}

            {estado.publicado ? (
                <Mensaje tono="exito">
                    Catálogo publicado. Tu enlace: despashop.com/<strong>mi-tienda</strong>
                </Mensaje>
            ) : (
                <Mensaje tono="aviso">
                    Sin publicar: por ahora solo tú puedes verlo. Los cambios guardados no salen al público hasta que
                    publiques.
                </Mensaje>
            )}

            <div className="flex gap-1.5">
                <BotonFalso nombre="guardar" className="flex-1">
                    Guardar cambios
                </BotonFalso>
                <BotonFalso nombre="publicar" tono="exito" className="flex-1">
                    {estado.publicado ? 'Publicado' : 'Publicar'}
                </BotonFalso>
            </div>

            <Encabezado>Compartir</Encabezado>
            <CampoFalso nombre="enlace" valor="despashop.com/mi-tienda" />
        </Marco>
    );
}

function PanelEntrada({ estado }) {
    return (
        <Ventana titulo="Despashop">
            <div className="flex flex-col gap-3 p-2.5 sm:flex-row">
                <div className="flex flex-wrap gap-1 sm:w-28 sm:shrink-0 sm:flex-nowrap sm:flex-col sm:gap-1">
                    {[
                        ['panel', 'Panel'],
                        ['catalogo', 'Mi catálogo'],
                        ['personalizar', 'Personalizar'],
                        ['productos', 'Productos'],
                        ['facturas', 'Facturas'],
                    ].map(([id, nombre]) => (
                        <Objetivo key={id} nombre={`menu-${id}`} resaltar={false}>
                            <span
                                className={`block truncate rounded-md px-1.5 py-1 text-[10px] font-medium ${
                                    id === 'personalizar' && estado.pestana === 'estilo'
                                        ? 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300'
                                        : 'text-stone-500 dark:text-stone-400'
                                }`}
                            >
                                {nombre}
                            </span>
                        </Objetivo>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="mb-2 text-[11px] font-bold text-stone-700 dark:text-stone-200">Personalizar catálogo</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <span className="block h-2 w-16 rounded bg-stone-200 dark:bg-stone-800" />
                            <span className="block h-7 rounded bg-stone-100 dark:bg-stone-800" />
                            <span className="block h-7 rounded bg-stone-100 dark:bg-stone-800" />
                            <span className="block h-2 w-12 rounded bg-stone-200 dark:bg-stone-800" />
                            <span className="block h-10 rounded bg-stone-100 dark:bg-stone-800" />
                        </div>
                        <VistaCatalogo estado={estado} />
                    </div>
                </div>
            </div>
        </Ventana>
    );
}

/* ── Los pasos ──────────────────────────────────────────────────────────── */

const agregarBloque = (id, nombre) => (e) => ({
    ...e,
    agregando: false,
    guardado: false,
    bloques: [...e.bloques, { id, nombre, visible: true }],
});

export const PASOS_CATALOGO = [
    {
        titulo: 'Donde vive tu catálogo',
        texto: 'En el menú, «Personalizar». A la izquierda los controles, a la derecha tu catálogo de verdad. Todo lo que cambies se ve al instante, y nada sale al público hasta que guardes.',
        escena: PanelEntrada,
        acciones: [{ en: 'menu-personalizar', clic: (e) => e, nota: 'Catálogo → Personalizar', espera: 900 }],
    },
    {
        titulo: 'Diez temas listos para usar',
        texto: 'Es la forma rápida de empezar. Cada tema cambia colores, letras, formas, animación y proporción de las fotos de una sola vez. Tu contenido no se toca: ni textos, ni fotos, ni el orden de los bloques.',
        escena: PanelTemas,
        acciones: [
            { en: 'tema-cobalto', clic: conTema('cobalto'), nota: 'Probar «Cobalto»' },
            { en: 'tema-editorial', clic: conTema('editorial'), nota: 'Y «Editorial»' },
            { en: 'tema-medianoche', clic: conTema('medianoche'), nota: 'O uno oscuro', espera: 1100 },
        ],
    },
    {
        titulo: 'Tus colores y tus letras',
        texto: 'Si subiste tu logo, el botón de la paleta saca sus colores y los usa. También puedes elegirlos a mano, cambiar la tipografía y decidir cómo se ven los títulos: normales, en mayúsculas, con degradado o subrayados.',
        escena: PanelColores,
        acciones: [
            { en: 'color-#be185d', clic: con({ primario: '#be185d', id: 'propio' }), nota: 'Elegir el principal' },
            { en: 'paleta-logo', clic: con({ primario: '#0f766e', acento: '#f59e0b' }), nota: 'O sacarlos del logo' },
            { en: 'fuente-Playfair Display', clic: con({ fuente: 'Playfair Display' }), nota: 'Cambiar la letra' },
            { en: 'titulos-gradient', clic: con({ titulos: 'gradient' }), nota: 'Títulos en degradado', espera: 1100 },
        ],
    },
    {
        titulo: 'Las formas y el fondo',
        texto: 'Esquinas rectas o redondas, con sombra o sin ella, y la proporción del recuadro de las fotos: vertical le sienta a la ropa, horizontal a la comida y los muebles. El fondo de la página puede ser liso, degradado o con un patrón suave.',
        escena: PanelFormas,
        acciones: [
            { en: 'radio-20', clic: con({ radio: 20 }), nota: 'Esquinas muy redondas' },
            { en: 'relacion-portrait', clic: con({ relacion: 'portrait' }), nota: 'Fotos verticales' },
            { en: 'fondo-dots', clic: con({ fondoTipo: 'dots' }), nota: 'Fondo con puntos' },
            { en: 'sombra', clic: con({ sombra: false }), nota: 'Quitar la sombra', espera: 1100 },
        ],
    },
    {
        titulo: 'El movimiento, elegido por ti',
        texto: 'Cuánto se mueve, de dónde entra cada bloque (hay ocho entradas), a qué velocidad y si entran en cascada. Y si quieres, una barra delgada arriba que se llena mientras el visitante baja.',
        escena: PanelMovimiento,
        acciones: [
            { en: 'nivel-lively', clic: con({ nivel: 'lively' }), nota: 'Animación viva' },
            { en: 'entrada-blur', clic: con({ entrada: 'blur' }), nota: 'Que entre desenfocada' },
            { en: 'velocidad-fast', clic: con({ velocidad: 'fast' }), nota: 'Más rápida' },
            { en: 'barra', clic: con({ barra: true }), nota: 'Barra de avance', espera: 1100 },
        ],
    },
    {
        titulo: 'Ordenar y esconder bloques',
        texto: 'Tu catálogo es una lista de bloques. Arrastra uno por su asa para subirlo o bajarlo, y tócale el ojo para esconderlo sin borrarlo. También puedes hacer clic directo en la vista previa para editar lo que toques.',
        escena: PanelSecciones,
        acciones: [
            {
                en: 'asa-banners',
                arrastrar: 'bloque-hero',
                clic: (e) => ({
                    ...e,
                    guardado: false,
                    bloques: [
                        e.bloques[0],
                        e.bloques[1],
                        e.bloques[3],
                        e.bloques[2],
                        ...e.bloques.slice(4),
                    ],
                }),
                nota: 'Arrastrar los banners arriba',
            },
            {
                en: 'ojo-marquee',
                clic: (e) => ({
                    ...e,
                    guardado: false,
                    bloques: e.bloques.map((b) => (b.id === 'marquee' ? { ...b, visible: false } : b)),
                }),
                nota: 'Esconder la cinta',
                espera: 1100,
            },
        ],
    },
    {
        titulo: 'Preguntas que se abren solas',
        texto: 'El bloque de preguntas frecuentes son ventanas desplegables: el visitante toca una pregunta y se abre la respuesta. Las que contestes aquí son las que dejas de responder por WhatsApp.',
        escena: PanelSecciones,
        acciones: [
            { en: 'agregar-bloque', clic: (e) => ({ ...e, agregando: true }), nota: 'Agregar bloque' },
            { en: 'nuevo-faq', clic: agregarBloque('faq', 'Preguntas frecuentes'), nota: 'Preguntas frecuentes', espera: 900 },
            { en: 'faq-0', clic: (e) => ({ ...e, faqAbierta: 0 }), nota: 'Así lo ve tu cliente', espera: 1200 },
            { en: 'faq-1', clic: (e) => ({ ...e, faqAbierta: 1 }), nota: 'Una abierta a la vez', espera: 1200 },
        ],
    },
    {
        titulo: 'Testimonios, cifras y separadores',
        texto: 'Tres bloques más que puedes repetir donde quieras: lo que dicen tus clientes con sus estrellas, números grandes que dan confianza, y figuras decorativas para separar secciones.',
        escena: PanelSecciones,
        acciones: [
            { en: 'agregar-bloque', clic: (e) => ({ ...e, agregando: true }), nota: 'Otra vez «Agregar»' },
            { en: 'nuevo-stats', clic: agregarBloque('stats', 'Cifras'), nota: 'Cifras', espera: 700 },
            { en: 'agregar-bloque', clic: (e) => ({ ...e, agregando: true }) },
            { en: 'nuevo-divider', clic: agregarBloque('divider', 'Separador'), nota: 'Separador', espera: 700 },
            { en: 'agregar-bloque', clic: (e) => ({ ...e, agregando: true }) },
            { en: 'nuevo-testimonials', clic: agregarBloque('testimonials', 'Testimonios'), nota: 'Testimonios', espera: 1300 },
        ],
    },
    {
        titulo: 'Banners y ventanas emergentes',
        texto: 'En «Banners» subes las imágenes del carrusel y decides cada cuánto pasan. En «Ventanas» armas un aviso que aparece solo: al abrir, a los pocos segundos, al bajar o al intentar salir. Una bien puesta rinde más que tres.',
        escena: PanelTemas,
        acciones: [
            { en: 'pestana-banners', clic: (e) => ({ ...e, pestana: 'banners' }), nota: 'Pestaña Banners' },
            { en: 'pestana-modales', clic: (e) => ({ ...e, pestana: 'modales' }), nota: 'Pestaña Ventanas' },
            { en: 'pestana-estilo', clic: (e) => ({ ...e, pestana: 'estilo' }), espera: 900 },
        ],
    },
    {
        titulo: 'Guardar y publicar',
        texto: 'Son dos cosas distintas. «Guardar» conserva tus cambios; «Publicar» es lo que abre el catálogo al público. Mientras no publiques, el enlace solo lo ves tú. Cuando publiques, comparte ese enlace y listo.',
        escena: PanelGuardar,
        acciones: [
            { en: 'guardar', clic: (e) => ({ ...e, guardado: true }), nota: 'Guardar cambios', espera: 1000 },
            { en: 'publicar', clic: (e) => ({ ...e, publicado: true }), nota: 'Abrirlo al público', espera: 1200 },
        ],
    },
];
