import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function Ajustes({ ajustes }) {
    const { flash } = usePage().props;

    const form = useForm({
        brand_name: ajustes.brand_name ?? '',
        landing_headline: ajustes.landing_headline ?? '',
        landing_subheadline: ajustes.landing_subheadline ?? '',
        landing_cta_primary: ajustes.landing_cta_primary ?? '',
        landing_cta_secondary: ajustes.landing_cta_secondary ?? '',
        plans_title: ajustes.plans_title ?? '',
        plans_subtitle: ajustes.plans_subtitle ?? '',
        registrations_open: ajustes.registrations_open ?? '1',
        support_email: ajustes.support_email ?? '',
        support_whatsapp: ajustes.support_whatsapp ?? '',
        security_email: ajustes.security_email ?? '',
        terms_url: ajustes.terms_url ?? '',
        privacy_url: ajustes.privacy_url ?? '',
    });

    const enviar = (evento) => {
        evento.preventDefault();
        form.put(route('admin.ajustes.update'), { preserveScroll: true });
    };

    return (
        <AdminLayout header="Ajustes de la plataforma">
            <Head title="Ajustes" />

            <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
                {flash?.success && (
                    <div className="rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800 dark:border-marca-900 dark:bg-marca-950/50 dark:text-marca-300">
                        {flash.success}
                    </div>
                )}

                <Panel titulo="Identidad">
                    <Campo etiqueta="Nombre de la plataforma" campo="brand_name" form={form} />
                </Panel>

                <Panel titulo="Página de bienvenida" descripcion="Los textos que ven los visitantes antes de registrarse.">
                    <div className="space-y-4">
                        <Campo etiqueta="Titular" campo="landing_headline" form={form} />

                        <div>
                            <label className="text-sm font-medium">Párrafo bajo el titular</label>
                            <textarea
                                value={form.data.landing_subheadline}
                                onChange={(e) => form.setData('landing_subheadline', e.target.value)}
                                rows={3}
                                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
                            />
                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                Conviene que no pase de veinte palabras: es lo primero que se lee.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Campo etiqueta="Botón principal" campo="landing_cta_primary" form={form} />
                            <Campo etiqueta="Botón secundario" campo="landing_cta_secondary" form={form} />
                        </div>
                    </div>
                </Panel>

                <Panel titulo="Sección de planes">
                    <div className="space-y-4">
                        <Campo etiqueta="Título" campo="plans_title" form={form} />
                        <Campo etiqueta="Subtítulo" campo="plans_subtitle" form={form} />
                    </div>
                </Panel>

                <Panel titulo="Registros" descripcion="Al cerrarlos, la web deja de mostrar el formulario de solicitud.">
                    <div className="flex gap-2">
                        {[
                            ['1', 'Abiertos'],
                            ['0', 'Cerrados'],
                        ].map(([valor, etiqueta]) => (
                            <button
                                key={valor}
                                type="button"
                                onClick={() => form.setData('registrations_open', valor)}
                                aria-pressed={form.data.registrations_open === valor}
                                className={`pulsable rounded-lg px-5 py-2.5 text-sm font-medium ${
                                    form.data.registrations_open === valor
                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                        : 'border border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
                                }`}
                            >
                                {etiqueta}
                            </button>
                        ))}
                    </div>
                </Panel>

                <Panel titulo="Contacto y legales">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Campo etiqueta="Correo de soporte" campo="support_email" form={form} tipo="email" />
                        <Campo etiqueta="WhatsApp de soporte" campo="support_whatsapp" form={form} />
                        <Campo etiqueta="Enlace a términos" campo="terms_url" form={form} />
                        <Campo etiqueta="Enlace a privacidad" campo="privacy_url" form={form} />
                    </div>
                </Panel>

                <Panel
                    titulo="Avisos de seguridad"
                    descripcion="Dónde llegan los avisos cuando el registro de seguridad anota algo grave: intentos de acceso en ráfaga, permisos tanteados o uso indebido de la IA. Si lo dejas vacío, el aviso va al correo de todos los administradores."
                >
                    <Campo etiqueta="Correo para avisos de seguridad" campo="security_email" form={form} tipo="email" />
                </Panel>

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="pulsable rounded-xl bg-marca-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 dark:bg-marca-500 dark:text-stone-950"
                    >
                        {form.processing ? 'Guardando' : 'Guardar ajustes'}
                    </button>

                    {form.recentlySuccessful && (
                        <span className="animate-acercar text-sm font-medium text-marca-700 dark:text-marca-400">
                            Guardado
                        </span>
                    )}
                </div>
            </form>
        </AdminLayout>
    );
}

function Panel({ titulo, descripcion, children }) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display font-semibold">{titulo}</h2>
            {descripcion && (
                <p className="mb-4 mt-1 max-w-[60ch] text-sm text-stone-500 dark:text-stone-400">{descripcion}</p>
            )}
            <div className={descripcion ? '' : 'mt-4'}>{children}</div>
        </section>
    );
}

function Campo({ etiqueta, campo, form, tipo = 'text' }) {
    return (
        <div>
            <label className="text-sm font-medium">{etiqueta}</label>
            <input
                type={tipo}
                value={form.data[campo] ?? ''}
                onChange={(e) => form.setData(campo, e.target.value)}
                className="mt-2 w-full rounded-lg border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
            />
            {form.errors[campo] && <p className="mt-1 text-sm text-red-600">{form.errors[campo]}</p>}
        </div>
    );
}
