import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="name" value="Tu nombre" />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Correo" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                            <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                                Tu correo todavía no está confirmado. Por ahí te avisamos de lo importante y por
                                ahí recuperas la contraseña si la olvidas.
                            </p>

                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="pulsable mt-3 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-amber-700"
                            >
                                Enviarme el enlace de nuevo
                            </Link>

                            {status === 'verification-link-sent' && (
                                <p className="mt-3 text-sm font-medium text-amber-900 dark:text-amber-200">
                                    Te enviamos un enlace nuevo.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>{processing ? 'Guardando' : 'Guardar'}</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-stone-600 dark:text-stone-400">
                            Guardado.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
