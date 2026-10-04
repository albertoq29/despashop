import { useEffect } from 'react';
import { Link, useForm } from '@inertiajs/react';
import PantallaDeAcceso, { BotonDeAcceso, CampoDeAcceso, TarjetaDeAcceso } from '@/Layouts/PantallaDeAcceso';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => reset('password');
    }, []);

    const enviar = (evento) => {
        evento.preventDefault();
        post(route('login'));
    };

    return (
        <PantallaDeAcceso
            titulo="Iniciar sesión"
            encabezado="Entra a tu panel"
            descripcion="Administra tu inventario, tu catálogo y tus facturas."
            aviso={status}
            pie={
                <>
                    ¿No tienes cuenta?{' '}
                    <Link href={route('register')} className="font-medium text-marca-700 hover:underline dark:text-marca-400">
                        Solicita la tuya
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

                <CampoDeAcceso
                    id="password"
                    etiqueta="Contraseña"
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    autoComplete="current-password"
                    required
                    error={errors.password}
                    extra={
                        canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-sm text-marca-700 hover:underline dark:text-marca-400"
                            >
                                ¿La olvidaste?
                            </Link>
                        )
                    }
                />

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300">
                    <input
                        type="checkbox"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950"
                    />
                    Mantener la sesión abierta
                </label>

                <BotonDeAcceso procesando={processing}>
                    {processing ? 'Entrando' : 'Iniciar sesión'}
                </BotonDeAcceso>
            </TarjetaDeAcceso>
        </PantallaDeAcceso>
    );
}
