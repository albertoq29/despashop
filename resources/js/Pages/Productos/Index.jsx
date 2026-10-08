import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Interruptor } from '@/Components/UI';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Swal from 'sweetalert2';
import { hoyLocal } from '@/utils/fechas';
import { useNombreDistribuidor } from '@/utils/nivelesDePrecio';

const normalizeText = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/** D\u00f3nde se presta un servicio. Mismas claves que App\Models\Product. */
const MODALIDADES_SERVICIO = {
    local: 'En nuestro local',
    domicilio: 'A domicilio',
    remoto: 'En l\u00ednea',
    acordar: 'A convenir',
};

export default function Index({ auth, productos, categories }) {
    const nombreDistribuidor = useNombreDistribuidor();
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [extraPhotos, setExtraPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [modalKey, setModalKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Reposicion: entro mercancia y se registra con su costo ──
    const [reponiendo, setReponiendo] = useState(null);
    const [prodEditado, setProdEditado] = useState(null);

    // ── Variantes (color, talla, modelo) ──
    const [newVariants, setNewVariants] = useState([]);      // variantes a agregar
    const [existingVariants, setExistingVariants] = useState([]); // variantes ya guardadas

    // ── Fichero de fotos privadas del producto ──
    const [newPrivatePhotos, setNewPrivatePhotos] = useState([]);           // { file, name, preview }
    const [existingPrivatePhotos, setExistingPrivatePhotos] = useState([]); // ya guardadas en el fichero

    /**
 * Clases de los campos escritos a mano dentro del modal.
 *
 * Los `<textarea>`, `<select>` e `<input>` sueltos no heredan nada: sin un
 * fondo y un color propios el navegador los pinta blancos, que es lo que
 * hacía que en modo oscuro el formulario quedara lleno de recuadros claros.
 */
const CAMPO =
    'block w-full rounded-md border-stone-300 bg-white text-stone-900 shadow-sm placeholder:text-stone-400 ' +
    'focus:border-marca-600 focus:ring-marca-600 ' +
    'dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 ' +
    'dark:focus:border-marca-400 dark:focus:ring-marca-400';

/** Caja de una sección del formulario: separa los grupos de campos. */
const TARJETA =
    'rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-950/40 sm:p-5';

const VARIANT_TYPES = [
        { value: 'color', label: 'Color' },
        { value: 'talla', label: 'Talla o medida' },
        { value: 'tipo',  label: 'Modelo o presentación' },
    ];

    const recalculateTotalStock = (existList, newList) => {
        const hasVariants = (existList && existList.length > 0) || (newList && newList.length > 0);
        if (hasVariants) {
            const totalExist = (existList || []).reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
            const totalNew = (newList || []).reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
            setData('stock', totalExist + totalNew);
        }
    };

    const addVariant = () => {
        const updated = [...newVariants, { label: '', type: 'color', stock: 0, image: null, preview: null }];
        setNewVariants(updated);
        recalculateTotalStock(existingVariants, updated);
    };

    const updateVariant = (idx, field, value) => {
        const updated = newVariants.map((v, i) => i === idx ? { ...v, [field]: value } : v);
        setNewVariants(updated);
        if (field === 'stock') {
            recalculateTotalStock(existingVariants, updated);
        }
    };

    const updateExistingVariant = (id, field, value) => {
        const updated = existingVariants.map(v => v.id === id ? { ...v, [field]: value } : v);
        setExistingVariants(updated);
        if (field === 'stock') {
            recalculateTotalStock(updated, newVariants);
        }
    };

    const updateVariantImage = (idx, file) => {
        setNewVariants(prev => prev.map((v, i) =>
            i === idx ? { ...v, image: file, preview: file ? URL.createObjectURL(file) : null } : v
        ));
    };

    const removeNewVariant = (idx) => {
        const updated = newVariants.filter((_, i) => i !== idx);
        setNewVariants(updated);
        recalculateTotalStock(existingVariants, updated);
    };

    const deleteExistingVariant = (variantId) => {
        Swal.fire({ title: '¿Eliminar variante?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' })
            .then(result => {
                if (result.isConfirmed) {
                    router.delete(route('product-variants.destroy', variantId), {
                        preserveScroll: true,
                        onSuccess: () => {
                            const updated = existingVariants.filter(v => v.id !== variantId);
                            setExistingVariants(updated);
                            recalculateTotalStock(updated, newVariants);
                        }
                    });
                }
            });
    };

    const [busqueda, setBusqueda] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [filterHidden, setFilterHidden] = useState('visible'); // 'visible' | 'hidden' | 'all'
    const [sortByStock, setSortByStock] = useState(false);

    const { data, setData, clearErrors, errors } = useForm({
        id: '', name: '', item_type: 'producto', service_duration: '', service_mode: 'local',
        price_usdt: '', price_mayor_usdt: '', price_distribuidor_usdt: '',
        cost_price: '', stock: 0, categories: [], conditional_price: '', conditional_min_quantity: '',
        notes: '', description: '', image: null, photos: [], is_hidden: false, por_llegar: false, show_variants_in_store: true, last_units: false, _method: 'POST'
    });

    const esServicio = data.item_type === 'servicio';

    let productosFiltrados = productos.filter(p => {
        const nameMatch = normalizeText(p.name).includes(normalizeText(busqueda));
        const hiddenMatch = filterHidden === 'all' || (filterHidden === 'hidden' ? p.is_hidden : !p.is_hidden);
        return nameMatch && hiddenMatch;
    });

    if (sortByStock) {
        productosFiltrados = [...productosFiltrados].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    }

    const freshForm = (method = 'POST') => ({
        id: '', name: '', item_type: 'producto', service_duration: '', service_mode: 'local',
        price_usdt: '', price_mayor_usdt: '', price_distribuidor_usdt: '',
        cost_price: '', stock: 0, categories: [], conditional_price: '', conditional_min_quantity: '',
        notes: '', description: '', image: null, photos: [], is_hidden: false, por_llegar: false, show_variants_in_store: true, last_units: false, _method: method
    });

    const openCreate = () => {
        setIsEditing(false); setPreviewImage(null); setExtraPhotos([]); setExistingPhotos([]);
        setNewVariants([]); setExistingVariants([]);
        setNewPrivatePhotos([]); setExistingPrivatePhotos([]);
        setCategorySearch(''); setModalKey(prev => prev + 1); setData(freshForm()); clearErrors(); setShowModal(true);
    };

    const abrirReposicion = (prod) => {
        setShowModal(false);
        setReponiendo(prod);
    };

    const openEdit = (prod) => {
        setIsEditing(true); setProdEditado(prod); setPreviewImage(prod.image_url); setExtraPhotos([]);
        setExistingPhotos(prod.images || []);
        setNewVariants([]); setExistingVariants(prod.variants || []);
        setNewPrivatePhotos([]); setExistingPrivatePhotos(prod.private_photos || []);
        setCategorySearch(''); setModalKey(prev => prev + 1);
        setData({
            id: prod.id, name: prod.name,
            item_type: prod.item_type || 'producto',
            service_duration: prod.service_duration || '',
            service_mode: prod.service_mode || 'local',
            price_usdt: prod.price_usdt || '',
            price_mayor_usdt: prod.price_mayor_usdt || '', price_distribuidor_usdt: prod.price_distribuidor_usdt || '',
            cost_price: prod.cost_price || '', stock: prod.stock || 0,
            categories: prod.categories ? prod.categories.map(c => c.id.toString()) : [],
            conditional_price: prod.conditional_price || '', conditional_min_quantity: prod.conditional_min_quantity || '',
            notes: prod.notes || '', description: prod.description || '',
            image: null, photos: [], is_hidden: prod.is_hidden || false, por_llegar: prod.por_llegar || false,
            show_variants_in_store: prod.show_variants_in_store ?? true,
            last_units: prod.last_units || false, _method: 'PATCH'
        });
        clearErrors(); setShowModal(true);
    };

    const handleDelete = (id) => {
        Swal.fire({ title: '¿Estás seguro?', text: 'No podrás revertir esta acción', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#db2777', cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                router.delete(route('productos.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ title: '¡Eliminado!', text: 'Producto eliminado.', icon: 'success', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const handleToggleHidden = (prod) => {
        router.patch(route('productos.toggle-hidden', prod.id), {}, {
            preserveScroll: true,
            onSuccess: () => Swal.fire({
                position: 'top-end', icon: 'success',
                title: prod.is_hidden ? 'Producto visible en tienda' : 'Producto ocultado de tienda',
                showConfirmButton: false, timer: 1500, toast: true,
            })
        });
    };

    const submit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('item_type', data.item_type || 'producto');

        if (data.item_type === 'servicio') {
            formData.append('service_duration', data.service_duration || '');
            formData.append('service_mode', data.service_mode || '');
        }

        formData.append('price_usdt', data.price_usdt || '');
        formData.append('price_mayor_usdt', data.price_mayor_usdt || '');
        formData.append('price_distribuidor_usdt', data.price_distribuidor_usdt || '');
        formData.append('cost_price', data.cost_price || '');
        formData.append('stock', data.stock);
        formData.append('conditional_price', data.conditional_price || '');
        formData.append('conditional_min_quantity', data.conditional_min_quantity || '');
        formData.append('notes', data.notes || '');
        formData.append('description', data.description || '');
        formData.append('is_hidden', data.is_hidden ? '1' : '0');
        formData.append('por_llegar', data.por_llegar ? '1' : '0');
        formData.append('show_variants_in_store', data.show_variants_in_store ? '1' : '0');
        formData.append('last_units', data.last_units ? '1' : '0');
        if (data.image) formData.append('image', data.image);
        if (data.photos?.length) data.photos.forEach((p, i) => formData.append(`photos[${i}]`, p));
        if (data.categories?.length) data.categories.forEach(id => formData.append('categories[]', id));
        // Fichero de fotos privadas (nuevas)
        newPrivatePhotos.forEach((p, i) => {
            formData.append(`private_photos[${i}]`, p.file);
            formData.append(`private_photo_names[${i}]`, p.name?.trim() || '');
        });
        // Variantes existentes
        existingVariants.forEach(v => {
            formData.append(`existing_variants[${v.id}][label]`, v.label);
            formData.append(`existing_variants[${v.id}][type]`, v.type || 'tipo');
            formData.append(`existing_variants[${v.id}][stock]`, v.stock || 0);
            if (v.newImage) formData.append(`existing_variants[${v.id}][image]`, v.newImage);
        });
        // Variantes nuevas
        newVariants.forEach((v, i) => {
            if (!v.label.trim()) return;
            formData.append(`variants[${i}][label]`, v.label);
            formData.append(`variants[${i}][type]`, v.type || 'tipo');
            formData.append(`variants[${i}][stock]`, v.stock || 0);
            if (v.image) formData.append(`variants[${i}][image]`, v.image);
        });
        if (isEditing) formData.append('_method', 'PATCH');

        const url = isEditing ? route('productos.update', data.id) : route('productos.store');
        router.post(url, formData, {
            forceFormData: true, preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false); setShowModal(false);
                setNewVariants([]); setExistingVariants([]);
                setNewPrivatePhotos([]); setExistingPrivatePhotos([]);
                Swal.fire({ position: 'top-end', icon: 'success', title: isEditing ? 'Producto actualizado' : 'Producto creado', showConfirmButton: false, timer: 1500, toast: true });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire({ icon: 'error', title: 'Error al guardar', text: Object.values(errs).flat().join(' | ') });
            },
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setData('image', file);
        setPreviewImage(file ? URL.createObjectURL(file) : null);
    };

    const handlePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        setData('photos', files);
        setExtraPhotos(files.map(f => URL.createObjectURL(f)));
    };

    // ── Fichero de fotos privadas ──
    const handlePrivatePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        setNewPrivatePhotos(prev => [
            ...prev,
            ...files.map(f => ({
                file: f,
                name: f.name.replace(/\.[^.]+$/, ''),
                preview: URL.createObjectURL(f),
            }))
        ]);
        e.target.value = '';
    };

    const setPrivatePhotoName = (index, value) => {
        setNewPrivatePhotos(prev => prev.map((p, i) => i === index ? { ...p, name: value } : p));
    };

    const removeNewPrivatePhoto = (index) => {
        setNewPrivatePhotos(prev => prev.filter((_, i) => i !== index));
    };

    const openPrivatePhoto = (foto) => {
        if (foto.url) window.open(foto.url, '_blank', 'noopener');
    };

    const renamePrivatePhoto = (foto) => {
        Swal.fire({
            title: 'Renombrar foto', input: 'text', inputValue: foto.name,
            inputAttributes: { maxlength: 255 }, showCancelButton: true,
            confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', confirmButtonColor: '#db2777',
            inputValidator: (value) => (!value || !value.trim()) ? 'El nombre no puede estar vacío' : undefined,
        }).then(result => {
            if (!result.isConfirmed) return;
            const nuevoNombre = result.value.trim();
            router.patch(route('fichero-fotos.update', foto.id), { name: nuevoNombre }, {
                preserveScroll: true,
                onSuccess: () => setExistingPrivatePhotos(prev => prev.map(f => f.id === foto.id ? { ...f, name: nuevoNombre } : f)),
            });
        });
    };

    const deletePrivatePhoto = (foto) => {
        Swal.fire({
            title: '¿Eliminar esta foto del fichero?', text: `"${foto.name}" se borrará de forma permanente.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(result => {
            if (!result.isConfirmed) return;
            router.delete(route('fichero-fotos.destroy', foto.id), {
                preserveScroll: true,
                onSuccess: () => setExistingPrivatePhotos(prev => prev.filter(f => f.id !== foto.id)),
            });
        });
    };

    const deleteSecondaryImage = (id) => {
        Swal.fire({ title: '¿Eliminar esta foto?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' })
            .then(result => {
                if (result.isConfirmed) {
                    router.delete(route('product-images.destroy', id), {
                        preserveScroll: true,
                        onSuccess: () => setExistingPhotos(existingPhotos.filter(img => img.id !== id))
                    });
                }
            });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-stone-800 dark:text-stone-200">Catálogo de Productos</h2>}>
            <Head title="Productos" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Barra Superior */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="w-full sm:w-1/2 relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/></svg>
                                </div>
                                <TextInput type="text" className="pl-10 w-full" placeholder="Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <SecondaryButton onClick={() => router.visit(route('productos.reorder-page'))} className="w-full sm:w-auto justify-center flex items-center gap-1.5">
                                    <span>↕️ Ordenar Catálogo</span>
                                </SecondaryButton>
                                <PrimaryButton onClick={openCreate} className="w-full sm:w-auto justify-center">+ Nuevo Producto</PrimaryButton>
                            </div>
                        </div>

                        {/* Filtro visibilidad */}
                        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-stone-900 rounded-lg px-4 py-2.5 border border-stone-200 dark:border-stone-800 shadow-sm">
                            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Mostrar:</span>
                            {[['visible', 'Visibles'], ['hidden', 'Ocultos'], ['all', 'Todos']].map(([val, label]) => (
                                <button key={val} onClick={() => setFilterHidden(val)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${filterHidden === val ? 'bg-stone-700 dark:bg-stone-800 text-white border-stone-700 dark:border-stone-300 shadow-sm' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'}`}>
                                    {label}
                                </button>
                            ))}

                            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block"></div>

                            {/* Botón Ordenar por Poco Stock */}
                            <button
                                onClick={() => setSortByStock(!sortByStock)}
                                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                    sortByStock
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-200'
                                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-amber-400 hover:text-amber-600'
                                }`}
                                title="Ordenar productos mostrando primero los de menor stock"
                            >
                                <span>{sortByStock ? '✓ Ordenado por Menor Stock' : 'Ordenar por Poco Stock'}</span>
                            </button>

                            <span className="ml-auto text-xs text-stone-400 dark:text-stone-500 font-medium">{productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Grid de Productos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {productosFiltrados.map(prod => (
                            <div key={prod.id} className={`rounded-xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden border flex flex-col relative group bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 ${prod.is_hidden ? 'opacity-60' : ''}`}>

                                {prod.pending_variant_confirmation_count > 0 && (
                                    <div className="bg-stone-800 dark:bg-stone-700 text-white text-xs font-bold py-1.5 px-3 text-center animate-pulse flex items-center justify-center gap-1 shrink-0 z-10">
                                        <span>⏳</span>
                                        <span>{prod.pending_variant_confirmation_count} pendientes por confirmar variante</span>
                                    </div>
                                )}

                                {/* Badges */}
                                <div className={`absolute left-2 z-10 flex flex-col gap-1 ${prod.pending_variant_confirmation_count > 0 ? 'top-10' : 'top-2'}`}>
                                    {prod.item_type === 'servicio' && <span className="bg-marca-700 dark:bg-marca-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">Servicio</span>}
                                    {prod.is_hidden && <span className="bg-stone-600 dark:bg-stone-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">Oculto</span>}
                                    {prod.por_llegar && <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">✈️ Por llegar</span>}
                                    {prod.last_units && <span className="bg-marca-600 dark:bg-marca-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">Últimas unidades</span>}
                                    {!prod.price_usdt && <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">Consultar</span>}
                                </div>

                                {/* Imagen */}
                                <div className="h-48 w-full bg-stone-100 dark:bg-stone-800 relative cursor-pointer" onClick={() => openEdit(prod)}>
                                    <img src={prod.thumb_url || prod.image_url} alt={prod.name} loading="lazy" decoding="async" className="h-full w-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center pointer-events-none">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white dark:bg-stone-900 px-3 py-1 rounded-full text-xs font-bold text-stone-800 dark:text-stone-200 shadow">Click para Editar</span>
                                    </div>
                                </div>

                                {/* Botón Eliminar */}
                                <button onClick={() => handleDelete(prod.id)}
                                    className={`absolute p-1.5 bg-white dark:bg-stone-900 rounded-full shadow-md text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all z-10 opacity-0 group-hover:opacity-100 ${prod.pending_variant_confirmation_count > 0 ? 'top-10' : 'top-2'} right-2`}
                                    title="Eliminar producto">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>

                                {/* Botón Ocultar/Mostrar */}
                                <button onClick={() => handleToggleHidden(prod)}
                                    className={`absolute bottom-2 right-2 p-1.5 rounded-full shadow-md transition-all z-10 opacity-0 group-hover:opacity-100 ${prod.is_hidden ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                                    title={prod.is_hidden ? 'Hacer visible en tienda' : 'Ocultar de tienda'}>
                                    {prod.is_hidden
                                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                                    }
                                </button>

                                {/* Info */}
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="mb-1 text-center">
                                        {prod.price_usdt
                                            ? <span className="text-xl font-bold text-marca-700 dark:text-marca-400">Detal: $ {parseFloat(prod.price_usdt).toFixed(2)}</span>
                                            : <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900">Precio a consultar</span>}
                                    </div>
                                    <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200 line-clamp-2 mb-2 flex-1 text-center">{prod.name}</h3>
                                    {prod.categories?.length > 0 && (
                                        <div className="flex flex-wrap items-center justify-center gap-1 mb-2">
                                            {prod.categories.map(cat => (
                                                <span key={cat.id} className="text-[10px] bg-marca-50 dark:bg-marca-950/40 text-marca-700 dark:text-marca-400 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-800 uppercase font-bold tracking-wider">{cat.name}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="space-y-2 mt-2">
                                        {parseFloat(prod.cost_price) > 0 && (
                                            <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
                                                <span>Costo Unitario:</span>
                                                <span className="font-semibold">${parseFloat(prod.cost_price).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm pt-1 border-t border-stone-200 dark:border-stone-800">
                                            {prod.item_type === 'servicio' ? (
                                                <>
                                                    <span className="text-stone-600 dark:text-stone-400">Servicio:</span>
                                                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                                                        {[prod.service_duration, MODALIDADES_SERVICIO[prod.service_mode]].filter(Boolean).join(' · ') || 'Sin detalles'}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-stone-600 dark:text-stone-400">Stock Total:</span>
                                                    <span className={`font-bold ${prod.stock > 10 ? 'text-green-600 dark:text-green-400' : prod.stock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{prod.stock} uds.</span>
                                                </>
                                            )}
                                        </div>
                                        {prod.item_type !== 'servicio' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); abrirReposicion(prod); }}
                                                title="Entro mercancia: registra cuantas unidades y a que costo"
                                                className="pulsable mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-marca-200 bg-marca-50 px-3 py-1.5 text-xs font-bold text-marca-700 transition hover:bg-marca-100 dark:border-marca-900 dark:bg-marca-950/40 dark:text-marca-400 dark:hover:bg-marca-950"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                                Registrar reposición
                                            </button>
                                        )}
                                        {prod.variants && prod.variants.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-wrap gap-1.5 justify-center">
                                                {prod.variants.map(v => (
                                                    <span key={v.id} className="text-[10px] bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-800 flex items-center gap-1">
                                                        <span className="font-semibold">{v.label}:</span>
                                                        <span className={`font-bold ${v.stock > 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-500 dark:text-red-400'}`}>{v.stock} uds.</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Estado vacío */}
                    {productosFiltrados.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700">
                            <p className="text-stone-500 dark:text-stone-400 text-lg">
                                {productos.length === 0 ? 'No tienes productos registrados aún.' : 'No se encontraron productos con los filtros aplicados.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="4xl">
                <form key={modalKey} onSubmit={submit} className="flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="shrink-0 border-b border-stone-200 bg-stone-50 px-6 py-4 dark:border-stone-800 dark:bg-stone-950/70">
                        <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">{isEditing ? 'Editar producto' : 'Nuevo producto'}</h2>
                        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                            Solo el nombre y el stock son obligatorios. El resto lo puedes completar después.
                        </p>
                    </div>

                    {/* Cuerpo */}
                    <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">

                        <SeccionModal titulo={esServicio ? 'Datos del servicio' : 'Datos del producto'} />

                        {/* Producto o servicio: cambia qué campos tienen sentido */}
                        <div className={`space-y-5 ${TARJETA}`}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { valor: 'producto', titulo: 'Producto', texto: 'Algo que entregas y tiene existencias.' },
                                { valor: 'servicio', titulo: 'Servicio', texto: 'Algo que haces: no se agota ni se descuenta.' },
                            ].map(({ valor, titulo, texto }) => (
                                <button
                                    key={valor}
                                    type="button"
                                    onClick={() => setData('item_type', valor)}
                                    aria-pressed={data.item_type === valor}
                                    className={`rounded-xl border p-3 text-left transition-colors duration-150 ${
                                        data.item_type === valor
                                            ? 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
                                            : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800'
                                    }`}
                                >
                                    <span className="block text-sm font-bold">{titulo}</span>
                                    <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{texto}</span>
                                </button>
                            ))}
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value={esServicio ? 'Nombre del servicio' : 'Nombre del Producto'} />
                            <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={e => setData('name', e.target.value)} required />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {esServicio && (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="service_duration" value="Cuánto dura (opcional)" />
                                    <TextInput
                                        id="service_duration"
                                        type="text"
                                        maxLength={40}
                                        placeholder="45 min, 2 horas, 3 días…"
                                        className="mt-1 block w-full"
                                        value={data.service_duration}
                                        onChange={e => setData('service_duration', e.target.value)}
                                    />
                                    <InputError message={errors.service_duration} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="service_mode" value="Dónde se presta" />
                                    <select
                                        id="service_mode"
                                        value={data.service_mode}
                                        onChange={e => setData('service_mode', e.target.value)}
                                        className={`mt-1 text-sm ${CAMPO}`}
                                    >
                                        <option value="local">En nuestro local</option>
                                        <option value="domicilio">A domicilio</option>
                                        <option value="remoto">En línea</option>
                                        <option value="acordar">A convenir</option>
                                    </select>
                                    <InputError message={errors.service_mode} className="mt-2" />
                                </div>
                            </div>
                        )}
                        </div>

                        <SeccionModal
                            titulo="Precios y costo"
                            ayuda="Deja vacío el precio al detal si prefieres que digan Consultar."
                        />

                        {(() => {
                            const costNum = parseFloat(data.cost_price);
                            const hasCost = !isNaN(costNum) && costNum > 0;
                            const gainDetal = hasCost && data.price_usdt ? (parseFloat(data.price_usdt) - costNum).toFixed(2) : null;
                            const gainMayor = hasCost && data.price_mayor_usdt ? (parseFloat(data.price_mayor_usdt) - costNum).toFixed(2) : null;
                            const gainDistribuidor = hasCost && data.price_distribuidor_usdt ? (parseFloat(data.price_distribuidor_usdt) - costNum).toFixed(2) : null;
                            return (
                                <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 ${TARJETA}`}>
                                    <div>
                                        <InputLabel htmlFor="cost_price" value="Costo Unitario / Compra (USD - Opcional)" />
                                        <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                            <TextInput id="cost_price" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.cost_price} onChange={e => setData('cost_price', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="price" value="Precio Al Detal (dejar vacío = Consultar)" />
                                        <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                            <TextInput id="price" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.price_usdt} onChange={e => setData('price_usdt', e.target.value)} />
                                        </div>
                                        {!data.price_usdt && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold block mt-1 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">Sin precio → "Consultar" en tienda</span>}
                                        {gainDetal !== null && <span className="text-xs text-marca-700 dark:text-marca-400 font-bold block mt-1 bg-marca-50 dark:bg-marca-950/40 px-2 py-0.5 rounded border border-marca-200 dark:border-marca-900">Ganancia: ${gainDetal} ({costNum > 0 ? ((gainDetal / costNum) * 100).toFixed(0) : 0}%)</span>}
                                        <InputError message={errors.price_usdt} className="mt-2" />
                                    </div>
                                    {esServicio ? (
                                        <div className="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                                            Un servicio no lleva existencias: no se agota ni se descuenta al facturar.
                                        </div>
                                    ) : (
                                        <div>
                                            <InputLabel htmlFor="stock" value={isEditing ? 'Stock Disponible (corregir conteo)' : 'Stock Disponible'} />
                                            <TextInput id="stock" type="number" step="1" className="mt-1 block w-full" value={data.stock} onChange={e => setData('stock', e.target.value)} required />
                                            <InputError message={errors.stock} className="mt-2" />
                                        </div>
                                    )}
                                    <div>
                                        <InputLabel htmlFor="price_mayor" value="Precio Mayor (Opcional)" />
                                        <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                            <TextInput id="price_mayor" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.price_mayor_usdt} onChange={e => setData('price_mayor_usdt', e.target.value)} />
                                        </div>
                                        {gainMayor !== null && <span className="text-xs text-marca-700 dark:text-marca-400 font-bold block mt-1 bg-marca-50 dark:bg-marca-950/40 px-2 py-0.5 rounded border border-marca-200 dark:border-marca-900">Ganancia: ${gainMayor} ({costNum > 0 ? ((gainMayor / costNum) * 100).toFixed(0) : 0}%)</span>}
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="price_distribuidor" value={`Precio ${nombreDistribuidor} (Opcional)`} />
                                        <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                            <TextInput id="price_distribuidor" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.price_distribuidor_usdt} onChange={e => setData('price_distribuidor_usdt', e.target.value)} />
                                        </div>
                                        {gainDistribuidor !== null && <span className="text-xs text-marca-700 dark:text-marca-400 font-bold block mt-1 bg-marca-50 dark:bg-marca-950/40 px-2 py-0.5 rounded border border-marca-200 dark:border-marca-900">Ganancia: ${gainDistribuidor} ({costNum > 0 ? ((gainDistribuidor / costNum) * 100).toFixed(0) : 0}%)</span>}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Reponer escribiendo el stock a mano sale mal cuando la
                            mercancia cambio de precio: el libro de compras la valora
                            al costo de hoy. Por eso se empuja la reposicion. */}
                        {isEditing && !esServicio && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">¿Entró mercancía nueva?</p>
                                    <p className="mt-0.5 text-xs leading-snug text-amber-800 dark:text-amber-300">
                                        Cambiar el stock aquí arriba es para <strong>arreglar un error de conteo</strong>: lo que agregues se valora
                                        al costo que el producto tiene hoy. Si compraste más, regístralo como reposición con el costo que
                                        pagaste y tus ganancias quedan bien separadas entre lo viejo y lo nuevo.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => prodEditado && abrirReposicion(prodEditado)}
                                    className="pulsable shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-amber-700"
                                >
                                    Registrar reposición
                                </button>
                            </div>
                        )}

                        <SeccionModal
                            titulo="Precio por cantidad"
                            ayuda="Un precio distinto al llevar varias unidades."
                        />

                        <div className="grid grid-cols-1 gap-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40 sm:p-5 md:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="conditional_price" value="Precio Condicionado Promocional (Opcional)" />
                                <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                    <TextInput id="conditional_price" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.conditional_price} onChange={e => setData('conditional_price', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <InputLabel htmlFor="conditional_min_quantity" value="Unds. Mínimas p/ Precio Condicionado" />
                                <TextInput id="conditional_min_quantity" type="number" step="1" className="mt-1 block w-full" value={data.conditional_min_quantity} onChange={e => setData('conditional_min_quantity', e.target.value)} />
                            </div>
                        </div>

                        <SeccionModal titulo="Notas y categorías" />

                        <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${TARJETA}`}>
                            <div>
                                <InputLabel htmlFor="notes" value="Notas (Ej: Quedan disponibles N unidades de cada color)" />
                                <textarea id="notes" className={`mt-1 ${CAMPO}`} rows="3"
                                    value={data.notes} onChange={e => setData('notes', e.target.value)}
                                    placeholder="Tallas, colores o cualquier aclaratoria para ti" />
                            </div>
                            <div className="flex flex-col h-full">
                                <InputLabel value="Categorías" />
                                <div className="border border-stone-300 dark:border-stone-700 rounded-md overflow-hidden mt-1 shadow-sm flex-1 flex flex-col">
                                    <div className="bg-stone-50 dark:bg-stone-900 p-2 border-b border-stone-200 dark:border-stone-800">
                                        <input type="text" placeholder="Buscar categoría..."
                                            className={`py-1.5 text-sm ${CAMPO}`}
                                            value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                                    </div>
                                    <div className="h-32 overflow-y-auto p-2 bg-white dark:bg-stone-900 flex flex-col gap-2">
                                        {categories?.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
                                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-marca-50 dark:hover:bg-marca-950/40 rounded p-1 transition-colors">
                                                <input type="checkbox" className="rounded border-stone-300 bg-white text-marca-700 shadow-sm focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-marca-400 dark:focus:ring-marca-400"
                                                    checked={data.categories.includes(cat.id.toString())}
                                                    onChange={e => {
                                                        const idStr = cat.id.toString();
                                                        setData('categories', e.target.checked
                                                            ? [...data.categories, idStr]
                                                            : data.categories.filter(id => id !== idStr));
                                                    }} />
                                                <span className="text-sm text-stone-700 dark:text-stone-300">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <SeccionModal titulo="Descripción para el catálogo" />

                        <div className={TARJETA}>
                            <InputLabel htmlFor="description" value="Descripción del Producto (visible en el catálogo)" />
                            <textarea id="description" className={`mt-1 ${CAMPO}`} rows="4"
                                value={data.description} onChange={e => setData('description', e.target.value)}
                                placeholder="Describe el producto: qué incluye, para qué sirve, medidas o presentación..." />
                        </div>

                        {/* ── VARIANTES ──────────────────────────────────────── */}
                        <div className={`${TARJETA} ${esServicio ? 'hidden' : ''}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <InputLabel value="Variantes del Producto" className="!mb-0" />
                                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Agrega colores, tallas, modelos o sabores, cada uno con su stock e imagen.</p>
                                </div>
                                <button type="button" onClick={addVariant}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-marca-50 dark:bg-marca-950/40 border border-stone-200 dark:border-stone-800 text-marca-700 dark:text-marca-400 text-xs font-bold rounded-full hover:bg-marca-100 dark:hover:bg-marca-950/60 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                    Agregar variante
                                </button>
                            </div>

                            {/* Variantes existentes (edición) */}
                            {existingVariants.length > 0 && (
                                <div className="mb-4 space-y-3">
                                    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Variantes Guardadas</p>
                                    {existingVariants.map(v => (
                                        <div key={v.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl items-center">
                                            <div className="flex items-center gap-2">
                                                {v.preview || v.image_url
                                                    ? <img src={v.preview || v.image_url} className="w-10 h-10 object-contain rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 flex-shrink-0" alt={v.label} />
                                                    : <div className="w-10 h-10 rounded-lg border border-stone-200 bg-marca-50 dark:border-stone-800 dark:bg-marca-950/40 flex items-center justify-center text-marca-400 dark:text-marca-500 text-xs flex-shrink-0"></div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-[120px]">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={v.label}
                                                    onChange={e => updateExistingVariant(v.id, 'label', e.target.value)}
                                                    className={`mt-1 text-sm ${CAMPO}`}
                                                />
                                            </div>
                                            <div className="w-full sm:w-36">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Tipo</label>
                                                <select
                                                    value={v.type}
                                                    onChange={e => updateExistingVariant(v.id, 'type', e.target.value)}
                                                    className={`mt-1 text-sm ${CAMPO}`}>
                                                    {VARIANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-full sm:w-28">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Stock</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={v.stock}
                                                    onChange={e => updateExistingVariant(v.id, 'stock', e.target.value)}
                                                    className={`mt-1 text-sm font-bold !text-marca-700 dark:!text-marca-400 ${CAMPO}`}
                                                />
                                            </div>
                                            <div className="w-full sm:w-36">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Cambiar Foto</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0] || null;
                                                        setExistingVariants(prev => prev.map(item => item.id === v.id ? { ...item, newImage: file, preview: file ? URL.createObjectURL(file) : null } : item));
                                                    }}
                                                    className="mt-1 block text-[11px] text-stone-500 dark:text-stone-400 file:mr-1 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-marca-100 dark:file:bg-marca-950 file:text-marca-800 dark:file:text-marca-300"
                                                />
                                            </div>
                                            <button type="button" onClick={() => deleteExistingVariant(v.id)}
                                                className="mt-4 sm:mt-5 text-stone-300 dark:text-stone-600 hover:text-red-500 transition-colors flex-shrink-0"
                                                title="Eliminar variante">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Variantes nuevas a agregar */}
                            {newVariants.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-marca-600 dark:text-marca-400 uppercase tracking-wider">Nuevas Variantes</p>
                                    {newVariants.map((v, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-marca-50/60 dark:bg-marca-950/60 border border-stone-200 dark:border-stone-800 rounded-xl items-center">
                                            <div className="flex-1 min-w-[120px]">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Nombre</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Rojo, Vainilla..."
                                                    value={v.label}
                                                    onChange={e => updateVariant(idx, 'label', e.target.value)}
                                                    className={`mt-1 text-sm ${CAMPO}`}
                                                />
                                            </div>
                                            <div className="w-full sm:w-36">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Tipo</label>
                                                <select
                                                    value={v.type}
                                                    onChange={e => updateVariant(idx, 'type', e.target.value)}
                                                    className={`mt-1 text-sm ${CAMPO}`}>
                                                    {VARIANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-full sm:w-28">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Stock</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={v.stock}
                                                    onChange={e => updateVariant(idx, 'stock', e.target.value)}
                                                    className={`mt-1 text-sm font-bold !text-marca-700 dark:!text-marca-400 ${CAMPO}`}
                                                />
                                            </div>
                                            <div className="w-full sm:w-36">
                                                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Foto (Opcional)</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {v.preview && <img src={v.preview} className="h-8 w-8 object-contain border border-stone-200 rounded-lg bg-white dark:border-stone-800 dark:bg-stone-900 flex-shrink-0" alt="" />}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={e => updateVariantImage(idx, e.target.files[0] || null)}
                                                        className="block text-[11px] text-stone-500 dark:text-stone-400 file:mr-1 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-marca-100 dark:file:bg-marca-950 file:text-marca-800 dark:file:text-marca-300 hover:file:bg-marca-200 dark:hover:file:bg-marca-900"
                                                    />
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeNewVariant(idx)}
                                                className="mt-4 sm:mt-5 text-stone-300 dark:text-stone-600 hover:text-red-500 transition-colors flex-shrink-0"
                                                title="Quitar variante">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newVariants.length === 0 && existingVariants.length === 0 && (
                                <p className="text-xs text-stone-400 dark:text-stone-500 italic">Aún no hay variantes para este producto.</p>
                            )}
                        </div>

                        {/* Imágenes */}
                        <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${TARJETA}`}>
                            <div>
                                <InputLabel htmlFor="image" value="Foto Principal (Opcional)" />
                                {previewImage && <div className="mt-2 mb-4"><img src={previewImage} alt="Preview" className="h-24 w-24 object-contain border border-stone-200 rounded bg-stone-50 dark:border-stone-800 dark:bg-stone-900 shadow-sm" /></div>}
                                <input id="image" type="file" className="block w-full text-sm text-stone-500 dark:text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-marca-50 dark:file:bg-marca-950 file:text-marca-800 dark:file:text-marca-300 hover:file:bg-marca-200 dark:hover:file:bg-marca-900 mt-2"
                                    onChange={handleImageChange} accept="image/*" />
                                <InputError message={errors.image} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="photos" value="Fotos de Galería (Múltiples)" />
                                <input id="photos" type="file" multiple className="mt-2 block w-full text-sm text-stone-500 dark:text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-marca-50 dark:file:bg-marca-950 file:text-marca-800 dark:file:text-marca-300 hover:file:bg-marca-200 dark:hover:file:bg-marca-900"
                                    onChange={handlePhotosChange} accept="image/*" />
                                {extraPhotos.length > 0 && (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        {extraPhotos.map((src, idx) => <img key={idx} src={src} alt="" className="h-16 w-16 object-contain border border-stone-200 rounded bg-stone-50 dark:border-stone-800 dark:bg-stone-900 shadow-sm" />)}
                                    </div>
                                )}
                                {isEditing && existingPhotos.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-2">Galería Existente</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {existingPhotos.map(photo => (
                                                <div key={photo.id} className="relative group">
                                                    <img src={photo.image_url} className="h-16 w-16 object-contain border border-stone-200 rounded bg-stone-50 dark:border-stone-800 dark:bg-stone-900 shadow-sm" alt="" />
                                                    <button type="button" onClick={() => deleteSecondaryImage(photo.id)}
                                                        className="absolute inset-0 bg-red-500 bg-opacity-80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold rounded">X</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fichero de Fotos (privado) */}
                        <div className={TARJETA}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                                        Fichero de fotos
                                        <span className="text-[10px] font-black uppercase tracking-wide bg-stone-800 dark:bg-stone-800 text-white rounded-full px-2 py-0.5">Privado</span>
                                    </h3>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                        Fotos de este producto visibles solo desde aquí. No aparecen en la tienda ni en el catálogo público.
                                    </p>
                                </div>
                                <label className="pulsable shrink-0 cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 transition-colors">
                                    + Agregar fotos al fichero
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handlePrivatePhotosChange} />
                                </label>
                            </div>

                            {/* Fotos ya guardadas en el fichero */}
                            {existingPrivatePhotos.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                                    {existingPrivatePhotos.map(foto => (
                                        <div key={foto.id} className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden bg-stone-50 dark:bg-stone-900">
                                            <button type="button" onClick={() => openPrivatePhoto(foto)} title="Abrir en una pestaña nueva"
                                                className="block w-full h-24 relative group cursor-pointer">
                                                <img src={foto.url} alt={foto.name} loading="lazy" className="h-full w-full object-cover" />
                                                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px] font-bold">Abrir ↗</span>
                                                </span>
                                            </button>
                                            <div className="p-2 bg-white dark:bg-stone-900">
                                                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 break-words leading-tight" title={foto.name}>{foto.name}</p>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <button type="button" onClick={() => renamePrivatePhoto(foto)}
                                                        className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-marca-700 dark:hover:text-marca-400 cursor-pointer">Renombrar</button>
                                                    <span className="text-stone-200 dark:text-stone-700">|</span>
                                                    <button type="button" onClick={() => deletePrivatePhoto(foto)}
                                                        className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-red-600 cursor-pointer">Eliminar</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Fotos nuevas pendientes de guardar */}
                            {newPrivatePhotos.length > 0 && (
                                <div className="space-y-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                        Se guardarán al {isEditing ? 'guardar los cambios' : 'crear el producto'}
                                    </p>
                                    {newPrivatePhotos.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-stone-900 rounded-lg border border-amber-200 dark:border-amber-900 p-2">
                                            <img src={p.preview} alt="" className="h-12 w-12 object-cover rounded border border-stone-200 dark:border-stone-800 shrink-0" />
                                            <TextInput type="text" className="flex-1 text-sm" maxLength={255} placeholder="Nombre de la foto"
                                                value={p.name} onChange={e => setPrivatePhotoName(idx, e.target.value)} />
                                            <button type="button" onClick={() => removeNewPrivatePhoto(idx)}
                                                className="text-xs font-bold text-stone-400 dark:text-stone-500 hover:text-red-600 px-2 cursor-pointer" title="Quitar">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {existingPrivatePhotos.length === 0 && newPrivatePhotos.length === 0 && (
                                <p className="text-xs text-stone-400 dark:text-stone-500 italic">Este producto aún no tiene fotos en el fichero.</p>
                            )}
                        </div>
                        {/* ── VISIBILIDAD ─────────────────────────────────── */}
                        <div>
                            <SeccionModal
                                titulo="Visibilidad en el catálogo"
                                ayuda="Cómo se comporta este producto para quien visita tu catálogo."
                            />

                            <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${TARJETA}`}>
                                {!esServicio && (
                                    <Interruptor
                                        etiqueta="Mostrar variantes"
                                        ayuda="Al desactivarlo, las variantes no aparecen en el catálogo."
                                        valor={data.show_variants_in_store}
                                        onCambiar={(v) => setData('show_variants_in_store', v)}
                                    />
                                )}
                                {!esServicio && (
                                    <Interruptor
                                        etiqueta="Por llegar"
                                        ayuda="Se anuncia como próximo a llegar, aunque no tengas stock."
                                        valor={data.por_llegar}
                                        onCambiar={(v) => setData('por_llegar', v)}
                                    />
                                )}
                                <Interruptor
                                    etiqueta="Ocultar del catálogo"
                                    ayuda={esServicio ? 'Sigue en tu lista, pero nadie lo ve.' : 'Sigue en tu inventario, pero nadie lo ve.'}
                                    valor={data.is_hidden}
                                    onCambiar={(v) => setData('is_hidden', v)}
                                />
                                {!esServicio && (
                                    <Interruptor
                                        etiqueta="Últimas unidades"
                                        ayuda="Muestra un aviso para animar la compra."
                                        valor={data.last_units}
                                        onCambiar={(v) => setData('last_units', v)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex shrink-0 justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4 dark:border-stone-800 dark:bg-stone-950/70">
                        <SecondaryButton onClick={() => setShowModal(false)} type="button">Cancelar</SecondaryButton>
                        <PrimaryButton disabled={isSubmitting} type="submit">
                            {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Producto')}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Reposicion: un formulario aparte, porque es otra operacion */}
            <Modal show={!!reponiendo} onClose={() => setReponiendo(null)} maxWidth="lg">
                {reponiendo && (
                    <FormularioDeReposicion
                        key={reponiendo.id}
                        producto={reponiendo}
                        onCerrar={() => setReponiendo(null)}
                    />
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}

/** Que hacer con el costo del producto cuando entra mercancia a otro precio. */
const POLITICAS_DE_COSTO = [
    {
        valor: 'promedio',
        etiqueta: 'Promediar con lo que me quedaba',
        ayuda: 'Lo normal: tu costo queda entre el viejo y el nuevo, pesado por las unidades de cada uno.',
    },
    {
        valor: 'nuevo',
        etiqueta: 'Usar el costo nuevo',
        ayuda: 'Para cuando lo viejo ya se agotó o el precio anterior ya no te sirve de referencia.',
    },
    {
        valor: 'mantener',
        etiqueta: 'Dejar mi costo como está',
        ayuda: 'La compra entra al libro, pero el costo con el que calculas precios no se mueve.',
    },
];

/**
 * Entro mercancia: cuantas unidades, a que costo y que pasa con el costo
 * del producto.
 *
 * Separar esto de «escribir un stock mas grande» es lo que permite saber
 * cuanto costo realmente cada lote. Antes todo el historial se valoraba al
 * costo de hoy, asi que subir el costo reescribia lo que pagaste el mes
 * pasado.
 */
function FormularioDeReposicion({ producto, onCerrar }) {
    const variantes = producto.variants || [];
    const costoActual = parseFloat(producto.cost_price) || 0;
    const stockActual = parseInt(producto.stock, 10) || 0;

    const { data, setData, post, processing, errors } = useForm({
        cantidad: '',
        costo_unitario: costoActual > 0 ? costoActual.toFixed(2) : '',
        variant_id: variantes.length === 1 ? String(variantes[0].id) : '',
        politica: 'promedio',
        fecha: hoyLocal(),
        nota: '',
    });

    const cantidad = parseInt(data.cantidad, 10) || 0;
    const costo = parseFloat(data.costo_unitario) || 0;
    const invertido = cantidad * costo;
    const stockDespues = stockActual + cantidad;

    // El mismo promedio ponderado que calcula App\Services\Ganancias\Reposicion
    const costoDespues = (() => {
        if (data.politica === 'mantener') return costoActual;
        if (data.politica === 'nuevo' || stockActual <= 0 || costoActual <= 0) return costo;
        return ((stockActual * costoActual) + (cantidad * costo)) / (stockActual + cantidad);
    })();

    const enviar = (e) => {
        e.preventDefault();
        post(route('productos.reponer', producto.id), {
            preserveScroll: true,
            onSuccess: () => {
                onCerrar();
                Swal.fire({
                    position: 'top-end', icon: 'success', toast: true,
                    title: 'Reposición registrada', showConfirmButton: false, timer: 2200,
                });
            },
        });
    };

    return (
        <form onSubmit={enviar} className="flex max-h-[90vh] flex-col">
            <div className="shrink-0 border-b border-stone-200 bg-stone-50 px-6 py-4 dark:border-stone-800 dark:bg-stone-950/70">
                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">Registrar reposición</h2>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    {producto.name} · tienes {stockActual} uds.
                    {costoActual > 0 ? ` a $${costoActual.toFixed(2)} c/u` : ' sin costo registrado'}
                </p>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="rep_cantidad" value="Unidades que entraron" />
                        <TextInput
                            id="rep_cantidad" type="number" step="1" min="1" autoFocus
                            className="mt-1 block w-full"
                            value={data.cantidad}
                            onChange={(e) => setData('cantidad', e.target.value)}
                        />
                        <InputError message={errors.cantidad} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="rep_costo" value="Costo por unidad (lo que pagaste)" />
                        <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-stone-500 dark:text-stone-400">$</span>
                            <TextInput
                                id="rep_costo" type="number" step="0.01" min="0.01"
                                className="mt-1 block w-full pl-7"
                                value={data.costo_unitario}
                                onChange={(e) => setData('costo_unitario', e.target.value)}
                            />
                        </div>
                        <InputError message={errors.costo_unitario} className="mt-2" />
                    </div>
                </div>

                {variantes.length > 0 && (
                    <div>
                        <InputLabel htmlFor="rep_variante" value="¿A cuál variante entraron?" />
                        <select
                            id="rep_variante"
                            value={data.variant_id}
                            onChange={(e) => setData('variant_id', e.target.value)}
                            className="mt-1 block w-full rounded-md border-stone-300 bg-white text-stone-900 shadow-sm focus:border-marca-500 focus:ring-marca-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        >
                            <option value="">Selecciona una variante</option>
                            {variantes.map((v) => (
                                <option key={v.id} value={v.id}>{v.label} ({v.stock} uds.)</option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                            El stock del producto es la suma de sus variantes, por eso hay que decir a cuál van.
                        </p>
                        <InputError message={errors.variant_id} className="mt-2" />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="rep_fecha" value="Fecha de la compra" />
                        <TextInput
                            id="rep_fecha" type="date" max={hoyLocal()}
                            className="mt-1 block w-full"
                            value={data.fecha}
                            onChange={(e) => setData('fecha', e.target.value)}
                        />
                        <InputError message={errors.fecha} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="rep_nota" value="Nota (opcional)" />
                        <TextInput
                            id="rep_nota" type="text" maxLength={160}
                            placeholder="Proveedor, factura, flete..."
                            className="mt-1 block w-full"
                            value={data.nota}
                            onChange={(e) => setData('nota', e.target.value)}
                        />
                        <InputError message={errors.nota} className="mt-2" />
                    </div>
                </div>

                <div>
                    <InputLabel value="¿Y tu costo unitario?" />
                    <div className="mt-2 space-y-2">
                        {POLITICAS_DE_COSTO.map((opcion) => (
                            <label
                                key={opcion.valor}
                                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                                    data.politica === opcion.valor
                                        ? 'border-marca-500 bg-marca-50 dark:border-marca-600 dark:bg-marca-950/40'
                                        : 'border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900'
                                }`}
                            >
                                <input
                                    type="radio" name="politica" value={opcion.valor}
                                    checked={data.politica === opcion.valor}
                                    onChange={(e) => setData('politica', e.target.value)}
                                    className="mt-0.5 border-stone-300 text-marca-600 focus:ring-marca-500 dark:border-stone-700"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-stone-800 dark:text-stone-200">{opcion.etiqueta}</span>
                                    <span className="block text-xs leading-snug text-stone-500 dark:text-stone-400">{opcion.ayuda}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.politica} className="mt-2" />
                </div>

                {/* Que va a pasar, antes de que pase */}
                <div className="rounded-xl border border-marca-200 bg-marca-50 p-4 dark:border-marca-900 dark:bg-marca-950/40">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <Resumen titulo="Inviertes" valor={`$${invertido.toFixed(2)}`} />
                        <Resumen titulo="Stock" valor={`${stockActual} → ${stockDespues}`} />
                        <Resumen
                            titulo="Costo unitario"
                            valor={`$${costoActual.toFixed(2)} → $${(costoDespues || 0).toFixed(2)}`}
                        />
                    </div>
                    {data.politica === 'promedio' && costoActual > 0 && stockActual > 0 && cantidad > 0 && costo > 0 && (
                        <p className="mt-3 border-t border-marca-200 pt-2 text-center text-xs text-marca-800 dark:border-marca-900 dark:text-marca-300">
                            Promedio entre las {stockActual} que te quedaban a ${costoActual.toFixed(2)} y
                            las {cantidad} nuevas a ${costo.toFixed(2)}.
                        </p>
                    )}
                </div>

                <p className="text-xs leading-snug text-stone-500 dark:text-stone-400">
                    Las facturas ya emitidas conservan el costo que tenían: esta reposición no cambia ganancias pasadas.
                </p>
            </div>

            <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-6 py-4 dark:border-stone-800 dark:bg-stone-950/70">
                <div className="flex justify-end gap-3">
                    <SecondaryButton type="button" onClick={onCerrar}>Cancelar</SecondaryButton>
                    <PrimaryButton type="submit" disabled={processing || cantidad < 1 || costo <= 0}>
                        {processing ? 'Registrando...' : 'Registrar reposición'}
                    </PrimaryButton>
                </div>
            </div>
        </form>
    );
}

function Resumen({ titulo, valor }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-wide text-marca-700 dark:text-marca-400">{titulo}</p>
            <p className="font-display text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100">{valor}</p>
        </div>
    );
}

/**
 * Encabezado de una sección del formulario.
 *
 * El margen inferior negativo lo acerca a su tarjeta: con el espaciado
 * parejo del cuerpo, el título quedaba a la misma distancia del grupo que
 * encabeza y del anterior, y no se entendía a cuál pertenecía.
 */
function SeccionModal({ titulo, ayuda }) {
    return (
        <div className="-mb-2 flex items-start gap-2.5">
            <span className="mt-1 block h-4 w-1 shrink-0 rounded-full bg-marca-600 dark:bg-marca-500" />
            <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</h3>
                {ayuda && <p className="mt-0.5 text-xs leading-snug text-stone-500 dark:text-stone-400">{ayuda}</p>}
            </div>
        </div>
    );
}
