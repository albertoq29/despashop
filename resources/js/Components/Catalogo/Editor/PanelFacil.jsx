import { router } from '@inertiajs/react';
import { ArrowRight, Check, Eye, EyeOff, Pencil, Settings2, Sparkles } from 'lucide-react';
import PrimerosPasos from '@/Components/PrimerosPasos';
import { Grupo, ReversionDeColores, Segmentado, SubidaImagen, Texto } from './Controles';
import TemasRapidos from './TemasRapidos';
import { TIPOS_DE_SECCION } from '../secciones';

/**
 * Bloques que se encienden desde aquí, en el orden en que importan.
 *
 * La cabecera y los productos no están: son el catálogo, no una opción. Los
 * bloques propios (texto, beneficios, preguntas) tampoco: se agregan y se
 * reordenan en la pestaña Secciones, que es justo lo avanzado.
 */
const ENCENDIBLES = ['hero', 'banners', 'featured', 'services', 'combos', 'marquee', 'announcement', 'contact'];

/**
 * Grupos de redondez.
 *
 * El panel avanzado tiene las seis opciones de `radius`. Aquí van tres, y
 * cada una representa a dos: así un catálogo que ya tenía `lg` aparece
 * marcado en «Suaves» en vez de quedarse sin nada elegido.
 */
const REDONDEZ = [
    { valor: 'none', texto: 'Rectas', equivalen: ['none', 'sm'] },
    { valor: 'lg', texto: 'Suaves', equivalen: ['md', 'lg'] },
    { valor: 'xl', texto: 'Redondas', equivalen: ['xl', 'full'] },
];

/**
 * Lo primero que se ve al entrar a personalizar el catálogo.
 *
 * El editor completo tiene más de setenta controles repartidos en seis
 * pestañas, y para quien abre esto por primera vez eso no es libertad: es no
 * saber por dónde empezar. Aquí está lo que de verdad cambia cómo se ve un
 * catálogo —el logo, un tema, cuatro decisiones de forma, qué bloques se
 * encienden y los textos de la portada— y nada más.
 *
 * No reemplaza al editor completo ni esconde nada: es la puerta de entrada,
 * y el botón del final lleva al resto cuando haga falta.
 */
export default function PanelFacil({ editor, conIa, onIa, onPublicar, subtituloDeFabrica }) {
    const { datos, cambiar, theme, inventario } = editor;
    const pasos = primerosPasos({ datos, theme, inventario, onPublicar, editor, subtituloDeFabrica });
    const campo = (clave) => ({ valor: datos[clave], onCambiar: (valor) => cambiar(clave, valor), error: editor.errores[clave] });
    const redondez = REDONDEZ.find((opcion) => opcion.equivalen.includes(datos.radius))?.valor ?? 'lg';

    return (
        <>
            {pasos.hechos < pasos.total && (
                <Grupo
                    titulo="Vamos paso a paso"
                    descripcion="Lo que falta para que tu catálogo se pueda mandar por WhatsApp sin que te dé cosa."
                >
                    <PrimerosPasos pasos={pasos.pasos} hechos={pasos.hechos} total={pasos.total} className="-mx-2" />
                </Grupo>
            )}

            {conIa && (
                <Grupo
                    titulo="La forma más rápida"
                    descripcion="Cuenta en dos frases qué vendes y la IA propone colores, letras, textos y el orden de la página. Nada se publica hasta que lo revises."
                >
                    <button
                        type="button"
                        onClick={onIa}
                        className="pulsable boton-elevado inline-flex w-full items-center justify-center gap-2 rounded-xl bg-marca-700 px-4 py-3 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400"
                    >
                        <Sparkles className="h-4 w-4" />
                        Que la IA arme mi catálogo
                    </button>
                </Grupo>
            )}

            <Grupo id="paso-logo" titulo="Tu logo" descripcion="Al subirlo, el catálogo toma sus colores. Es el cambio que más se nota con menos esfuerzo.">
                {editor.coloresPrevios && (
                    <ReversionDeColores onRevertir={editor.revertirColores} onCerrar={editor.olvidarColoresPrevios} />
                )}

                <SubidaImagen
                    actual={theme.logo_url}
                    ruta={route('catalogo.logo')}
                    campo="logo"
                    rutaBorrado={route('catalogo.imagen.destroy', 'logo')}
                    ayuda="PNG o JPG hasta 4 MB. Con fondo transparente se ve mejor."
                    onListo={editor.sincronizarColores}
                />

                {theme.logo_palette?.length > 0 && (
                    <button
                        type="button"
                        onClick={() =>
                            router.post(route('catalogo.logo.paleta'), {}, {
                                preserveScroll: true,
                                preserveState: true,
                                onSuccess: editor.sincronizarColores,
                            })
                        }
                        className="pulsable inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                        <Sparkles className="h-4 w-4" />
                        Repintar con los colores del logo
                    </button>
                )}
            </Grupo>

            <Grupo titulo="Elige un estilo" descripcion="Cada uno cambia colores, letras y formas de una vez. El contenido no se toca.">
                <TemasRapidos datos={datos} onAplicar={editor.aplicarTema} />
            </Grupo>

            <Grupo titulo="Cuatro decisiones" descripcion="Lo que más cambia el aspecto sin entrar en detalles.">
                <Segmentado
                    etiqueta="Esquinas"
                    valor={redondez}
                    onCambiar={(valor) => cambiar('radius', valor)}
                    opciones={REDONDEZ.map(({ valor, texto }) => ({ valor, texto }))}
                />

                <Segmentado
                    etiqueta="Cómo se ven tus productos"
                    {...campo('layout')}
                    opciones={[
                        { valor: 'grid', texto: 'Cuadrícula' },
                        { valor: 'list', texto: 'Lista' },
                        { valor: 'masonry', texto: 'Mosaico' },
                    ]}
                />

                <Segmentado
                    etiqueta="Aire entre las cosas"
                    {...campo('density')}
                    opciones={[
                        { valor: 'compact', texto: 'Junto' },
                        { valor: 'normal', texto: 'Normal' },
                        { valor: 'airy', texto: 'Amplio' },
                    ]}
                />

                <Segmentado
                    etiqueta="Movimiento"
                    {...campo('animation_level')}
                    opciones={[
                        { valor: 'none', texto: 'Ninguno' },
                        { valor: 'subtle', texto: 'Suave' },
                        { valor: 'lively', texto: 'Animado' },
                    ]}
                    ayuda="Cómo entran los bloques mientras bajan por tu catálogo."
                />
            </Grupo>

            <Grupo titulo="Qué se ve en tu catálogo" descripcion="Enciende lo que te sirva y apaga el resto. Tu cabecera y tus productos van siempre.">
                <div className="space-y-1.5">
                    {ENCENDIBLES.map((tipo) => {
                        const seccion = datos.sections.find((s) => s.id === tipo);

                        return seccion ? (
                            <FilaDeBloque
                                key={tipo}
                                seccion={seccion}
                                falta={queFalta(tipo, datos, editor.banners, inventario)}
                                onAlternar={() => editor.alternarSeccion(tipo)}
                                onAjustar={() => editor.editarSeccion(tipo)}
                            />
                        ) : null;
                    })}
                </div>
            </Grupo>

            <Grupo id="paso-portada" titulo="Lo primero que leen" descripcion="El titular grande de la portada. Si lo dejas vacío se usa el nombre de tu negocio.">
                <Texto etiqueta="Título" {...campo('hero_title')} placeholder={editor.comercio} maximo={120} />
                <Texto etiqueta="Debajo del título" {...campo('hero_subtitle')} maximo={200} filas={2} />
            </Grupo>

            <Grupo titulo="Tu WhatsApp" descripcion="Todos los botones del catálogo escriben a este número. Sin él, nadie puede pedirte nada.">
                <Texto etiqueta="Número" {...campo('whatsapp_number')} placeholder="+58 412 0000000" maximo={40} />
            </Grupo>

            <Grupo
                titulo="¿Quieres afinar más?"
                descripcion="Todo lo demás sigue estando: los colores uno por uno, las tipografías, los banners, las preguntas frecuentes y el orden de los bloques."
            >
                <button
                    type="button"
                    onClick={() => editor.irAPestana('secciones')}
                    className="pulsable group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                    <Settings2 className="h-4 w-4" />
                    Personalización avanzada
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-salida group-hover:translate-x-0.5" />
                </button>
            </Grupo>
        </>
    );
}

/**
 * Los mismos cuatro pasos que muestra el panel, pero resueltos aquí.
 *
 * El servidor los calcula para el panel; aquí no sirve esa copia, porque
 * el comercio acaba de subir el logo o de escribir su portada y el paso
 * tiene que tacharse en ese momento, no al recargar. Se leen del borrador
 * que el editor tiene en la mano.
 *
 * Y las acciones son de esta misma pantalla: bajan hasta el control que
 * toca en vez de mandar a otro lado. Esa es toda la diferencia.
 */
function primerosPasos({ datos, theme, inventario, onPublicar, editor, subtituloDeFabrica }) {
    const bajarA = (id) => () =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const pasos = [
        {
            clave: 'productos',
            titulo: 'Carga lo que vendes',
            texto: 'Un catálogo sin productos se ve vacío por más bonito que quede.',
            hecho: (inventario?.productos ?? 0) + (inventario?.servicios ?? 0) > 0,
            enlace: route('productos.index'),
            accion: 'Cargar',
        },
        {
            clave: 'logo',
            titulo: 'Sube tu logo',
            texto: 'El catálogo toma sus colores solo.',
            hecho: Boolean(theme.logo_url),
            alIr: bajarA('paso-logo'),
            accion: 'Subirlo',
        },
        {
            clave: 'portada',
            titulo: 'Escribe tu portada',
            texto: 'Lo primero que se lee al entrar.',
            hecho: portadaPropia(datos, editor.comercio, subtituloDeFabrica),
            alIr: bajarA('paso-portada'),
            accion: 'Escribirla',
        },
        {
            clave: 'publicado',
            titulo: 'Déjalo en línea',
            texto: 'Mientras esté oculto solo lo ves tú.',
            hecho: Boolean(datos.is_published),
            alIr: onPublicar,
            accion: 'Publicar',
        },
    ];

    return { pasos, hechos: pasos.filter((paso) => paso.hecho).length, total: pasos.length };
}

/**
 * La misma regla que App\Support\PrimerosPasos, para que el paso no
 * aparezca tachado en una pantalla y pendiente en la otra.
 *
 * El catálogo nace con el nombre del negocio arriba y un subtítulo
 * genérico: eso no es haber escrito la portada, es que no abra vacía.
 */
function portadaPropia(datos, suNombre, subtituloDeFabrica) {
    const titulo = String(datos.hero_title ?? '').trim();
    const subtitulo = String(datos.hero_subtitle ?? '').trim();

    return (titulo !== '' && titulo !== suNombre) || (subtitulo !== '' && subtitulo !== subtituloDeFabrica);
}

/**
 * Un bloque encendido que no tiene con qué llenarse no se pinta, y desde
 * aquí eso parecería que el interruptor no sirve. Mejor decirlo.
 */
function queFalta(tipo, datos, banners, inventario) {
    if (tipo === 'banners' && banners.length === 0) {
        return 'Te falta subir banners';
    }
    if (tipo === 'services' && (inventario?.servicios ?? 0) === 0) {
        return 'Te falta marcar algún artículo como servicio';
    }
    if (tipo === 'combos' && (inventario?.combos ?? 0) === 0) {
        return 'Te falta crear un combo';
    }
    if (tipo === 'featured' && (inventario?.productos ?? 0) === 0) {
        return 'Te falta agregar productos';
    }
    if (tipo === 'marquee' && !datos.marquee_text?.trim()) {
        return 'Te falta escribir el texto de la cinta';
    }
    if (tipo === 'announcement' && !datos.announcement?.trim()) {
        return 'Te falta escribir el aviso';
    }

    return null;
}

function FilaDeBloque({ seccion, falta, onAlternar, onAjustar }) {
    const tipo = TIPOS_DE_SECCION[seccion.type];
    const Icono = tipo?.Icono ?? Check;
    const encendido = seccion.visible;

    return (
        <div
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                encendido
                    ? 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
                    : 'border-stone-200 bg-stone-50 dark:border-stone-800/70 dark:bg-stone-950/40'
            }`}
        >
            <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    encendido
                        ? 'bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400'
                        : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500'
                }`}
            >
                <Icono className="h-4 w-4" />
            </span>

            <span className={`min-w-0 flex-1 ${encendido ? '' : 'opacity-60'}`}>
                <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                    {tipo?.nombre ?? seccion.type}
                </span>
                <span
                    className={`block truncate text-[11px] ${
                        encendido && falta ? 'text-amber-700 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'
                    }`}
                >
                    {encendido && falta ? falta : tipo?.descripcion}
                </span>
            </span>

            {encendido && (
                <button
                    type="button"
                    onClick={onAjustar}
                    aria-label={`Ajustar ${tipo?.nombre ?? seccion.type}`}
                    title="Ajustar este bloque"
                    className="pulsable grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            )}

            <button
                type="button"
                role="switch"
                aria-checked={encendido}
                onClick={onAlternar}
                aria-label={`${encendido ? 'Ocultar' : 'Mostrar'} ${tipo?.nombre ?? seccion.type}`}
                title={encendido ? 'Ocultar este bloque' : 'Mostrar este bloque'}
                className={`pulsable grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    encendido
                        ? 'text-marca-700 hover:bg-marca-50 dark:text-marca-400 dark:hover:bg-marca-950/60'
                        : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
            >
                {encendido ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
        </div>
    );
}
