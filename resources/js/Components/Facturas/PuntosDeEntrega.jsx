import { ArrowDown, MapPin } from 'lucide-react';

/** Lo que trae el punto A cuando se enciende por primera vez. */
export const PUNTO_A_POR_DEFECTO = 'Mi negocio';

/**
 * De dónde sale la entrega y a dónde va.
 *
 * Es opcional dentro de algo que ya es opcional: hay entregas que se
 * acuerdan por teléfono y no necesitan quedar escritas. Por eso vive
 * detrás de su propio interruptor y no aparece hasta que se pide.
 *
 * Los dos son texto libre a propósito: un punto de entrega aquí se dice
 * «frente a la panadería, casa de rejas verdes», y quien reparte necesita
 * leerlo, no buscarlo en un mapa.
 */
export default function PuntosDeEntrega({ activo, onActivo, puntoA, onPuntoA, puntoB, onPuntoB }) {
    const campo =
        'w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm ' +
        'bg-white text-stone-900 placeholder:text-stone-400 ' +
        'focus:border-marca-600 focus:ring-1 focus:ring-marca-600 outline-none ' +
        'dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 ' +
        'dark:focus:border-marca-400 dark:focus:ring-marca-400';

    return (
        <div className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => {
                        onActivo(e.target.checked);

                        // Al encenderlo se propone el negocio como origen, que
                        // es de donde sale casi siempre; se puede cambiar.
                        if (e.target.checked && !puntoA) {
                            onPuntoA(PUNTO_A_POR_DEFECTO);
                        }
                    }}
                    className="w-4 h-4 text-marca-700 dark:text-marca-400 border-stone-300 dark:border-stone-700 rounded focus:ring-marca-600 dark:focus:ring-marca-400 focus:ring-opacity-25"
                />
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                    Registrar punto de entrega
                </span>
            </label>

            {activo && (
                <div className="mt-2.5 space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                    <div className="space-y-1">
                        <label
                            htmlFor="punto-a"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-marca-600 dark:text-marca-400"
                        >
                            <MapPin className="h-3.5 w-3.5" />
                            Punto A · de dónde sale
                        </label>
                        <input
                            id="punto-a"
                            type="text"
                            value={puntoA}
                            maxLength={255}
                            onChange={(e) => onPuntoA(e.target.value)}
                            placeholder={PUNTO_A_POR_DEFECTO}
                            className={campo}
                        />
                    </div>

                    <div className="flex justify-center text-stone-300 dark:text-stone-700">
                        <ArrowDown className="h-4 w-4" />
                    </div>

                    <div className="space-y-1">
                        <label
                            htmlFor="punto-b"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-marca-600 dark:text-marca-400"
                        >
                            <MapPin className="h-3.5 w-3.5" />
                            Punto B · a dónde va
                        </label>
                        <input
                            id="punto-b"
                            type="text"
                            value={puntoB}
                            maxLength={255}
                            onChange={(e) => onPuntoB(e.target.value)}
                            placeholder="Ej.: Av. Bolívar, frente a la panadería, casa de rejas verdes"
                            className={campo}
                        />
                    </div>

                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                        Escríbelos como se los dirías a quien reparte. Puedes dejar uno vacío si no hace falta.
                    </p>
                </div>
            )}
        </div>
    );
}
