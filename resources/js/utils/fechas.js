/**
 * Fechas vistas desde donde está quien usa la app, no desde UTC.
 */

/**
 * La fecha de hoy en la zona de quien usa la app, en formato `YYYY-MM-DD`.
 *
 * `toISOString()` devuelve UTC: en Venezuela, pasadas las ocho de la noche
 * ya es el día siguiente, y un formulario que proponía esa fecha era
 * rechazado por el servidor sin que se entendiera por qué.
 */
export function hoyLocal() {
    const ahora = new Date();

    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
