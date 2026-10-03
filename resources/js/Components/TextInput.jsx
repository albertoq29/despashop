import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Campo de texto de los formularios.
 *
 * Trae fondo y color de texto propios: sin ellos el navegador pintaba su
 * blanco de siempre, así que en modo oscuro cada campo quedaba como un
 * recuadro blanco dentro de una pantalla negra. El foco usa el verde de la
 * marca, no el índigo que venía de la plantilla original.
 */
export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-md border-stone-300 bg-white text-stone-900 shadow-sm placeholder:text-stone-400 ' +
                'focus:border-marca-600 focus:ring-marca-600 disabled:opacity-60 ' +
                'dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 ' +
                'dark:focus:border-marca-400 dark:focus:ring-marca-400 ' +
                className
            }
            ref={localRef}
        />
    );
});
