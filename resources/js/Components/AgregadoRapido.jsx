import React, { useEffect, useMemo, useState } from 'react';
import { fuzzyCandidates, matchConfidence } from '@/utils/fuzzySearch';

/**
 * Agregado rápido: pegar una lista de nombres (por ejemplo la que manda un
 * cliente por WhatsApp) y agregarlos todos al carrito de una sola vez.
 *
 * No reemplaza al agregado normal: es un atajo. Nada entra al carrito sin
 * pasar antes por la pantalla de revisión, porque los nombres casi nunca
 * vienen escritos igual que en el catálogo.
 */

const EJEMPLO = `2 Cuaderno cosido grande
termo de acero 750 ml
Audífonos inalámbricos x3
taza de cerámica - 2
mochila antirrobo negra`;

// Umbral por debajo del cual no se preselecciona nada: la coincidencia es muy floja
const UMBRAL_AUTOSELECCION = 45;

const CONFIANZA = {
    exacta:  { texto: 'Exacta',      clase: 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' },
    alta:    { texto: 'Alta',        clase: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900' },
    media:   { texto: 'Revisar',     clase: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    baja:    { texto: 'Poco segura', clase: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' },
    ninguna: { texto: 'Sin coincidencia', clase: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800' },
};

let _rowUid = 0;

/**
 * Líneas que son ruido, no productos. Sirve para poder pegar tal cual el
 * mensaje de consulta que arma la tienda, que viene así:
 *
 *   Buenas. Me interesa consultar la disponibilidad de los siguientes productos:
 *
 *   1. Cuaderno cosido grande
 *   Imagen: http://every.conser/storage/products/1782261606_fundacob.png
 *
 *   2. Gel Limpiador Facial Espumoso Ph Neutro
 *   Imagen: Sin imagen
 *
 *   Muchas gracias.
 */
const PATRONES_RUIDO = [
    // "Imagen: ...", "Foto: ...", "Link: ..."
    /^(imagen|imagenes|imágenes|foto|fotos|image|img|url|link|enlace)\s*[:=]/i,
    // una URL sola en su línea
    /^https?:\/\/\S+$/i,
    /^sin\s+imagen$/i,
    // saludos y despedidas
    /^(hola|buenas|buenos días|buenos dias|buenas tardes|buenas noches|gracias|muchas gracias|mil gracias|saludos|ok|listo|perfecto)[.!¡]*$/i,
];

/** Quita el formato de WhatsApp (*negrita*, _cursiva_) */
const limpiarFormato = (t) => (t || '').replace(/[*_~`]/g, '').trim();

/**
 * Separa la cantidad del nombre y descarta el ruido. Acepta las formas en que
 * la gente suele escribir una lista:
 *   "2 Taza" · "2x Taza" · "Taza x2" · "Taza - 2" · "Taza (2)"
 * y limpia viñetas ("- Taza") y numeración de lista ("1. Taza", "2) Taza").
 *
 * Devuelve null si la línea está vacía, { ignorada: true } si es ruido,
 * o { texto, qty } si es un producto.
 */
export function parsearLinea(raw) {
    let texto = limpiarFormato(raw);
    if (!texto) return null;

    // Viñetas y numeración: "1." o "2)" es numeración de lista, no cantidad
    texto = texto.replace(/^[-–—•*·]+\s*/, '').replace(/^\d{1,3}\s*[.)]\s+/, '').trim();
    if (!texto) return null;

    // Encabezados del mensaje ("...los siguientes productos:") y demás ruido
    if (texto.endsWith(':')) return { ignorada: true };
    if (PATRONES_RUIDO.some(re => re.test(texto))) return { ignorada: true };

    // Precio al final: "— $12.50", "· Bs. 300". Se exige el símbolo para no
    // romper nombres que terminan en número ("Base Líquida Nº3", "Splash 250ml").
    texto = texto.replace(/\s*[-–—·|]*\s*(us\$|\$|bs\.?)\s*[\d.,]+$/i, '').trim();
    if (!texto) return { ignorada: true };

    let qty = 1;
    let m;
    if ((m = texto.match(/^(\d{1,2})\s*[x*]?\s+(.{2,})$/i))) {
        qty = parseInt(m[1], 10);
        texto = m[2];
    } else if ((m = texto.match(/^(.{2,}?)\s*[x*]\s*(\d{1,3})$/i))) {
        texto = m[1];
        qty = parseInt(m[2], 10);
    } else if ((m = texto.match(/^(.{2,}?)\s*[-–:]\s*(\d{1,3})$/))) {
        texto = m[1];
        qty = parseInt(m[2], 10);
    } else if ((m = texto.match(/^(.{2,}?)\s*\((\d{1,3})\)$/))) {
        texto = m[1];
        qty = parseInt(m[2], 10);
    }

    texto = texto.trim().replace(/[,;.]+$/, '').trim();
    if (texto.length < 2) return { ignorada: true };

    return { texto, qty: Math.min(999, Math.max(1, qty || 1)) };
}

export default function AgregadoRapido({ productos = [], haystacks, onAgregar }) {
    const [abierto, setAbierto] = useState(false);
    const [paso, setPaso] = useState('texto'); // 'texto' | 'revision'
    const [texto, setTexto] = useState('');
    const [filas, setFilas] = useState([]);
    const [ignoradas, setIgnoradas] = useState([]);
    const [verIgnoradas, setVerIgnoradas] = useState(false);

    const productosPorId = useMemo(() => {
        const map = new Map();
        productos.forEach(p => map.set(p.id, p));
        return map;
    }, [productos]);

    const cerrar = () => {
        setAbierto(false);
        setPaso('texto');
        setTexto('');
        setFilas([]);
        setIgnoradas([]);
        setVerIgnoradas(false);
    };

    // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto
    useEffect(() => {
        if (!abierto) return;
        const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
        document.addEventListener('keydown', onKey);
        const overflowPrevio = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflowPrevio;
        };
    }, [abierto]);

    const analizar = () => {
        const nuevas = [];
        const descartadas = [];
        texto.split(/[\n;]+/).forEach(raw => {
            const parsed = parsearLinea(raw);
            if (!parsed) return;
            if (parsed.ignorada) {
                descartadas.push(raw.trim());
                return;
            }

            const candidatos = fuzzyCandidates(parsed.texto, productos, p => haystacks.get(p.id), 8);
            const mejor = candidatos[0];

            nuevas.push({
                id: ++_rowUid,
                original: raw.trim(),
                consulta: parsed.texto,
                qty: parsed.qty,
                candidatos,
                productoId: mejor && mejor.score >= UMBRAL_AUTOSELECCION ? mejor.item.id : '',
            });
        });
        setFilas(nuevas);
        setIgnoradas(descartadas);
        setPaso('revision');
    };

    const actualizarFila = (id, cambios) => {
        setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...cambios } : f)));
    };

    const quitarFila = (id) => setFilas(prev => prev.filter(f => f.id !== id));

    // Stock disponible descontando lo que otras filas ya pidieron del mismo producto
    const stockDe = (productoId) => {
        const p = productosPorId.get(productoId);
        return p ? (parseInt(p.stock) || 0) : 0;
    };

    const filasListas = filas.filter(f => f.productoId !== '' && stockDe(f.productoId) > 0);
    const totalUnidades = filasListas.reduce((s, f) => s + Math.min(f.qty, stockDe(f.productoId)), 0);
    const sinResolver = filas.filter(f => f.productoId === '').length;
    const agotadas = filas.filter(f => f.productoId !== '' && stockDe(f.productoId) <= 0).length;

    const confirmar = () => {
        const seleccion = filasListas.map(f => ({
            producto: productosPorId.get(f.productoId),
            qty: Math.min(f.qty, stockDe(f.productoId)),
        }));
        if (seleccion.length === 0) return;
        onAgregar(seleccion);
        cerrar();
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setAbierto(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-marca-600 dark:from-marca-500 to-stone-600 dark:to-stone-500 hover:from-marca-700 dark:hover:from-marca-500 hover:to-stone-700 dark:hover:to-stone-500 shadow-sm transition-all"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Agregado Rápido (lista)
            </button>

            {abierto && (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6">
                    <div className="fixed inset-0 bg-stone-500/75 dark:bg-stone-400/75" onClick={cerrar} />

                    <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Cabecera */}
                        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0">
                            <h3 className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                                <svg className="w-5 h-5 text-marca-600 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                                Agregado Rápido
                                {paso === 'revision' && (
                                    <span className="text-xs font-semibold text-stone-400 dark:text-stone-500">· Revisa antes de agregar</span>
                                )}
                            </h3>
                            <button
                                type="button"
                                onClick={cerrar}
                                className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {/* ── PASO 1: pegar la lista ─────────────────────────── */}
                        {paso === 'texto' && (
                            <>
                                <div className="px-6 py-4 overflow-y-auto scrollbar-slim space-y-3">
                                    <p className="text-sm text-stone-500 dark:text-stone-400">
                                        Pega la lista de productos, <span className="font-semibold text-stone-700 dark:text-stone-300">uno por línea</span>.
                                        No hace falta que estén escritos exactamente igual que en el catálogo: se buscan por
                                        coincidencia y luego los confirmas.
                                    </p>

                                    <textarea
                                        autoFocus
                                        rows={9}
                                        value={texto}
                                        onChange={e => setTexto(e.target.value)}
                                        placeholder={EJEMPLO}
                                        className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-sm font-mono focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none resize-y"
                                    />

                                    <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3">
                                        <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5">Cantidades reconocidas</p>
                                        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-stone-600 dark:text-stone-400">
                                            {['2 Taza', '2x Taza', 'Taza x2', 'Taza - 2', 'Taza (2)'].map(f => (
                                                <span key={f} className="px-2 py-0.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">{f}</span>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-2">
                                            Las viñetas (<span className="font-mono">-</span>, <span className="font-mono">•</span>)
                                            y la numeración (<span className="font-mono">1.</span>, <span className="font-mono">2)</span>) se ignoran.
                                        </p>
                                        <p className="text-[11px] text-marca-700 dark:text-marca-400 font-bold mt-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                                            💬 Puedes pegar tal cual el mensaje de consulta que te llega por WhatsApp:
                                            las líneas de <span className="font-mono">Imagen:</span>, los enlaces y los saludos
                                            se descartan solos.
                                        </p>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 flex-shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
                                    <button
                                        type="button"
                                        onClick={() => setTexto(EJEMPLO)}
                                        className="text-xs font-semibold text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 underline transition-colors"
                                    >
                                        Usar un ejemplo
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={cerrar}
                                            className="px-4 py-2.5 border-2 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={analizar}
                                            disabled={!texto.trim()}
                                            className="px-5 py-2.5 bg-marca-700 dark:bg-marca-500 text-white font-bold rounded-xl hover:bg-marca-800 dark:hover:bg-marca-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                        >
                                            Buscar coincidencias
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── PASO 2: revisión y confirmación ────────────────── */}
                        {paso === 'revision' && (
                            <>
                                <div className="px-6 py-4 overflow-y-auto scrollbar-slim space-y-2.5 flex-1">
                                    {filas.length === 0 && (
                                        <p className="text-center text-sm text-stone-400 dark:text-stone-500 py-10">
                                            No se pudo leer ninguna línea de la lista.
                                        </p>
                                    )}

                                    {/* Nada se descarta en silencio: siempre se puede ver qué se ignoró */}
                                    {ignoradas.length > 0 && (
                                        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => setVerIgnoradas(v => !v)}
                                                className="w-full flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                                            >
                                                <span>
                                                    Se ignoraron {ignoradas.length} línea{ignoradas.length === 1 ? '' : 's'} (imágenes, enlaces, saludos)
                                                </span>
                                                <span>{verIgnoradas ? '▲' : '▼'}</span>
                                            </button>
                                            {verIgnoradas && (
                                                <ul className="mt-2 space-y-0.5 border-t border-stone-200 dark:border-stone-800 pt-2">
                                                    {ignoradas.map((linea, i) => (
                                                        <li key={i} className="text-[10px] text-stone-400 dark:text-stone-500 font-mono truncate" title={linea}>
                                                            {linea}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {filas.map(fila => {
                                        const producto = fila.productoId !== '' ? productosPorId.get(fila.productoId) : null;
                                        const stock = producto ? (parseInt(producto.stock) || 0) : 0;
                                        const elegido = fila.candidatos.find(c => c.item.id === fila.productoId);
                                        const nivel = producto
                                            ? (elegido ? matchConfidence(elegido.score) : 'exacta')
                                            : 'ninguna';
                                        const conf = CONFIANZA[nivel];
                                        const excede = producto && fila.qty > stock;

                                        // El resto del catálogo, para poder elegir a mano lo que no acertó
                                        const idsCandidatos = new Set(fila.candidatos.map(c => c.item.id));
                                        const otros = productos.filter(p => !idsCandidatos.has(p.id));

                                        return (
                                            <div
                                                key={fila.id}
                                                className={`rounded-xl border p-3 transition-colors ${
                                                    producto && stock > 0
                                                        ? 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                                                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <p className="text-xs text-stone-400 dark:text-stone-500 font-mono truncate" title={fila.original}>
                                                        “{fila.original}”
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.clase}`}>
                                                            {conf.texto}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => quitarFila(fila.id)}
                                                            className="text-stone-300 dark:text-stone-600 hover:text-red-500 transition-colors"
                                                            title="Quitar esta línea"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
                                                        {producto?.image_path ? (
                                                            <img src={`/storage/${producto.image_path}`} alt="" className="w-full h-full object-cover"/>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-600">
                                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <select
                                                            value={fila.productoId}
                                                            onChange={e => actualizarFila(fila.id, {
                                                                productoId: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                                            })}
                                                            className="w-full border border-stone-200 dark:border-stone-800 rounded-lg px-2 py-1.5 text-sm font-semibold text-stone-800 dark:text-stone-200 focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none bg-white dark:bg-stone-900"
                                                        >
                                                            <option value="">— No agregar —</option>
                                                            {fila.candidatos.length > 0 && (
                                                                <optgroup label="Coincidencias">
                                                                    {fila.candidatos.map(c => (
                                                                        <option key={c.item.id} value={c.item.id}>
                                                                            {c.item.name} · stock {c.item.stock}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            <optgroup label="Todo el catálogo">
                                                                {otros.map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} · stock {p.stock}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        </select>

                                                        {producto && (
                                                            <p className="text-[11px] mt-1 ml-0.5">
                                                                <span className="text-stone-500 dark:text-stone-400 font-mono">
                                                                    ${(parseFloat(producto.price_usdt) || 0).toFixed(2)}
                                                                </span>
                                                                {stock > 0 ? (
                                                                    <span className={excede ? 'text-amber-600 dark:text-amber-400 font-bold ml-2' : 'text-stone-400 dark:text-stone-500 ml-2'}>
                                                                        {excede
                                                                            ? `Solo hay ${stock} — se agregarán ${stock}`
                                                                            : `Stock: ${stock}`}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-red-500 dark:text-red-400 font-bold ml-2">Sin stock — no se agregará</span>
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => actualizarFila(fila.id, { qty: Math.max(1, fila.qty - 1) })}
                                                            className="px-2.5 py-1.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                                        >−</button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={fila.qty}
                                                            onChange={e => {
                                                                const v = parseInt(e.target.value, 10);
                                                                actualizarFila(fila.id, { qty: isNaN(v) ? 1 : Math.max(1, v) });
                                                            }}
                                                            className="w-14 text-center text-sm font-mono border-x border-stone-200 dark:border-stone-800 py-1.5 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => actualizarFila(fila.id, { qty: fila.qty + 1 })}
                                                            className="px-2.5 py-1.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                                        >+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
                                    <div className="text-xs text-stone-500 dark:text-stone-400">
                                        <span className="font-bold text-stone-700 dark:text-stone-300">{filasListas.length}</span> de {filas.length} líneas listas
                                        {totalUnidades > 0 && <> · <span className="font-bold text-stone-700 dark:text-stone-300">{totalUnidades}</span> unidades</>}
                                        {sinResolver > 0 && <span className="text-amber-600 dark:text-amber-400 font-semibold"> · {sinResolver} sin resolver</span>}
                                        {agotadas > 0 && <span className="text-red-500 dark:text-red-400 font-semibold"> · {agotadas} sin stock</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaso('texto')}
                                            className="px-4 py-2.5 border-2 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm"
                                        >
                                            Volver
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmar}
                                            disabled={filasListas.length === 0}
                                            className="px-5 py-2.5 bg-marca-700 dark:bg-marca-500 text-white font-bold rounded-xl hover:bg-marca-800 dark:hover:bg-marca-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                        >
                                            Agregar {filasListas.length > 0 ? `${filasListas.length} producto${filasListas.length === 1 ? '' : 's'}` : ''}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
