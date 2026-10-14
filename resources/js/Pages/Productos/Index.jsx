import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Interruptor } from '@/Components/UI';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Swal from 'sweetalert2';
import { Banknote, FileSpreadsheet } from 'lucide-react';
import { hoyLocal } from '@/utils/fechas';
import NombreDelPrecio from '@/Components/NombreDelPrecio';
import { useNombreDistribuidor } from '@/utils/nivelesDePrecio';
import { admiteFraccion, conUnidad, pasoDeCantidad, unidadCorta } from '@/utils/unidades';

const normalizeText = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/** Cada cuánto renueva una suscripción. Mismas claves que Product::PERIODOS. */
const PERIODOS_SUSCRIPCION = [
    ['mensual', 'Mensual'],
    ['trimestral', 'Trimestral'],
    ['semestral', 'Semestral'],
    ['anual', 'Anual'],
];

/** Dónde se presta un servicio. Mismas claves que App\Models\Product. */
const MODALIDADES_SERVICIO = {
    local: 'En nuestro local',
    domicilio: 'A domicilio',
    remoto: 'En línea',
    acordar: 'A convenir',
};

/**
 * Las pestañas del formulario.
 *
 * Antes era una sola columna con diez apartados seguidos: para cambiar un
 * precio había que pasar por las variantes, y para subir una foto había que
 * bajar hasta el final. Agrupadas, cada cosa está donde uno la busca.
 */
const PESTANAS_DEL_PRODUCTO = [
    { id: 'basico', texto: 'Básico' },
    { id: 'precios', texto: 'Precios' },
    { id: 'inventario', texto: 'Existencias', soloProducto: true },
    { id: 'fotos', texto: 'Fotos' },
    { id: 'catalogo', texto: 'Catálogo' },
];

/** En qué pestaña vive cada campo, para llevar allí el primer error. */
const PESTANA_DEL_CAMPO = {
    name: 'basico',
    description: 'basico',
    notes: 'basico',
    categories: 'basico',
    service_duration: 'basico',
    service_mode: 'basico',
    cost_price: 'precios',
    price_usdt: 'precios',
    price_mayor_usdt: 'precios',
    price_distribuidor_usdt: 'precios',
    price_divisa_usdt: 'precios',
    price_mayor_divisa_usdt: 'precios',
    price_distribuidor_divisa_usdt: 'precios',
    conditional_price: 'precios',
    conditional_min_quantity: 'precios',
    periodo_suscripcion: 'precios',
    stock: 'inventario',
    unidad: 'inventario',
    image: 'fotos',
    photos: 'fotos',
    private_photos: 'fotos',
};

/** Lo que se ve en el modo simple: un error en otro campo lo tiene que apagar. */
const CAMPOS_SIMPLES = ['name', 'description', 'price_usdt', 'price_divisa_usdt', 'stock', 'unidad', 'image', 'item_type'];

const PREFERENCIA_SIMPLE = 'productos.modoSimple';

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

/** Un campo de archivo: el navegador no le hereda nada al botón. */
const ARCHIVO =
    'block w-full text-sm text-stone-500 file:mr-4 file:rounded-full file:border-0 file:bg-marca-50 ' +
    'file:px-4 file:py-2 file:text-sm file:font-semibold file:text-marca-800 hover:file:bg-marca-200 ' +
    'dark:text-stone-400 dark:file:bg-marca-950 dark:file:text-marca-300 dark:hover:file:bg-marca-900';

/** Caja de una sección del formulario: separa los grupos de campos. */
const TARJETA =
    'rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-950/40 sm:p-5';

const VARIANT_TYPES = [
    { value: 'color', label: 'Color' },
    { value: 'talla', label: 'Talla o medida' },
    { value: 'tipo', label: 'Modelo o presentación' },
];

export default function Index({ auth, productos, categories, unidades }) {
    const nombreDistribuidor = useNombreDistribuidor();
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [extraPhotos, setExtraPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [modalKey, setModalKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // El formulario abre por pestañas, y el modo simple se recuerda: quien lo
    // prefiere no tiene que encenderlo cada vez que crea algo.
    const [pestana, setPestana] = useState('basico');
    const [simple, setSimple] = useState(() => leerPreferencia(PREFERENCIA_SIMPLE) === 'si');

    const cambiarSimple = (valor) => {
        setSimple(valor);
        guardarPreferencia(PREFERENCIA_SIMPLE, valor ? 'si' : 'no');
    };

    /**
     * Un error en un campo que no está en pantalla no se ve.
     *
     * El servidor valida todo el producto, así que el error puede caer en una
     * pestaña cerrada o, en modo simple, en un campo que no se muestra: en
     * ese caso se abre lo que haga falta para que se lea.
     */
    const mostrarDondeFalla = (errores) => {
        const clave = Object.keys(errores ?? {})[0];

        if (!clave) {
            return;
        }

        const campo = clave.split('.')[0];

        if (simple && !CAMPOS_SIMPLES.includes(campo)) {
            cambiarSimple(false);
        }

        setPestana(PESTANA_DEL_CAMPO[campo] ?? 'basico');
    };

    // ── Reposicion: entro mercancia y se registra con su costo ──
    const [reponiendo, setReponiendo] = useState(null);
    const [prodEditado, setProdEditado] = useState(null);

    // ── Variantes (color, talla, modelo) ──
    const [newVariants, setNewVariants] = useState([]);      // variantes a agregar
    const [existingVariants, setExistingVariants] = useState([]); // variantes ya guardadas

    // ── Fichero de fotos privadas del producto ──
    const [newPrivatePhotos, setNewPrivatePhotos] = useState([]);           // { file, name, preview }
    const [existingPrivatePhotos, setExistingPrivatePhotos] = useState([]); // ya guardadas en el fichero

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
        price_divisa_usdt: '', price_mayor_divisa_usdt: '', price_distribuidor_divisa_usdt: '',
        es_suscripcion: false, periodo_suscripcion: 'mensual',
        cost_price: '', stock: 0, unidad: 'unidad', categories: [], conditional_price: '', conditional_min_quantity: '',
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
        price_divisa_usdt: '', price_mayor_divisa_usdt: '', price_distribuidor_divisa_usdt: '',
        es_suscripcion: false, periodo_suscripcion: 'mensual',
        cost_price: '', stock: 0, unidad: 'unidad', categories: [], conditional_price: '', conditional_min_quantity: '',
        notes: '', description: '', image: null, photos: [], is_hidden: false, por_llegar: false, show_variants_in_store: true, last_units: false, _method: method
    });

    const openCreate = () => {
        setIsEditing(false); setPreviewImage(null); setExtraPhotos([]); setExistingPhotos([]);
        setNewVariants([]); setExistingVariants([]);
        setNewPrivatePhotos([]); setExistingPrivatePhotos([]);
        setCategorySearch(''); setModalKey(prev => prev + 1); setData(freshForm()); clearErrors();
        setPestana('basico'); setShowModal(true);
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
            price_divisa_usdt: prod.price_divisa_usdt || '',
            price_mayor_divisa_usdt: prod.price_mayor_divisa_usdt || '',
            price_distribuidor_divisa_usdt: prod.price_distribuidor_divisa_usdt || '',
            es_suscripcion: prod.es_suscripcion || false,
            periodo_suscripcion: prod.periodo_suscripcion || 'mensual',
            cost_price: prod.cost_price || '', stock: prod.stock || 0,
            unidad: prod.unidad || 'unidad',
            categories: prod.categories ? prod.categories.map(c => c.id.toString()) : [],
            conditional_price: prod.conditional_price || '', conditional_min_quantity: prod.conditional_min_quantity || '',
            notes: prod.notes || '', description: prod.description || '',
            image: null, photos: [], is_hidden: prod.is_hidden || false, por_llegar: prod.por_llegar || false,
            show_variants_in_store: prod.show_variants_in_store ?? true,
            last_units: prod.last_units || false, _method: 'PATCH'
        });
        clearErrors(); setPestana('basico'); setShowModal(true);
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
        formData.append('price_divisa_usdt', data.price_divisa_usdt || '');
        formData.append('price_mayor_divisa_usdt', data.price_mayor_divisa_usdt || '');
        formData.append('price_distribuidor_divisa_usdt', data.price_distribuidor_divisa_usdt || '');
        formData.append('es_suscripcion', data.es_suscripcion ? '1' : '0');
        formData.append('periodo_suscripcion', data.periodo_suscripcion || 'mensual');
        formData.append('cost_price', data.cost_price || '');
        formData.append('stock', data.stock);
        formData.append('unidad', data.unidad || 'unidad');
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
                const nombre = data.item_type === 'servicio' ? 'Servicio' : 'Producto';
                Swal.fire({ position: 'top-end', icon: 'success', title: isEditing ? `${nombre} actualizado` : `${nombre} creado`, showConfirmButton: false, timer: 1500, toast: true });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                // El error puede estar en una pestaña cerrada: se abre
                mostrarDondeFalla(errs);
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
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-stone-800 dark:text-stone-200">Productos y servicios</h2>}>
            <Head title="Productos y servicios" />
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
                                <Link
                                    href={route('productos.importar')}
                                    className="pulsable inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-stone-300 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 sm:w-auto"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Importar Excel
                                </Link>
                                <PrimaryButton onClick={openCreate} className="w-full sm:w-auto justify-center">+ Nuevo</PrimaryButton>
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
                                <span>{sortByStock ? '✓ Ordenado por menos existencias' : 'Ordenar por pocas existencias'}</span>
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
                                                    <span className="text-stone-600 dark:text-stone-400">Existencias:</span>
                                                    <span className={`font-bold ${prod.stock > 10 ? 'text-green-600 dark:text-green-400' : prod.stock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{conUnidad(prod.stock, prod)}</span>
                                                </>
                                            )}
                                        </div>
                                        {prod.item_type !== 'servicio' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); abrirReposicion(prod); }}
                                                title="Entró mercancía: registra cuánto y a qué costo"
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
                                                        <span className={`font-bold ${v.stock > 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-500 dark:text-red-400'}`}>{v.stock}</span>
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

            {/* El formulario: por pestañas, y con un modo simple para quien
                solo quiere nombre, foto, descripción y precio */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="4xl">
                <form key={modalKey} onSubmit={submit} className="flex max-h-[90vh] flex-col">

                    <div className="shrink-0 border-b border-stone-200 bg-stone-50 px-5 py-4 dark:border-stone-800 dark:bg-stone-950/70 sm:px-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                                    {isEditing ? (esServicio ? 'Editar servicio' : 'Editar producto') : (esServicio ? 'Nuevo servicio' : 'Nuevo producto')}
                                </h2>
                                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                                    {simple
                                        ? 'Lo imprescindible. Apaga el modo simple para ver todo lo demás.'
                                        : 'Solo el nombre y las existencias son obligatorios. El resto lo completas cuando quieras.'}
                                </p>
                            </div>

                            <div className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
                                <Interruptor
                                    etiqueta="Modo simple"
                                    valor={simple}
                                    onCambiar={cambiarSimple}
                                />
                            </div>
                        </div>

                        {!simple && (
                            <PestanasDelProducto
                                activa={pestana}
                                onCambiar={setPestana}
                                esServicio={esServicio}
                                errores={errors}
                            />
                        )}
                    </div>

                    {/* Cuerpo */}
                    <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">

                        {/* ── Simple: nombre, foto, descripción y precio ───── */}
                        {simple && (
                            <>
                                <TipoDeFicha valor={data.item_type} onCambiar={(v) => setData('item_type', v)} />

                                <div>
                                    <InputLabel htmlFor="name_simple" value={esServicio ? 'Nombre del servicio' : 'Nombre del producto'} />
                                    <TextInput id="name_simple" type="text" className="mt-1 block w-full" value={data.name} onChange={e => setData('name', e.target.value)} required />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="image_simple" value="Foto" />
                                    {previewImage && (
                                        <img src={previewImage} alt="" className="mt-2 h-24 w-24 rounded-lg border border-stone-200 bg-stone-50 object-contain dark:border-stone-800 dark:bg-stone-900" />
                                    )}
                                    <input id="image_simple" type="file" accept="image/*" onChange={handleImageChange} className={`mt-2 ${ARCHIVO}`} />
                                    <InputError message={errors.image} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="description_simple" value="Descripción" />
                                    <textarea id="description_simple" rows="3" className={`mt-1 ${CAMPO}`}
                                        value={data.description} onChange={e => setData('description', e.target.value)}
                                        placeholder={esServicio ? 'Qué incluye, cuánto dura, cómo se acuerda…' : 'Qué es, para qué sirve, medidas o presentación…'} />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <NivelDePrecio
                                        id="price_simple"
                                        etiqueta="Precio"
                                        campo="price_usdt"
                                        campoDivisa="price_divisa_usdt"
                                        data={data}
                                        setData={setData}
                                        costo={data.cost_price}
                                        error={errors.price_usdt}
                                        avisoSinPrecio
                                        sufijo={esServicio ? null : unidadCorta({ unidad: data.unidad })}
                                    />

                                    {!esServicio && (
                                        <CampoDeExistencias
                                            data={data}
                                            setData={setData}
                                            unidades={unidades}
                                            isEditing={isEditing}
                                            error={errors.stock}
                                        />
                                    )}
                                </div>

                                <p className="rounded-xl bg-stone-100 px-3.5 py-3 text-xs leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
                                    Lo demás —costo, precios al mayor, categorías, variantes, galería y visibilidad— sigue
                                    donde estaba: apaga el modo simple cuando lo necesites.
                                </p>
                            </>
                        )}

                        {/* ── Básico ───────────────────────────────────────── */}
                        {!simple && pestana === 'basico' && (
                            <>
                                <TipoDeFicha valor={data.item_type} onCambiar={(v) => setData('item_type', v)} />

                                <div className={`space-y-5 ${TARJETA}`}>
                                    <div>
                                        <InputLabel htmlFor="name" value={esServicio ? 'Nombre del servicio' : 'Nombre del producto'} />
                                        <TextInput id="name" type="text" className="mt-1 block w-full" value={data.name} onChange={e => setData('name', e.target.value)} required />
                                        <InputError message={errors.name} className="mt-2" />
                                    </div>

                                    {esServicio && (
                                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                                                    {Object.entries(MODALIDADES_SERVICIO).map(([valor, texto]) => (
                                                        <option key={valor} value={valor}>{texto}</option>
                                                    ))}
                                                </select>
                                                <InputError message={errors.service_mode} className="mt-2" />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <InputLabel htmlFor="description" value="Descripción (se ve en tu catálogo)" />
                                        <textarea id="description" className={`mt-1 ${CAMPO}`} rows="4"
                                            value={data.description} onChange={e => setData('description', e.target.value)}
                                            placeholder={esServicio ? 'Qué incluye, cuánto dura, cómo se acuerda…' : 'Qué es, para qué sirve, medidas o presentación…'} />
                                    </div>
                                </div>

                                <SeccionModal titulo="Categorías y notas" ayuda="Las categorías ordenan tu catálogo; las notas son solo para ti." />

                                <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${TARJETA}`}>
                                    <div className="flex h-full flex-col">
                                        <InputLabel value="Categorías" />
                                        <div className="mt-1 flex flex-1 flex-col overflow-hidden rounded-md border border-stone-300 shadow-sm dark:border-stone-700">
                                            <div className="border-b border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-900">
                                                <input type="text" placeholder="Buscar categoría..."
                                                    className={`py-1.5 text-sm ${CAMPO}`}
                                                    value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                                            </div>
                                            <div className="flex h-32 flex-col gap-2 overflow-y-auto bg-white p-2 dark:bg-stone-900">
                                                {categories?.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
                                                    <label key={cat.id} className="flex cursor-pointer items-center gap-2 rounded p-1 transition-colors hover:bg-marca-50 dark:hover:bg-marca-950/40">
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
                                                {categories?.length === 0 && (
                                                    <p className="text-xs text-stone-400 dark:text-stone-500">Todavía no tienes categorías.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="notes" value="Notas privadas" />
                                        <textarea id="notes" className={`mt-1 ${CAMPO}`} rows="3"
                                            value={data.notes} onChange={e => setData('notes', e.target.value)}
                                            placeholder="Tallas, colores o cualquier aclaratoria para ti" />
                                        <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                                            Nadie más las ve: no salen en tu catálogo ni en las facturas.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Precios ──────────────────────────────────────── */}
                        {!simple && pestana === 'precios' && (
                            <>
                                <SeccionModal
                                    titulo="Precios y costo"
                                    ayuda="Deja vacío el precio al detal si prefieres que digan Consultar."
                                />

                                <div className={TARJETA}>
                                    <div className="max-w-xs">
                                        <InputLabel htmlFor="cost_price" value="Lo que te cuesta (opcional)" />
                                        <div className="relative mt-1">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-stone-500 dark:text-stone-400">$</span>
                                            <TextInput id="cost_price" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.cost_price} onChange={(e) => setData('cost_price', e.target.value)} />
                                        </div>
                                        <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                                            Con el costo puesto, cada precio te muestra tu ganancia.
                                        </p>
                                    </div>

                                    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                                        <NivelDePrecio
                                            id="price"
                                            etiqueta="Al detal"
                                            campo="price_usdt"
                                            campoDivisa="price_divisa_usdt"
                                            data={data}
                                            setData={setData}
                                            costo={data.cost_price}
                                            error={errors.price_usdt}
                                            avisoSinPrecio
                                            sufijo={esServicio ? null : unidadCorta({ unidad: data.unidad })}
                                        />

                                        <NivelDePrecio
                                            id="price_mayor"
                                            etiqueta="Al mayor (opcional)"
                                            campo="price_mayor_usdt"
                                            campoDivisa="price_mayor_divisa_usdt"
                                            data={data}
                                            setData={setData}
                                            costo={data.cost_price}
                                            error={errors.price_mayor_usdt}
                                            sufijo={esServicio ? null : unidadCorta({ unidad: data.unidad })}
                                        />

                                        <NivelDePrecio
                                            id="price_distribuidor"
                                            etiqueta={`${nombreDistribuidor} (opcional)`}
                                            campo="price_distribuidor_usdt"
                                            campoDivisa="price_distribuidor_divisa_usdt"
                                            data={data}
                                            setData={setData}
                                            costo={data.cost_price}
                                            error={errors.price_distribuidor_usdt}
                                            sufijo={esServicio ? null : unidadCorta({ unidad: data.unidad })}
                                        />
                                    </div>

                                    <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                                        El precio <strong>en divisas</strong> es opcional y no es el precio en dólares convertido a
                                        bolívares: es otro precio, normalmente más bajo, para quien paga en efectivo en divisas. En
                                        tu catálogo sale como <strong>promo en divisas</strong>.
                                    </p>

                                    {/* Es viendo el campo donde se nota que
                                        «Distribuidor» no es la palabra del negocio */}
                                    <div className="mt-4">
                                        <NombreDelPrecio />
                                    </div>
                                </div>

                                <SeccionModal
                                    titulo="Precio por cantidad"
                                    ayuda="Un precio distinto al llevar varias unidades."
                                />

                                <div className={`grid grid-cols-1 gap-5 ${TARJETA} md:grid-cols-2`}>
                                    <div>
                                        <InputLabel htmlFor="conditional_price" value="Precio promocional" />
                                        <div className="relative mt-1">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-stone-500 dark:text-stone-400">$</span>
                                            <TextInput id="conditional_price" type="number" step="0.01" className="mt-1 block w-full pl-7" value={data.conditional_price} onChange={e => setData('conditional_price', e.target.value)} />
                                        </div>
                                        <InputError message={errors.conditional_price} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="conditional_min_quantity" value="Desde cuántas" />
                                        <TextInput id="conditional_min_quantity" type="number" step="1" className="mt-1 block w-full" value={data.conditional_min_quantity} onChange={e => setData('conditional_min_quantity', e.target.value)} />
                                        <InputError message={errors.conditional_min_quantity} className="mt-2" />
                                    </div>
                                </div>

                                {/* Un hosting o un mantenimiento mensual no se factura una
                                    vez: se renueva, y hay que saber a quién le toca. */}
                                <SeccionModal titulo="Cobro por suscripción" ayuda="Para lo que se paga cada cierto tiempo y no una sola vez." />

                                <div className={TARJETA}>
                                    <Interruptor
                                        etiqueta="¿Aplica modelo de pago por suscripción?"
                                        ayuda="Al facturarlo podrás anotar cuándo renueva cada cliente, y aparecerá en Renovaciones."
                                        valor={data.es_suscripcion}
                                        onCambiar={(v) => setData('es_suscripcion', v)}
                                    />

                                    {data.es_suscripcion && (
                                        <div className="mt-4">
                                            <InputLabel value="Cada cuánto se renueva" />
                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {PERIODOS_SUSCRIPCION.map(([valor, etiqueta]) => (
                                                    <button
                                                        key={valor}
                                                        type="button"
                                                        onClick={() => setData('periodo_suscripcion', valor)}
                                                        aria-pressed={data.periodo_suscripcion === valor}
                                                        className={`pulsable rounded-lg border px-3 py-2 text-sm font-semibold ${
                                                            data.periodo_suscripcion === valor
                                                                ? 'border-marca-600 bg-marca-50 text-marca-800 dark:border-marca-500 dark:bg-marca-950/40 dark:text-marca-300'
                                                                : 'border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800'
                                                        }`}
                                                    >
                                                        {etiqueta}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                                                Al marcar una renovación como hecha, la fecha salta sola al siguiente período. No
                                                factura nada: cobrar sigue siendo tu decisión.
                                            </p>
                                            <InputError message={errors.periodo_suscripcion} className="mt-2" />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── Existencias ──────────────────────────────────── */}
                        {!simple && pestana === 'inventario' && (
                            esServicio ? (
                                <div className="rounded-xl border border-dashed border-stone-300 p-5 text-sm leading-relaxed text-stone-500 dark:border-stone-700 dark:text-stone-400">
                                    Un servicio no lleva existencias: no se agota, no se descuenta al facturar y no tiene
                                    variantes. Si esto sí se almacena, cámbialo a producto en la pestaña <strong>Básico</strong>.
                                </div>
                            ) : (
                                <>
                                    <SeccionModal
                                        titulo="Existencias"
                                        ayuda="En qué unidad lo mides y cuánto tienes."
                                    />

                                    <div className={TARJETA}>
                                        <CampoDeExistencias
                                            data={data}
                                            setData={setData}
                                            unidades={unidades}
                                            isEditing={isEditing}
                                            error={errors.stock}
                                        />
                                        <InputError message={errors.unidad} className="mt-2" />
                                    </div>

                                    {/* Reponer escribiendo el stock a mano sale mal cuando la
                                        mercancia cambio de precio: el libro de compras la valora
                                        al costo de hoy. Por eso se empuja la reposicion. */}
                                    {isEditing && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">¿Entró mercancía nueva?</p>
                                                <p className="mt-0.5 text-xs leading-snug text-amber-800 dark:text-amber-300">
                                                    Cambiar las existencias aquí arriba es para <strong>arreglar un error de conteo</strong>: lo que agregues se valora
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
                                        titulo="Variantes"
                                        ayuda="Colores, tallas, modelos o sabores, cada uno con su existencia y su foto."
                                    />

                                    <div className={TARJETA}>
                                        <div className="mb-3 flex items-center justify-end">
                                            <button type="button" onClick={addVariant}
                                                className="pulsable flex items-center gap-1.5 rounded-full border border-stone-200 bg-marca-50 px-3 py-1.5 text-xs font-bold text-marca-700 transition-colors hover:bg-marca-100 dark:border-stone-800 dark:bg-marca-950/40 dark:text-marca-400 dark:hover:bg-marca-950/60">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                                Agregar variante
                                            </button>
                                        </div>

                                        {data.unidad !== 'unidad' && (existingVariants.length > 0 || newVariants.length > 0) && (
                                            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                                Las variantes se cuentan por piezas enteras, aunque el producto se venda
                                                por {unidadCorta({ unidad: data.unidad })}.
                                            </p>
                                        )}

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
                                            <p className="text-xs italic text-stone-400 dark:text-stone-500">Aún no hay variantes para este producto.</p>
                                        )}
                                    </div>
                                </>
                            )
                        )}

                        {/* ── Fotos ────────────────────────────────────────── */}
                        {!simple && pestana === 'fotos' && (
                            <>
                                <SeccionModal titulo="Fotos del catálogo" ayuda="La principal es la que se ve en la rejilla; la galería se abre al tocar el producto." />

                                <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${TARJETA}`}>
                                    <div>
                                        <InputLabel htmlFor="image" value="Foto principal" />
                                        {previewImage && <div className="mb-4 mt-2"><img src={previewImage} alt="Vista previa" className="h-24 w-24 rounded border border-stone-200 bg-stone-50 object-contain shadow-sm dark:border-stone-800 dark:bg-stone-900" /></div>}
                                        <input id="image" type="file" accept="image/*" onChange={handleImageChange} className={`mt-2 ${ARCHIVO}`} />
                                        <InputError message={errors.image} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="photos" value="Galería (varias)" />
                                        <input id="photos" type="file" multiple accept="image/*" onChange={handlePhotosChange} className={`mt-2 ${ARCHIVO}`} />
                                        {extraPhotos.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {extraPhotos.map((src, idx) => <img key={idx} src={src} alt="" className="h-16 w-16 rounded border border-stone-200 bg-stone-50 object-contain shadow-sm dark:border-stone-800 dark:bg-stone-900" />)}
                                            </div>
                                        )}
                                        {isEditing && existingPhotos.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="mb-2 text-xs font-bold uppercase text-stone-500 dark:text-stone-400">Galería guardada</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {existingPhotos.map(photo => (
                                                        <div key={photo.id} className="group relative">
                                                            <img src={photo.image_url} className="h-16 w-16 rounded border border-stone-200 bg-stone-50 object-contain shadow-sm dark:border-stone-800 dark:bg-stone-900" alt="" />
                                                            <button type="button" onClick={() => deleteSecondaryImage(photo.id)}
                                                                className="absolute inset-0 flex items-center justify-center rounded bg-red-500 bg-opacity-80 font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">X</button>
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
                            </>
                        )}

                        {/* ── Catálogo ─────────────────────────────────────── */}
                        {!simple && pestana === 'catalogo' && (
                            <>
                                <SeccionModal
                                    titulo="Visibilidad en el catálogo"
                                    ayuda="Cómo se comporta para quien visita tu catálogo."
                                />

                                <div className={`grid gap-4 sm:grid-cols-2 ${TARJETA}`}>
                                    <Interruptor
                                        etiqueta="Ocultar del catálogo"
                                        ayuda={esServicio ? 'Sigue en tu lista, pero nadie lo ve.' : 'Sigue en tu inventario, pero nadie lo ve.'}
                                        valor={data.is_hidden}
                                        onCambiar={(v) => setData('is_hidden', v)}
                                    />
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
                                            ayuda="Se anuncia como próximo a llegar, aunque no tengas existencias."
                                            valor={data.por_llegar}
                                            onCambiar={(v) => setData('por_llegar', v)}
                                        />
                                    )}
                                    {!esServicio && (
                                        <Interruptor
                                            etiqueta="Últimas unidades"
                                            ayuda="Muestra un aviso para animar la compra."
                                            valor={data.last_units}
                                            onCambiar={(v) => setData('last_units', v)}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex shrink-0 justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4 dark:border-stone-800 dark:bg-stone-950/70">
                        <SecondaryButton onClick={() => setShowModal(false)} type="button">Cancelar</SecondaryButton>
                        <PrimaryButton disabled={isSubmitting} type="submit">
                            {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : (esServicio ? 'Crear servicio' : 'Crear producto'))}
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
/**
 * Un nivel de precio con su promo en divisas debajo.
 *
 * Van juntos y no en celdas aparte porque son el mismo precio con dos
 * formas de pago: separarlos dejaba ocho campos sueltos donde nadie
 * recordaba cuál de divisas correspondía a cuál nivel.
 */
function NivelDePrecio({ id, etiqueta, campo, campoDivisa, data, setData, costo, error, avisoSinPrecio = false, sufijo = null }) {
    const costoNum = parseFloat(costo);
    const hayCosto = !isNaN(costoNum) && costoNum > 0;

    const ganancia = (valor) => {
        if (!hayCosto || !valor) {
            return null;
        }

        const resta = parseFloat(valor) - costoNum;

        return { monto: resta.toFixed(2), porcentaje: ((resta / costoNum) * 100).toFixed(0) };
    };

    const normal = ganancia(data[campo]);
    const divisa = ganancia(data[campoDivisa]);

    return (
        <div>
            <InputLabel htmlFor={id} value={etiqueta} />
            <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-stone-500 dark:text-stone-400">$</span>
                <TextInput
                    id={id}
                    type="number"
                    step="0.01"
                    className={`mt-1 block w-full pl-7 ${sufijo ? 'pr-12' : ''}`}
                    value={data[campo]}
                    onChange={(e) => setData(campo, e.target.value)}
                />
                {sufijo && (
                    <span className="pointer-events-none absolute inset-y-0 right-0 mt-1 flex items-center pr-3 text-xs font-semibold text-stone-500 dark:text-stone-400">
                        / {sufijo}
                    </span>
                )}
            </div>

            {avisoSinPrecio && !data[campo] && (
                <span className="mt-1 block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
                    Sin precio → "Consultar" en tienda
                </span>
            )}

            {normal && <Ganancia {...normal} />}

            <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-950/60">
                <label htmlFor={`${id}_divisa`} className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                    <Banknote className="h-3.5 w-3.5" />
                    En divisas (opcional)
                </label>
                <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-stone-500 dark:text-stone-400">$</span>
                    <TextInput
                        id={`${id}_divisa`}
                        type="number"
                        step="0.01"
                        className={`block w-full pl-7 text-sm ${sufijo ? 'pr-12' : ''}`}
                        value={data[campoDivisa]}
                        onChange={(e) => setData(campoDivisa, e.target.value)}
                    />
                    {sufijo && (
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-stone-500 dark:text-stone-400">
                            / {sufijo}
                        </span>
                    )}
                </div>
                {divisa && <Ganancia {...divisa} />}
            </div>

            <InputError message={error} className="mt-2" />
        </div>
    );
}

function Ganancia({ monto, porcentaje }) {
    return (
        <span className="mt-1 block rounded border border-marca-200 bg-marca-50 px-2 py-0.5 text-xs font-bold text-marca-700 dark:border-marca-900 dark:bg-marca-950/40 dark:text-marca-400">
            Ganancia: ${monto} ({porcentaje}%)
        </span>
    );
}

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


/**
 * Las pestañas del formulario, con un punto donde haya algo que corregir.
 *
 * Un servicio no tiene existencias ni variantes, así que esa pestaña no se
 * le muestra: no es una opción escondida, es que no aplica.
 */
function PestanasDelProducto({ activa, onCambiar, esServicio, errores }) {
    const conError = (id) => Object.keys(errores ?? {}).some(
        (clave) => PESTANA_DEL_CAMPO[clave.split('.')[0]] === id,
    );

    return (
        <nav aria-label="Secciones del producto" className="-mb-px mt-4 flex gap-1 overflow-x-auto scrollbar-slim">
            {PESTANAS_DEL_PRODUCTO.filter(({ soloProducto }) => !soloProducto || !esServicio).map(({ id, texto }) => {
                const esActiva = activa === id;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onCambiar(id)}
                        aria-current={esActiva ? 'page' : undefined}
                        className={`relative shrink-0 rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                            esActiva
                                ? 'bg-white text-marca-700 shadow-[0_1px_0_0_#fff] dark:bg-stone-900 dark:text-marca-400'
                                : 'text-stone-500 hover:bg-white/60 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-900/60 dark:hover:text-stone-100'
                        }`}
                    >
                        {texto}
                        {conError(id) && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Hay algo que corregir" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

/** Producto o servicio: decide qué campos tienen sentido en toda la ficha. */
function TipoDeFicha({ valor, onCambiar }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {[
                { valor: 'producto', titulo: 'Producto', texto: 'Algo que entregas y tiene existencias.' },
                { valor: 'servicio', titulo: 'Servicio', texto: 'Algo que haces: no se agota ni se descuenta.' },
            ].map((opcion) => (
                <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => onCambiar(opcion.valor)}
                    aria-pressed={valor === opcion.valor}
                    className={`rounded-xl border p-3 text-left transition-colors duration-150 ${
                        valor === opcion.valor
                            ? 'border-marca-600 bg-marca-50 dark:border-marca-500 dark:bg-marca-950/40'
                            : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800'
                    }`}
                >
                    <span className="block text-sm font-bold">{opcion.titulo}</span>
                    <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{opcion.texto}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * Cuánto hay y en qué se mide.
 *
 * Van juntos porque son una sola decisión: «2,5» no quiere decir nada sin
 * saber si son kilos o cajas. Al cambiar a una unidad que no admite partes
 * la cantidad se redondea en el momento, para no guardar media caja.
 */
function CampoDeExistencias({ data, setData, unidades, isEditing, error }) {
    const unidad = data.unidad || 'unidad';
    const fraccion = admiteFraccion({ unidad });

    const cambiarUnidad = (nueva) => {
        const cantidad = parseFloat(data.stock) || 0;

        setData((anterior) => ({
            ...anterior,
            unidad: nueva,
            stock: admiteFraccion({ unidad: nueva }) ? cantidad : Math.round(cantidad),
        }));
    };

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <InputLabel htmlFor="unidad" value="Se vende por" />
                <select
                    id="unidad"
                    value={unidad}
                    onChange={(e) => cambiarUnidad(e.target.value)}
                    className={`mt-1 text-sm ${CAMPO}`}
                >
                    {Object.entries(unidades ?? {}).map(([grupo, opciones]) => (
                        <optgroup key={grupo} label={grupo}>
                            {opciones.map((opcion) => (
                                <option key={opcion.valor} value={opcion.valor}>
                                    {opcion.nombre} ({opcion.corto})
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                    {fraccion
                        ? 'Puedes vender partes: 0,5 o 2,75.'
                        : 'Se vende de a piezas enteras.'}
                </p>
            </div>

            <div>
                <InputLabel htmlFor="stock" value={isEditing ? 'Cuánto tienes (corregir conteo)' : 'Cuánto tienes'} />
                <div className="relative mt-1">
                    <TextInput
                        id="stock"
                        type="number"
                        min="0"
                        step={pasoDeCantidad({ unidad })}
                        className="mt-1 block w-full pr-14"
                        value={data.stock}
                        onChange={(e) => setData('stock', e.target.value)}
                        required
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 mt-1 flex items-center pr-3 text-sm font-semibold text-stone-500 dark:text-stone-400">
                        {unidadCorta({ unidad })}
                    </span>
                </div>
                <InputError message={error} className="mt-2" />
            </div>
        </div>
    );
}

/** Lee y guarda una preferencia sin reventar donde no haya almacenamiento. */
function leerPreferencia(clave) {
    try {
        return localStorage.getItem(clave);
    } catch (e) {
        return null;
    }
}

function guardarPreferencia(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
    } catch (e) {
        // Sin almacenamiento el formulario simplemente abre completo
    }
}
