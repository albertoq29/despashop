import { CalendarClock, Check, Infinity as Infinito, Minus } from 'lucide-react';

const PERIODOS = { monthly: 'al mes', yearly: 'al año', lifetime: 'pago único', free: '' };

/**
 * Fecha de un plan en texto largo.
 *
 * Las fechas llegan como "2026-10-16". `new Date` las interpretaría como
 * medianoche UTC, que en Venezuela es el día anterior; por eso se arma la
 * fecha local a mano.
 */
export function fechaLarga(iso, conAno = true) {
    if (!iso) {
        return '';
    }

    const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);

    return new Date(ano, mes - 1, dia).toLocaleDateString('es', {
        day: 'numeric',
        month: 'long',
        ...(conAno ? { year: 'numeric' } : {}),
    });
}

/** "vence hoy", "vence mañana", "faltan 12 días", "venció hace 3 días". */
export function textoDeDias(dias) {
    if (dias === null || dias === undefined) {
        return '';
    }

    if (dias < 0) {
        return Math.abs(dias) === 1 ? 'venció ayer' : `venció hace ${Math.abs(dias)} días`;
    }

    if (dias === 0) {
        return 'vence hoy';
    }

    return dias === 1 ? 'vence mañana' : `faltan ${dias} días`;
}

const ESTADOS = {
    activo: { texto: 'Activo', clase: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300', barra: 'bg-marca-600 dark:bg-marca-500' },
    sin_vencimiento: { texto: 'Sin vencimiento', clase: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300', barra: 'bg-marca-600' },
    por_vencer: { texto: 'Por vencer', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', barra: 'bg-amber-500' },
    vencido: { texto: 'Vencido', clase: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300', barra: 'bg-red-600' },
    sin_plan: { texto: 'Sin plan', clase: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300', barra: 'bg-stone-400' },
};

/**
 * Plan del comercio: vigencia, uso de cada límite y qué incluye.
 *
 * La usan el panel del comercio y la ficha del admin, así los dos ven
 * exactamente los mismos números.
 */
export default function ResumenDelPlan({ resumen, pie = null, id, etiqueta = 'Tu plan' }) {
    const estado = ESTADOS[resumen.estado] ?? ESTADOS.sin_plan;
    const plan = resumen.plan;

    return (
        <section id={id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            {/* Plan y vigencia */}
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="font-display text-2xl font-semibold tracking-tight">{plan?.nombre ?? 'Sin plan asignado'}</h3>
                        {plan && <Precio plan={plan} descuento={resumen.descuento} />}

                        {resumen.es_prueba && (
                            <span className="rounded-full bg-marca-100 px-2 py-0.5 text-xs font-semibold text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                                Prueba gratis
                            </span>
                        )}
                    </div>

                    {resumen.nota && (
                        <p className="mt-2 max-w-[48ch] text-sm text-stone-500 dark:text-stone-400">{resumen.nota}</p>
                    )}
                </div>

                <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${estado.barra}`} />
                    {estado.texto}
                </span>
            </div>

            {resumen.borrado && <AvisoDeBorrado resumen={resumen} />}

            {resumen.vence ? <Vigencia resumen={resumen} barra={estado.barra} /> : plan && (
                <p className="flex items-center gap-2 border-t border-stone-200 px-5 py-3 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
                    <Infinito className="h-4 w-4 shrink-0" />
                    Sin fecha de vencimiento.
                </p>
            )}

            {/* Límites */}
            <div className="grid gap-px border-t border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-800 sm:grid-cols-2 xl:grid-cols-3">
                {resumen.limites.map((limite) => (
                    <Medidor key={limite.clave} limite={limite} />
                ))}

                {/* Relleno para que la última fila no quede con un hueco gris */}
                <div className="hidden bg-white dark:bg-stone-900 sm:block" />
            </div>

            {/* Qué incluye */}
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-5 py-4 dark:border-stone-800">
                {resumen.incluye.map((item) => (
                    <span
                        key={item.nombre}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                            item.activo
                                ? 'bg-marca-50 text-marca-800 dark:bg-marca-950/60 dark:text-marca-300'
                                : 'bg-stone-100 text-stone-500 line-through decoration-stone-400/60 dark:bg-stone-800 dark:text-stone-500'
                        }`}
                    >
                        {item.activo ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        {item.nombre}
                    </span>
                ))}
            </div>

            {pie && <div className="border-t border-stone-200 px-5 py-4 dark:border-stone-800">{pie}</div>}
        </section>
    );
}

function Precio({ plan, descuento }) {
    if (plan.precio_usd <= 0) {
        return <span className="text-sm text-stone-500 dark:text-stone-400">Gratis</span>;
    }

    const periodo = PERIODOS[plan.periodo] ?? '';

    if (!descuento) {
        return (
            <span className="text-sm text-stone-500 dark:text-stone-400">
                ${plan.precio_usd.toLocaleString('es')} {periodo}
            </span>
        );
    }

    return (
        <span className="text-sm text-stone-500 dark:text-stone-400">
            <span className="line-through opacity-60">${plan.precio_usd.toLocaleString('es')}</span>{' '}
            <span className="font-semibold text-marca-700 dark:text-marca-400">
                ${Number(plan.precio_con_descuento ?? plan.precio_usd).toLocaleString('es')} {periodo}
            </span>
            <span className="ml-1.5 rounded bg-marca-100 px-1.5 py-0.5 text-xs font-semibold text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                -{descuento}%
            </span>
        </span>
    );
}

/**
 * Lo que pasa cuando un plan lleva días vencido.
 *
 * Es el único lugar donde el comercio ve la fecha en que perderá sus datos,
 * así que se dice sin rodeos y con el día exacto.
 */
function AvisoDeBorrado({ resumen }) {
    const dias = resumen.dias_para_borrado;
    const urgente = dias !== null && dias <= 3;

    return (
        <div className={`border-t px-5 py-4 ${urgente ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`}>
            <p className={`text-sm font-semibold ${urgente ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'}`}>
                Tu catálogo dejó de verse
            </p>
            <p className={`mt-1 text-sm ${urgente ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                {dias > 0
                    ? `Si no renuevas antes del ${fechaLarga(resumen.borrado)}, se eliminarán tus productos, tus facturas y tus imágenes. Quedan ${dias} ${dias === 1 ? 'día' : 'días'}.`
                    : `El plazo venció: tus datos se eliminarán hoy. Escríbenos ahora mismo si quieres conservarlos.`}
            </p>
        </div>
    );
}

function Vigencia({ resumen, barra }) {
    const { inicio, vence, dias_restantes: dias } = resumen;

    // Cuánto del período ya pasó, para la barra
    let transcurrido = 100;

    if (inicio && vence) {
        const desde = new Date(`${inicio}T00:00:00`).getTime();
        const hasta = new Date(`${vence}T23:59:59`).getTime();
        transcurrido = Math.min(100, Math.max(0, ((Date.now() - desde) / Math.max(1, hasta - desde)) * 100));
    }

    const vencido = dias !== null && dias < 0;

    return (
        <div className="border-t border-stone-200 px-5 py-4 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                    <CalendarClock className="h-4 w-4 shrink-0 text-stone-400" />
                    {vencido ? 'Venció el' : 'Vence el'} <strong className="font-semibold">{fechaLarga(vence)}</strong>
                </span>
                <span
                    className={`font-medium tabular-nums ${
                        vencido ? 'text-red-700 dark:text-red-400' : dias <= resumen.dias_aviso ? 'text-amber-700 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'
                    }`}
                >
                    {textoDeDias(dias)}
                </span>
            </div>

            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" role="presentation">
                <div className={`h-full rounded-full transition-[width] duration-700 ease-salida ${barra}`} style={{ width: `${transcurrido}%` }} />
            </div>

            {inicio && (
                <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">Período iniciado el {fechaLarga(inicio)}</p>
            )}
        </div>
    );
}

/** Uso de un límite, con el color subiendo de tono al acercarse al tope. */
function Medidor({ limite }) {
    const { nombre, usados, maximo, detalle } = limite;
    const ilimitado = maximo === null || maximo === undefined;
    const noIncluido = maximo === 0;
    const porcentaje = ilimitado || noIncluido ? 0 : Math.min(100, (usados / maximo) * 100);

    const tono =
        !ilimitado && !noIncluido && usados >= maximo
            ? { barra: 'bg-red-600', texto: 'text-red-700 dark:text-red-400' }
            : porcentaje >= 80
              ? { barra: 'bg-amber-500', texto: 'text-amber-700 dark:text-amber-400' }
              : { barra: 'bg-marca-600 dark:bg-marca-500', texto: 'text-stone-900 dark:text-stone-100' };

    return (
        <div className="bg-white p-5 dark:bg-stone-900">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-stone-600 dark:text-stone-400">{nombre}</p>
                {!ilimitado && !noIncluido && usados >= maximo && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Al límite</span>
                )}
            </div>

            <p className={`mt-1.5 font-display text-xl font-semibold tabular-nums ${noIncluido ? 'text-stone-400 dark:text-stone-500' : tono.texto}`}>
                {noIncluido ? (
                    'No incluido'
                ) : ilimitado ? (
                    <span className="inline-flex items-center gap-1.5">
                        {usados.toLocaleString('es')}
                        <span className="text-sm font-medium text-stone-500 dark:text-stone-400">· ilimitado</span>
                    </span>
                ) : (
                    <>
                        {usados.toLocaleString('es')}
                        <span className="text-sm font-medium text-stone-500 dark:text-stone-400"> de {maximo.toLocaleString('es')}</span>
                    </>
                )}
            </p>

            {!ilimitado && !noIncluido && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div className={`h-full rounded-full transition-[width] duration-700 ease-salida ${tono.barra}`} style={{ width: `${porcentaje}%` }} />
                </div>
            )}

            {detalle && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{detalle}</p>}
        </div>
    );
}
