/**
 * El estado de la cuenta de un comercio, con su color.
 *
 * Vive aquí y no en la lista de comercios porque la ficha también lo usa.
 * Cuando estaba exportado desde `Pages/Admin/Comercios/Index.jsx`, la ficha
 * importaba de una página: Rollup se llevó esa página dentro del paquete de
 * la ficha, dejó de emitirle un trozo propio y desapareció del manifiesto de
 * Vite. La plantilla pide cada página por su ruta, así que la lista de
 * comercios quedó respondiendo con un error.
 *
 * De ahí la regla: una página no importa de otra página. Lo compartido sale
 * a un componente, que es lo que esto es.
 */
export const TONOS_ESTADO = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    approved: 'bg-marca-100 text-marca-800 dark:bg-marca-950 dark:text-marca-300',
    suspended: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export const NOMBRES_ESTADO = {
    pending: 'Pendiente',
    approved: 'Activo',
    suspended: 'Suspendido',
    rejected: 'Rechazado',
};

export default function EstadoDeComercio({ estado }) {
    return (
        <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${TONOS_ESTADO[estado]}`}>
            {NOMBRES_ESTADO[estado]}
        </span>
    );
}
