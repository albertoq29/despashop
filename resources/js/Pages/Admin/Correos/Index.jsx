import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Loader2, Mail, Send, Users } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { Interruptor } from '@/Components/UI';

const CAMPO =
    'block w-full rounded-md border-stone-300 bg-white text-stone-900 shadow-sm placeholder:text-stone-400 ' +
    'focus:border-marca-600 focus:ring-marca-600 ' +
    'dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600';

/**
 * Escribirle a los comercios que cumplen ciertas condiciones.
 *
 * Primero se arma a quién, y recién después qué decirle: el orden importa
 * porque el mensaje que se le escribe a quien nunca publicó no es el mismo
 * que el de quien lleva tres meses sin facturar. La lista de alcance se
 * recarga desde el servidor en cada cambio, así que lo que se ve antes de
 * enviar es lo que de verdad va a recibir el correo.
 */
export default function Correos({ condiciones, maximoPorTanda, elegidas, dias, alcance }) {
    const [enviando, setEnviando] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        titulo: '',
        cuerpo: '',
        enlace: '',
        texto_del_enlace: '',
        con_catalogo: false,
    });

    /** Cambiar el filtro recarga el alcance: se consulta al servidor. */
    const filtrar = (nuevasElegidas, nuevosDias) => {
        router.get(
            route('admin.correos.index'),
            { condiciones: nuevasElegidas, dias: nuevosDias },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const alternar = (clave) => {
        const siguientes = elegidas.includes(clave)
            ? elegidas.filter((c) => c !== clave)
            : [...elegidas, clave];

        filtrar(siguientes, dias);
    };

    const cambiarDias = (clave, valor) => filtrar(elegidas, { ...dias, [clave]: valor });

    const enviar = (e) => {
        e.preventDefault();
        setEnviando(true);

        router.post(
            route('admin.correos.store'),
            { ...data, condiciones: elegidas, dias },
            {
                preserveScroll: true,
                onSuccess: () => reset(),
                onFinish: () => setEnviando(false),
            },
        );
    };

    const hayAlcance = alcance.total > 0;
    const seCortan = alcance.total > maximoPorTanda;

    return (
        <AdminLayout header="Correos a comercios">
            <Head title="Correos a comercios" />

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
                <p className="max-w-[70ch] leading-relaxed text-stone-600 dark:text-stone-400">
                    Escríbele a los comercios que cumplen ciertas condiciones. Quien lleva un mes sin entrar,
                    quien nunca publicó su catálogo, quien no ha cargado nada: son los que se pierden si nadie
                    les escribe.
                </p>

                {/* ── A quién ─────────────────────────────────────────────── */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                    <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                        ¿A quién le escribes?
                    </h2>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        Se envía a quien cumpla <strong>todas</strong> las condiciones que marques. Solo entran
                        comercios aprobados.
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {condiciones.map((condicion) => {
                            const activa = elegidas.includes(condicion.clave);

                            return (
                                <div
                                    key={condicion.clave}
                                    className={`rounded-xl border p-3.5 transition-colors ${
                                        activa
                                            ? 'border-marca-400 bg-marca-50/60 dark:border-marca-700 dark:bg-marca-950/40'
                                            : 'border-stone-200 dark:border-stone-800'
                                    }`}
                                >
                                    <label className="flex cursor-pointer items-start gap-2.5">
                                        <input
                                            type="checkbox"
                                            checked={activa}
                                            onChange={() => alternar(condicion.clave)}
                                            className="mt-0.5 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                                                {condicion.nombre}
                                            </span>
                                            <span className="mt-0.5 block text-xs leading-snug text-stone-500 dark:text-stone-400">
                                                {condicion.ayuda}
                                            </span>
                                        </span>
                                    </label>

                                    {activa && condicion.dias && (
                                        <div className="mt-3 flex items-center gap-2 pl-7">
                                            <TextInput
                                                type="number"
                                                min="1"
                                                max="1095"
                                                value={dias[condicion.clave] ?? 30}
                                                onChange={(e) => cambiarDias(condicion.clave, e.target.value)}
                                                className="w-24 text-sm"
                                            />
                                            <span className="text-sm text-stone-600 dark:text-stone-400">días</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <InputError message={errors.condiciones} className="mt-3" />
                </section>

                {/* ── Cuántos son ─────────────────────────────────────────── */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-700 dark:bg-marca-950 dark:text-marca-400">
                            <Users className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
                                {elegidas.length === 0
                                    ? 'Marca una condición'
                                    : alcance.total === 1
                                      ? '1 comercio'
                                      : `${alcance.total.toLocaleString('es-VE')} comercios`}
                            </p>
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                {elegidas.length === 0
                                    ? 'Sin condiciones no se le escribe a nadie.'
                                    : 'Cumplen todas las condiciones marcadas.'}
                            </p>
                        </div>
                    </div>

                    {seCortan && (
                        <p className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                Se envían {maximoPorTanda} por tanda. Vuelve a enviar después para alcanzar al
                                resto, o afina la condición.
                            </span>
                        </p>
                    )}

                    {alcance.muestra.length > 0 && (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
                            <table className="w-full min-w-max text-left text-sm">
                                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-950 dark:text-stone-400">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">Comercio</th>
                                        <th className="px-3 py-2 font-semibold">Correo</th>
                                        <th className="px-3 py-2 font-semibold">Último acceso</th>
                                        <th className="px-3 py-2 font-semibold">Desde</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                    {alcance.muestra.map((comercio) => (
                                        <tr key={comercio.id}>
                                            <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-200">
                                                {comercio.nombre}
                                            </td>
                                            <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{comercio.email}</td>
                                            <td className="px-3 py-2 text-stone-600 dark:text-stone-400">
                                                {comercio.ultimoAcceso ?? 'Nunca entró'}
                                            </td>
                                            <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{comercio.desde}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {alcance.total > alcance.muestra.length && alcance.muestra.length > 0 && (
                        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                            Se muestran los primeros {alcance.muestra.length}.
                        </p>
                    )}
                </section>

                {/* ── Qué decirles ────────────────────────────────────────── */}
                <form onSubmit={enviar} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                    <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                        ¿Qué les dices?
                    </h2>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        Sale con el diseño de siempre: tu logo arriba y el contacto de soporte al pie. Escribe{' '}
                        <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">{'{nombre}'}</code>{' '}
                        donde quieras que aparezca el del comercio.
                    </p>

                    <div className="mt-5 space-y-5">
                        <div>
                            <InputLabel htmlFor="titulo" value="Asunto y titular" />
                            <TextInput
                                id="titulo"
                                className="mt-1 block w-full"
                                maxLength={120}
                                value={data.titulo}
                                onChange={(e) => setData('titulo', e.target.value)}
                                placeholder="{nombre}, tu catálogo está a un paso"
                                required
                            />
                            <InputError message={errors.titulo} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="cuerpo" value="Mensaje" />
                            <textarea
                                id="cuerpo"
                                rows="7"
                                maxLength={4000}
                                className={`mt-1 ${CAMPO}`}
                                value={data.cuerpo}
                                onChange={(e) => setData('cuerpo', e.target.value)}
                                placeholder={'Deja una línea en blanco entre párrafo y párrafo.'}
                                required
                            />
                            <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                                Una línea en blanco separa párrafos. Va como texto: no se interpreta HTML.
                            </p>
                            <InputError message={errors.cuerpo} className="mt-2" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="enlace" value="Enlace del botón (opcional)" />
                                <TextInput
                                    id="enlace"
                                    type="url"
                                    className="mt-1 block w-full"
                                    value={data.enlace}
                                    onChange={(e) => setData('enlace', e.target.value)}
                                    placeholder="https://despashop.com/login"
                                />
                                <InputError message={errors.enlace} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="texto_del_enlace" value="Texto del botón" />
                                <TextInput
                                    id="texto_del_enlace"
                                    className="mt-1 block w-full"
                                    maxLength={40}
                                    value={data.texto_del_enlace}
                                    onChange={(e) => setData('texto_del_enlace', e.target.value)}
                                    placeholder="Entrar a mi panel"
                                />
                                <InputError message={errors.texto_del_enlace} className="mt-2" />
                            </div>
                        </div>

                        <Interruptor
                            etiqueta="Incluir su dirección de catálogo"
                            ayuda="Útil cuando el mensaje es para que publiquen o compartan su enlace."
                            valor={data.con_catalogo}
                            onCambiar={(v) => setData('con_catalogo', v)}
                        />
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pt-5 dark:border-stone-800">
                        {hayAlcance && (
                            <p className="mr-auto text-sm text-stone-500 dark:text-stone-400">
                                Se enviará a {Math.min(alcance.total, maximoPorTanda)} comercio
                                {Math.min(alcance.total, maximoPorTanda) === 1 ? '' : 's'}.
                            </p>
                        )}

                        <PrimaryButton type="submit" disabled={! hayAlcance || enviando || processing}>
                            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {enviando ? 'Enviando…' : 'Enviar ahora'}
                        </PrimaryButton>
                    </div>

                    {! hayAlcance && (
                        <p className="mt-3 flex items-center justify-end gap-2 text-sm text-stone-500 dark:text-stone-400">
                            <Mail className="h-4 w-4" />
                            Marca una condición que alcance a alguien.
                        </p>
                    )}
                </form>
            </div>
        </AdminLayout>
    );
}
