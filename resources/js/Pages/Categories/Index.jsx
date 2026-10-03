import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Aviso, Boton, Cabecera, Campo, Entrada, Pagina, Tarjeta, Vacio } from '@/Components/UI';

export default function Index({ categories }) {
    const { flash } = usePage().props;
    const [editando, setEditando] = useState(null);

    const alta = useForm({ name: '' });

    const crear = (evento) => {
        evento.preventDefault();
        alta.post(route('categorias.store'), {
            preserveScroll: true,
            onSuccess: () => alta.reset(),
        });
    };

    const eliminar = (categoria) => {
        if (window.confirm(`¿Eliminar la categoría "${categoria.name}"? Los productos que la usan no se borran.`)) {
            router.delete(route('categorias.destroy', categoria.id), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout header="Categorías">
            <Head title="Categorías" />

            <Pagina className="max-w-3xl">
                <Cabecera
                    titulo="Categorías"
                    descripcion="Agrupan tus productos y se convierten en los filtros del catálogo público."
                />

                {flash?.success && <Aviso tono="exito">{flash.success}</Aviso>}

                <Tarjeta titulo="Agregar categoría">
                    <form onSubmit={crear} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <Campo error={alta.errors.name} id="nombre" className="flex-1">
                            <Entrada
                                id="nombre"
                                value={alta.data.name}
                                onChange={(e) => alta.setData('name', e.target.value)}
                                placeholder="Por ejemplo: Novedades"
                                maxLength={255}
                                required
                            />
                        </Campo>

                        <Boton type="submit" disabled={alta.processing} className="sm:mt-0">
                            <Plus className="h-4 w-4" />
                            {alta.processing ? 'Agregando' : 'Agregar'}
                        </Boton>
                    </form>
                </Tarjeta>

                <Tarjeta
                    titulo={`Tus categorías (${categories.length})`}
                    cuerpo={false}
                >
                    {categories.length === 0 ? (
                        <Vacio
                            Icono={Tags}
                            titulo="Todavía no tienes categorías"
                            texto="Crea la primera arriba. Sin categorías, tus productos aparecen todos juntos en el catálogo."
                        />
                    ) : (
                        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                            {categories.map((categoria) => (
                                <li key={categoria.id} className="px-5 py-3">
                                    {editando === categoria.id ? (
                                        <FormularioEdicion
                                            categoria={categoria}
                                            onListo={() => setEditando(null)}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="min-w-0 truncate font-medium">{categoria.name}</span>

                                            <div className="flex shrink-0 gap-1">
                                                <Boton
                                                    variante="fantasma"
                                                    tamano="icono"
                                                    aria-label={`Editar ${categoria.name}`}
                                                    onClick={() => setEditando(categoria.id)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Boton>

                                                <Boton
                                                    variante="peligroSuave"
                                                    tamano="icono"
                                                    aria-label={`Eliminar ${categoria.name}`}
                                                    onClick={() => eliminar(categoria)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Boton>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Tarjeta>
            </Pagina>
        </AuthenticatedLayout>
    );
}

function FormularioEdicion({ categoria, onListo }) {
    const form = useForm({ name: categoria.name });

    const guardar = (evento) => {
        evento.preventDefault();
        form.put(route('categorias.update', categoria.id), {
            preserveScroll: true,
            onSuccess: onListo,
        });
    };

    return (
        <form onSubmit={guardar} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Campo error={form.errors.name} className="flex-1">
                <Entrada
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    autoFocus
                    required
                />
            </Campo>

            <div className="flex shrink-0 gap-1">
                <Boton type="submit" tamano="icono" disabled={form.processing} aria-label="Guardar">
                    <Check className="h-4 w-4" />
                </Boton>

                <Boton variante="fantasma" tamano="icono" onClick={onListo} aria-label="Cancelar">
                    <X className="h-4 w-4" />
                </Boton>
            </div>
        </form>
    );
}
