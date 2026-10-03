/**
 * Miniaturas de las opciones de diseño.
 *
 * Se dibujan con los colores del propio comercio, así cada opción ya se
 * ve como quedaría en su catálogo y no como un esquema genérico.
 */

const linea = (ancho, color, alto = 3) => (
    <span className="block rounded-full" style={{ width: ancho, height: alto, background: color }} />
);

function Lienzo({ c, children, className = '' }) {
    return (
        <span
            className={`relative block h-12 w-full overflow-hidden rounded-md ring-1 ring-inset ring-black/5 ${className}`}
            style={{ background: c.fondo }}
        >
            {children}
        </span>
    );
}

export function DibujoCabecera({ estilo, c }) {
    const barras = {
        glass: { background: `${c.fondo}cc`, borderBottom: `1px solid ${c.texto}22` },
        solid: { background: c.superficie, borderBottom: `1px solid ${c.texto}22` },
        brand: { background: c.primario },
        minimal: { background: 'transparent' },
    };
    const colorLinea = estilo === 'brand' ? c.sobrePrimario : c.texto;

    return (
        <Lienzo c={c}>
            <span className="flex h-4 items-center gap-1 px-1.5" style={barras[estilo]}>
                <span className="h-2 w-2 rounded-sm" style={{ background: estilo === 'brand' ? c.sobrePrimario : c.primario }} />
                {linea(14, `${colorLinea}99`, 2)}
                <span className="flex-1" />
                {linea(6, `${colorLinea}66`, 2)}
                {linea(6, `${colorLinea}66`, 2)}
            </span>
            <span className="mx-1.5 mt-1.5 block space-y-1">
                {linea('70%', `${c.texto}22`, 3)}
                {linea('45%', `${c.texto}18`, 3)}
            </span>
        </Lienzo>
    );
}

export function DibujoPortada({ disposicion, c }) {
    const caja = { background: `linear-gradient(120deg, ${c.primario}, ${c.secundario})` };

    if (disposicion === 'minimal') {
        return (
            <Lienzo c={c}>
                <span className="absolute left-2 top-2.5 space-y-1">
                    {linea(34, c.texto, 4)}
                    {linea(22, `${c.texto}55`, 2)}
                    <span className="mt-1 block h-2 w-8 rounded-sm" style={{ background: c.primario }} />
                </span>
            </Lienzo>
        );
    }

    if (disposicion === 'split') {
        return (
            <Lienzo c={c}>
                <span className="absolute left-2 top-3 space-y-1">
                    {linea(22, c.texto, 3)}
                    {linea(16, `${c.texto}55`, 2)}
                    <span className="mt-1 block h-1.5 w-6 rounded-sm" style={{ background: c.primario }} />
                </span>
                <span className="absolute bottom-1.5 right-1.5 top-1.5 w-[42%] rounded" style={caja} />
            </Lienzo>
        );
    }

    const izquierda = disposicion === 'left';

    return (
        <Lienzo c={c}>
            <span
                className={`absolute inset-1.5 flex flex-col justify-center gap-1 rounded px-2 ${izquierda ? 'items-start' : 'items-center'}`}
                style={caja}
            >
                {linea(28, c.sobrePrimario, 3)}
                {linea(18, `${c.sobrePrimario}99`, 2)}
                <span className="mt-0.5 block h-1.5 w-6 rounded-sm" style={{ background: c.sobrePrimario }} />
            </span>
        </Lienzo>
    );
}

export function DibujoTarjeta({ estilo, c }) {
    const tarjeta = {
        elevated: { background: c.superficie, boxShadow: '0 2px 6px rgb(0 0 0 / 0.18)' },
        flat: { background: c.superficie },
        bordered: { border: `1px solid ${c.texto}33` },
        overlay: { background: c.superficie },
    }[estilo];

    return (
        <Lienzo c={c} className="flex items-center justify-center gap-1.5 px-2">
            {[0, 1].map((i) => (
                <span key={i} className="relative block h-9 w-8 overflow-hidden rounded" style={tarjeta}>
                    <span
                        className={`block ${estilo === 'overlay' ? 'h-full' : 'h-5'}`}
                        style={{ background: `linear-gradient(135deg, ${c.primario}55, ${c.secundario}55)` }}
                    />
                    {estilo === 'overlay' ? (
                        <span className="absolute bottom-1 left-1">{linea(14, '#ffffff', 2)}</span>
                    ) : (
                        <span className="block space-y-0.5 p-1">
                            {linea(16, `${c.texto}77`, 2)}
                            {linea(9, c.primario, 2)}
                        </span>
                    )}
                </span>
            ))}
        </Lienzo>
    );
}

export function DibujoFormato({ formato, c }) {
    const bloque = (clave, alto = 'h-3') => (
        <span key={clave} className={`block rounded-sm ${alto}`} style={{ background: `${c.primario}44` }} />
    );

    if (formato === 'list') {
        return (
            <Lienzo c={c} className="space-y-1 p-1.5">
                {[0, 1, 2].map((i) => (
                    <span key={i} className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `${c.primario}55` }} />
                        {linea('60%', `${c.texto}33`, 2)}
                    </span>
                ))}
            </Lienzo>
        );
    }

    if (formato === 'masonry') {
        return (
            <Lienzo c={c} className="grid grid-cols-3 gap-1 p-1.5">
                <span className="space-y-1">{[bloque(1, 'h-5'), bloque(2, 'h-3')]}</span>
                <span className="space-y-1">{[bloque(3, 'h-3'), bloque(4, 'h-5')]}</span>
                <span className="space-y-1">{[bloque(5, 'h-4'), bloque(6, 'h-4')]}</span>
            </Lienzo>
        );
    }

    return (
        <Lienzo c={c} className="grid grid-cols-3 gap-1 p-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => bloque(i, 'h-[15px]'))}
        </Lienzo>
    );
}

export function DibujoCategorias({ estilo, c }) {
    if (estilo === 'underline') {
        return (
            <Lienzo c={c} className="flex items-center px-2">
                <span className="relative flex w-full gap-2 pb-1.5" style={{ borderBottom: `1px solid ${c.texto}22` }}>
                    {linea(10, c.texto, 2)}
                    {linea(12, `${c.texto}55`, 2)}
                    {linea(9, `${c.texto}55`, 2)}
                    <span className="absolute -bottom-px left-0 h-0.5 w-2.5 rounded-full" style={{ background: c.primario }} />
                </span>
            </Lienzo>
        );
    }

    const redondeo = estilo === 'boxes' ? 'rounded-sm' : 'rounded-full';

    return (
        <Lienzo c={c} className="flex flex-wrap content-center items-center gap-1 px-2">
            <span className={`h-3 w-7 ${redondeo}`} style={{ background: c.primario }} />
            <span className={`h-3 w-6 ${redondeo}`} style={{ border: `1px solid ${c.texto}33` }} />
            <span className={`h-3 w-8 ${redondeo}`} style={{ border: `1px solid ${c.texto}33` }} />
        </Lienzo>
    );
}

export function DibujoBoton({ estilo, c }) {
    const base = { height: 14, width: 44, borderRadius: estilo === 'pill' ? 999 : 3 };
    const estilos = {
        solid: { background: c.primario },
        outline: { border: `1.5px solid ${c.primario}` },
        soft: { background: `${c.primario}26` },
        pill: { background: c.primario },
    };

    return (
        <Lienzo c={c} className="grid place-items-center">
            <span className="block" style={{ ...base, ...estilos[estilo] }} />
        </Lienzo>
    );
}

export function DibujoEsquinas({ radio, c }) {
    const valores = { none: 0, sm: 2, md: 4, lg: 6, xl: 9, full: 14 };

    return (
        <span className="grid h-9 place-items-center">
            <span
                className="block h-6 w-8"
                style={{ borderTopLeftRadius: valores[radio], border: `2px solid ${c.primario}`, borderRight: 0, borderBottom: 0 }}
            />
        </span>
    );
}

export function DibujoAnimacion({ nivel, c }) {
    return (
        <Lienzo c={c} className="flex items-end justify-center gap-1.5 pb-2">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={`block w-3 rounded-sm ${nivel === 'none' ? '' : 'dibujo-animado'}`}
                    style={{
                        height: 18 + i * 4,
                        background: `${c.primario}${nivel === 'lively' ? 'cc' : '77'}`,
                        animationDelay: `${i * 140}ms`,
                        animationDuration: nivel === 'lively' ? '1.1s' : '2.2s',
                        '--salto': nivel === 'lively' ? '-7px' : '-3px',
                    }}
                />
            ))}
        </Lienzo>
    );
}

export function DibujoFondo({ tipo, patron, c }) {
    const tinte = `${c.primario}40`;
    const estilos = {
        solid: { background: c.fondo },
        gradient: { background: `linear-gradient(160deg, ${c.fondo}, ${c.primario}33)` },
        dots: { backgroundColor: c.fondo, backgroundImage: `radial-gradient(${tinte} 1.2px, transparent 1.2px)`, backgroundSize: '8px 8px' },
        grid: {
            backgroundColor: c.fondo,
            backgroundImage: `linear-gradient(${tinte} 1px, transparent 1px), linear-gradient(90deg, ${tinte} 1px, transparent 1px)`,
            backgroundSize: '10px 10px',
        },
        diagonal: { backgroundColor: c.fondo, backgroundImage: `repeating-linear-gradient(45deg, ${tinte} 0 1.5px, transparent 1.5px 6px)` },
        waves: {
            backgroundColor: c.fondo,
            backgroundImage: `radial-gradient(circle at 50% 100%, ${tinte} 0 5px, transparent 5px)`,
            backgroundSize: '16px 8px',
        },
    };

    return <span className="block h-10 w-full rounded-md ring-1 ring-inset ring-black/5" style={estilos[patron ?? tipo]} />;
}

/**
 * Hacia dónde se mueve un bloque al aparecer.
 *
 * El recuadro se queda quieto y la pieza entra desde el borde que indica
 * la opción, para que se entienda sin leer el nombre.
 */
export function DibujoEntrada({ entrada, c }) {
    // Solo variables: si el dibujo trajera `transform` en su estilo, la
    // animacion y el estilo en linea pelearian por la misma propiedad.
    const desde = {
        fade: { '--desde-opacidad': 0 },
        up: { '--desde-transform': 'translateY(9px)' },
        down: { '--desde-transform': 'translateY(-9px)' },
        left: { '--desde-transform': 'translateX(-12px)' },
        right: { '--desde-transform': 'translateX(12px)' },
        zoom: { '--desde-transform': 'scale(0.65)' },
        blur: { '--desde-filtro': 'blur(3px)' },
        flip: { '--desde-transform': 'perspective(70px) rotateX(40deg)' },
    }[entrada] ?? {};

    return (
        <Lienzo c={c} className="grid place-items-center overflow-hidden">
            <span className="dibujo-entra block h-6 w-12 rounded" style={{ background: `${c.primario}cc`, ...desde }} />
        </Lienzo>
    );
}

export function DibujoTitulo({ estilo, c }) {
    const comun = { background: c.primario, borderRadius: 2 };

    return (
        <Lienzo c={c} className="flex flex-col items-center justify-center gap-1.5">
            <span
                className="block h-[7px] w-16"
                style={
                    estilo === 'gradient'
                        ? { background: `linear-gradient(90deg, ${c.primario}, ${c.secundario})`, borderRadius: 2 }
                        : estilo === 'upper'
                          ? { ...comun, height: 6, width: 68, opacity: 0.9 }
                          : comun
                }
            />
            {estilo === 'underline' ? (
                <span className="block h-[3px] w-6 rounded-full" style={{ background: c.secundario }} />
            ) : (
                <span className="block h-[4px] w-10 rounded-full" style={{ background: `${c.texto}33` }} />
            )}
        </Lienzo>
    );
}

export function DibujoFigura({ figura, c }) {
    const rutas = {
        wave: 'M0,20 C12,30 24,4 36,12 C48,20 60,28 72,18 L72,36 L0,36 Z',
        slant: 'M0,36 L72,2 L72,36 Z',
        curve: 'M0,36 C18,6 54,6 72,36 Z',
        zigzag: 'M0,36 L12,14 L24,36 L36,14 L48,36 L60,14 L72,36 Z',
    };

    return (
        <Lienzo c={c} className="flex items-end justify-center">
            {figura === 'line' ? (
                <span className="mb-4 block h-[2px] w-16 rounded-full" style={{ background: `${c.texto}33` }} />
            ) : figura === 'dots' ? (
                <span className="mb-4 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: `${c.primario}99` }} />
                    ))}
                </span>
            ) : (
                <svg viewBox="0 0 72 36" preserveAspectRatio="none" className="h-7 w-full">
                    <path d={rutas[figura] ?? rutas.wave} fill={`${c.primario}55`} />
                </svg>
            )}
        </Lienzo>
    );
}
