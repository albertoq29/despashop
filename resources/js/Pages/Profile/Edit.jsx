import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Cabecera, Pagina, Tarjeta } from '@/Components/UI';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout header="Mi perfil">
            <Head title="Mi perfil" />

            <Pagina className="max-w-3xl">
                <Cabecera
                    titulo="Mi perfil"
                    descripcion="Tus datos de acceso. Para cambiar el nombre o el aspecto de tu catálogo, usa Personalizar catálogo."
                />

                <Tarjeta titulo="Datos de la cuenta">
                    <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                </Tarjeta>

                <Tarjeta titulo="Contraseña" descripcion="Usa una larga y que no repitas en otros sitios.">
                    <UpdatePasswordForm />
                </Tarjeta>

                <Tarjeta
                    titulo="Descargar mis datos"
                    descripcion="Una copia de todo lo tuyo: productos, servicios, categorías, combos, facturas, clientes y tus imágenes."
                >
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Las planillas se abren en Excel o en Google Sheets. Guarda esta copia donde puedas
                        encontrarla: si algún día cierras tu cuenta, es lo único que queda.
                    </p>

                    <a
                        href={route('datos.descargar')}
                        className="pulsable mt-4 inline-flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                    >
                        <Download className="h-4 w-4" />
                        Descargar todo en un ZIP
                    </a>
                </Tarjeta>

                <Tarjeta titulo="Eliminar cuenta">
                    <DeleteUserForm />
                </Tarjeta>
            </Pagina>
        </AuthenticatedLayout>
    );
}
