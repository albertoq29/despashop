import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { CircleDollarSign, Download } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Aviso, Boton, Cabecera, Campo, Entrada, Pagina, Tarjeta } from '@/Components/UI';

export default function Create({ lastRate }) {
    const [consultando, setConsultando] = useState(false);
    const [errorApi, setErrorApi] = useState(null);

    const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
        bcv: '',
    });

    const traerDelBcv = async () => {
        setConsultando(true);
        setErrorApi(null);

        try {
            const respuesta = await axios.get(route('api.fetch-rates'));

            if (respuesta.data.success) {
                setData('bcv', respuesta.data.bcv);
            } else {
                setErrorApi('La consulta no devolvió una tasa. Puedes escribirla a mano.');
            }
        } catch (error) {
            setErrorApi('No se pudo consultar la tasa automáticamente. Escríbela a mano.');
        } finally {
            setConsultando(false);
        }
    };

    const guardar = (evento) => {
        evento.preventDefault();
        post(route('tasas.store'), { onSuccess: () => reset() });
    };

    return (
        <AuthenticatedLayout header="Tasa de cambio">
            <Head title="Tasa de cambio" />

            <Pagina className="max-w-3xl">
                <Cabecera
                    titulo="Tasa de cambio"
                    descripcion="Con ella se calculan los precios en bolívares de tu catálogo y tus facturas."
                />

                <div className="grid gap-5">
                    <Tarjeta>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm text-stone-500 dark:text-stone-400">Dólar BCV vigente</p>
                                <p className="mt-2 font-display text-4xl font-semibold tabular-nums">
                                    {lastRate ? Number(lastRate.bcv).toFixed(2) : '--'}
                                </p>
                                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                    {lastRate
                                        ? `Registrada el ${new Date(lastRate.created_at).toLocaleDateString('es', {
                                              day: '2-digit',
                                              month: 'long',
                                              year: 'numeric',
                                          })}`
                                        : 'Todavía no has registrado ninguna'}
                                </p>
                            </div>

                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                                <CircleDollarSign className="h-5 w-5" />
                            </span>
                        </div>
                    </Tarjeta>
                </div>

                <Tarjeta
                    titulo="Registrar una tasa nueva"
                    descripcion="Queda guardada con la fecha de hoy y pasa a usarse de inmediato."
                >
                    <form onSubmit={guardar} className="space-y-5">
                        <Campo
                            etiqueta="Bolívares por dólar"
                            error={errors.bcv}
                            ayuda="Usa punto para los decimales. Por ejemplo: 36.50"
                            id="bcv"
                            requerido
                        >
                            <Entrada
                                id="bcv"
                                type="number"
                                step="0.0001"
                                min="0"
                                inputMode="decimal"
                                value={data.bcv}
                                onChange={(e) => setData('bcv', e.target.value)}
                                placeholder="36.50"
                                className="text-lg tabular-nums"
                                required
                            />
                        </Campo>

                        {errorApi && <Aviso tono="aviso">{errorApi}</Aviso>}

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Boton type="submit" disabled={processing}>
                                {processing ? 'Guardando' : 'Guardar tasa'}
                            </Boton>

                            <Boton variante="contorno" onClick={traerDelBcv} disabled={consultando}>
                                <Download className="h-4 w-4" />
                                {consultando ? 'Consultando' : 'Traer del BCV'}
                            </Boton>

                            {recentlySuccessful && (
                                <span className="animate-acercar self-center text-sm font-medium text-marca-700 dark:text-marca-400">
                                    Tasa guardada
                                </span>
                            )}
                        </div>
                    </form>
                </Tarjeta>
            </Pagina>
        </AuthenticatedLayout>
    );
}
