/**
 * Colores de un campo escrito a mano.
 *
 * El plugin de formularios de Tailwind le pone fondo blanco a todo
 * `<input>`, `<select>` y `<textarea>`, y el color del texto lo heredan del
 * tema. En modo oscuro eso es texto claro sobre fondo blanco: el campo está
 * ahí, se puede escribir y no se lee nada.
 *
 * Por eso cualquier campo suelto —uno que no pase por `Entrada` ni por
 * `TextInput`— tiene que traer estas clases. Van solo los colores: el ancho,
 * el redondeo y el tamaño de letra son de cada campo.
 *
 * `color-scheme: dark` es para lo que dibuja el navegador y no el CSS: el
 * icono del calendario, las flechitas de los números, el menú de un select.
 * Sin eso quedan negros sobre negro aunque la caja esté bien pintada.
 */
export const COLORES_DE_CAMPO =
    'bg-white text-stone-900 placeholder:text-stone-400 ' +
    'dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:[color-scheme:dark]';
