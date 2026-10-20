import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { numeroDeWhatsapp } from '@/utils/whatsapp';
import {
    ArrowRight,
    BarChart3,
    Check,
    Copy,
    ExternalLink,
    Package,
    Palette,
    Plus,
    Receipt,
    Sparkles,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ResumenDelPlan from '@/Components/Plan/ResumenDelPlan';
import PrimerosPasos from '@/Components/PrimerosPasos';
import { Boton, Campo, Entrada, Pagina, Tarjeta } from '@/Components/UI';

/**
 * Panel del comercio.
 *
 * Antes abría con cuatro cifras, un gráfico y un buscador por fechas. Para
 * quien recién llega eso es un tablero vacío que no dice qué hacer, y para
 * quien ya trabaja es ruido delante de lo que vino a hacer. Las cifras se
 * mudaron a Estadísticas.
 *
 * Lo que queda es lo que se usa: dónde está su catálogo, qué le falta —si le
 * falta algo— y una caja de dos campos para agregar algo sin salir de aquí.
 */
export default function Dashboard({ nombre, catalogo, plan, soporte, primerosPasos }) {
    return (
        <AuthenticatedLayout header="Panel">
            <Head title="Panel" />

            <Pagina>
                <Saludo nombre={nombre} listo={primerosPasos.listo} />

                {!primerosPasos.listo && <Guia pasos={primerosPasos} catalogo={catalogo} />}

                <TuCatalogo catalogo={catalogo} />

                <AgregarRapido />

                <AccesosRapidos />

                {plan && <ResumenDelPlan id="plan" resumen={plan} pie={<ContactoParaElPlan soporte={soporte} plan={plan} />} />}

                <ComoVaElNegocio />
            </Pagina>
        </AuthenticatedLayout>
    );
}

function Saludo({ nombre, listo }) {
    return (
        <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
                Hola, {nombre}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {listo
                    ? 'Tu catálogo está en línea. Desde aquí lo compartes, agregas lo que vendes y facturas.'
                    : 'Vamos por partes: unos pocos pasos y tu catálogo queda listo para compartir.'}
            </p>
        </div>
    );
}

/* ── La guía ────────────────────────────────────────────────────────────── */

/**
 * El ofrecimiento para quien todavía no tiene el catálogo armado.
 *
 * Pregunta antes de mandar —«¿creamos tu catálogo?»— porque quien entra por
 * primera vez no está buscando una lista de tareas: está viendo si esto le
 * sirve. Y da dos caminos: que lo arme la IA en un minuto, o los pasos a
 * mano para quien prefiere ir viendo.
 */
function Guia({ pasos, catalogo }) {
    const empezando = pasos.hechos <= 1;

    return (
        <Tarjeta cuerpo={false} className="overflow-hidden">
            <div className="border-b border-stone-200 p-5 dark:border-stone-800 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100 sm:text-xl">
                            {empezando ? '¿Creamos tu catálogo?' : 'Ya casi está'}
                        </h3>
                        <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                            {empezando
                                ? 'Te vamos llevando paso a paso. No hay que saber de diseño y nada se publica sin que lo veas antes.'
                                : 'Te falta poco para tener un catálogo que da gusto mandar por WhatsApp.'}
                        </p>
                    </div>

                    {catalogo.ia_disponible && (
                        <Boton href={route('catalogo.personalizar', { ia: 1 })} className="w-full sm:w-auto">
                            <Sparkles className="h-4 w-4" />
                            Que lo arme la IA
                        </Boton>
                    )}
                </div>
            </div>

            <div className="p-3 sm:p-4">
                <div className="px-2 sm:px-1">
                    <PrimerosPasos pasos={pasos.pasos} hechos={pasos.hechos} total={pasos.total} />
                </div>
            </div>
        </Tarjeta>
    );
}

/* ── El enlace del catálogo ─────────────────────────────────────────────── */

function TuCatalogo({ catalogo }) {
    const [copiado, setCopiado] = useState(false);

    if (!catalogo?.url) {
        return null;
    }

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(catalogo.url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch (e) {
            // Sin permiso de portapapeles el usuario puede copiar del enlace
        }
    };

    return (
        <Tarjeta>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-stone-500 dark:text-stone-400">Tu catálogo</p>
                        {catalogo.publicado ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-marca-100 px-2 py-0.5 text-xs font-medium text-marca-800 dark:bg-marca-950 dark:text-marca-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-marca-600 dark:bg-marca-400" />
                                En línea
                            </span>
                        ) : (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Oculto
                            </span>
                        )}
                    </div>

                    <a
                        href={catalogo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate font-display text-lg font-semibold text-marca-700 hover:underline dark:text-marca-400"
                    >
                        {catalogo.url.replace(/^https?:\/\//, '')}
                    </a>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Boton variante="contorno" tamano="sm" onClick={copiar}>
                        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiado ? 'Copiado' : 'Copiar enlace'}
                    </Boton>

                    <a
                        href={catalogo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                    </a>
                </div>
            </div>
        </Tarjeta>
    );
}

/* ── Agregar algo sin salir del panel ───────────────────────────────────── */

/**
 * Dos campos y listo.
 *
 * El formulario completo de productos tiene pestañas, variantes, tres
 * niveles de precio y existencias por unidad de medida. Todo eso hace falta
 * —cuando hace falta—. Para llenar un catálogo la primera vez, no: ahí lo
 * que se necesita es poder escribir diez cosas seguidas sin pensar.
 *
 * Nace sin control de existencias a propósito: un producto con cero unidades
 * saldría «agotado» en el catálogo, que es lo último que quiere ver alguien
 * que acaba de cargarlo. El control se enciende después, producto por
 * producto, desde su ficha.
 */
function AgregarRapido() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        price_usdt: '',
        stock: 0,
        controla_stock: false,
    });

    const [ultimo, setUltimo] = useState(null);

    const enviar = (evento) => {
        evento.preventDefault();

        post(route('productos.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setUltimo(data.name);
                reset('name', 'price_usdt');
            },
        });
    };

    return (
        <Tarjeta
            titulo="Agrega algo a tu catálogo"
            descripcion="Nombre y precio. Las fotos, las categorías y lo demás se completan después."
            accion={
                <Boton href={route('productos.index')} variante="fantasma" tamano="sm">
                    Ver todo
                    <ArrowRight className="h-3.5 w-3.5" />
                </Boton>
            }
        >
            <form onSubmit={enviar} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Campo etiqueta="Qué vendes" id="rapido-nombre" error={errors.name} className="flex-1">
                    <Entrada
                        id="rapido-nombre"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Tornillos de media pulgada"
                        maxLength={255}
                        required
                    />
                </Campo>

                <Campo etiqueta="Precio en $" id="rapido-precio" error={errors.price_usdt} className="sm:w-36">
                    <Entrada
                        id="rapido-precio"
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.price_usdt}
                        onChange={(e) => setData('price_usdt', e.target.value)}
                        placeholder="0,00"
                    />
                </Campo>

                <Boton type="submit" disabled={processing || !data.name.trim()} className="sm:mt-8">
                    <Plus className="h-4 w-4" />
                    Agregar
                </Boton>
            </form>

            {ultimo && (
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
                    <Check className="h-4 w-4 text-marca-600 dark:text-marca-400" />
                    <span>
                        <strong className="font-semibold text-stone-800 dark:text-stone-200">{ultimo}</strong> ya está en
                        tu catálogo.
                    </span>
                    <Link
                        href={route('productos.index')}
                        className="font-medium text-marca-700 hover:underline dark:text-marca-400"
                    >
                        Ponle foto y detalles
                    </Link>
                </p>
            )}
        </Tarjeta>
    );
}

/* ── Lo que se hace todos los días ──────────────────────────────────────── */

const ACCESOS = [
    {
        titulo: 'Nueva factura',
        texto: 'Cobra y descuenta del inventario',
        Icono: Receipt,
        ruta: () => route('facturas.create'),
    },
    {
        titulo: 'Productos y servicios',
        texto: 'Edita, ordena y pon fotos',
        Icono: Package,
        ruta: () => route('productos.index'),
    },
    {
        titulo: 'Personalizar catálogo',
        texto: 'Colores, portada y secciones',
        Icono: Palette,
        ruta: () => route('catalogo.personalizar'),
    },
];

function AccesosRapidos() {
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {ACCESOS.map(({ titulo, texto, Icono, ruta }) => (
                <Link
                    key={titulo}
                    href={ruta()}
                    className="pulsable group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 hover:border-marca-500 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-marca-400"
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 group-hover:bg-marca-100 group-hover:text-marca-700 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:bg-marca-950 dark:group-hover:text-marca-400">
                        <Icono className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">{titulo}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-stone-500 dark:text-stone-400">
                            {texto}
                        </span>
                    </span>
                </Link>
            ))}
        </div>
    );
}

/** Las cifras viven en su propia pantalla; aquí solo queda la puerta. */
function ComoVaElNegocio() {
    return (
        <Link
            href={route('estadisticas.index')}
            className="pulsable flex items-center justify-between gap-3 rounded-2xl border border-dashed border-stone-300 px-5 py-4 text-sm hover:border-stone-400 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-stone-600 dark:hover:bg-stone-900/60"
        >
            <span className="flex min-w-0 items-center gap-2.5">
                <BarChart3 className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
                <span className="text-stone-700 dark:text-stone-300">
                    ¿Cómo va el negocio? Ventas, visitas y tasa del día.
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-marca-700 dark:text-marca-400">
                Ver estadísticas
                <ArrowRight className="h-3.5 w-3.5" />
            </span>
        </Link>
    );
}

/* ── Plan ───────────────────────────────────────────────────────────────── */

/** Cómo renovar o cambiar de plan: con el contacto de soporte de la plataforma. */
function ContactoParaElPlan({ soporte, plan }) {
    const numero = numeroDeWhatsapp(soporte?.whatsapp);
    const urgente = ['por_vencer', 'vencido'].includes(plan.estado);
    const mensaje = encodeURIComponent(
        plan.plan ? `Hola, quiero renovar o cambiar mi plan ${plan.plan.nombre}.` : 'Hola, quiero contratar un plan.',
    );

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-600 dark:text-stone-400">
                {urgente
                    ? 'Renueva tu plan para seguir usando todas las funciones sin interrupciones.'
                    : '¿Necesitas más espacio o funciones? Puedes cambiar de plan cuando quieras.'}
            </p>

            {(numero || soporte?.email) && (
                <div className="flex shrink-0 flex-wrap gap-2">
                    {numero && (
                        <a
                            href={`https://wa.me/${numero}?text=${mensaje}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`pulsable boton-elevado inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                                urgente
                                    ? 'bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950'
                                    : 'bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900'
                            }`}
                        >
                            {urgente ? 'Renovar por WhatsApp' : 'Escribir por WhatsApp'}
                        </a>
                    )}
                    {soporte?.email && (
                        <a
                            href={`mailto:${soporte.email}?subject=${encodeURIComponent('Mi plan en Despashop')}`}
                            className="pulsable inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                        >
                            Escribir un correo
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
