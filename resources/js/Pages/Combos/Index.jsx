import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Swal from 'sweetalert2';
import { useNombreDistribuidor } from '@/utils/nivelesDePrecio';

export default function CombosIndex({ auth, combos, products }) {
    const nombreDistribuidor = useNombreDistribuidor();
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [extraPhotos, setExtraPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [modalKey, setModalKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [filterHidden, setFilterHidden] = useState('visible');
    const [productSearch, setProductSearch] = useState('');

    const { data, setData, reset, clearErrors, errors } = useForm({
        id: '',
        name: '',
        price_usdt: '',
        price_type: 'detal',
        cost_price: '',
        stock: 0,
        conditional_price: '',
        conditional_min_quantity: '',
        description: '',
        notes: '',
        image: null,
        photos: [],
        products_data: [],
        is_hidden: false,
    });

    const combosFiltrados = combos.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(busqueda.toLowerCase());
        const hiddenMatch = filterHidden === 'all' || (filterHidden === 'hidden' ? c.is_hidden : !c.is_hidden);
        return nameMatch && hiddenMatch;
    });

    const availableProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    const freshData = () => ({
        id: '', name: '', price_usdt: '', price_type: 'detal',
        cost_price: '', stock: 0, conditional_price: '', conditional_min_quantity: '',
        description: '', notes: '', image: null, photos: [], products_data: [], is_hidden: false,
    });

    const openCreate = () => {
        setIsEditing(false);
        setPreviewImage(null);
        setExtraPhotos([]);
        setExistingPhotos([]);
        setProductSearch('');
        setModalKey(prev => prev + 1);
        setData(freshData());
        clearErrors();
        setShowModal(true);
    };

    const openEdit = (combo) => {
        setIsEditing(true);
        setPreviewImage(combo.image_url);
        setExtraPhotos([]);
        setExistingPhotos(combo.images || []);
        setProductSearch('');
        setModalKey(prev => prev + 1);
        setData({
            id: combo.id,
            name: combo.name,
            price_usdt: combo.price_usdt || '',
            price_type: combo.price_type || 'detal',
            cost_price: combo.cost_price || '',
            stock: combo.stock || 0,
            conditional_price: combo.conditional_price || '',
            conditional_min_quantity: combo.conditional_min_quantity || '',
            description: combo.description || '',
            notes: combo.notes || '',
            image: null,
            photos: [],
            products_data: combo.products ? combo.products.map(p => ({
                product_id: p.id.toString(),
                price_type: p.pivot?.price_type || 'detal'
            })) : [],
            is_hidden: combo.is_hidden || false,
        });
        clearErrors();
        setShowModal(true);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: '¿Eliminar este combo?',
            text: 'No podrás revertir esta acción',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#db2777',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(result => {
            if (result.isConfirmed) {
                router.delete(route('combos.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ title: '¡Eliminado!', icon: 'success', timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    const handleToggleHidden = (combo) => {
        router.patch(route('combos.toggle-hidden', combo.id), {}, {
            preserveScroll: true,
            onSuccess: () => Swal.fire({
                position: 'top-end', icon: 'success',
                title: combo.is_hidden ? 'Combo visible en tienda' : 'Combo ocultado de tienda',
                showConfirmButton: false, timer: 1500, toast: true,
            }),
        });
    };

    const toggleProduct = (productId) => {
        const idStr = productId.toString();
        const exists = data.products_data.some(p => p.product_id.toString() === idStr);
        if (exists) {
            setData('products_data', data.products_data.filter(p => p.product_id.toString() !== idStr));
        } else {
            setData('products_data', [...data.products_data, { product_id: idStr, price_type: 'detal' }]);
        }
    };

    const updateProductPriceType = (productId, priceType) => {
        setData('products_data', data.products_data.map(p => {
            if (p.product_id.toString() === productId.toString()) {
                return { ...p, price_type: priceType };
            }
            return p;
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('price_usdt', data.price_usdt || '');
        formData.append('price_type', data.price_type || 'detal');
        formData.append('cost_price', data.cost_price || '');
        formData.append('stock', data.stock);
        formData.append('conditional_price', data.conditional_price || '');
        formData.append('conditional_min_quantity', data.conditional_min_quantity || '');
        formData.append('description', data.description || '');
        formData.append('notes', data.notes || '');
        formData.append('is_hidden', data.is_hidden ? '1' : '0');
        
        data.products_data.forEach((p, idx) => {
            formData.append(`products[${idx}][product_id]`, p.product_id);
            formData.append(`products[${idx}][price_type]`, p.price_type);
        });

        if (data.image) formData.append('image', data.image);
        if (data.photos?.length) data.photos.forEach((p, i) => formData.append(`photos[${i}]`, p));
        if (isEditing) formData.append('_method', 'PATCH');

        const url = isEditing ? route('combos.update', data.id) : route('combos.store');
        router.post(url, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                setShowModal(false);
                Swal.fire({ position: 'top-end', icon: 'success', title: isEditing ? 'Combo actualizado' : 'Combo creado', showConfirmButton: false, timer: 1500, toast: true });
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

    const round2 = n => Math.round(n * 100) / 100;

    // Efecto para autocalcular el precio del combo sumando los productos según su tipo de precio individual
    useEffect(() => {
        let sum = 0;
        (data.products_data || []).forEach(item => {
            const prod = products.find(p => p.id.toString() === item.product_id.toString());
            if (prod) {
                const price = parseFloat(
                    item.price_type === 'mayor'        ? (prod.price_mayor_usdt || prod.price_usdt) :
                    item.price_type === 'distribuidor' ? (prod.price_distribuidor_usdt || prod.price_usdt) :
                                                         prod.price_usdt
                ) || 0;
                sum += price;
            }
        });
        const calculatedPriceStr = sum > 0 ? round2(sum).toFixed(2) : '';
        if (data.price_usdt !== calculatedPriceStr) {
            setData('price_usdt', calculatedPriceStr);
        }
    }, [data.products_data, products]);

    const deleteGalleryImage = (id) => {
        Swal.fire({ title: '¿Eliminar foto?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'No' })
            .then(r => {
                if (r.isConfirmed) {
                    router.delete(route('combo-images.destroy', id), {
                        preserveScroll: true,
                        onSuccess: () => setExistingPhotos(existingPhotos.filter(img => img.id !== id)),
                    });
                }
            });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-stone-800 dark:text-stone-200">Combos</h2>}>
            <Head title="Combos" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Barra Superior */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="w-full sm:w-1/2 relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/></svg>
                                </div>
                                <TextInput type="text" className="pl-10 w-full" placeholder="Buscar combo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                            </div>
                            <PrimaryButton onClick={openCreate} className="w-full sm:w-auto justify-center">
                                + Nuevo Combo
                            </PrimaryButton>
                        </div>

                        {/* Filtros visibilidad */}
                        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-stone-900 rounded-lg px-4 py-2.5 border border-stone-200 dark:border-stone-800 shadow-sm">
                            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Mostrar:</span>
                            {[['visible', 'Visibles'], ['hidden', 'Ocultos'], ['all', 'Todos']].map(([val, label]) => (
                                <button key={val} onClick={() => setFilterHidden(val)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${filterHidden === val ? 'bg-stone-700 dark:bg-stone-800 text-white border-stone-700 dark:border-stone-300 shadow-sm' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'}`}>
                                    {label}
                                </button>
                            ))}
                            <span className="ml-auto text-xs text-stone-400 dark:text-stone-500 font-medium">{combosFiltrados.length} combo{combosFiltrados.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Grid de Combos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {combosFiltrados.map(combo => (
                            <div key={combo.id}
                                className={`rounded-xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden border flex flex-col relative group bg-gradient-to-br from-stone-100 dark:from-stone-800 to-white border-stone-200 dark:border-stone-800 ${combo.is_hidden ? 'opacity-60' : ''}`}>

                                {/* Badges */}
                                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                    <span className="bg-stone-800 dark:bg-stone-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">Combo</span>
                                    {combo.is_hidden && <span className="bg-stone-600 dark:bg-stone-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">Oculto</span>}
                                    {!combo.price_usdt && <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">Consultar</span>}
                                </div>

                                {/* Imagen */}
                                <div className="h-48 w-full bg-stone-100 dark:bg-stone-800 relative cursor-pointer" onClick={() => openEdit(combo)}>
                                    {combo.image_url ? (
                                        <img src={combo.image_url} alt={combo.name} className="h-full w-full object-contain p-2" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-6xl"></div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center pointer-events-none">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white dark:bg-stone-900 px-3 py-1 rounded-full text-xs font-bold text-stone-800 dark:text-stone-200 shadow">Click para Editar</span>
                                    </div>
                                </div>

                                {/* Botón Eliminar */}
                                <button onClick={() => handleDelete(combo.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-stone-900 rounded-full shadow-md text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all z-10 opacity-0 group-hover:opacity-100"
                                    title="Eliminar combo">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>

                                {/* Botón Ocultar/Mostrar */}
                                <button onClick={() => handleToggleHidden(combo)}
                                    className={`absolute bottom-2 right-2 p-1.5 rounded-full shadow-md transition-all z-10 opacity-0 group-hover:opacity-100 ${combo.is_hidden ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                                    title={combo.is_hidden ? 'Hacer visible en tienda' : 'Ocultar de tienda'}>
                                    {combo.is_hidden
                                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                                    }
                                </button>

                                {/* Info */}
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="mb-1 text-center">
                                        {combo.price_usdt
                                            ? <span className="text-xl font-bold text-stone-700 dark:text-stone-300">$ {parseFloat(combo.price_usdt).toFixed(2)}</span>
                                            : <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-100">Precio a consultar</span>}
                                    </div>
                                    <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200 line-clamp-2 mb-2 flex-1 text-center">{combo.name}</h3>

                                    {/* Productos incluidos */}
                                    {combo.products && combo.products.length > 0 && (
                                        <div className="mt-1">
                                            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mb-1 text-center">Incluye:</p>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {combo.products.map(p => (
                                                    <span key={p.id} className="text-[9px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded-full border border-stone-200 dark:border-stone-800 font-semibold">{p.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t">
                                        <span className="text-stone-600 dark:text-stone-400">Stock:</span>
                                        <span className={`font-bold ${combo.stock > 10 ? 'text-green-600 dark:text-green-400' : combo.stock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {combo.stock} uds.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Estado vacío */}
                    {combosFiltrados.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-800">
                            <div className="text-6xl mb-4"></div>
                            <p className="text-stone-500 dark:text-stone-400 text-lg">
                                {combos.length === 0 ? 'No tienes combos creados aún.' : 'No se encontraron combos con los filtros aplicados.'}
                            </p>
                            {combos.length === 0 && <button onClick={openCreate} className="mt-4 px-6 py-2 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-full hover:bg-stone-200 dark:hover:bg-stone-900 transition">+ Crear primer combo</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── MODAL ─────────────────────────────────────── */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="4xl">
                <form key={modalKey} onSubmit={submit} className="flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl"></span>
                            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                                {isEditing ? 'Editar Combo' : 'Nuevo Combo'}
                            </h2>
                        </div>
                        {/* Ocultar toggle */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-xs font-bold text-stone-600 dark:text-stone-400">Ocultar en tienda</span>
                            <div onClick={() => setData('is_hidden', !data.is_hidden)}
                                className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${data.is_hidden ? 'bg-stone-600 dark:bg-stone-400' : 'bg-stone-300 dark:bg-stone-700'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-stone-900 rounded-full shadow transition-transform duration-200 ${data.is_hidden ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </label>
                    </div>

                    {/* Cuerpo */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">

                        {/* Nombre */}
                        <div>
                            <InputLabel htmlFor="combo_name" value="Nombre del Combo" />
                            <TextInput id="combo_name" type="text" className="mt-1 block w-full" value={data.name} onChange={e => setData('name', e.target.value)} required />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* ── Selector de Productos incluidos ── */}
                        <div className="border-2 border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-stone-100 dark:bg-stone-800">
                            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                                Productos que conforman este combo
                                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">({(data.products_data || []).length} seleccionados)</span>
                            </h3>

                            {/* Tabla de productos seleccionados */}
                            {data.products_data && data.products_data.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    <p className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">Productos en el Combo (Ajustar Precio Base):</p>
                                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden divide-y divide-stone-50 dark:divide-stone-950">
                                        {data.products_data.map(item => {
                                            const p = products.find(pr => pr.id.toString() === item.product_id.toString());
                                            if (!p) return null;
                                            
                                            const currentPrice = parseFloat(
                                                item.price_type === 'mayor'        ? (p.price_mayor_usdt || p.price_usdt) :
                                                item.price_type === 'distribuidor' ? (p.price_distribuidor_usdt || p.price_usdt) :
                                                                                     p.price_usdt
                                            ) || 0;
                                            
                                            return (
                                                <div key={item.product_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-stone-50/30 dark:hover:bg-stone-950/30 transition-colors">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt="" className="w-8 h-8 object-cover rounded border border-stone-200 dark:border-stone-700 flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-stone-200 dark:bg-stone-800 rounded flex items-center justify-center text-sm flex-shrink-0"></div>
                                                        )}
                                                        <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{p.name}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                                                        <select
                                                            value={item.price_type}
                                                            onChange={e => updateProductPriceType(item.product_id, e.target.value)}
                                                            className="text-xs border-stone-200 dark:border-stone-800 focus:border-stone-600 dark:focus:border-stone-500 focus:ring-stone-600 dark:focus:ring-stone-500 rounded-lg py-1 px-2 bg-stone-50 dark:bg-stone-900 font-medium"
                                                        >
                                                            <option value="detal">Detal (${parseFloat(p.price_usdt || 0).toFixed(2)})</option>
                                                            {p.price_mayor_usdt && <option value="mayor">Mayor (${parseFloat(p.price_mayor_usdt).toFixed(2)})</option>}
                                                            {p.price_distribuidor_usdt && <option value="distribuidor">{nombreDistribuidor} (${parseFloat(p.price_distribuidor_usdt).toFixed(2)})</option>}
                                                        </select>
                                                        
                                                        <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100 w-16 text-right">${currentPrice.toFixed(2)}</span>
                                                        
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleProduct(item.product_id)}
                                                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                                                            title="Eliminar"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <input type="text" placeholder="Buscar producto para añadir..."
                                className="w-full text-sm border-stone-200 dark:border-stone-800 rounded-lg focus:ring-stone-500 dark:focus:ring-stone-500 focus:border-stone-500 dark:focus:border-stone-500 py-2 px-3 mb-2 bg-white dark:bg-stone-900"
                                value={productSearch} onChange={e => setProductSearch(e.target.value)} />

                            <div className="max-h-44 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900">
                                {availableProducts.length === 0
                                    ? <p className="text-xs text-stone-400 dark:text-stone-500 p-3 italic text-center">No se encontraron productos</p>
                                    : availableProducts.map(p => {
                                        const selected = data.products_data.some(item => item.product_id.toString() === p.id.toString());
                                        return (
                                            <label key={p.id} className={`flex items-center gap-3 p-2.5 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border-b border-stone-100 dark:border-stone-800 last:border-0 ${selected ? 'bg-stone-100 dark:bg-stone-800' : ''}`}>
                                                <input type="checkbox" className="rounded border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 focus:ring-stone-600 dark:focus:ring-stone-500"
                                                    checked={selected} onChange={() => toggleProduct(p.id)} />
                                                {p.image_url && <img src={p.image_url} className="w-8 h-8 object-contain rounded border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900" alt="" />}
                                                <span className="text-sm text-stone-800 dark:text-stone-200 flex-1">{p.name}</span>
                                                {p.price_usdt && <span className="text-xs text-stone-400 dark:text-stone-500 font-semibold">${parseFloat(p.price_usdt).toFixed(2)}</span>}
                                            </label>
                                        );
                                    })
                                }
                            </div>
                        </div>

                        {/* Precios y Stock */}
                        {(() => {
                            const costNum = parseFloat(data.cost_price);
                            const hasCost = !isNaN(costNum) && costNum > 0;
                            const gainDetal = hasCost && data.price_usdt ? (parseFloat(data.price_usdt) - costNum).toFixed(2) : null;
                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div>
                                        <InputLabel value="Costo Total del Combo (Opcional)" />
                                        <div className="relative mt-1">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                            <TextInput type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.cost_price} onChange={e => setData('cost_price', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel value="Precio (Suma Auto)" />
                                        <div className="relative mt-1">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                            <TextInput type="number" step="0.01" className="mt-1 block w-full pl-7 bg-stone-50 dark:bg-stone-900" value={data.price_usdt} onChange={e => setData('price_usdt', e.target.value)} />
                                        </div>
                                        {!data.price_usdt && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold block mt-1 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-100">Sin precio → "Consultar" en tienda</span>}
                                        {gainDetal !== null && <span className="text-xs text-marca-700 dark:text-marca-400 font-bold block mt-1 bg-marca-50 dark:bg-marca-950/40 px-2 py-0.5 rounded">Ganancia: ${gainDetal}</span>}
                                        <InputError message={errors.price_usdt} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="Stock" />
                                        <TextInput type="number" step="1" className="mt-1 block w-full" value={data.stock} onChange={e => setData('stock', e.target.value)} required />
                                        <InputError message={errors.stock} className="mt-2" />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Precio Condicional */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                            <div>
                                <InputLabel value="Precio Promocional Condicionado (Opcional)" />
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 dark:text-stone-400 font-bold">$</span>
                                    <TextInput type="number" step="0.01" className="mt-1 block w-full pl-7 bg-white dark:bg-stone-900" value={data.conditional_price} onChange={e => setData('conditional_price', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Cantidad mínima para el precio promocional" />
                                <TextInput type="number" step="1" className="mt-1 block w-full bg-white dark:bg-stone-900" value={data.conditional_min_quantity} onChange={e => setData('conditional_min_quantity', e.target.value)} />
                            </div>
                        </div>

                        {/* Descripción y Notas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <InputLabel value="Descripción (visible en tienda)" />
                                <textarea className="mt-1 block w-full rounded-md border-stone-300 bg-white text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400" rows="3"
                                    value={data.description} onChange={e => setData('description', e.target.value)}
                                    placeholder="Describe el combo: qué incluye, para qué sirve..." />
                            </div>
                            <div>
                                <InputLabel value="Notas internas (no visible en tienda)" />
                                <textarea className="mt-1 block w-full rounded-md border-stone-300 bg-white text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-marca-600 focus:ring-marca-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-marca-400 dark:focus:ring-marca-400" rows="3"
                                    value={data.notes} onChange={e => setData('notes', e.target.value)}
                                    placeholder="Aclaratorias internas, variantes, etc." />
                            </div>
                        </div>

                        {/* Imágenes del combo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                            <div>
                                <InputLabel value="Foto Principal del Combo (Opcional)" />
                                {previewImage && <div className="mt-2 mb-3"><img src={previewImage} alt="Preview" className="h-24 w-24 object-contain border rounded bg-stone-50 dark:bg-stone-900 shadow-sm" /></div>}
                                <input type="file" className="block w-full text-sm text-stone-500 dark:text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-100 dark:file:bg-stone-800 file:text-stone-700 dark:file:text-stone-300 hover:file:bg-stone-200 dark:hover:file:bg-stone-700 mt-2"
                                    onChange={handleImageChange} accept="image/*" />
                                <InputError message={errors.image} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel value="Galería del Combo (Múltiples fotos)" />
                                <input type="file" multiple className="mt-2 block w-full text-sm text-stone-500 dark:text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-100 dark:file:bg-stone-800 file:text-stone-700 dark:file:text-stone-300 hover:file:bg-stone-200 dark:hover:file:bg-stone-700"
                                    onChange={handlePhotosChange} accept="image/*" />
                                {extraPhotos.length > 0 && (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        {extraPhotos.map((src, idx) => <img key={idx} src={src} alt="" className="h-16 w-16 object-contain border rounded bg-stone-50 dark:bg-stone-900 shadow-sm" />)}
                                    </div>
                                )}
                                {isEditing && existingPhotos.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-2">Galería Existente</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {existingPhotos.map(photo => (
                                                <div key={photo.id} className="relative group">
                                                    <img src={photo.image_url} className="h-16 w-16 object-contain border rounded bg-stone-50 dark:bg-stone-900 shadow-sm" alt="" />
                                                    <button type="button" onClick={() => deleteGalleryImage(photo.id)}
                                                        className="absolute inset-0 bg-red-500 bg-opacity-80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold rounded">X</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 shrink-0 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setShowModal(false)} type="button">Cancelar</SecondaryButton>
                        <button type="submit" disabled={isSubmitting}
                            className="px-6 py-2 bg-stone-800 dark:bg-stone-700 hover:bg-stone-800 dark:hover:bg-stone-400 text-white font-bold rounded-lg shadow transition-colors disabled:opacity-60">
                            {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Combo')}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
