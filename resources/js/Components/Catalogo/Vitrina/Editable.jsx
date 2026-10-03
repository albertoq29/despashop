import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, EyeOff, SlidersHorizontal } from 'lucide-react';
import { nombreDeSeccion } from '../secciones';
import { irASeccion, useVitrina } from './Comunes';

/**
 * Comunicación entre el editor y la vista previa.
 *
 * El catálogo corre dentro de un iframe del mismo origen. El editor le
 * manda el diseño sin guardar y la sección elegida; la vista previa le
 * devuelve los clics sobre los bloques. Cualquier mensaje de otro origen o
 * de otra ventana se ignora.
 */
export const MENSAJES = {
    listo: 'despashop:listo',
    actualizar: 'despashop:actualizar',
    enfocar: 'despashop:enfocar',
    recargar: 'despashop:recargar',
    modal: 'despashop:modal',
    seleccionar: 'despashop:seleccionar',
    mover: 'despashop:mover',
    ocultar: 'despashop:ocultar',
};

export function enviarAlEditor(mensaje) {
    if (window.parent !== window) {
        window.parent.postMessage(mensaje, window.location.origin);
    }
}

export function useCanalDelEditor(activo, { alActualizar, alModal }) {
    useEffect(() => {
        if (!activo || window.parent === window) {
            return undefined;
        }

        const alRecibir = (evento) => {
            if (evento.origin !== window.location.origin || evento.source !== window.parent) {
                return;
            }

            const mensaje = evento.data;

            switch (mensaje?.tipo) {
                case MENSAJES.actualizar:
                    alActualizar(mensaje.tema, mensaje.seleccion ?? null, mensaje.enfoque ?? null);
                    break;
                case MENSAJES.enfocar:
                    irASeccion(mensaje.id);
                    break;
                case MENSAJES.recargar:
                    router.reload({ preserveScroll: true, preserveState: true });
                    break;
                case MENSAJES.modal:
                    alModal(mensaje.modal ?? null);
                    break;
                default:
                    break;
            }
        };

        // Los enlaces externos sacarían al comercio de su vista previa
        const alHacerClic = (evento) => {
            const enlace = evento.target.closest?.('a[href]');

            if (enlace && !enlace.getAttribute('href').startsWith('#')) {
                evento.preventDefault();
            }
        };

        window.addEventListener('message', alRecibir);
        document.addEventListener('click', alHacerClic, true);
        enviarAlEditor({ tipo: MENSAJES.listo });

        return () => {
            window.removeEventListener('message', alRecibir);
            document.removeEventListener('click', alHacerClic, true);
        };
        // Los manejadores solo actualizan estado; basta con registrarlos una vez
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activo]);
}

/**
 * Envoltura de cada bloque del catálogo.
 *
 * En el catálogo público solo aporta el ancla para los accesos de la
 * cabecera. En el editor además dibuja el contorno al pasar el puntero y
 * una barra con acciones, como al seleccionar una capa en un lienzo.
 */
export function Bloque({ seccion, esPrimero, esUltimo, className = '', children }) {
    const { modoEditor, seleccion, datos } = useVitrina();

    if (!modoEditor) {
        return (
            <div id={`seccion-${seccion.id}`} className={`scroll-mt-20 ${className}`}>
                {children}
            </div>
        );
    }

    const seleccionado = seleccion === seccion.id;

    const accion = (tipo, extra = {}) => (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        enviarAlEditor({ tipo, id: seccion.id, ...extra });
    };

    return (
        <div
            id={`seccion-${seccion.id}`}
            data-seleccionado={seleccionado ? '' : undefined}
            onClick={() => enviarAlEditor({ tipo: MENSAJES.seleccionar, id: seccion.id })}
            className={`cat-editable group/bloque scroll-mt-20 ${className}`}
        >
            {children}

            <div className="cat-editable-barra" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={accion(MENSAJES.seleccionar)} className="cat-editable-nombre">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {nombreDeSeccion(seccion, datos.categories)}
                </button>

                <span className="cat-editable-separador" />

                <button
                    type="button"
                    onClick={accion(MENSAJES.mover, { direccion: -1 })}
                    disabled={esPrimero}
                    aria-label="Subir bloque"
                    title="Subir"
                >
                    <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={accion(MENSAJES.mover, { direccion: 1 })}
                    disabled={esUltimo}
                    aria-label="Bajar bloque"
                    title="Bajar"
                >
                    <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={accion(MENSAJES.ocultar)} aria-label="Ocultar bloque" title="Ocultar">
                    <EyeOff className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
