import { useEffect, useId, useRef, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, Info, Loader2, Package, Palette, PenLine, RotateCcw, Sparkles, X } from 'lucide-react';
import { contrasteSobre } from '../colores';
import { TIPOS_DE_SECCION } from '../secciones';
import { Segmentado } from './Controles';

const SALIDA = [0.23, 1, 0.32, 1];

const IDEAS = [
    'Cafetería artesanal en Mérida. Vendemos café de altura en grano y molido, postres caseros y tazas. Queremos un estilo cálido, con tonos tierra.',
    'Ferretería de barrio en Valencia con herramientas, pinturas, electricidad y plomería. Algo claro, serio y fácil de recorrer desde el teléfono.',
    'Tienda de ropa deportiva para mujeres en Caracas: licras, tops, zapatos y accesorios. Moderna, con energía y colores vivos.',
];

const QUE_PROPONER = [
    { clave: 'diseno', titulo: 'Diseño', texto: 'Colores, letras y estilo', Icono: Palette },
    { clave: 'textos', titulo: 'Textos y secciones', texto: 'Portada, beneficios, orden', Icono: PenLine },
    { clave: 'inventario', titulo: 'Productos de ejemplo', texto: 'Categorías y borradores', Icono: Package },
];

const PASOS_DE_ESPERA = [
    'Leyendo la descripción de tu negocio',
    'Eligiendo colores que combinen',
    'Buscando las tipografías',
    'Escribiendo los textos',
    'Ordenando los bloques de la página',
    'Revisando que todo se lea bien',
];

/**
 * Asistente para crear el catálogo a partir de una descripción.
 *
 * Nada de lo que propone se guarda solo: el diseño y los textos pasan al
 * borrador del editor (se ven en la vista previa y se pueden deshacer) y el
 * inventario de ejemplo se crea únicamente si el comercio lo elige.
 */
export default function AsistenteIa({ abierto, onCerrar, uso, onUso, limites, onAplicar, onInventarioCreado }) {
    const [paso, setPaso] = useState('escribir');
    const [descripcion, setDescripcion] = useState('');
    const [tono, setTono] = useState('cercano');
    const [incluir, setIncluir] = useState({ diseno: true, textos: true, inventario: false });
    const [error, setError] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [elegidos, setElegidos] = useState({ categorias: [], productos: [] });
    const [aplicando, setAplicando] = useState(false);
    const peticion = useRef(0);
    const titulo = useId();

    // Cerrar con Escape y bloquear el scroll de la página mientras está abierto
    useEffect(() => {
        if (!abierto) {
            return undefined;
        }

        const alPulsar = (evento) => evento.key === 'Escape' && !aplicando && onCerrar();
        const anterior = document.body.style.overflow;

        document.addEventListener('keydown', alPulsar);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', alPulsar);
            document.body.style.overflow = anterior;
        };
    }, [abierto, aplicando, onCerrar]);

    const espera = useCuentaRegresiva(uso);

    const generar = async () => {
        const id = ++peticion.current;
        setError(null);
        setPaso('generando');

        try {
            const { data } = await axios.post(route('catalogo.ia.generar'), { descripcion, tono, incluir });

            // Si cerró la ventana o pidió otra propuesta mientras tanto, esta ya no importa
            if (id !== peticion.current) {
                return;
            }

            onUso(data.uso);
            setResultado(data);
            setElegidos({
                categorias: (data.propuesta.inventario?.categorias ?? []).map((_, i) => i),
                productos: (data.propuesta.inventario?.productos ?? []).map((_, i) => i),
            });
            setPaso('propuesta');
        } catch (e) {
            if (id !== peticion.current) {
                return;
            }

            const respuesta = e.response?.data;

            if (respuesta?.uso) {
                onUso(respuesta.uso);
            }

            setError(
                respuesta?.errors?.descripcion?.[0] ??
                    respuesta?.message ??
                    'No pudimos conectar con el asistente. Revisa tu conexión e intenta de nuevo.',
            );
            setPaso('escribir');
        }
    };

    const aplicar = async () => {
        const { propuesta, generacion_id: generacionId } = resultado;
        setAplicando(true);
        setError(null);

        onAplicar(propuesta);

        const conInventario = elegidos.categorias.length > 0 || elegidos.productos.length > 0;

        if (propuesta.inventario && conInventario) {
            try {
                const { data } = await axios.post(route('catalogo.ia.inventario', generacionId), elegidos);
                onInventarioCreado(data.creado);
            } catch (e) {
                setError(e.response?.data?.message ?? 'Se aplicó el diseño, pero no pudimos crear los productos de ejemplo.');
                setAplicando(false);

                return;
            }
        }

        setAplicando(false);
        reiniciar();
        onCerrar();
    };

    const reiniciar = () => {
        setPaso('escribir');
        setResultado(null);
        setError(null);
    };

    const cerrar = () => {
        if (aplicando) {
            return;
        }

        // Una petición en curso se ignora al volver; la descripción se conserva
        peticion.current++;

        if (paso === 'generando') {
            setPaso('escribir');
        }

        onCerrar();
    };

    const largo = descripcion.trim().length;
    const nadaElegido = !Object.values(incluir).some(Boolean);
    const sinCupo = uso.restantes <= 0;
    const puedeGenerar = largo >= limites.minimo && largo <= limites.maximo && !nadaElegido && !sinCupo && espera === 0;

    return (
        <AnimatePresence>
            {abierto && (
                <div key="asistente" className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titulo}>
                    <motion.button
                        type="button"
                        aria-label="Cerrar"
                        onClick={cerrar}
                        className="absolute inset-0 bg-stone-950/60 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.2 }}
                    />

                    <motion.div
                        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-stone-900 sm:max-w-2xl sm:rounded-2xl"
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16 } }}
                        transition={{ duration: 0.3, ease: SALIDA }}
                    >
                        {/* Encabezado */}
                        <div className="flex items-start gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-800">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                                <Sparkles className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 id={titulo} className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
                                    Crea tu catálogo con IA
                                </h2>
                                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                    Describe tu negocio y te proponemos diseño, textos y productos de ejemplo.
                                </p>
                            </div>
                            <Cupo uso={uso} />
                            <button
                                type="button"
                                onClick={cerrar}
                                disabled={aplicando}
                                aria-label="Cerrar"
                                className="pulsable -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-40 dark:text-stone-400 dark:hover:bg-stone-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={paso}
                                    initial={{ opacity: 0, x: paso === 'propuesta' ? 16 : 0 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                                    transition={{ duration: 0.24, ease: SALIDA }}
                                    className="p-5"
                                >
                                    {paso === 'escribir' && (
                                        <Escribir
                                            descripcion={descripcion}
                                            onDescripcion={setDescripcion}
                                            tono={tono}
                                            onTono={setTono}
                                            incluir={incluir}
                                            onIncluir={setIncluir}
                                            limites={limites}
                                            error={error}
                                        />
                                    )}
                                    {paso === 'generando' && <Generando />}
                                    {paso === 'propuesta' && resultado && (
                                        <Propuesta
                                            propuesta={resultado.propuesta}
                                            elegidos={elegidos}
                                            onElegidos={setElegidos}
                                            error={error}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 bg-stone-50/80 px-5 py-3 dark:border-stone-800 dark:bg-stone-950/40">
                            {paso === 'propuesta' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={reiniciar}
                                        disabled={aplicando}
                                        className="pulsable inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200/70 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Cambiar la descripción
                                    </button>
                                    <span className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={generar}
                                        disabled={aplicando || sinCupo || espera > 0}
                                        title={sinCupo ? 'Ya usaste tus creaciones de hoy' : undefined}
                                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {espera > 0 ? `Otra en ${espera} s` : 'Otra propuesta'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={aplicar}
                                        disabled={aplicando}
                                        className="pulsable boton-elevado inline-flex items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
                                    >
                                        {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Aplicar al catálogo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                                        <Info className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            {sinCupo
                                                ? 'Ya usaste tus creaciones de hoy. Se renuevan mañana.'
                                                : 'Nada se publica hasta que guardes. Podrás revisar y deshacer.'}
                                        </span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={generar}
                                        disabled={!puedeGenerar || paso === 'generando'}
                                        className="pulsable boton-elevado inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
                                    >
                                        {paso === 'generando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        {paso === 'generando' ? 'Creando' : espera > 0 ? `Espera ${espera} s` : 'Crear propuesta'}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ── Paso 1: la descripción ─────────────────────────────────────────────── */

function Escribir({ descripcion, onDescripcion, tono, onTono, incluir, onIncluir, limites, error }) {
    const campo = useRef(null);
    const largo = descripcion.trim().length;

    useEffect(() => {
        campo.current?.focus({ preventScroll: true });
    }, []);

    return (
        <div className="space-y-5">
            {error && (
                <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <label htmlFor="descripcion-ia" className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        ¿Qué vendes y cómo quieres que se vea?
                    </label>
                    <span
                        className={`text-[11px] tabular-nums ${
                            largo > limites.maximo ? 'text-red-600' : 'text-stone-400 dark:text-stone-500'
                        }`}
                    >
                        {largo}/{limites.maximo}
                    </span>
                </div>
                <textarea
                    id="descripcion-ia"
                    ref={campo}
                    rows={4}
                    maxLength={limites.maximo}
                    value={descripcion}
                    onChange={(e) => onDescripcion(e.target.value)}
                    placeholder="Ej.: Panadería familiar en Barquisimeto. Pan dulce, tortas por encargo y café. Queremos algo cálido y sencillo."
                    className="w-full resize-y rounded-xl border-stone-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
                />
                {largo > 0 && largo < limites.minimo && (
                    <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                        Cuéntanos un poco más: qué vendes, dónde y qué estilo te gusta.
                    </p>
                )}
            </div>

            <div>
                <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">Ideas para empezar</p>
                <div className="flex flex-col gap-1.5">
                    {IDEAS.map((idea) => (
                        <button
                            key={idea}
                            type="button"
                            onClick={() => onDescripcion(idea)}
                            className="pulsable rounded-lg border border-stone-200 px-3 py-2 text-left text-xs leading-relaxed text-stone-600 hover:border-marca-500 hover:bg-marca-50/60 dark:border-stone-800 dark:text-stone-400 dark:hover:border-marca-500 dark:hover:bg-marca-950/30"
                        >
                            {idea}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-2 text-sm font-medium text-stone-800 dark:text-stone-200">Qué quieres que proponga</p>
                <div className="grid gap-2 sm:grid-cols-3">
                    {QUE_PROPONER.map(({ clave, titulo, texto, Icono }) => {
                        const activo = incluir[clave];

                        return (
                            <button
                                key={clave}
                                type="button"
                                role="checkbox"
                                aria-checked={activo}
                                onClick={() => onIncluir((anterior) => ({ ...anterior, [clave]: !anterior[clave] }))}
                                className={`pulsable relative flex items-start gap-2.5 rounded-xl border p-3 text-left ${
                                    activo
                                        ? 'border-marca-600 bg-marca-50/70 ring-1 ring-marca-600/30 dark:border-marca-500 dark:bg-marca-950/40'
                                        : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700'
                                }`}
                            >
                                <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${activo ? 'text-marca-700 dark:text-marca-400' : 'text-stone-400'}`} />
                                <span className="min-w-0">
                                    <span className="block text-[13px] font-semibold text-stone-800 dark:text-stone-100">{titulo}</span>
                                    <span className="block text-[11px] text-stone-500 dark:text-stone-400">{texto}</span>
                                </span>
                                <span
                                    className={`absolute right-2 top-2 grid h-4 w-4 place-items-center rounded transition-colors ${
                                        activo ? 'bg-marca-600 text-white dark:bg-marca-500' : 'border border-stone-300 dark:border-stone-600'
                                    }`}
                                >
                                    {activo && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Segmentado
                etiqueta="Tono de los textos"
                valor={tono}
                onCambiar={onTono}
                opciones={[
                    { valor: 'cercano', texto: 'Cercano' },
                    { valor: 'profesional', texto: 'Profesional' },
                    { valor: 'alegre', texto: 'Alegre' },
                    { valor: 'elegante', texto: 'Elegante' },
                ]}
            />

            <p className="rounded-xl bg-stone-100 px-3.5 py-3 text-[11px] leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
                Tu descripción y los nombres de tus productos se envían a un servicio externo de IA. Nunca tus precios,
                costos ni datos de clientes. La IA puede equivocarse: revisa la propuesta antes de guardarla.
            </p>
        </div>
    );
}

/* ── Paso 2: esperando a la IA ──────────────────────────────────────────── */

function Generando() {
    const [indice, setIndice] = useState(0);

    useEffect(() => {
        const intervalo = setInterval(() => setIndice((i) => Math.min(i + 1, PASOS_DE_ESPERA.length - 1)), 2600);

        return () => clearInterval(intervalo);
    }, []);

    return (
        <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
            <div className="relative grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-marca-500/20 [animation-duration:1.8s]" />
                <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                    <Sparkles className="h-7 w-7" />
                </span>
            </div>

            <div className="mt-6 h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={indice}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: SALIDA }}
                        className="text-sm font-medium text-stone-700 dark:text-stone-200"
                    >
                        {PASOS_DE_ESPERA[indice]}
                    </motion.p>
                </AnimatePresence>
            </div>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Suele tardar entre 10 y 30 segundos.</p>

            <div className="mt-8 w-full max-w-sm space-y-2.5">
                {[100, 82, 64].map((ancho, i) => (
                    <div
                        key={ancho}
                        className="h-3 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800"
                        style={{ width: `${ancho}%`, animationDelay: `${i * 150}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}

/* ── Paso 3: la propuesta ───────────────────────────────────────────────── */

function Propuesta({ propuesta, elegidos, onElegidos, error }) {
    const { tema, textos, sections: secciones, inventario, concepto } = propuesta;

    const alternar = (lista, indice) =>
        onElegidos((anterior) => ({
            ...anterior,
            [lista]: anterior[lista].includes(indice)
                ? anterior[lista].filter((i) => i !== indice)
                : [...anterior[lista], indice],
        }));

    return (
        <div className="space-y-6">
            {error && (
                <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {concepto && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{concepto}</p>}

            {(tema || textos) && <MuestraDePortada tema={tema} textos={textos} />}

            {tema && (
                <Apartado titulo="Paleta y letras">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex overflow-hidden rounded-lg ring-1 ring-black/10 dark:ring-white/10">
                            {['color_primary', 'color_secondary', 'color_accent', 'color_bg', 'color_surface', 'color_text'].map((clave) => (
                                <span key={clave} title={tema[clave]} className="h-8 w-8" style={{ background: tema[clave] }} />
                            ))}
                        </div>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                            <span style={{ fontFamily: `"${tema.font_heading}", system-ui` }} className="text-sm text-stone-800 dark:text-stone-100">
                                {tema.font_heading}
                            </span>{' '}
                            para títulos, {tema.font_body} para el texto
                        </span>
                    </div>
                </Apartado>
            )}

            {secciones && (
                <Apartado titulo="Orden de la página">
                    <ol className="flex flex-wrap gap-1.5">
                        {secciones
                            .filter((s) => s.visible)
                            .map((seccion, indice) => {
                                const tipo = TIPOS_DE_SECCION[seccion.type];

                                return (
                                    <li
                                        key={seccion.id ?? `${seccion.type}-${indice}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                                    >
                                        <span className="tabular-nums text-stone-400">{indice + 1}</span>
                                        {tipo?.Icono && <tipo.Icono className="h-3.5 w-3.5" />}
                                        {tipo?.repetible && seccion.title ? seccion.title : tipo?.nombre}
                                    </li>
                                );
                            })}
                    </ol>
                </Apartado>
            )}

            {inventario && (inventario.categorias.length > 0 || inventario.productos.length > 0) && (
                <Apartado
                    titulo="Productos de ejemplo"
                    descripcion="Se crean ocultos, sin precio ni fotos, para que los completes en Inventario. Desmarca los que no quieras."
                >
                    {inventario.categorias.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {inventario.categorias.map((nombre, indice) => (
                                <Casilla
                                    key={nombre}
                                    activa={elegidos.categorias.includes(indice)}
                                    onClick={() => alternar('categorias', indice)}
                                    compacta
                                >
                                    {nombre}
                                </Casilla>
                            ))}
                        </div>
                    )}

                    <div className="grid gap-1.5 sm:grid-cols-2">
                        {inventario.productos.map((producto, indice) => (
                            <Casilla
                                key={producto.nombre}
                                activa={elegidos.productos.includes(indice)}
                                onClick={() => alternar('productos', indice)}
                            >
                                <span className="block text-[13px] font-medium text-stone-800 dark:text-stone-100">{producto.nombre}</span>
                                {producto.descripcion && (
                                    <span className="mt-0.5 block text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                                        {producto.descripcion}
                                    </span>
                                )}
                            </Casilla>
                        ))}
                    </div>
                </Apartado>
            )}
        </div>
    );
}

/** Portada en miniatura con los colores, letras y textos propuestos. */
function MuestraDePortada({ tema, textos }) {
    const t = tema ?? {};
    const primario = t.color_primary ?? '#292524';
    const radio = { none: 0, sm: 4, md: 6, lg: 10, xl: 14, full: 18 }[t.radius] ?? 10;
    const radioBoton = t.button_style === 'pill' ? 999 : radio;

    return (
        <div
            className="overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10"
            style={{ background: t.color_bg ?? '#ffffff', color: t.color_text ?? '#1c1917', fontFamily: `"${t.font_body ?? 'Inter'}", system-ui` }}
        >
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${(t.color_text ?? '#1c1917')}1a` }}>
                <span className="h-5 w-5 rounded" style={{ background: primario }} />
                <span className="h-2 w-20 rounded-full" style={{ background: `${t.color_text ?? '#1c1917'}33` }} />
            </div>
            <div className="px-5 py-6">
                <p className="text-balance text-xl font-semibold leading-tight sm:text-2xl" style={{ fontFamily: `"${t.font_heading ?? 'Inter'}", system-ui` }}>
                    {textos?.hero_title || 'Tu portada'}
                </p>
                {textos?.hero_subtitle && (
                    <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: t.color_muted ?? '#78716c' }}>
                        {textos.hero_subtitle}
                    </p>
                )}
                <span
                    className="mt-4 inline-block px-4 py-2 text-xs font-semibold"
                    style={
                        t.button_style === 'outline'
                            ? { border: `1.5px solid ${primario}`, color: primario, borderRadius: radioBoton }
                            : t.button_style === 'soft'
                              ? { background: `${primario}24`, color: primario, borderRadius: radioBoton }
                              : { background: primario, color: contrasteSobre(primario), borderRadius: radioBoton }
                    }
                >
                    {textos?.hero_cta_text || 'Ver productos'}
                </span>
            </div>
        </div>
    );
}

function Apartado({ titulo, descripcion, children }) {
    return (
        <section>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</h3>
            {descripcion && <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{descripcion}</p>}
            <div className="mt-2.5">{children}</div>
        </section>
    );
}

function Casilla({ activa, onClick, children, compacta = false }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={activa}
            onClick={onClick}
            className={`pulsable flex items-start gap-2 rounded-lg border text-left ${compacta ? 'px-2.5 py-1.5 text-xs' : 'p-2.5'} ${
                activa
                    ? 'border-marca-600/60 bg-marca-50/60 dark:border-marca-500/60 dark:bg-marca-950/30'
                    : 'border-stone-200 opacity-60 hover:opacity-100 dark:border-stone-800'
            }`}
        >
            <span
                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded transition-colors ${
                    activa ? 'bg-marca-600 text-white dark:bg-marca-500 dark:text-stone-950' : 'border border-stone-300 dark:border-stone-600'
                }`}
            >
                {activa && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">{children}</span>
        </button>
    );
}

function Cupo({ uso }) {
    const agotado = uso.restantes <= 0;

    return (
        <span
            className={`mt-1 hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums sm:inline-block ${
                agotado
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
            }`}
            title="Creaciones con IA disponibles hoy"
        >
            {uso.restantes} de {uso.limite} hoy
        </span>
    );
}

/** Segundos que faltan para poder pedir otra propuesta. */
function useCuentaRegresiva(uso) {
    const [segundos, setSegundos] = useState(uso.espera ?? 0);

    // Cada respuesta del servidor trae su propia espera, aunque repita el número
    useEffect(() => setSegundos(uso.espera ?? 0), [uso]);

    useEffect(() => {
        if (segundos <= 0) {
            return undefined;
        }

        const temporizador = setTimeout(() => setSegundos((s) => Math.max(0, s - 1)), 1000);

        return () => clearTimeout(temporizador);
    }, [segundos]);

    return segundos;
}
