import { useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';

/**
 * Cierre de la cuenta.
 *
 * Se nombra lo que se pierde en concreto —productos, facturas, el catálogo
 * y su dirección— en vez de hablar de «recursos y datos»: quien está a
 * punto de pulsar tiene que saber exactamente qué desaparece.
 */
export default function DeleteUserForm({ className = '' }) {
    const [confirmando, setConfirmando] = useState(false);
    const campoClave = useRef();

    const { data, setData, delete: destruir, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const eliminar = (evento) => {
        evento.preventDefault();

        destruir(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => cerrar(),
            onError: () => campoClave.current.focus(),
            onFinish: () => reset(),
        });
    };

    const cerrar = () => {
        setConfirmando(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-5 ${className}`}>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Al cerrar tu cuenta se borra todo lo tuyo: productos, servicios, combos, facturas, clientes,
                imágenes y el diseño de tu catálogo. La dirección de tu catálogo queda libre para que otro
                comercio la tome. <strong className="text-stone-800 dark:text-stone-200">No se puede deshacer
                y no podemos recuperar nada después.</strong>
            </p>

            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Si quieres conservar tu información, descárgala antes desde «Descargar mis datos», aquí arriba.
            </p>

            <DangerButton onClick={() => setConfirmando(true)}>Eliminar mi cuenta</DangerButton>

            <Modal show={confirmando} onClose={cerrar} maxWidth="lg">
                <form onSubmit={eliminar} className="p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                    </span>

                    <h2 className="mt-4 font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                        ¿Seguro que quieres eliminar tu cuenta?
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                        Se borrarán tus productos, tus facturas y tu catálogo, y la dirección quedará libre.
                        Esto es definitivo. Escribe tu contraseña para confirmarlo.
                    </p>

                    <div className="mt-6">
                        <InputLabel htmlFor="password" value="Contraseña" className="sr-only" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={campoClave}
                            value={data.password}
                            onChange={(evento) => setData('password', evento.target.value)}
                            className="block w-full"
                            isFocused
                            placeholder="Tu contraseña"
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={cerrar} type="button">
                            Cancelar
                        </SecondaryButton>

                        <DangerButton disabled={processing}>
                            {processing ? 'Eliminando' : 'Sí, eliminar mi cuenta'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
