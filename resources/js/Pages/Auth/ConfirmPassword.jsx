import { useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import PantallaDeAcceso, { BotonDeAcceso, CampoDeAcceso, TarjetaDeAcceso } from '@/Layouts/PantallaDeAcceso';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const enviar = (evento) => {
        evento.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PantallaDeAcceso
            titulo="Confirma tu contraseña"
            encabezado="Confirma que eres tú"
            descripcion="Vas a hacer algo delicado, así que te pedimos la contraseña una vez más."
            Icono={ShieldCheck}
        >
            <TarjetaDeAcceso onSubmit={enviar}>
                <CampoDeAcceso
                    id="password"
                    etiqueta="Contraseña"
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                    error={errors.password}
                />

                <BotonDeAcceso procesando={processing}>
                    {processing ? 'Comprobando' : 'Continuar'}
                </BotonDeAcceso>
            </TarjetaDeAcceso>
        </PantallaDeAcceso>
    );
}
