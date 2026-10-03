import { Monitor, Moon, Sun } from 'lucide-react';
import { useTema } from '@/hooks/useTema';

const OPCIONES = [
    { valor: 'claro', etiqueta: 'Claro', Icono: Sun },
    { valor: 'oscuro', etiqueta: 'Oscuro', Icono: Moon },
    { valor: 'sistema', etiqueta: 'Sistema', Icono: Monitor },
];

/**
 * Selector de tema. En `compacto` alterna claro y oscuro con un toque;
 * completo muestra las tres opciones, incluida seguir al sistema.
 */
export default function CambiarTema({ compacto = false, className = '' }) {
    const { tema, esOscuro, setTema, alternar } = useTema();

    if (compacto) {
        return (
            <button
                type="button"
                onClick={alternar}
                aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                className={`pulsable grid h-9 w-9 place-items-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 ${className}`}
            >
                {esOscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
        );
    }

    return (
        <div
            role="radiogroup"
            aria-label="Tema de la interfaz"
            className={`inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1 dark:border-stone-800 dark:bg-stone-900 ${className}`}
        >
            {OPCIONES.map(({ valor, etiqueta, Icono }) => {
                const activo = tema === valor;

                return (
                    <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setTema(valor)}
                        title={etiqueta}
                        className={`pulsable flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                            activo
                                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100'
                                : 'text-stone-500 hover:text-stone-800 dark:text-stone-500 dark:hover:text-stone-300'
                        }`}
                    >
                        <Icono className="h-3.5 w-3.5" />
                        {etiqueta}
                    </button>
                );
            })}
        </div>
    );
}
