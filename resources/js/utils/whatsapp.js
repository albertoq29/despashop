/**
 * El número tal como lo entiende WhatsApp: solo dígitos, con el país.
 *
 * Los comercios anotan su número como lo marcan aquí: «0424 123 4567»,
 * «0414-1112233», «04121234567». Ese cero de adelante es el prefijo para
 * llamar dentro de Venezuela, no parte del número, y WhatsApp no sabe qué
 * hacer con él: abría un chat con un número que no existe. Se cambia por
 * el 58 del país, que es lo que WhatsApp sí reconoce.
 *
 * Lo que ya viene con país se deja quieto. El 00 de las llamadas
 * internacionales se quita sin agregar nada, porque ahí el país ya viene
 * escrito detrás; confundirlo con el cero local rompería un número que
 * funcionaba.
 */
export function numeroDeWhatsapp(valor) {
    const digitos = String(valor ?? '').replace(/\D/g, '');

    if (digitos.startsWith('00')) {
        return digitos.slice(2);
    }

    return digitos.startsWith('0') ? `58${digitos.slice(1)}` : digitos;
}

/** El enlace completo, con su mensaje si lleva uno. */
export function enlaceDeWhatsapp(valor, mensaje = '') {
    const numero = numeroDeWhatsapp(valor);

    return mensaje
        ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
        : `https://wa.me/${numero}`;
}
