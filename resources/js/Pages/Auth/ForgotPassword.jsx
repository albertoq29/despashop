import { Link, useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import PantallaDeAcceso, { BotonDeAcceso, CampoDeAcceso, TarjetaDeAcceso } from '@/Layouts/PantallaDeAcceso';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const enviar = (evento) => {
        evento.preventDefault();
        post(route('password.email'));
    };

    return (
        <PantallaDeAcceso
            titulo="Recuperar contraseña"
            encabezado="¿Olvidaste tu contraseña?"
            descripcion="Escribe tu correo y te mandamos un enlace para poner una nueva."
            Icono={KeyRound}
            aviso={status}
            pie={
                <>
                    ¿Ya la recordaste?{' '}
                    <Link href={route('login')} className="font-medium text-marca-700 hover:underline dark:text-marca-400">
                        Volver a entrar
                    </Link>
                </>
            }
        >
            <TarjetaDeAcceso onSubmit={enviar}>
                <CampoDeAcceso
                    id="email"
                    etiqueta="Correo"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    error={errors.email}
                />

                <BotonDeAcceso procesando={processing}>
                    {processing ? 'Enviando' : 'Enviarme el enlace'}
                </BotonDeAcceso>

                <p className="text-center text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    El enlace vale por 60 minutos. Si no te llega, revisa la carpeta de spam.
                </p>
            </TarjetaDeAcceso>
        </PantallaDeAcceso>
    );
}
