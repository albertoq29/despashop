import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, Tag } from 'lucide-react';
import { useClaveDistribuidor, useOpcionesDeDistribuidor } from '@/utils/nivelesDePrecio';

/**
 * Cómo se llama el tercer precio, elegido donde se escribe.
 *
 * Vive junto a los precios del producto y no en otra pantalla porque es
 * aquí donde el comercio se da cuenta de que «Distribuidor» no es la
 * palabra que usa. Buscarlo en ajustes supone saber que la opción existe.
 *
 * Es un ajuste del comercio y no del producto, así que se guarda al
 * tocarlo —no al guardar el producto— y se dice en una línea que aplica a
 * todo. Sin eso parecería que cada producto puede llamarse distinto.
 */
export default function NombreDelPrecio({ className = '' }) {
    const elegida = useClaveDistribuidor();
    const opciones = useOpcionesDeDistribuidor();
    const [guardando, setGuardando] = useState(null);

    const elegir = (clave) => {
        if (clave === elegida) {
            return;
        }

        setGuardando(clave);

        router.post(
            route('settings.nombre-del-precio'),
            { distributor_price_label: clave },
            {
                // El formulario del producto está abierto y a medio llenar:
                // ni se cierra ni se pierde lo escrito por cambiar un nombre.
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setGuardando(null),
            },
        );
    };

    return (
        <div
            className={`rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/60 ${className}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-stone-800 dark:text-stone-200">
                        <Tag className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
                        ¿Cómo llamas a tu tercer precio?
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-stone-500 dark:text-stone-400">
                        El mismo precio con el nombre de tu ramo. Aplica a todos tus productos, a tus facturas y a
                        tu catálogo.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    {Object.entries(opciones).map(([clave, nombre]) => {
                        const activo = clave === elegida;

                        return (
                            <button
                                key={clave}
                                type="button"
                                onClick={() => elegir(clave)}
                                disabled={guardando !== null}
                                aria-pressed={activo}
                                className={`pulsable inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-60 ${
                                    activo
                                        ? 'border-marca-600 bg-marca-50 text-marca-800 dark:border-marca-500 dark:bg-marca-950/40 dark:text-marca-300'
                                        : 'border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                                }`}
                            >
                                {activo && <Check className="h-3.5 w-3.5 shrink-0" />}
                                {nombre}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
