import { ArrowDown, Bike, MapPin, User } from 'lucide-react';

/** Lo que trae el punto A cuando se enciende por primera vez. */
export const PUNTO_A_POR_DEFECTO = 'Mi negocio';

const TIPOS = [
    { valor: 'personal', texto: 'Entrega personal', Icono: User, ayuda: 'La llevas tú y la entregas en mano.' },
    { valor: 'delivery', texto: 'Delivery', Icono: Bike, ayuda: 'La manda alguien, de un punto a otro.' },
];

/**
 * Qué clase de entrega es, y —si es delivery— por dónde va.
 *
 * Son dos cosas distintas aunque las dos se agenden: una la lleva el propio
 * comercio y se acuerda con el cliente, la otra se manda con alguien y
 * tiene un recorrido. Cada una va a su propia lista, porque quien sale a
 * repartir no mira lo mismo que quien entrega en mano.
 *
 * El recorrido es opcional incluso dentro del delivery: hay envíos que se
 * acuerdan por teléfono y no necesitan quedar escritos. Los dos puntos son
 * texto libre a propósito —aquí una dirección se dice «frente a la
 * panadería, casa de rejas verdes»— y quien reparte necesita leerlo, no
 * buscarlo en un mapa.
 */
export default function PuntosDeEntrega({
    tipo,
    onTipo,
    activo,
    onActivo,
    puntoA,
    onPuntoA,
    puntoB,
    onPuntoB,
}) {
    const esDelivery = tipo === 'delivery';

    const campo =
        'w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm ' +
        'bg-white text-stone-900 placeholder:text-stone-400 ' +
        'focus:border-marca-600 focus:ring-1 focus:ring-marca-600 outline-none ' +
        'dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 ' +
        'dark:focus:border-marca-400 dark:focus:ring-marca-400';

    return (
        <div className="mt-3 space-y-3">
            <div>
                <span className="mb-1.5 block text-[11px] font-semibold text-marca-600 dark:text-marca-400">
                    ¿Cómo se entrega?
                </span>

                <div className="grid grid-cols-2 gap-2">
                    {TIPOS.map(({ valor, texto, Icono }) => {
                        const elegido = tipo === valor;

                        return (
                            <button
                                key={valor}
                                type="button"
                                onClick={() => onTipo(valor)}
                                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                    elegido
                                        ? 'border-marca-600 bg-marca-50 text-marca-800 dark:border-marca-500 dark:bg-marca-950/50 dark:text-marca-300'
                                        : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800/50'
                                }`}
                            >
                                <Icono className="h-4 w-4" />
                                {texto}
                            </button>
                        );
                    })}
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {TIPOS.find((t) => t.valor === tipo)?.ayuda} Cada una aparece en su propia lista de Entregas.
                </p>
            </div>

            {esDelivery && (
                <div>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                        <input
                            type="checkbox"
                            checked={activo}
                            onChange={(e) => {
                                onActivo(e.target.checked);

                                // Al encenderlo se propone el negocio como
                                // origen, que es de donde sale casi siempre
                                if (e.target.checked && !puntoA) {
                                    onPuntoA(PUNTO_A_POR_DEFECTO);
                                }
                            }}
                            className="h-4 w-4 rounded border-stone-300 text-marca-700 focus:ring-marca-600 focus:ring-opacity-25 dark:border-stone-700 dark:text-marca-400 dark:focus:ring-marca-400"
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
                                Escríbelos como se los dirías a quien reparte. Puedes dejar uno vacío si no hace
                                falta.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
