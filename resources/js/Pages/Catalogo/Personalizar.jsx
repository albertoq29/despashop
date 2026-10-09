import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import {
    Check,
    Copy,
    ExternalLink,
    Eye,
    GalleryHorizontal,
    Layers,
    Loader2,
    MessageSquare,
    Monitor,
    Palette,
    Redo2,
    Save,
    Share2,
    Sparkles,
    Smartphone,
    Store,
    Undo2,
    Wand2,
    X,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AsistenteIa from '@/Components/Catalogo/Editor/AsistenteIa';
import { Lienzo, useVistaPrevia } from '@/Components/Catalogo/Editor/Lienzo';
import PanelEstilo from '@/Components/Catalogo/Editor/PanelEstilo';
import PanelSecciones from '@/Components/Catalogo/Editor/PanelSecciones';
import { PanelBanners, PanelCompartir, PanelMarca, PanelModales } from '@/Components/Catalogo/Editor/PanelesDeContenido';
import { useHistorial } from '@/Components/Catalogo/Editor/useHistorial';
import { nuevaSeccion } from '@/Components/Catalogo/secciones';
import { MENSAJES } from '@/Components/Catalogo/Vitrina/Editable';
import { AccesoAlTutorial } from '@/Components/Tutorial';
import { aFamilia } from '@/Components/Catalogo/Vitrina/estilos';

const PESTANAS = [
    { id: 'secciones', etiqueta: 'Secciones', Icono: Layers },
    { id: 'estilo', etiqueta: 'Estilo', Icono: Palette },
    { id: 'marca', etiqueta: 'Marca', Icono: Store },
    { id: 'banners', etiqueta: 'Banners', Icono: GalleryHorizontal },
    { id: 'modales', etiqueta: 'Ventanas', Icono: MessageSquare },
    { id: 'compartir', etiqueta: 'Compartir', Icono: Share2 },
];

const PANELES = {
    secciones: PanelSecciones,
    estilo: PanelEstilo,
    marca: PanelMarca,
    banners: PanelBanners,
    modales: PanelModales,
    compartir: PanelCompartir,
};

const COLORES = ['color_primary', 'color_secondary', 'color_accent', 'color_bg', 'color_surface', 'color_text', 'color_muted'];
const SALIDA = [0.23, 1, 0.32, 1];

/**
 * Editor del catálogo.
 *
 * A la izquierda, los controles; a la derecha, el catálogo real dentro de
 * un iframe que recibe el borrador en cada cambio. Nada se publica hasta
 * guardar, y todo se puede deshacer mientras tanto.
 */
export default function Personalizar({ theme, banners, modals, catalogUrl, limites, fuentes, categorias, vistaPreviaUrl, nombreComercio, ia }) {
    const pagina = usePage();
    const { flash } = pagina.props;
    const form = useForm(datosIniciales(theme));
    const formulario = useRef(form);
    formulario.current = form;

    const [pestana, setPestana] = useState('secciones');
    const [seleccion, setSeleccion] = useState(null);
    const [dispositivo, setDispositivo] = useState(() => leerPreferencia('catalogo-dispositivo', 'escritorio'));
    const [verPrevia, setVerPrevia] = useState(false);
    const [aviso, setAviso] = useState(null);
    const [avisoPc, setAvisoPc] = useState(() => leerPreferencia('catalogo-aviso-pc', 'si') === 'si');
    const [avisoAyuda, setAvisoAyuda] = useState(() => leerPreferencia('catalogo-aviso-ayuda', 'si') === 'si');
    // Los colores de antes de que el logo repintara el catálogo
    const [coloresPrevios, setColoresPrevios] = useState(null);
    // El pedido de llevar la vista previa a un bloque viaja junto con el
    // borrador: si llegara antes, se desplazaría sobre el orden viejo.
    const [enfoque, setEnfoque] = useState(null);
    const enfocar = (id) => setEnfoque({ id, n: Date.now() });
    const esEscritorio = useMediaQuery('(min-width: 1024px)');
    const panel = useRef(null);
    const contenido = useRef(null);
    const irAlPanel = useRef(false);

    // Asistente de IA. Se abre solo si se llega con ?ia=1 (desde el panel de inicio).
    const [usoIa, setUsoIa] = useState(ia);
    const [iaAbierta, setIaAbierta] = useState(
        () => ia.disponible && new URLSearchParams(pagina.url.split('?')[1] ?? '').get('ia') === '1',
    );

    useEffect(() => {
        const url = new URL(window.location.href);

        if (iaAbierta && url.searchParams.has('ia')) {
            url.searchParams.delete('ia');
            window.history.replaceState(window.history.state, '', url);
        }
    }, [iaAbierta]);

    /* ── Cambios en el borrador ─────────────────────────────────────────── */

    // Siempre con la forma funcional: `setData(campo, valor)` parte del
    // estado del último render y, con varios cambios seguidos, pisa los
    // anteriores. Así se perdían los temas rápidos.
    const cambiarVarios = useCallback((valores) => {
        formulario.current.setData((anterior) => ({ ...anterior, ...valores }));
    }, []);

    const cambiar = useCallback((campo, valor) => cambiarVarios({ [campo]: valor }), [cambiarVarios]);

    const cambiarSecciones = useCallback((transformar) => {
        formulario.current.setData((anterior) => ({ ...anterior, sections: transformar(anterior.sections) }));
    }, []);

    const reemplazar = useCallback((datos) => formulario.current.setData(datos), []);
    const historial = useHistorial(form.data, reemplazar);
    const historialActual = useRef(historial);
    historialActual.current = historial;

    // «Temas y colores» tiene que dejar los temas en pantalla. Si ya se está
    // en Estilo no hay cambio de pestaña que dispare nada, así que el
    // desplazamiento se hace aquí mismo.
    const verTemas = () => {
        if (pestana === 'estilo') {
            contenido.current?.scrollIntoView({ block: 'start' });

            return;
        }

        irAlPanel.current = true;
        setPestana('estilo');
    };

    const avisar = useCallback((texto, opciones = {}) => {
        setAviso({ id: Date.now(), texto, tono: opciones.tono ?? 'neutro', accion: opciones.accion ?? null });
    }, []);

    const conDeshacer = { texto: 'Deshacer', ejecutar: () => historialActual.current.deshacer() };

    /* ── Vista previa ───────────────────────────────────────────────────── */

    const vista = useVistaPrevia((mensaje) => {
        if (mensaje.tipo === MENSAJES.seleccionar) {
            setPestana('secciones');
            setSeleccion(mensaje.id);
        } else if (mensaje.tipo === MENSAJES.mover) {
            moverSeccion(mensaje.id, mensaje.direccion, true);
            enfocar(mensaje.id);
        } else if (mensaje.tipo === MENSAJES.ocultar) {
            alternarSeccion(mensaje.id);
            avisar('Bloque oculto', { accion: conDeshacer });
        }
    });

    useEffect(() => {
        if (!vista.listo) {
            return undefined;
        }

        // Varios cambios seguidos (arrastrar un color) viajan en un solo mensaje
        const temporizador = setTimeout(
            () => vista.enviar({ tipo: MENSAJES.actualizar, tema: form.data, seleccion, enfoque }),
            16,
        );

        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data, seleccion, enfoque, vista.conexion]);

    // Lo que vive en el servidor (imágenes, banners, ventanas) obliga a
    // recargar los datos de la vista previa; el borrador se reenvía solo.
    const firma = JSON.stringify([
        theme.logo_url,
        theme.cover_url,
        theme.favicon_url,
        banners.map((b) => [b.id, b.updated_at]),
        modals.map((m) => [m.id, m.updated_at]),
        categorias.map((c) => c.id),
    ]);
    const firmaAnterior = useRef(firma);

    useEffect(() => {
        if (firma !== firmaAnterior.current) {
            firmaAnterior.current = firma;
            vista.enviar({ tipo: MENSAJES.recargar });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firma]);

    /* ── Secciones ──────────────────────────────────────────────────────── */

    const seleccionar = (id, { enfocar: llevarAVista = false } = {}) => {
        setSeleccion(id);

        if (llevarAVista && id) {
            enfocar(id);
        }
    };

    function moverSeccion(id, direccion, saltarOcultas = false) {
        cambiarSecciones((secciones) => {
            const origen = secciones.findIndex((s) => s.id === id);
            let destino = origen + direccion;

            // Desde la vista previa se mueve entre bloques visibles: saltar
            // detrás de uno oculto parecería que el botón no hizo nada.
            while (saltarOcultas && destino >= 0 && destino < secciones.length && !secciones[destino].visible) {
                destino += direccion;
            }

            if (origen < 0 || destino < 0 || destino >= secciones.length) {
                return secciones;
            }

            const nuevas = [...secciones];
            const [bloque] = nuevas.splice(origen, 1);
            nuevas.splice(destino, 0, bloque);

            return nuevas;
        });
    }

    function alternarSeccion(id) {
        cambiarSecciones((secciones) => secciones.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
    }

    const actualizarSeccion = (id, cambios) =>
        cambiarSecciones((secciones) => secciones.map((s) => (s.id === id ? { ...s, ...cambios } : s)));

    const insertarSeccion = (bloque, despuesDe) => {
        cambiarSecciones((secciones) => {
            let destino = secciones.findIndex((s) => s.id === despuesDe);

            if (destino >= 0) {
                destino += 1;
            } else {
                const contacto = secciones.findIndex((s) => s.id === 'contact');
                destino = contacto >= 0 ? contacto : secciones.length;
            }

            const nuevas = [...secciones];
            nuevas.splice(destino, 0, bloque);

            return nuevas;
        });

        setSeleccion(bloque.id);
        enfocar(bloque.id);
    };

    const editor = {
        datos: form.data,
        errores: form.errors,
        theme,
        banners,
        modals,
        categorias,
        fuentes,
        limites,
        catalogUrl,
        comercio: nombreComercio,
        seleccion,

        cambiar,
        cambiarVarios,
        cambiarRed: (red, valor) =>
            formulario.current.setData((anterior) => ({
                ...anterior,
                social_links: { ...(Array.isArray(anterior.social_links) ? {} : anterior.social_links), [red]: valor },
            })),

        seleccionar,
        irAPestana: (id) => setPestana(id),
        editarSeccion: (id) => {
            setPestana('secciones');
            seleccionar(id, { enfocar: true });
        },

        reordenarSecciones: (nuevas) => cambiarSecciones(() => nuevas),
        moverSeccion: (id, direccion) => moverSeccion(id, direccion),
        alternarSeccion,
        actualizarSeccion,
        agregarSeccion: (tipo) => insertarSeccion(nuevaSeccion(tipo, categorias), seleccion),
        duplicarSeccion: (id) => {
            const original = form.data.sections.find((s) => s.id === id);

            if (original) {
                insertarSeccion({ ...structuredClone(original), id: nuevaSeccion(original.type, categorias).id }, id);
            }
        },
        eliminarSeccion: (id) => {
            cambiarSecciones((secciones) => secciones.filter((s) => s.id !== id));
            setSeleccion(null);
            avisar('Bloque eliminado', { accion: conDeshacer });
        },

        aplicarTema: (tema) => {
            cambiarVarios({ ...tema.valores, palette_from_logo: false });
            avisar(`Tema ${tema.nombre} aplicado. Guarda para publicarlo.`, { accion: conDeshacer });
        },

        // Tras subir un logo o regenerar su paleta, el servidor ya guardó
        // los colores nuevos: pasan al borrador sin marcarlo como pendiente.
        sincronizarColores: (pagina) => {
            const nuevo = pagina?.props?.theme;

            if (!nuevo) {
                return;
            }

            const claves = [...COLORES, 'palette_from_logo'];
            const antes = Object.fromEntries(claves.map((c) => [c, formulario.current.data[c]]));
            const colores = Object.fromEntries(claves.map((c) => [c, nuevo[c]]));

            cambiarVarios(colores);
            formulario.current.setDefaults(colores);

            // Solo hay algo que revertir si la paleta de verdad se movió:
            // cambiar el logo sin que los colores cambien no deja nada atrás.
            setColoresPrevios(COLORES.some((c) => antes[c] !== colores[c]) ? antes : null);
        },

        coloresPrevios,
        olvidarColoresPrevios: () => setColoresPrevios(null),
        revertirColores: () => {
            if (!coloresPrevios) {
                return;
            }

            // `palette_from_logo` se apaga: acaban de decir que no quieren la
            // paleta del logo, y dejarlo encendido la volvería a aplicar al
            // subir el siguiente.
            cambiarVarios({ ...coloresPrevios, palette_from_logo: false });
            setColoresPrevios(null);
            avisar('Volvimos a tus colores. Guarda para que quede así.');
        },

        mostrarModal: (modal) => {
            vista.enviar({ tipo: MENSAJES.modal, modal });

            if (!esEscritorio) {
                setVerPrevia(true);
            }
        },
    };

    /* ── Guardar, descartar y publicar ──────────────────────────────────── */

    const guardar = () => {
        if (form.processing || !form.isDirty) {
            return;
        }

        form.put(route('catalogo.personalizar.update'), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => form.setDefaults(),
            onError: (errores) => {
                const primero = Object.values(errores)[0];
                avisar(primero ? `No se pudo guardar: ${primero}` : 'No se pudo guardar. Revisa los datos.', { tono: 'error' });
            },
        });
    };

    // La propuesta de la IA entra al borrador como un solo cambio: se ve en la
    // vista previa, se puede deshacer y no se publica hasta guardar.
    const aplicarPropuesta = (propuesta) => {
        cambiarVarios({
            ...(propuesta.tema ?? {}),
            ...(propuesta.textos ?? {}),
            ...(propuesta.sections ? { sections: propuesta.sections } : {}),
        });
        setPestana('secciones');
        setSeleccion(null);
        enfocar(propuesta.sections?.find((s) => s.visible)?.id ?? 'header');
        avisar('Propuesta aplicada. Revísala en la vista previa y guarda para publicarla.', { accion: conDeshacer });
    };

    const inventarioCreado = (creado) => {
        const partes = [];

        if (creado.productos > 0) {
            partes.push(`${creado.productos} ${creado.productos === 1 ? 'producto oculto' : 'productos ocultos'}`);
        }
        if (creado.categorias > 0) {
            partes.push(`${creado.categorias} ${creado.categorias === 1 ? 'categoría' : 'categorías'}`);
        }

        const omitidos = creado.omitidos > 0 ? ` ${creado.omitidos} no se crearon por el límite de tu plan.` : '';

        avisar(
            partes.length
                ? `Se crearon ${partes.join(' y ')}. Complétalos en Inventario.${omitidos}`
                : `No se creó ningún producto.${omitidos}`,
            { tono: 'exito' },
        );

        // Las categorías nuevas quedan disponibles para los bloques de categoría destacada
        router.reload({ only: ['categorias'], preserveState: true, preserveScroll: true });
    };

    const guardarActual = useRef(guardar);
    guardarActual.current = guardar;

    const descartar = () => {
        form.reset();
        avisar('Cambios descartados', { accion: conDeshacer });
    };

    const alternarPublicacion = () => {
        router.post(route('catalogo.publicar'), {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (pagina) => {
                const publicado = pagina.props.theme.is_published;
                cambiar('is_published', publicado);
                formulario.current.setDefaults('is_published', publicado);
            },
        });
    };

    // Los mensajes del servidor (guardado, límites del plan) llegan como aviso
    useEffect(() => {
        if (flash?.success) {
            avisar(flash.success, { tono: 'exito' });
        } else if (flash?.error) {
            avisar(flash.error, { tono: 'error' });
        }
    }, [flash, avisar]);

    useEffect(() => {
        if (!aviso) {
            return undefined;
        }

        const temporizador = setTimeout(() => setAviso(null), aviso.accion ? 5000 : 3200);

        return () => clearTimeout(temporizador);
    }, [aviso]);

    /* ── Atajos y protección de cambios ─────────────────────────────────── */

    useEffect(() => {
        const alPulsar = (evento) => {
            if (!(evento.ctrlKey || evento.metaKey)) {
                return;
            }

            const tecla = evento.key.toLowerCase();

            if (tecla === 's') {
                evento.preventDefault();
                guardarActual.current();

                return;
            }

            // En un campo de texto, deshacer es del propio campo
            if (evento.target.closest?.('input, textarea, select, [contenteditable="true"]')) {
                return;
            }

            if (tecla === 'z' && !evento.shiftKey) {
                evento.preventDefault();
                historialActual.current.deshacer();
            } else if ((tecla === 'z' && evento.shiftKey) || tecla === 'y') {
                evento.preventDefault();
                historialActual.current.rehacer();
            }
        };

        window.addEventListener('keydown', alPulsar);

        return () => window.removeEventListener('keydown', alPulsar);
    }, []);

    useEffect(() => {
        if (!form.isDirty) {
            return undefined;
        }

        const alCerrar = (evento) => {
            evento.preventDefault();
            evento.returnValue = '';
        };

        const dejarDeEscuchar = router.on('before', (evento) => {
            const visita = evento.detail.visit;

            if (visita.method === 'get' && !window.confirm('Tienes cambios sin guardar en tu catálogo. ¿Salir sin guardarlos?')) {
                evento.preventDefault();
            }
        });

        window.addEventListener('beforeunload', alCerrar);

        return () => {
            window.removeEventListener('beforeunload', alCerrar);
            dejarDeEscuchar();
        };
    }, [form.isDirty]);

    useEffect(() => {
        guardarPreferencia('catalogo-dispositivo', dispositivo);
    }, [dispositivo]);

    // Al cambiar de pestaña se vuelve arriba del todo, salvo cuando se llegó
    // pidiendo algo concreto del panel: entonces la vista va al panel y no a
    // los avisos que lo preceden.
    useEffect(() => {
        if (irAlPanel.current) {
            irAlPanel.current = false;
            contenido.current?.scrollIntoView({ block: 'start' });
        } else {
            panel.current?.scrollTo({ top: 0 });
        }
    }, [pestana]);

    const Panel = PANELES[pestana];

    const fuentesDelEditor = `https://fonts.bunny.net/css?family=${fuentes.map((f) => `${aFamilia(f)}:500`).join('|')}&display=swap`;

    return (
        <AuthenticatedLayout header="Personalizar catálogo">
            {/* El punto en la pestaña avisa de cambios pendientes aunque se esté en otra ventana */}
            <Head title={form.isDirty ? '• Personalizar catálogo' : 'Personalizar catálogo'}>
                <link rel="stylesheet" href={fuentesDelEditor} />
            </Head>

            <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
                {/* ── Controles ── */}
                <aside className="flex min-h-[calc(100dvh-4rem)] flex-col bg-white dark:bg-stone-900 lg:min-h-0 lg:border-r lg:border-stone-200 lg:dark:border-stone-800">
                    {usoIa.disponible && <BotonIa uso={usoIa} onAbrir={() => setIaAbierta(true)} />}

                    <Pestanas activa={pestana} onCambiar={setPestana} />

                    <div ref={panel} className="scrollbar-slim flex-1 pb-24 lg:min-h-0 lg:overflow-y-auto lg:pb-0">
                        {!esEscritorio && avisoPc && (
                            <AvisoDeComputadora
                                onCerrar={() => {
                                    setAvisoPc(false);
                                    guardarPreferencia('catalogo-aviso-pc', 'no');
                                }}
                            />
                        )}

                        {avisoAyuda && (
                            <AvisoDeAyuda
                                conIa={usoIa.disponible}
                                onTemas={verTemas}
                                onIa={() => setIaAbierta(true)}
                                onCerrar={() => {
                                    setAvisoAyuda(false);
                                    guardarPreferencia('catalogo-aviso-ayuda', 'no');
                                }}
                            />
                        )}

                        <AccesoAlTutorial nombre="catalogo" className="border-b border-stone-200 p-4 dark:border-stone-800" />

                        <motion.div
                            ref={contenido}
                            key={pestana}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: SALIDA }}
                        >
                            <Panel editor={editor} />
                        </motion.div>
                    </div>

                    <BarraGuardar
                        form={form}
                        historial={historial}
                        onGuardar={guardar}
                        onDescartar={descartar}
                    />
                </aside>

                {/* ── Vista previa ── */}
                <section
                    className={
                        verPrevia && !esEscritorio
                            ? 'fixed inset-0 z-50 flex flex-col bg-stone-100 dark:bg-stone-950'
                            : 'hidden min-h-0 flex-col bg-stone-100 dark:bg-stone-950 lg:flex'
                    }
                    aria-label="Vista previa del catálogo"
                >
                    <BarraVistaPrevia
                        publicado={theme.is_published}
                        catalogUrl={catalogUrl}
                        dispositivo={dispositivo}
                        onDispositivo={setDispositivo}
                        onPublicar={alternarPublicacion}
                        esEscritorio={esEscritorio}
                        onCerrar={() => setVerPrevia(false)}
                        sucio={form.isDirty && !form.processing}
                        procesando={form.processing}
                        onGuardar={guardar}
                    />

                    <Lienzo
                        url={vistaPreviaUrl}
                        iframeRef={vista.iframeRef}
                        listo={vista.listo}
                        dispositivo={esEscritorio ? dispositivo : 'movil'}
                        completo={!esEscritorio}
                    />
                </section>
            </div>

            {!esEscritorio && !verPrevia && (
                <button
                    type="button"
                    onClick={() => setVerPrevia(true)}
                    className="pulsable boton-elevado fixed bottom-[4.75rem] right-4 z-30 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
                >
                    <Eye className="h-4 w-4" />
                    Vista previa
                </button>
            )}

            <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

            {usoIa.disponible && (
                <AsistenteIa
                    abierto={iaAbierta}
                    onCerrar={() => setIaAbierta(false)}
                    uso={usoIa}
                    onUso={setUsoIa}
                    limites={{ minimo: ia.minimo, maximo: ia.maximo }}
                    onAplicar={aplicarPropuesta}
                    onInventarioCreado={inventarioCreado}
                />
            )}
        </AuthenticatedLayout>
    );
}

/* ── Piezas del editor ──────────────────────────────────────────────────── */

function Pestanas({ activa, onCambiar }) {
    return (
        <nav
            aria-label="Secciones del editor"
            // En móvil queda pegada justo debajo del encabezado, que es donde
            // se abre el menú de la cuenta. Con el mismo z-20 que él ganaba
            // por venir después en el marcado y le tapaba «Cerrar sesión»:
            // basta con estar por encima del editor que pasa por debajo.
            className="sticky top-16 z-10 grid grid-cols-6 border-b border-stone-200 bg-white/95 px-1.5 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 lg:static"
        >
            {PESTANAS.map(({ id, etiqueta, Icono }) => {
                const esActiva = activa === id;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onCambiar(id)}
                        aria-current={esActiva ? 'page' : undefined}
                        className={`relative flex flex-col items-center gap-1 px-1 pb-2.5 pt-3 text-[11px] font-medium transition-colors duration-150 ${
                            esActiva
                                ? 'text-marca-700 dark:text-marca-400'
                                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                        }`}
                    >
                        <Icono className="h-[18px] w-[18px]" />
                        <span className="truncate">{etiqueta}</span>
                        {esActiva && (
                            <motion.span
                                layoutId="pestana-activa"
                                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-marca-600 dark:bg-marca-400"
                                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                            />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

/**
 * Recomendación de diseñar en computadora. Solo en pantallas de teléfono, y
 * se puede quitar para siempre: es un consejo, no una advertencia.
 */
function AvisoDeComputadora({ onCerrar }) {
    return (
        <div className="border-b border-stone-200 p-3 dark:border-stone-800">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 dark:border-sky-900 dark:bg-sky-950/40">
                <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sky-700 dark:bg-stone-900 dark:text-sky-400">
                        <Monitor className="h-4 w-4" />
                    </span>

                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-sky-900 dark:text-sky-200">
                        <strong className="block font-semibold">Se diseña mejor en computadora</strong>
                        <span className="mt-0.5 block">
                            Ahí caben los controles y la vista previa a la vez. Aquí toca «Vista previa» para ver
                            cómo va quedando.
                        </span>
                    </p>

                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="No mostrar este aviso"
                        className="pulsable -mr-1 -mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sky-700/70 hover:bg-white/70 dark:text-sky-400 dark:hover:bg-stone-900/70"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Los atajos, para cuando el diseño se hace cuesta arriba.
 *
 * Nadie tiene por qué pelear con treinta controles: un tema rápido deja
 * todo coherente de una vez, la paleta del logo pone los colores del
 * negocio, y la IA propone el catálogo entero. Están repartidos por el
 * editor, así que este aviso los junta donde se ven al entrar.
 */
function AvisoDeAyuda({ conIa, onTemas, onIa, onCerrar }) {
    const boton =
        'pulsable inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold sm:w-auto';

    return (
        <div className="border-b border-stone-200 p-3 dark:border-stone-800">
            <div className="rounded-xl border border-marca-200 bg-marca-50 p-3.5 dark:border-marca-900 dark:bg-marca-950/40">
                <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-marca-700 dark:bg-stone-900 dark:text-marca-400">
                        <Wand2 className="h-4 w-4" />
                    </span>

                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-marca-900 dark:text-marca-200">
                        <strong className="block font-semibold">¿Se te complica el diseño?</strong>
                        <span className="mt-0.5 block">
                            No tienes que armarlo a mano. Un tema rápido cambia colores, letras y formas de una
                            vez, y el botón de la paleta toma los colores de tu logo
                            {conIa ? '. Y si prefieres, nuestra IA te propone el catálogo entero' : ''}.
                        </span>
                    </p>

                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="No mostrar este aviso"
                        className="pulsable -mr-1 -mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-marca-700/70 hover:bg-white/70 dark:text-marca-400 dark:hover:bg-stone-900/70"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={onTemas}
                        className={`${boton} boton-elevado bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950`}
                    >
                        <Palette className="h-4 w-4" />
                        Temas y colores
                    </button>

                    {conIa && (
                        <button
                            type="button"
                            onClick={onIa}
                            className={`${boton} border border-marca-300 text-marca-900 hover:bg-white/70 dark:border-marca-800 dark:text-marca-200 dark:hover:bg-stone-900/70`}
                        >
                            <Sparkles className="h-4 w-4" />
                            Crear con IA
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function BotonIa({ uso, onAbrir }) {
    return (
        <div className="border-b border-stone-200 p-2.5 dark:border-stone-800">
            <button
                type="button"
                onClick={onAbrir}
                className="pulsable group flex w-full items-center gap-3 rounded-xl border border-marca-200 bg-gradient-to-r from-marca-50 to-white px-3 py-2.5 text-left hover:border-marca-400 dark:border-marca-900/70 dark:from-marca-950/60 dark:to-stone-900 dark:hover:border-marca-700"
            >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marca-700 text-white transition-transform duration-200 ease-salida group-hover:rotate-6 dark:bg-marca-500 dark:text-stone-950">
                    <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-900 dark:text-stone-50">Crear con IA</span>
                    <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">
                        Describe tu negocio y arma el catálogo en segundos
                    </span>
                </span>
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                        uso.restantes > 0
                            ? 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                    title="Creaciones con IA disponibles hoy"
                >
                    {uso.restantes}/{uso.limite}
                </span>
            </button>
        </div>
    );
}

function BarraGuardar({ form, historial, onGuardar, onDescartar }) {
    const sucio = form.isDirty && !form.processing;

    const estado = form.processing
        ? { texto: 'Guardando', clase: 'text-stone-500 dark:text-stone-400' }
        : form.isDirty
          ? { texto: 'Sin guardar', clase: 'text-amber-800 dark:text-amber-300', punto: 'bg-amber-500' }
          : form.recentlySuccessful
            ? { texto: 'Guardado', clase: 'text-marca-700 dark:text-marca-400', icono: true }
            : { texto: 'Todo guardado', clase: 'text-stone-500 dark:text-stone-400' };

    const botonIcono =
        'pulsable grid h-9 w-8 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-900/5 disabled:pointer-events-none disabled:opacity-35 dark:text-stone-300 dark:hover:bg-white/10';

    // Con cambios pendientes la barra entera cambia de tono: el aviso no
    // depende de leer un texto pequeño en una esquina.
    return (
        <div
            className={`fixed inset-x-0 bottom-0 z-30 flex items-center gap-1 border-t px-2.5 py-2.5 backdrop-blur-md transition-colors duration-300 ease-salida lg:sticky ${
                form.isDirty
                    ? 'border-amber-300 bg-amber-50/95 dark:border-amber-800/70 dark:bg-amber-950/60'
                    : 'border-stone-200 bg-white/95 dark:border-stone-800 dark:bg-stone-900/95'
            }`}
        >
            <button type="button" onClick={historial.deshacer} disabled={!historial.puedeDeshacer} className={botonIcono} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
                <Undo2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={historial.rehacer} disabled={!historial.puedeRehacer} className={botonIcono} title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer">
                <Redo2 className="h-4 w-4" />
            </button>

            <span className={`ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium ${estado.clase}`} aria-live="polite">
                {estado.punto && <span className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${estado.punto}`} />}
                {estado.icono && <Check className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{estado.texto}</span>
            </span>

            {sucio && (
                <button
                    type="button"
                    onClick={onDescartar}
                    className="pulsable shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-stone-900/5 dark:text-stone-300 dark:hover:bg-white/10"
                >
                    Descartar
                </button>
            )}

            <BotonGuardar sucio={sucio} procesando={form.processing} onGuardar={onGuardar} />
        </div>
    );
}

/**
 * Botón de guardar que se hace notar cuando hay algo pendiente.
 *
 * Sin cambios queda apagado y discreto. Con cambios crece, cambia a
 * "Guardar cambios" y lanza un halo que late unas veces y luego queda fijo:
 * llama la atención sin convertirse en un parpadeo permanente.
 */
function BotonGuardar({ sucio, procesando, onGuardar, compacto = false }) {
    return (
        <button
            type="button"
            onClick={onGuardar}
            disabled={!sucio || procesando}
            title="Guardar cambios (Ctrl+S)"
            className={`pulsable boton-elevado inline-flex shrink-0 items-center gap-2 rounded-lg font-semibold transition-[padding,background-color,color] duration-200 ease-salida disabled:shadow-none ${
                sucio || procesando
                    ? `bg-marca-700 text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950 dark:hover:bg-marca-400 ${
                          compacto ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5 text-sm'
                      } ${sucio ? 'guardar-pendiente' : ''}`
                    : 'bg-stone-200 px-4 py-2 text-sm text-stone-400 dark:bg-stone-800 dark:text-stone-500'
            }`}
        >
            {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {procesando ? 'Guardando' : sucio ? 'Guardar cambios' : 'Guardado'}
        </button>
    );
}

function BarraVistaPrevia({ publicado, catalogUrl, dispositivo, onDispositivo, onPublicar, esEscritorio, onCerrar, sucio, procesando, onGuardar }) {
    const [copiado, setCopiado] = useState(false);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(catalogUrl);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch (e) {
            // Sin permiso de portapapeles queda el enlace para copiarlo a mano
        }
    };

    return (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-3 dark:border-stone-800 dark:bg-stone-900">
            {!esEscritorio && (
                <button
                    type="button"
                    onClick={onCerrar}
                    className="pulsable inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                    <X className="h-4 w-4" />
                    Volver
                </button>
            )}

            <button
                type="button"
                onClick={onPublicar}
                title={publicado ? 'Ocultar el catálogo' : 'Publicar el catálogo'}
                className={`pulsable inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    publicado
                        ? 'border-marca-200 bg-marca-50 text-marca-800 hover:bg-marca-100 dark:border-marca-900 dark:bg-marca-950/60 dark:text-marca-300'
                        : 'border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                }`}
            >
                <span className={`h-2 w-2 rounded-full ${publicado ? 'bg-marca-500' : 'bg-stone-400'}`} />
                {publicado ? 'Publicado' : 'Oculto'}
            </button>

            <div className="hidden min-w-0 flex-1 items-center gap-1 rounded-lg bg-stone-100 py-1 pl-3 pr-1 dark:bg-stone-800 sm:flex">
                <span className="min-w-0 flex-1 truncate text-xs text-stone-600 dark:text-stone-300">
                    {catalogUrl?.replace(/^https?:\/\//, '')}
                </span>
                <button
                    type="button"
                    onClick={copiar}
                    aria-label="Copiar enlace"
                    title="Copiar enlace"
                    className="pulsable grid h-7 w-7 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-white hover:text-stone-900 dark:hover:bg-stone-700 dark:hover:text-stone-100"
                >
                    {copiado ? <Check className="h-3.5 w-3.5 text-marca-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                    href={catalogUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir catálogo en otra pestaña"
                    title="Abrir catálogo"
                    className="pulsable grid h-7 w-7 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-white hover:text-stone-900 dark:hover:bg-stone-700 dark:hover:text-stone-100"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>

            <span className="flex-1 sm:hidden" />

            {/* Guardar también aquí: mientras se mira la vista previa, la barra
                de abajo queda lejos (y en el teléfono, tapada) */}
            <AnimatePresence initial={false}>
                {(sucio || procesando) && (
                    <motion.div
                        key="guardar"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
                        transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                        className="shrink-0"
                    >
                        <BotonGuardar sucio={sucio} procesando={procesando} onGuardar={onGuardar} compacto />
                    </motion.div>
                )}
            </AnimatePresence>

            {esEscritorio && (
                <div role="radiogroup" aria-label="Dispositivo" className="flex shrink-0 rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800">
                    {[
                        { id: 'escritorio', Icono: Monitor, texto: 'Computadora' },
                        { id: 'movil', Icono: Smartphone, texto: 'Teléfono' },
                    ].map(({ id, Icono, texto }) => (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={dispositivo === id}
                            aria-label={texto}
                            title={texto}
                            onClick={() => onDispositivo(id)}
                            className={`relative grid h-8 w-9 place-items-center rounded-md transition-colors ${
                                dispositivo === id ? 'text-stone-900 dark:text-stone-50' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                            }`}
                        >
                            {dispositivo === id && (
                                <motion.span
                                    layoutId="dispositivo-activo"
                                    className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-stone-950"
                                    transition={{ type: 'spring', duration: 0.3, bounce: 0.12 }}
                                />
                            )}
                            <Icono className="relative h-4 w-4" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function Aviso({ aviso, onCerrar }) {
    const tonos = {
        neutro: 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900',
        exito: 'bg-marca-700 text-white dark:bg-marca-500 dark:text-stone-950',
        error: 'bg-red-600 text-white',
    };

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 lg:bottom-6 lg:left-[calc(16rem+380px)] xl:left-[calc(16rem+420px)]">
            <AnimatePresence mode="wait">
                {aviso && (
                    <motion.div
                        key={aviso.id}
                        role="status"
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
                        transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }}
                        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl py-2.5 pl-4 pr-2 text-sm font-medium shadow-xl ${tonos[aviso.tono]}`}
                    >
                        <span className="min-w-0 flex-1">{aviso.texto}</span>
                        {aviso.accion && (
                            <button
                                type="button"
                                onClick={() => {
                                    aviso.accion.ejecutar();
                                    onCerrar();
                                }}
                                className="pulsable shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25 dark:bg-black/10 dark:hover:bg-black/20"
                            >
                                {aviso.accion.texto}
                            </button>
                        )}
                        <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" className="pulsable grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-70 hover:opacity-100">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Utilidades ─────────────────────────────────────────────────────────── */

function datosIniciales(theme) {
    return {
        palette_from_logo: theme.palette_from_logo,
        color_primary: theme.color_primary,
        color_secondary: theme.color_secondary,
        color_accent: theme.color_accent,
        color_bg: theme.color_bg,
        color_surface: theme.color_surface,
        color_text: theme.color_text,
        color_muted: theme.color_muted,
        font_heading: theme.font_heading,
        font_body: theme.font_body,
        heading_style: theme.heading_style ?? 'normal',
        radius: theme.radius,
        shadow: theme.shadow,
        dark_mode: theme.dark_mode,
        background_style: theme.background_style ?? 'solid',
        background_pattern: theme.background_pattern ?? 'dots',
        background_intensity: theme.background_intensity ?? 6,
        header_align: theme.header_align ?? 'left',
        header_sticky: theme.header_sticky ?? true,
        header_style: theme.header_style ?? 'glass',
        header_nav: theme.header_nav ?? true,
        logo_size: theme.logo_size ?? 'md',
        button_style: theme.button_style ?? 'solid',
        card_hover: theme.card_hover ?? 'lift',
        image_fit: theme.image_fit ?? 'cover',
        image_ratio: theme.image_ratio ?? 'square',
        density: theme.density ?? 'normal',
        show_product_badges: theme.show_product_badges ?? true,
        price_style: theme.price_style ?? 'normal',
        animation_level: theme.animation_level ?? 'subtle',
        animation_entrance: theme.animation_entrance ?? 'up',
        animation_speed: theme.animation_speed ?? 'normal',
        animation_stagger: theme.animation_stagger ?? true,
        scroll_progress: theme.scroll_progress ?? false,
        sections: theme.sections ?? [],
        layout: theme.layout,
        columns_desktop: theme.columns_desktop,
        columns_mobile: theme.columns_mobile,
        card_style: theme.card_style,
        category_style: theme.category_style ?? 'pills',
        product_sort: theme.product_sort ?? 'manual',
        show_sort: theme.show_sort ?? true,
        quick_view: theme.quick_view ?? true,
        product_view: theme.product_view ?? 'modal',
        multi_select: theme.multi_select ?? true,
        show_prices: theme.show_prices,
        show_stock: theme.show_stock,
        show_categories: theme.show_categories,
        show_search: theme.show_search,
        show_bs_prices: theme.show_bs_prices,
        wholesale_prices: theme.wholesale_prices ?? 'off',
        hero_style: theme.hero_style,
        hero_layout: theme.hero_layout ?? 'centered',
        hero_height: theme.hero_height ?? 'md',
        hero_title: theme.hero_title ?? '',
        hero_subtitle: theme.hero_subtitle ?? '',
        hero_cta_text: theme.hero_cta_text ?? '',
        hero_cta_link: theme.hero_cta_link ?? '',
        banners_autoplay: theme.banners_autoplay,
        banners_interval: theme.banners_interval,
        banners_effect: theme.banners_effect,
        banners_arrows: theme.banners_arrows,
        banners_dots: theme.banners_dots,
        marquee_text: theme.marquee_text ?? '',
        marquee_speed: theme.marquee_speed,
        marquee_bg: theme.marquee_bg ?? '',
        marquee_color: theme.marquee_color ?? '',
        whatsapp_number: theme.whatsapp_number ?? '',
        whatsapp_message: theme.whatsapp_message ?? '',
        social_links: Array.isArray(theme.social_links) ? {} : theme.social_links ?? {},
        seo_title: theme.seo_title ?? '',
        seo_description: theme.seo_description ?? '',
        announcement: theme.announcement ?? '',
        is_published: theme.is_published,
    };
}

function useMediaQuery(consulta) {
    const [coincide, setCoincide] = useState(() => window.matchMedia(consulta).matches);

    useEffect(() => {
        const medio = window.matchMedia(consulta);
        const alCambiar = () => setCoincide(medio.matches);

        medio.addEventListener('change', alCambiar);
        alCambiar();

        return () => medio.removeEventListener('change', alCambiar);
    }, [consulta]);

    return coincide;
}

function leerPreferencia(clave, porDefecto) {
    try {
        return localStorage.getItem(clave) ?? porDefecto;
    } catch (e) {
        return porDefecto;
    }
}

function guardarPreferencia(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
    } catch (e) {
        // Sin almacenamiento, el editor simplemente abre en computadora
    }
}
