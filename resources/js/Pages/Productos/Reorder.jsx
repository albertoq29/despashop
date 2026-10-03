import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Swal from 'sweetalert2';

export default function Reorder({ auth, productos }) {
    const [list, setList] = useState(productos);
    const [isSaving, setIsSaving] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Add class styling on drag start via target ref
        e.currentTarget.classList.add('opacity-40');
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Reorder list array
        const temp = [...list];
        const item = temp[draggedIndex];
        temp.splice(draggedIndex, 1);
        temp.splice(index, 0, item);

        setDraggedIndex(index);
        setList(temp);
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-40');
        setDraggedIndex(null);
    };

    const handleSave = () => {
        setIsSaving(true);
        router.post(route('productos.reorder'), {
            ids: list.map(p => p.id)
        }, {
            onSuccess: () => {
                setIsSaving(false);
                Swal.fire({
                    position: 'top-end',
                    icon: 'success',
                    title: 'Orden guardado correctamente',
                    showConfirmButton: false,
                    timer: 1500,
                    toast: true
                });
            },
            onError: () => {
                setIsSaving(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error al guardar el orden.'
                });
            }
        });
    };

    const handleReset = () => {
        Swal.fire({
            title: '¿Restablecer orden por defecto?',
            text: 'Los productos se mostrarán ordenados por fecha de creación (los más nuevos primero).',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#db2777',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setIsSaving(true);
                router.post(route('productos.reorder'), {
                    reset: true
                }, {
                    onSuccess: () => {
                        setIsSaving(false);
                        // Refresh the local state with products sorted by ID desc (default)
                        const defaultSorted = [...list].sort((a, b) => b.id - a.id);
                        setList(defaultSorted);
                        Swal.fire({
                            position: 'top-end',
                            icon: 'success',
                            title: 'Orden restablecido por defecto',
                            showConfirmButton: false,
                            timer: 1500,
                            toast: true
                        });
                    },
                    onError: () => {
                        setIsSaving(false);
                    }
                });
            }
        });
    };

    return (
        <AuthenticatedLayout 
            user={auth.user}
            header={
                <div className="flex items-center gap-3">
                    <button onClick={() => router.visit(route('productos.index'))} className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h2 className="text-xl font-semibold leading-tight text-stone-800 dark:text-stone-200">Ordenar Productos de la Tienda</h2>
                </div>
            }
        >
            <Head title="Ordenar Productos" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    
                    {/* Panel de Información y Acciones */}
                    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-stone-800 dark:text-stone-200 text-lg">Organiza tu vitrina</h3>
                            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Arrastra los productos para cambiar la posición en la que aparecerán en la tienda pública.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <SecondaryButton onClick={handleReset} disabled={isSaving} className="flex-1 sm:flex-none justify-center">
                                Restablecer por Defecto
                            </SecondaryButton>
                            <PrimaryButton onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none justify-center">
                                {isSaving ? 'Guardando...' : 'Guardar Orden'}
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Lista Drag-and-Drop */}
                    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden divide-y divide-stone-200 dark:divide-stone-800">
                        {list.map((prod, index) => (
                            <div
                                key={prod.id}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-4 p-4 hover:bg-marca-50/20 dark:hover:bg-marca-950/20 cursor-grab active:cursor-grabbing transition-all select-none duration-150 ${
                                    draggedIndex === index ? 'bg-marca-50 dark:bg-marca-950/40 border-y-2 border-dashed border-marca-500 dark:border-marca-600' : ''
                                }`}
                            >
                                {/* Drag Handle */}
                                <div className="text-stone-400 dark:text-stone-500 flex-shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16"/>
                                    </svg>
                                </div>

                                {/* Posición */}
                                <div className="font-bold text-stone-500 dark:text-stone-400 w-8 text-center text-sm">
                                    #{index + 1}
                                </div>

                                {/* Imagen */}
                                <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-200 dark:border-stone-800 flex-shrink-0 flex items-center justify-center">
                                    {prod.image_url ? (
                                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-stone-300 dark:text-stone-600">Sin foto</span>
                                    )}
                                </div>

                                {/* Detalles */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-stone-800 dark:text-stone-200 truncate text-sm">{prod.name}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                        {prod.categories?.map(cat => (
                                            <span key={cat.id} className="text-[10px] bg-marca-50 dark:bg-marca-950/40 text-marca-700 dark:text-marca-400 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-800 uppercase font-black tracking-wider">
                                                {cat.name}
                                            </span>
                                        ))}
                                        {prod.por_llegar && (
                                            <span className="text-[10px] bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-900 font-bold">
                                                ✈️ Por llegar
                                            </span>
                                        )}
                                        {prod.is_hidden && (
                                            <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-800 font-bold">
                                                Oculto
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Precio */}
                                <div className="text-right flex-shrink-0">
                                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                                        {prod.price_usdt ? `$${parseFloat(prod.price_usdt).toFixed(2)}` : 'Consultar'}
                                    </span>
                                    <div className="text-xs text-stone-400 dark:text-stone-500">Stock: {prod.stock}</div>
                                </div>
                            </div>
                        ))}

                        {list.length === 0 && (
                            <div className="text-center py-20 text-stone-400 dark:text-stone-500">
                                <p className="text-lg">No tienes productos registrados aún.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
