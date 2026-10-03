import {
    BotonFalso,
    CampoFalso,
    Encabezado,
    Etiqueta,
    Mensaje,
    Objetivo,
    Pastilla,
    Ventana,
} from './Escenario';

/**
 * Guion del tutorial de facturación.
 *
 * Lo que más se presta a confusión no es armar la factura, es el paso de
 * confirmarla: ahí se descuenta el inventario y ya no hay vuelta atrás. Por
 * eso el guion dedica tres pasos a confirmar, a los casos en los que no se
 * puede, y a qué hacer con una factura que no se va a cobrar.
 */

export const INICIAL = {
    pantalla: 'lista',
    filtro: 'draft',
    busqueda: '',
    items: [],
    cliente: { nombre: '', telefono: '' },
    envio: 0,
    empaques: false,
    estado: 'draft',
    dialogo: null,
    mensaje: null,
    stock: 18,
    eliminada: false,
    guardada: false,
};

const NOMBRES_ESTADO = {
    draft: 'Borrador',
    pending_variants: 'Por confirmar',
    confirmed: 'Confirmada',
};

const TONOS_ESTADO = { draft: 'neutro', pending_variants: 'aviso', confirmed: 'marca' };

const PRODUCTO = { nombre: 'Audífonos TWS', precio: 18, variante: null, cantidad: 1 };

const totalDe = (e) => e.items.reduce((suma, i) => suma + i.precio * i.cantidad, 0) + e.envio;

/* ── Pantallas de mentira ───────────────────────────────────────────────── */

function PantallaEntrada({ estado }) {
    return (
        <Ventana titulo="Despashop">
            <div className="flex flex-col gap-3 p-2.5 sm:flex-row">
                <div className="flex flex-wrap gap-1 sm:w-24 sm:shrink-0 sm:flex-nowrap sm:flex-col">
                    {[
                        ['panel', 'Panel'],
                        ['productos', 'Productos'],
                        ['facturas', 'Facturas'],
                        ['ganancias', 'Ganancias'],
                    ].map(([id, nombre]) => (
                        <Objetivo key={id} nombre={`menu-${id}`} resaltar={false}>
                            <span
                                className={`block truncate rounded-md px-1.5 py-1 text-[10px] font-medium ${
                                    id === 'facturas'
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
                    <ListaDeFacturas estado={estado} />
                </div>
            </div>
        </Ventana>
    );
}

function ListaDeFacturas({ estado }) {
    const filas = [
        { id: 148, cliente: 'Carla Pérez', total: 36.0, estado: 'draft' },
        { id: 147, cliente: 'Luis Mendoza', total: 54.5, estado: 'pending_variants' },
        { id: 146, cliente: 'Ana Rivas', total: 21.0, estado: 'confirmed' },
    ].filter((f) => (estado.eliminada ? f.id !== 148 : true));

    return (
        <>
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-stone-700 dark:text-stone-200">Facturas</p>
                <BotonFalso nombre="nueva-factura">+ Nueva factura</BotonFalso>
            </div>

            <p className="mb-2 text-[9px] leading-snug text-stone-500 dark:text-stone-400">
                Los borradores no descuentan inventario: el stock baja al confirmar.
            </p>

            <div className="mb-2 flex gap-1">
                {[
                    ['draft', 'Borradores'],
                    ['pending_variants', 'Por confirmar'],
                    ['confirmed', 'Confirmadas'],
                ].map(([id, texto]) => (
                    <Pastilla key={id} nombre={`filtro-${id}`} activa={estado.filtro === id}>
                        {texto}
                    </Pastilla>
                ))}
            </div>

            <div className="overflow-hidden rounded-md border border-stone-200 dark:border-stone-800">
                {filas.map((fila, indice) => (
                    <Objetivo key={fila.id} nombre={`fila-${fila.id}`} resaltar={false}>
                        <div
                            className={`flex items-center gap-2 px-2 py-1.5 ${
                                indice > 0 ? 'border-t border-stone-200 dark:border-stone-800' : ''
                            }`}
                        >
                            <span className="w-8 shrink-0 text-[10px] font-bold text-stone-400">#{fila.id}</span>
                            <span className="min-w-0 flex-1 truncate text-[10px] text-stone-700 dark:text-stone-200">{fila.cliente}</span>
                            <span className="text-[10px] font-bold tabular-nums text-stone-700 dark:text-stone-200">
                                ${fila.total.toFixed(2)}
                            </span>
                            <Etiqueta tono={TONOS_ESTADO[fila.estado]}>{NOMBRES_ESTADO[fila.estado]}</Etiqueta>
                            <Objetivo nombre={`borrar-${fila.id}`} resaltar={false}>
                                <span className="block text-[9px] leading-none text-stone-400">🗑</span>
                            </Objetivo>
                        </div>
                    </Objetivo>
                ))}
            </div>

            {estado.mensaje && (
                <div className="mt-2">
                    <Mensaje tono={estado.mensaje.tono}>{estado.mensaje.texto}</Mensaje>
                </div>
            )}
        </>
    );
}

function PantallaNueva({ estado }) {
    return (
        <Ventana titulo="Despashop · Nueva factura">
            <div className="grid gap-3 p-2.5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Encabezado>Agregar producto</Encabezado>
                    <CampoFalso
                        nombre="buscar"
                        valor={estado.busqueda}
                        escribiendo={estado.busqueda.length > 0 && estado.items.length === 0}
                        placeholder="Buscar producto o combo"
                    />

                    {estado.busqueda.length > 2 && estado.items.length === 0 && (
                        <Objetivo nombre="resultado" resaltar={false}>
                            <div className="flex items-center gap-2 rounded-md border border-stone-200 px-2 py-1.5 dark:border-stone-700">
                                <span className="block h-6 w-6 shrink-0 rounded bg-stone-100 dark:bg-stone-800" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[10px] font-semibold text-stone-700 dark:text-stone-200">
                                        Audífonos TWS
                                    </span>
                                    <span className="block text-[9px] text-stone-500 dark:text-stone-400">
                                        $18,00 · {estado.stock} uds. · 3 variantes
                                    </span>
                                </span>
                            </div>
                        </Objetivo>
                    )}

                    {estado.items.length > 0 && (
                        <div className="space-y-1.5 rounded-md border border-stone-200 p-1.5 dark:border-stone-700">
                            {estado.items.map((item, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-stone-700 dark:text-stone-200">
                                            {item.nombre}
                                        </span>
                                        <Objetivo nombre="cantidad" resaltar={false}>
                                            <span className="block rounded border border-stone-300 px-1.5 py-0.5 text-[10px] font-bold tabular-nums dark:border-stone-700">
                                                {item.cantidad}
                                            </span>
                                        </Objetivo>
                                        <span className="text-[10px] font-bold tabular-nums text-stone-700 dark:text-stone-200">
                                            ${(item.precio * item.cantidad).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex gap-1">
                                        {['Negro', 'Blanco', 'Azul'].map((color) => (
                                            <Pastilla key={color} nombre={`variante-${color}`} activa={item.variante === color}>
                                                {color}
                                            </Pastilla>
                                        ))}
                                    </div>

                                    {!item.variante && (
                                        <Mensaje tono="aviso">
                                            Este producto tiene variantes: elige una o no podrás confirmar la factura.
                                        </Mensaje>
                                    )}
                                </div>
                            ))}

                            <div className="flex gap-1 border-t border-stone-200 pt-1.5 dark:border-stone-800">
                                {['Detal', 'Mayor', 'Distribuidor'].map((tipo) => (
                                    <Pastilla key={tipo} nombre={`precio-${tipo}`} activa={tipo === 'Detal'}>
                                        {tipo}
                                    </Pastilla>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Encabezado>Datos del cliente</Encabezado>
                    <CampoFalso
                        nombre="cliente"
                        valor={estado.cliente.nombre}
                        escribiendo={estado.cliente.nombre.length > 0 && !estado.cliente.telefono}
                        placeholder="Nombre"
                    />
                    <CampoFalso nombre="telefono" valor={estado.cliente.telefono} placeholder="Teléfono" />

                    <Encabezado>Envío y empaques</Encabezado>
                    <div className="flex items-center gap-2">
                        <Objetivo nombre="envio" resaltar={false}>
                            <span className="block rounded border border-stone-300 px-2 py-1 text-[10px] font-bold tabular-nums dark:border-stone-700">
                                Envío ${estado.envio.toFixed(2)}
                            </span>
                        </Objetivo>
                        <Objetivo nombre="empaques" resaltar={false}>
                            <span
                                className={`block rounded px-2 py-1 text-[10px] font-semibold ${
                                    estado.empaques
                                        ? 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300'
                                        : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                                }`}
                            >
                                {estado.empaques ? '✓ Caja + bolsa' : '+ Empaques'}
                            </span>
                        </Objetivo>
                    </div>

                    <Encabezado>Estado de la factura</Encabezado>
                    <div className="space-y-1">
                        {[
                            ['draft', 'Guardar como borrador', 'Para editarla luego. No descuenta stock.'],
                            ['pending_variants', '⏳ Pagada (pendiente variantes)', 'Ya te pagaron, pero el stock sigue intacto.'],
                        ].map(([id, titulo, ayuda]) => (
                            <Objetivo key={id} nombre={`estado-${id}`} resaltar={false}>
                                <div className="flex items-start gap-1.5">
                                    <span
                                        className={`mt-0.5 block h-3 w-3 shrink-0 rounded-full border-2 transition-colors duration-200 ${
                                            estado.estado === id
                                                ? 'border-marca-600 bg-marca-600 dark:border-marca-400 dark:bg-marca-400'
                                                : 'border-stone-300 dark:border-stone-600'
                                        }`}
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-[10px] font-bold text-stone-700 dark:text-stone-200">{titulo}</span>
                                        <span className="block text-[9px] leading-snug text-stone-500 dark:text-stone-400">{ayuda}</span>
                                    </span>
                                </div>
                            </Objetivo>
                        ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-200 pt-2 dark:border-stone-800">
                        <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">Total</span>
                        <span className="text-[13px] font-bold tabular-nums text-stone-900 dark:text-stone-100">
                            ${totalDe(estado).toFixed(2)}
                        </span>
                    </div>

                    <BotonFalso nombre="guardar-factura" className="w-full">
                        Guardar y ver recibo
                    </BotonFalso>
                </div>
            </div>
        </Ventana>
    );
}

function PantallaRecibo({ estado }) {
    const confirmada = estado.estado === 'confirmed';

    return (
        <Ventana titulo="Despashop · Factura #148">
            <div className="grid gap-3 p-2.5 sm:grid-cols-[1fr,150px]">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-200">Factura #148</span>
                        <Etiqueta tono={TONOS_ESTADO[estado.estado]}>{NOMBRES_ESTADO[estado.estado]}</Etiqueta>
                    </div>

                    {estado.mensaje && <Mensaje tono={estado.mensaje.tono}>{estado.mensaje.texto}</Mensaje>}

                    <div className="rounded-md border border-stone-200 p-2 dark:border-stone-800">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-stone-600 dark:text-stone-300">Audífonos TWS · Azul × 2</span>
                            <span className="font-bold tabular-nums text-stone-800 dark:text-stone-100">$36,00</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="text-stone-600 dark:text-stone-300">Envío</span>
                            <span className="font-bold tabular-nums text-stone-800 dark:text-stone-100">$3,00</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between border-t border-stone-200 pt-1.5 text-[11px] dark:border-stone-800">
                            <span className="font-bold text-stone-500 dark:text-stone-400">Total</span>
                            <span className="font-bold tabular-nums text-stone-900 dark:text-stone-100">$39,00</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {!confirmada && (
                            <BotonFalso nombre="confirmar" tono="exito">
                                ✓ Confirmar y descontar stock
                            </BotonFalso>
                        )}
                        <BotonFalso nombre="editar" tono={confirmada ? 'tenue' : 'contorno'}>
                            {confirmada ? 'Editar (bloqueado)' : 'Editar'}
                        </BotonFalso>
                        <BotonFalso nombre="compartir" tono="contorno">
                            Compartir
                        </BotonFalso>
                    </div>

                    {confirmada && (
                        <p className="text-[9px] leading-snug text-stone-500 dark:text-stone-400">
                            Una factura confirmada ya no se edita ni se elimina: es la que cuenta para tus ganancias.
                        </p>
                    )}
                </div>

                <div className="space-y-2 rounded-md bg-stone-50 p-2 dark:bg-stone-950/60">
                    <Encabezado>Inventario</Encabezado>
                    <p className="text-[10px] text-stone-600 dark:text-stone-300">
                        Audífonos TWS
                        <span className="mt-0.5 block text-[14px] font-bold tabular-nums text-stone-900 dark:text-stone-100">
                            {estado.stock} uds.
                        </span>
                    </p>
                    <p className="text-[9px] leading-snug text-stone-500 dark:text-stone-400">
                        {confirmada ? 'Ya se descontaron las 2 vendidas.' : 'Intacto: el borrador no toca el stock.'}
                    </p>
                </div>
            </div>

            {estado.dialogo === 'confirmar' && (
                <Dialogo
                    titulo="¿Confirmar factura?"
                    texto="Se descontará el stock de los productos registrados. Esta acción no se puede deshacer."
                    aceptar="✓ Confirmar y descontar stock"
                    tono="exito"
                />
            )}
        </Ventana>
    );
}

function Dialogo({ titulo, texto, aceptar, tono }) {
    return (
        <div className="absolute inset-0 z-10 grid place-items-center bg-stone-900/50 px-3">
            <div className="w-full max-w-[230px] rounded-xl bg-white p-3 text-center shadow-xl dark:bg-stone-900">
                <p className="text-[11px] font-bold text-stone-800 dark:text-stone-100">{titulo}</p>
                <p className="mt-1 text-[9px] leading-snug text-stone-500 dark:text-stone-400">{texto}</p>
                <div className="mt-2.5 flex gap-1.5">
                    <BotonFalso nombre="dialogo-cancelar" tono="contorno" className="flex-1">
                        Cancelar
                    </BotonFalso>
                    <BotonFalso nombre="dialogo-aceptar" tono={tono} className="flex-1">
                        {aceptar}
                    </BotonFalso>
                </div>
            </div>
        </div>
    );
}

function PantallaFallos({ estado }) {
    return (
        <Ventana titulo="Despashop · Factura #147">
            <div className="space-y-2 p-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-stone-700 dark:text-stone-200">Factura #147</span>
                    <Etiqueta tono="aviso">Por confirmar</Etiqueta>
                </div>

                {estado.mensaje && <Mensaje tono={estado.mensaje.tono}>{estado.mensaje.texto}</Mensaje>}

                <div className="rounded-md border border-stone-200 p-2 text-[10px] dark:border-stone-800">
                    <div className="flex items-center justify-between">
                        <span className="text-stone-600 dark:text-stone-300">Audífonos TWS · sin variante</span>
                        <Etiqueta tono="alerta">falta elegir</Etiqueta>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                        <span className="text-stone-600 dark:text-stone-300">Cargador 20W × 5</span>
                        <Etiqueta tono="alerta">solo hay 2</Etiqueta>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <BotonFalso nombre="confirmar" tono="exito">
                        ✓ Confirmar y descontar stock
                    </BotonFalso>
                    <BotonFalso nombre="editar" tono="contorno">
                        Editar para arreglarlo
                    </BotonFalso>
                </div>
            </div>
        </Ventana>
    );
}

function PantallaEliminar({ estado }) {
    return (
        <Ventana titulo="Despashop · Facturas">
            <div className="p-2.5">
                <ListaDeFacturas estado={estado} />
            </div>

            {estado.dialogo === 'eliminar' && (
                <Dialogo
                    titulo="¿Eliminar la factura #148?"
                    texto="Es un borrador, así que no hay stock que devolver. No se puede deshacer."
                    aceptar="Sí, eliminar"
                    tono="peligro"
                />
            )}
        </Ventana>
    );
}

/* ── Los pasos ──────────────────────────────────────────────────────────── */

export const PASOS_FACTURAS = [
    {
        titulo: 'Tus facturas, en tres estados',
        texto: 'Borrador, por confirmar y confirmada. Solo la confirmada descuenta inventario y cuenta para tus ganancias; las otras dos son papeles de trabajo que puedes cambiar cuando quieras.',
        escena: PantallaEntrada,
        acciones: [
            { en: 'menu-facturas', clic: (e) => e, nota: 'Menú → Facturas' },
            { en: 'filtro-pending_variants', clic: (e) => ({ ...e, filtro: 'pending_variants' }), nota: 'Filtrar por estado' },
            { en: 'filtro-confirmed', clic: (e) => ({ ...e, filtro: 'confirmed' }) },
            { en: 'filtro-draft', clic: (e) => ({ ...e, filtro: 'draft' }), espera: 1000 },
        ],
    },
    {
        titulo: 'Armar la factura',
        texto: 'Busca el producto por su nombre, tócalo y ya está en la factura. Ajustas la cantidad y eliges si va a precio de detal, de mayor o de distribuidor; el total se recalcula solo.',
        escena: PantallaNueva,
        acciones: [
            { en: 'buscar', escribir: 'audífonos', aplicar: (parcial) => (e) => ({ ...e, busqueda: parcial }), nota: 'Buscar el producto' },
            {
                en: 'resultado',
                clic: (e) => ({ ...e, items: [{ ...PRODUCTO }] }),
                nota: 'Tocarlo para agregarlo',
                espera: 900,
            },
            {
                en: 'cantidad',
                clic: (e) => ({ ...e, items: e.items.map((i) => ({ ...i, cantidad: 2 })) }),
                nota: 'Subir la cantidad a 2',
                espera: 1000,
            },
        ],
    },
    {
        titulo: 'Si el producto tiene variantes, elígela',
        texto: 'Color, talla o modelo: hay que decir cuál se vendió. Es lo que más frena una confirmación — sin variante elegida, la app no te deja confirmar, porque no sabría de qué montón descontar.',
        escena: PantallaNueva,
        acciones: [
            { en: 'variante-Azul', clic: (e) => ({ ...e, items: e.items.map((i) => ({ ...i, variante: 'Azul' })) }), nota: 'Elegir «Azul»', espera: 1200 },
        ],
        estadoInicial: { items: [{ ...PRODUCTO, cantidad: 2 }], busqueda: 'audífonos' },
    },
    {
        titulo: 'El cliente, el envío y los empaques',
        texto: 'El nombre del cliente sale en el recibo. El envío se suma al total pero no es ganancia, así que en Ganancias aparece aparte. Los empaques que apliques descuentan de tu inventario de materiales al confirmar.',
        escena: PantallaNueva,
        acciones: [
            { en: 'cliente', escribir: 'Carla Pérez', aplicar: (parcial) => (e) => ({ ...e, cliente: { ...e.cliente, nombre: parcial } }), nota: 'Nombre del cliente' },
            { en: 'telefono', escribir: '0412 5558899', aplicar: (parcial) => (e) => ({ ...e, cliente: { ...e.cliente, telefono: parcial } }) },
            { en: 'envio', clic: (e) => ({ ...e, envio: 3 }), nota: 'Cobrar el envío' },
            { en: 'empaques', clic: (e) => ({ ...e, empaques: true }), nota: 'Aplicar empaques', espera: 1100 },
        ],
        estadoInicial: { items: [{ ...PRODUCTO, cantidad: 2, variante: 'Azul' }], busqueda: 'audífonos' },
    },
    {
        titulo: 'Guardar: borrador o pagada',
        texto: '«Borrador» es para seguir editándola. «Pagada (pendiente variantes)» es para cuando ya te pagaron pero falta cerrar detalles. Ninguna de las dos toca tu inventario: eso solo pasa al confirmar.',
        escena: PantallaNueva,
        acciones: [
            { en: 'estado-pending_variants', clic: (e) => ({ ...e, estado: 'pending_variants' }), nota: 'Ya te pagaron' },
            { en: 'estado-draft', clic: (e) => ({ ...e, estado: 'draft' }), nota: 'O déjala en borrador' },
            { en: 'guardar-factura', clic: (e) => ({ ...e, guardada: true }), nota: 'Guardar y ver el recibo', espera: 1100 },
        ],
        estadoInicial: {
            items: [{ ...PRODUCTO, cantidad: 2, variante: 'Azul' }],
            busqueda: 'audífonos',
            cliente: { nombre: 'Carla Pérez', telefono: '0412 5558899' },
            envio: 3,
            empaques: true,
        },
    },
    {
        titulo: 'Confirmar: el paso que sí mueve el inventario',
        texto: 'Al confirmar, la app descuenta el stock de cada producto (y de sus variantes y empaques), guarda la fecha y la factura empieza a contar en Ganancias. Te pide confirmación porque no se puede deshacer.',
        escena: PantallaRecibo,
        acciones: [
            { en: 'confirmar', clic: (e) => ({ ...e, dialogo: 'confirmar' }), nota: 'Confirmar y descontar', espera: 1100 },
            {
                en: 'dialogo-aceptar',
                clic: (e) => ({
                    ...e,
                    dialogo: null,
                    estado: 'confirmed',
                    stock: 16,
                    mensaje: { tono: 'exito', texto: 'Factura confirmada. Stock descontado correctamente.' },
                }),
                nota: 'Sí, confirmar',
                espera: 1600,
            },
        ],
        estadoInicial: { estado: 'draft', stock: 18, mensaje: null },
    },
    {
        titulo: 'Cuando la app no te deja confirmar',
        texto: 'Siempre es por una de dos razones, y te dice cuál: falta elegir la variante de un producto, o no hay stock suficiente de algo (producto, variante, combo o empaque). Se arregla editando la factura o reponiendo el inventario.',
        escena: PantallaFallos,
        acciones: [
            {
                en: 'confirmar',
                clic: (e) => ({
                    ...e,
                    mensaje: {
                        tono: 'alerta',
                        texto: 'No puedes confirmar: el producto «Audífonos TWS» tiene variantes sin especificar. Edita la factura para asignar la variante.',
                    },
                }),
                nota: 'Intentar confirmar',
                espera: 2200,
            },
            {
                en: 'confirmar',
                clic: (e) => ({
                    ...e,
                    mensaje: {
                        tono: 'alerta',
                        texto: 'Stock insuficiente para «Cargador 20W». Stock disponible: 2. Cantidad solicitada: 5.',
                    },
                }),
                nota: 'O este otro caso',
                espera: 2200,
            },
            { en: 'editar', clic: (e) => e, nota: 'Editar para arreglarlo', espera: 1000 },
        ],
        estadoInicial: { mensaje: null },
    },
    {
        titulo: 'Negar una factura: eliminar el borrador',
        texto: 'Si la venta no se dio, borra el borrador desde la papelera de la lista. No hay stock que devolver, porque nunca se descontó. Lo que sí es definitivo: una factura confirmada no se puede eliminar ni editar.',
        escena: PantallaEliminar,
        acciones: [
            { en: 'borrar-148', clic: (e) => ({ ...e, dialogo: 'eliminar' }), nota: 'La papelera del borrador', espera: 1100 },
            {
                en: 'dialogo-aceptar',
                clic: (e) => ({
                    ...e,
                    dialogo: null,
                    eliminada: true,
                    mensaje: { tono: 'exito', texto: 'Borrador eliminado correctamente.' },
                }),
                nota: 'Sí, eliminar',
                espera: 1600,
            },
            { en: 'borrar-146', clic: (e) => ({ ...e, mensaje: { tono: 'alerta', texto: 'No se puede eliminar una factura confirmada.' } }), nota: 'Con una confirmada, no', espera: 2200 },
        ],
        estadoInicial: { mensaje: null, eliminada: false, filtro: 'draft' },
        consejo: '¿Y si ya confirmaste una venta que se cayó? No borres nada: registra la devolución en Ganancias → Ajustes, y si la mercancía volvió al inventario, súbela con «Registrar reposición». Así los números siguen cuadrando.',
    },
];
