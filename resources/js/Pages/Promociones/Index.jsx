import { Head, useForm, usePage } from '@inertiajs/react';
import { Megaphone, Percent, Users } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Aviso,
    Boton,
    Cabecera,
    Campo,
    Entrada,
    AreaTexto,
    Interruptor,
    Pagina,
    Tarjeta,
} from '@/Components/UI';

export default function Index({ settings }) {
    const { flash } = usePage().props;

    const promos = useForm({
        global_discount: settings.global_discount ?? '0',
        force_wholesale: settings.force_wholesale === 'true' || settings.force_wholesale === '1',
        force_distributor: settings.force_distributor === 'true' || settings.force_distributor === '1',
    });

    const banner = useForm({
        banner_text: settings.banner_text ?? '',
    });

    const guardarPromos = (evento) => {
        evento.preventDefault();
        promos.post(route('settings.update'), { preserveScroll: true });
    };

    const guardarBanner = (evento) => {
        evento.preventDefault();
        banner.post(route('settings.banner'), { preserveScroll: true });
    };

    const descuento = Number(promos.data.global_discount) || 0;

    return (
        <AuthenticatedLayout header="Promociones">
            <Head title="Promociones" />

            <Pagina className="max-w-3xl">
                <Cabecera
                    titulo="Promociones"
                    descripcion="Ajustes que afectan a todo el catálogo a la vez, sin tocar producto por producto."
                />

                {flash?.success && <Aviso tono="exito">{flash.success}</Aviso>}

                <form onSubmit={guardarPromos}>
                    <Tarjeta
                        titulo="Descuento general"
                        descripcion="Se aplica sobre el precio de todos los productos del catálogo."
                    >
                        <Campo
                            etiqueta="Porcentaje de descuento"
                            error={promos.errors.global_discount}
                            ayuda="Deja 0 para no aplicar ningún descuento."
                            id="descuento"
                        >
                            <div className="relative max-w-[200px]">
                                <Entrada
                                    id="descuento"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={promos.data.global_discount}
                                    onChange={(e) => promos.setData('global_discount', e.target.value)}
                                    className="pr-10 text-lg tabular-nums"
                                    required
                                />
                                <Percent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            </div>
                        </Campo>

                        {descuento > 0 && (
                            <Aviso tono="info" className="mt-4">
                                Un producto de $10,00 se mostrará en $
                                {(10 * (1 - descuento / 100)).toFixed(2)}.
                            </Aviso>
                        )}

                        <div className="mt-6 space-y-4 border-t border-stone-200 pt-5 dark:border-stone-800">
                            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                                Precio que ve el público
                            </p>

                            <Interruptor
                                etiqueta="Mostrar precio al mayor a todos"
                                ayuda="El catálogo usa el precio mayorista en lugar del de detal."
                                valor={promos.data.force_wholesale}
                                onCambiar={(v) => promos.setData('force_wholesale', v)}
                            />

                            <Interruptor
                                etiqueta="Mostrar precio de distribuidor a todos"
                                ayuda="Tiene prioridad sobre el precio al mayor."
                                valor={promos.data.force_distributor}
                                onCambiar={(v) => promos.setData('force_distributor', v)}
                            />
                        </div>

                        {(promos.data.force_wholesale || promos.data.force_distributor) && (
                            <Aviso tono="aviso" className="mt-4">
                                Con esta opción activa, cualquier visitante verá el precio{' '}
                                {promos.data.force_distributor ? 'de distribuidor' : 'al mayor'}, no solo tus clientes
                                habituales.
                            </Aviso>
                        )}

                        <div className="mt-6 flex items-center gap-3">
                            <Boton type="submit" disabled={promos.processing}>
                                {promos.processing ? 'Guardando' : 'Guardar promociones'}
                            </Boton>

                            {promos.recentlySuccessful && (
                                <span className="animate-acercar text-sm font-medium text-marca-700 dark:text-marca-400">
                                    Guardado
                                </span>
                            )}
                        </div>
                    </Tarjeta>
                </form>

                <form onSubmit={guardarBanner}>
                    <Tarjeta
                        titulo="Mensaje del catálogo"
                        descripcion="Un texto corto que aparece sobre tus productos."
                    >
                        <Campo
                            etiqueta="Texto"
                            error={banner.errors.banner_text}
                            ayuda="Déjalo vacío para no mostrar ningún mensaje."
                            id="banner"
                        >
                            <AreaTexto
                                id="banner"
                                value={banner.data.banner_text}
                                onChange={(e) => banner.setData('banner_text', e.target.value)}
                                placeholder="Envío gratis en compras superiores a $30"
                                maxLength={2000}
                            />
                        </Campo>

                        <div className="mt-5 flex items-center gap-3">
                            <Boton type="submit" disabled={banner.processing}>
                                {banner.processing ? 'Guardando' : 'Guardar mensaje'}
                            </Boton>

                            {banner.recentlySuccessful && (
                                <span className="animate-acercar text-sm font-medium text-marca-700 dark:text-marca-400">
                                    Guardado
                                </span>
                            )}
                        </div>
                    </Tarjeta>
                </form>

                <Aviso tono="info">
                    Para banners con imagen, modales y el aspecto del catálogo, usa{' '}
                    <a
                        href={route('catalogo.personalizar')}
                        className="font-medium underline underline-offset-2"
                    >
                        Personalizar catálogo
                    </a>
                    .
                </Aviso>
            </Pagina>
        </AuthenticatedLayout>
    );
}
