import { useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import PantallaDeAcceso, { BotonDeAcceso, CampoDeAcceso, TarjetaDeAcceso } from '@/Layouts/PantallaDeAcceso';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const enviar = (evento) => {
        evento.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <PantallaDeAcceso
            titulo="Nueva contraseña"
            encabezado="Pon tu nueva contraseña"
            descripcion="Elige una que no uses en otro sitio. Con esta entrarás a partir de ahora."
            Icono={KeyRound}
        >
            <TarjetaDeAcceso onSubmit={enviar}>
                <CampoDeAcceso
                    id="email"
                    etiqueta="Correo"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    autoComplete="username"
                    required
                    error={errors.email}
                />

                <CampoDeAcceso
                    id="password"
                    etiqueta="Nueva contraseña"
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    required
                    error={errors.password}
                />

                <CampoDeAcceso
                    id="password_confirmation"
                    etiqueta="Repite la contraseña"
                    type="password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    autoComplete="new-password"
                    required
                    error={errors.password_confirmation}
                />

                <BotonDeAcceso procesando={processing}>
                    {processing ? 'Guardando' : 'Guardar y entrar'}
                </BotonDeAcceso>
            </TarjetaDeAcceso>
        </PantallaDeAcceso>
    );
}
