import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import CambiarTema from '@/Components/CambiarTema';
import { numeroDeWhatsapp } from '@/utils/whatsapp';

/**
 * Condiciones de uso de la plataforma.
 *
 * Página pública y con índice: quien se está registrando la abre en otra
 * pestaña, y quien ya tiene cuenta puede volver a ella cuando quiera.
 */
export default function Terminos({ secciones, version, contacto }) {
    const { plataforma } = usePage().props;
    const marca = plataforma?.marca ?? 'Despashop';
    const whatsapp = numeroDeWhatsapp(contacto?.whatsapp);

    return (
        <>
            <Head title="Términos y condiciones" />

            <div className="min-h-screen bg-stone-50 px-5 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-center justify-between">
                        <Link
                            href={route('home')}
                            className="inline-flex items-center gap-2 text-sm text-stone-600 transition-colors duration-150 ease-salida hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al inicio
                        </Link>

                        <CambiarTema compacto />
                    </div>

                    <header className="mt-8">
                        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                            Términos y condiciones
                        </h1>
                        <p className="mt-3 max-w-[65ch] text-stone-600 dark:text-stone-400">
                            Estas son las reglas de {marca}: qué hace la plataforma, qué esperamos de cada comercio y
                            qué puede esperar de nosotros. Están escritas para leerse, no para adornar.
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-wider text-stone-400">Versión {version}</p>
                    </header>

                    {/* Índice: el texto es largo y casi siempre se busca una cosa puntual */}
                    <nav className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                        <p className="text-sm font-medium">En esta página</p>
                        <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                            {secciones.map((seccion, indice) => (
                                <li key={seccion.id}>
                                    <a
                                        href={`#${seccion.id}`}
                                        className="text-sm text-stone-600 hover:text-marca-700 hover:underline dark:text-stone-400 dark:hover:text-marca-400"
                                    >
                                        <span className="tabular-nums text-stone-400">{indice + 1}.</span> {seccion.titulo}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <div className="mt-10 space-y-10">
                        {secciones.map((seccion, indice) => (
                            <section key={seccion.id} id={seccion.id} className="scroll-mt-8">
                                <h2 className="font-display text-xl font-semibold tracking-tight">
                                    <span className="mr-2 tabular-nums text-stone-400">{indice + 1}.</span>
                                    {seccion.titulo}
                                </h2>

                                <div className="mt-3 space-y-3">
                                    {seccion.parrafos.map((parrafo) => (
                                        <p key={parrafo} className="text-pretty leading-relaxed text-stone-700 dark:text-stone-300">
                                            {parrafo}
                                        </p>
                                    ))}
                                </div>

                                {seccion.puntos?.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {seccion.puntos.map((punto) => (
                                            <li key={punto} className="flex gap-3 text-stone-700 dark:text-stone-300">
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                                {punto}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}
                    </div>

                    <footer className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                        <h2 className="font-display font-semibold">¿Dudas o reclamos?</h2>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                            Escríbenos y te respondemos. Si ya tienes cuenta, también puedes usar el buzón de
                            sugerencias de tu panel.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                            {contacto?.email && (
                                <a
                                    href={`mailto:${contacto.email}`}
                                    className="pulsable inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                                >
                                    <Mail className="h-4 w-4" />
                                    {contacto.email}
                                </a>
                            )}

                            {whatsapp && (
                                <a
                                    href={`https://wa.me/${whatsapp}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="pulsable inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    WhatsApp
                                </a>
                            )}

                            <Link
                                href={route('register')}
                                className="pulsable inline-flex items-center gap-2 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 dark:bg-marca-500 dark:text-stone-950"
                            >
                                Solicitar una cuenta
                            </Link>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
