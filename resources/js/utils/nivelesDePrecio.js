import { usePage } from '@inertiajs/react';

/**
 * Cómo llama este comercio a su tercer nivel de precio.
 *
 * Es la misma columna con dos nombres según el ramo: quien surte a
 * revendedores vende «al distribuidor», quien mueve volumen vende «al gran
 * mayor». El servidor lo resuelve una vez y lo comparte con todo el panel;
 * aquí solo se lee, para que las tres pantallas donde aparece —producto,
 * combo y factura— no puedan contradecirse.
 */
export const NOMBRES_DISTRIBUIDOR = {
    distribuidor: 'Distribuidor',
    gran_mayor: 'Gran mayor',
};

export const DISTRIBUIDOR_POR_DEFECTO = NOMBRES_DISTRIBUIDOR.distribuidor;

export function useNombreDistribuidor() {
    return usePage().props.nivelesDePrecio?.distribuidor || DISTRIBUIDOR_POR_DEFECTO;
}

/** Las dos formas de llamarlo, para el selector de los ajustes. */
export function useOpcionesDeDistribuidor() {
    return usePage().props.nivelesDePrecio?.opciones ?? NOMBRES_DISTRIBUIDOR;
}

/** Los nombres del selector de precio de la factura. */
export function useEtiquetasDePrecio() {
    return {
        detal: 'Detal',
        mayor: 'Mayor',
        distribuidor: useNombreDistribuidor(),
        custom: 'Personalizado',
    };
}
