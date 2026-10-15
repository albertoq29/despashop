/**
 * La unidad en la que se mide un producto.
 *
 * Es el reflejo de App\Support\UnidadesDeMedida: si allá se agrega una,
 * aquí hay que sumarla. Lo que llega del servidor ya trae `unidad_corta` y
 * `admite_fraccion` calculados, así que esta tabla es el respaldo para
 * cuando solo se tiene la clave.
 */
const UNIDADES = {
    unidad: { corto: 'u', uno: 'unidad', fraccion: false },
    par: { corto: 'par', uno: 'par', fraccion: false },
    docena: { corto: 'doc', uno: 'docena', fraccion: true },
    caja: { corto: 'caja', uno: 'caja', fraccion: false },
    paquete: { corto: 'paq', uno: 'paquete', fraccion: false },
    bulto: { corto: 'bulto', uno: 'bulto', fraccion: false },
    kg: { corto: 'kg', uno: 'kilo', fraccion: true },
    g: { corto: 'g', uno: 'gramo', fraccion: false },
    lb: { corto: 'lb', uno: 'libra', fraccion: true },
    l: { corto: 'L', uno: 'litro', fraccion: true },
    ml: { corto: 'ml', uno: 'mililitro', fraccion: false },
    m: { corto: 'm', uno: 'metro', fraccion: true },
    cm: { corto: 'cm', uno: 'centímetro', fraccion: false },
    m2: { corto: 'm²', uno: 'metro cuadrado', fraccion: true },
    m3: { corto: 'm³', uno: 'metro cúbico', fraccion: true },
    gal: { corto: 'gal', uno: 'galón', fraccion: true },
};

const POR_DEFECTO = UNIDADES.unidad;

/** Los datos de una unidad, con la de siempre como respaldo. */
export function unidadDe(clave) {
    return UNIDADES[clave] ?? POR_DEFECTO;
}

/**
 * La abreviatura que acompaña a un número.
 *
 * Se prefiere lo que calculó el servidor (`unidad_corta`): así una unidad
 * nueva funciona aunque esta tabla se quede corta.
 */
export function unidadCorta(producto) {
    return producto?.unidad_corta ?? unidadDe(producto?.unidad).corto;
}

/** Si se puede vender una parte: medio kilo sí, media caja no. */
export function admiteFraccion(producto) {
    if (typeof producto?.admite_fraccion === 'boolean') {
        return producto.admite_fraccion;
    }

    return unidadDe(producto?.unidad).fraccion;
}

/** El salto de un campo de cantidad: gramo a gramo, o de uno en uno. */
export function pasoDeCantidad(producto) {
    return admiteFraccion(producto) ? 0.001 : 1;
}

/**
 * Una cantidad como se lee: «2,5», «12».
 *
 * Sin ceros de relleno, porque 2,500 no dice nada que no diga 2,5, y con
 * coma decimal, que es la de aquí.
 */
export function numero(cantidad) {
    const valor = Number(cantidad);

    if (!Number.isFinite(valor)) {
        return '0';
    }

    if (Number.isInteger(valor)) {
        return valor.toLocaleString('es-VE');
    }

    return valor.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/** Una cantidad con su unidad: «2,5 kg», «3 u». */
export function conUnidad(cantidad, producto) {
    return `${numero(cantidad)} ${unidadCorta(producto)}`;
}

/**
 * La cantidad con su unidad, pero solo cuando la unidad dice algo.
 *
 * En un recibo, «2 u» al lado de cada renglón es ruido: lo normal es contar
 * piezas. La unidad aparece cuando no es la de siempre, que es justo cuando
 * un número a secas no se entiende: 2,5 no dice si son kilos o litros.
 */
export function conUnidadSiHaceFalta(cantidad, producto) {
    const sinUnidad = !producto || producto.item_type === 'servicio' || (producto.unidad ?? 'unidad') === 'unidad';

    return sinUnidad ? numero(cantidad) : conUnidad(cantidad, producto);
}

/**
 * La cantidad que de verdad se puede guardar.
 *
 * Si la unidad no admite partes se redondea: nadie factura media caja. Si
 * las admite, se recorta a tres cifras, que es lo que guarda la columna.
 */
export function ajustarCantidad(cantidad, producto) {
    const valor = Math.max(0, Number(cantidad) || 0);

    return admiteFraccion(producto) ? Math.round(valor * 1000) / 1000 : Math.round(valor);
}
