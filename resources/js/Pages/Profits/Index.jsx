import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Swal from 'sweetalert2';
import { hoyLocal } from '@/utils/fechas';

const MONTHS = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
];

export default function Index({
    auth,
    productos,
    adjustments,
    sales,
    periodo,
    inversion,
    allProducts,
    availableYears,
    gananciasStartDate = null,
    filters
}) {
    // Todo lo que se muestra viene calculado del servidor. La pantalla no
    // vuelve a sumar nada: antes lo hacía y sus totales no coincidían con
    // los de arriba cuando había combos de por medio.
    const ventas = sales?.data ?? [];
    const totalInversionStock = inversion.en_stock;
    const totalInversionHistorica = inversion.historica;
    const totalRecaudado = inversion.recaudado;
    const totalRestantePorRecaudar = inversion.restante_por_recaudar;
    const totalUtilidadSobreInversion = inversion.utilidad;
    const roiAcumulado = inversion.retorno;
    const gananciaNeta = periodo.neto;
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [pageTab, setPageTab] = useState('resumen');
    const [showFinancialsModal, setShowFinancialsModal] = useState(false);
    const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

    const handleToggleStartDate = () => {
        const isReset = !!gananciasStartDate;
        
        Swal.fire({
            title: isReset ? '¿Restablecer historial?' : '¿Iniciar control desde hoy?',
            text: isReset 
                ? 'Se volverán a incluir en las estadísticas todas las facturas y ajustes del pasado.' 
                : 'Cualquier venta, factura o ajuste anterior a hoy será ignorado en las estadísticas de este módulo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ec4899',
            cancelButtonColor: '#6b7280',
            confirmButtonText: isReset ? 'Sí, ver todo el historial' : 'Sí, empezar desde hoy',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('profits.reset-start-date'), { reset: isReset }, {
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: '¡Actualizado!',
                            text: isReset ? 'Historial completo visible.' : 'Control configurado desde hoy.',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    const financialsForm = useForm({
        product_id: '',
        cost_price: 0,
    });

    // La inversión ya no se escribe: se registra la mercancía que entró y
    // el libro de compras la suma solo.
    const compraForm = useForm({
        product_id: '',
        qty: 1,
        unit_cost: 0,
        purchased_at: hoyLocal(),
        note: '',
        sumar_stock: true,
    });

    const handleEditFinancials = (prod) => {
        financialsForm.setData({
            product_id: prod.id,
            cost_price: prod.cost_price || 0,
        });
        compraForm.setData({
            product_id: prod.id,
            qty: 1,
            unit_cost: prod.cost_price || 0,
            purchased_at: hoyLocal(),
            note: '',
            sumar_stock: true,
        });
        financialsForm.clearErrors();
        compraForm.clearErrors();
        setShowFinancialsModal(true);
    };

    const handleSubmitCompra = (e) => {
        e.preventDefault();
        compraForm.post(route('profits.compras.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowFinancialsModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Compra registrada',
                    text: 'La inversión del producto quedó al día.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                });
            },
            onError: (errs) => Swal.fire({ icon: 'error', title: 'Revisa los datos', text: Object.values(errs).join(' · ') }),
        });
    };

    const handleSubmitFinancials = (e) => {
        e.preventDefault();
        financialsForm.post(route('profits.products.update-financials'), {
            onSuccess: () => {
                setShowFinancialsModal(false);
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: 'Datos financieros actualizados correctamente.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: (errs) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: Object.values(errs).join('\n')
                });
            }
        });
    };
    
    // States for filtering
    const [filterProduct, setFilterProduct] = useState(filters.product_id || '');
    const [filterMonth, setFilterMonth] = useState(filters.month || '');
    const [filterYear, setFilterYear] = useState(filters.year || '');


    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        product_id: '',
        type: 'loss',
        concept: '',
        qty: 1,
        amount_usd: '',
        reason: '',
        adjust_stock: false,
    });

    const handleFilterChange = (prodId, monthVal, yearVal) => {
        router.get(route('profits.index'), {
            product_id: prodId,
            month: monthVal,
            year: yearVal
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleClearFilters = () => {
        setFilterProduct('');
        setFilterMonth('');
        setFilterYear('');
        router.get(route('profits.index'), {}, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleOpenModal = () => {
        reset();
        clearErrors();
        setShowAdjustmentModal(true);
    };

    const handleProductChange = (prodId) => {
        setData(prev => {
            const updated = { ...prev, product_id: prodId };
            if (!prodId) {
                updated.qty = 1;
            }
            if (prodId && prev.type === 'loss') {
                const prod = productos.find(p => p.id.toString() === prodId.toString());
                if (prod && prod.cost_price) {
                    updated.amount_usd = (parseFloat(prod.cost_price) * prev.qty).toFixed(2);
                }
            }
            return updated;
        });
    };

    const handleQtyChange = (qtyVal) => {
        const qty = parseInt(qtyVal) || 1;
        setData(prev => {
            const updated = { ...prev, qty };
            if (prev.product_id && prev.type === 'loss') {
                const prod = productos.find(p => p.id.toString() === prev.product_id.toString());
                if (prod && prod.cost_price) {
                    updated.amount_usd = (parseFloat(prod.cost_price) * qty).toFixed(2);
                }
            }
            return updated;
        });
    };

    const handleConceptChange = (conceptVal) => {
        setData(prev => {
            const updated = { ...prev, concept: conceptVal };
            // Si el concepto es pérdida por producto dañado o inventario faltante, sugerimos descontar stock
            if (prev.type === 'loss') {
                const autoAdjust = ['Producto Dañado / Vencido', 'Pérdida de Inventario / Faltante'].includes(conceptVal);
                updated.adjust_stock = autoAdjust;

                // Si es un gasto general, quitamos el producto y no descontamos stock
                const isGeneralExpense = [
                    'Gasto Operativo / General (Alquiler, Luz, Internet)',
                    'Gasto de Embalaje / Papelería',
                    'Gastos de Transporte / Gasolina',
                    'Servicios / Marketing / Publicidad',
                    'Otros Gastos / Gastos Adicionales'
                ].includes(conceptVal);
                if (isGeneralExpense) {
                    updated.product_id = '';
                    updated.adjust_stock = false;
                    updated.qty = 1;
                }
            } else {
                updated.adjust_stock = false;
            }
            return updated;
        });
    };

    const handleSubmitAdjustment = (e) => {
        e.preventDefault();
        post(route('profits.adjustments.store'), {
            onSuccess: () => {
                setShowAdjustmentModal(false);
                Swal.fire({
                    icon: 'success',
                    title: '¡Registrado!',
                    text: 'Ajuste financiero guardado correctamente.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: (errs) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: Object.values(errs).join('\n')
                });
            }
        });
    };

    const toggleExpandInvoice = (id) => {
        setExpandedInvoiceId(expandedInvoiceId === id ? null : id);
    };

    // Resultado del período, tal como lo calculó el servidor
    const periodIngresos = periodo.ingresos;
    const periodCostoVentas = periodo.costo_ventas;
    const periodGananciaBruta = periodo.ganancia_bruta;
    const periodPerdidas = periodo.perdidas;
    const periodGananciasAdicionales = periodo.ganancias_adicionales;
    const periodNeto = periodo.neto;
    const totalPeriodSupplementsCost = periodo.empaques;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-stone-800 dark:text-stone-200 leading-tight">Control de Ganancias y Pérdidas</h2>}
        >
            <Head title="Control Financiero" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* INDICADOR Y CONTROL DE FECHA DE INICIO */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-marca-600/10 dark:from-marca-500/10 to-stone-600/10 dark:to-stone-500/10 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black">⏳</span>
                            <div>
                                <h3 className="text-sm font-black text-stone-800 dark:text-stone-200">Fecha de Inicio de Estadísticas</h3>
                                <p className="text-xs text-stone-500 dark:text-stone-400">
                                    {gananciasStartDate 
                                        ? `Actualmente contando desde el ${new Date(gananciasStartDate).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                        : 'Contando todo el historial de ventas y ajustes.'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleStartDate}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm ${
                                gananciasStartDate
                                    ? 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800'
                                    : 'bg-marca-700 dark:bg-marca-500 hover:bg-marca-800 dark:hover:bg-marca-400 text-white border border-marca-600 dark:border-marca-500'
                            }`}
                        >
                            {gananciasStartDate ? 'Restablecer Historial' : 'Iniciar Control desde Hoy'}
                        </button>
                    </div>

                    {/* PANEL DE FILTROS */}
                    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4">
                        <div className="flex flex-col md:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-1.5">Filtrar por Producto</label>
                                <select
                                    value={filterProduct}
                                    onChange={(e) => {
                                        setFilterProduct(e.target.value);
                                        handleFilterChange(e.target.value, filterMonth, filterYear);
                                    }}
                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                >
                                    <option value="">-- Todos los Productos --</option>
                                    {allProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-full md:w-48">
                                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-1.5">Filtrar por Mes</label>
                                <select
                                    value={filterMonth}
                                    onChange={(e) => {
                                        setFilterMonth(e.target.value);
                                        handleFilterChange(filterProduct, e.target.value, filterYear);
                                    }}
                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                >
                                    <option value="">-- Todos los Meses --</option>
                                    {MONTHS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-full md:w-40">
                                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-1.5">Filtrar por Año</label>
                                <select
                                    value={filterYear}
                                    onChange={(e) => {
                                        setFilterYear(e.target.value);
                                        handleFilterChange(filterProduct, filterMonth, e.target.value);
                                    }}
                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                >
                                    <option value="">-- Todos los Años --</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {(filterProduct || filterMonth || filterYear) && (
                                <button
                                    onClick={handleClearFilters}
                                    className="w-full md:w-auto px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                                >
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>
                    </div>

                    {/* TABS DE CONTROL FINANCIERO */}
                    <div className="border-b border-stone-200 dark:border-stone-800 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setPageTab('resumen')}
                            className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                                pageTab === 'resumen'
                                    ? 'border-marca-600 dark:border-marca-500 text-marca-700 dark:text-marca-400 font-black'
                                    : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                            }`}
                        >
                            Resumen Financiero
                        </button>
                        <button
                            type="button"
                            onClick={() => setPageTab('productos')}
                            className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                                pageTab === 'productos'
                                    ? 'border-marca-600 dark:border-marca-500 text-marca-700 dark:text-marca-400 font-black'
                                    : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                            }`}
                        >
                            Rendimiento de productos
                        </button>
                        <button
                            type="button"
                            onClick={() => setPageTab('ventas')}
                            className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                                pageTab === 'ventas'
                                    ? 'border-marca-600 dark:border-marca-500 text-marca-700 dark:text-marca-400 font-black'
                                    : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                            }`}
                        >
                            Libro de Ventas ({sales.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setPageTab('ajustes')}
                            className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                                pageTab === 'ajustes'
                                    ? 'border-marca-600 dark:border-marca-500 text-marca-700 dark:text-marca-400 font-black'
                                    : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                            }`}
                        >
                            Pérdidas e Ingresos Extra
                        </button>
                    </div>

                    {/* TAB RESUMEN */}
                    {pageTab === 'resumen' && (
                        <div className="space-y-6">
                            {/* Tarjetas de Resumen Global */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col justify-between">
                                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider leading-snug">Inversión Histórica</span>
                                    <span className="text-lg md:text-xl font-black text-stone-800 dark:text-stone-200 font-mono mt-2">${totalInversionHistorica.toFixed(2)}</span>
                                </div>
                                <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col justify-between">
                                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider leading-snug">Total Recaudado</span>
                                    <span className="text-lg md:text-xl font-black text-sky-600 dark:text-sky-400 font-mono mt-2">${totalRecaudado.toFixed(2)}</span>
                                </div>
                                
                                {/* Falta por recuperar */}
                                <div className={`rounded-2xl shadow-sm border p-4 flex flex-col justify-between transition-all ${
                                    totalRestantePorRecaudar > 0 
                                        ? 'bg-red-50/50 border-red-200 dark:border-red-900' 
                                        : 'bg-green-50/30 border-green-200 dark:border-green-900'
                                }`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider leading-snug ${
                                        totalRestantePorRecaudar > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                                    }`}>Falta por Recuperar</span>
                                    <span className={`text-lg md:text-xl font-black font-mono mt-2 ${
                                        totalRestantePorRecaudar > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {totalRestantePorRecaudar > 0 ? `$${totalRestantePorRecaudar.toFixed(2)}` : '¡Recuperado! '}
                                    </span>
                                </div>

                                {/* Ganado sobre inversión */}
                                <div className={`rounded-2xl shadow-sm border p-4 flex flex-col justify-between transition-all ${
                                    totalUtilidadSobreInversion >= 0 
                                        ? 'bg-emerald-50/30 border-emerald-100' 
                                        : 'bg-red-50/30 border-red-200 dark:border-red-900'
                                }`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider leading-snug ${
                                        totalUtilidadSobreInversion >= 0 ? 'text-emerald-700' : 'text-red-700 dark:text-red-400'
                                    }`}>Ganancia s/ Inversión</span>
                                    <span className={`text-lg md:text-xl font-black font-mono mt-2 ${
                                        totalUtilidadSobreInversion >= 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                        {totalUtilidadSobreInversion >= 0 ? '+' : ''}${totalUtilidadSobreInversion.toFixed(2)}
                                    </span>
                                </div>

                                <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col justify-between">
                                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider leading-snug">Inversión Stock Act.</span>
                                    <span className="text-lg md:text-xl font-black text-stone-700 dark:text-stone-300 font-mono mt-2">${totalInversionStock.toFixed(2)}</span>
                                </div>
                                <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col justify-between bg-marca-50/20 dark:bg-marca-950/20">
                                    <span className="text-[10px] font-bold text-marca-800 dark:text-marca-300 uppercase tracking-wider leading-snug">Ganancia Neta (Ventas)</span>
                                    <span className={`text-lg md:text-xl font-black font-mono mt-2 ${gananciaNeta >= 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-600 dark:text-red-400'}`}>
                                        ${gananciaNeta.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* ESTADO DE GANANCIAS Y PÉRDIDAS (P&L) */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                                <div className="border-b border-stone-200 dark:border-stone-800 pb-3 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                                        Estado de Ganancias y Pérdidas (P&L)
                                    </h3>
                                    <span className="text-xs bg-marca-50 dark:bg-marca-950/40 text-marca-700 dark:text-marca-400 font-extrabold px-3 py-1 rounded-full font-mono">
                                        {filterMonth ? MONTHS.find(m => m.value === filterMonth)?.label : 'Todo el año'} {filterYear || new Date().getFullYear()}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Desglose de Operaciones */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">Actividades del Periodo</h4>
                                        <div className="space-y-2.5 text-sm">
                                            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                                                <span className="text-stone-600 dark:text-stone-400 font-medium">Ingresos Brutos (Ventas)</span>
                                                <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-base">${periodIngresos.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                                                <span className="text-stone-600 dark:text-stone-400 font-medium">Costo de Ventas Base (Productos)</span>
                                                <span className="font-mono font-bold text-red-500 dark:text-red-400">-${(periodCostoVentas - totalPeriodSupplementsCost).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                                                <span className="text-stone-600 dark:text-stone-400 font-medium">Gasto en Suplementos (Bolsas, Empaques)</span>
                                                <span className="font-mono font-bold text-red-500 dark:text-red-400">-${totalPeriodSupplementsCost.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-2 rounded-lg">
                                                <span className="text-stone-800 dark:text-stone-200 font-bold">Ganancia Bruta (Ventas)</span>
                                                <span className="font-mono font-black text-marca-700 dark:text-marca-400 text-base">${periodGananciaBruta.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                                                <span className="text-stone-600 dark:text-stone-400 font-medium">Pérdidas Registradas (Mermas, Daños, Devoluciones)</span>
                                                <span className="font-mono font-bold text-red-500 dark:text-red-400">-${periodPerdidas.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                                                <span className="text-stone-600 dark:text-stone-400 font-medium">Ingresos Extras (Ajustes positivos)</span>
                                                <span className="font-mono font-bold text-marca-700 dark:text-marca-400">+${periodGananciasAdicionales.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-3 pb-2 border-t-2 border-dashed border-stone-200 dark:border-stone-800 bg-marca-50/20 dark:bg-marca-950/20 p-2.5 rounded-lg">
                                                <span className="text-marca-800 dark:text-marca-300 font-black text-base">Utilidad Neta</span>
                                                <span className={`font-mono font-black text-lg ${periodNeto >= 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    ${periodNeto.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Punto de Equilibrio & ROI */}
                                    <div className="space-y-4 bg-stone-50/50 dark:bg-stone-900/50 p-5 rounded-2xl border border-stone-100/50 dark:border-stone-800/50 flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">Análisis de Retorno de Inversión (Histórico)</h4>
                                            <div className="space-y-3 text-xs">
                                                <div>
                                                    <div className="flex justify-between text-stone-500 dark:text-stone-400 font-medium">
                                                        <span>Inversión Histórica Acumulada:</span>
                                                        <span className="font-mono font-bold text-stone-700 dark:text-stone-300">${totalInversionHistorica.toFixed(2)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 leading-snug">
                                                        Total invertido para adquirir inventario desde el inicio.
                                                    </p>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-stone-500 dark:text-stone-400 font-medium">
                                                        <span>Total Recaudado Acumulado:</span>
                                                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">${totalRecaudado.toFixed(2)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 leading-snug">
                                                        Ingreso bruto total recibido por ventas.
                                                    </p>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-stone-500 dark:text-stone-400 font-medium">
                                                        <span>Punto de Equilibrio:</span>
                                                        <span className={`font-bold ${totalRestantePorRecaudar > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                            {totalRestantePorRecaudar > 0 ? `Faltan $${totalRestantePorRecaudar.toFixed(2)}` : '¡Alcanzado! '}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 leading-snug">
                                                        Monto faltante por recaudar para cubrir la inversión inicial histórica y pérdidas.
                                                    </p>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-stone-500 dark:text-stone-400 font-medium">
                                                        <span>Rendimiento ROI sobre Inv. Histórica:</span>
                                                        <span className={`font-mono font-black ${totalUtilidadSobreInversion >= 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {totalUtilidadSobreInversion >= 0 ? '+' : ''}{roiAcumulado.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 leading-snug">
                                                        Porcentaje de retorno neto sobre el capital total invertido.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Breve tip de negocio */}
                                        <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                                            <strong>Consejo Financiero:</strong> Mantén tu inversión histórica y costo unitario actualizados. Un ROI superior al 30% indica una excelente rotación y rentabilidad de productos de belleza.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB PRODUCTOS */}
                    {pageTab === 'productos' && (
                        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 flex flex-col min-h-[500px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                                    Rendimiento y costos por producto
                                </h3>
                                <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold px-3 py-1 rounded-full">
                                    {productos.length} Productos
                                </span>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse text-xs md:text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500 uppercase font-black tracking-wider">
                                            <th className="pb-3 pl-2">Producto</th>
                                            <th className="pb-3 text-right">Costo Unit.</th>
                                            <th className="pb-3 text-right text-red-500 dark:text-red-400">Suplementos</th>
                                            <th className="pb-3 text-right">Recaudado</th>
                                            <th className="pb-3 text-right text-stone-500 dark:text-stone-400">Gan. Bruta</th>
                                            <th className="pb-3 text-right text-marca-700 dark:text-marca-400">Gan. Neta</th>
                                            <th className="pb-3 text-right">Inv. Histórica</th>
                                            <th className="pb-3 text-right">Falta Recuperar</th>
                                            <th className="pb-3 text-right">Gan. s/ Inv.</th>
                                            <th className="pb-3 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50 dark:divide-stone-900 text-sm">
                                        {productos.map(p => (
                                            <tr key={p.id} className="hover:bg-marca-50/10 dark:hover:bg-marca-950/10 transition-colors">
                                                <td className="py-3 pl-2 font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2.5 max-w-[180px] truncate" title={p.name}>
                                                    {p.image_path ? (
                                                        <img src={`/storage/${p.image_path}`} alt={p.name} className="w-7 h-7 object-cover rounded-lg border border-stone-200 dark:border-stone-800" />
                                                    ) : (
                                                        <div className="w-7 h-7 bg-marca-100 dark:bg-marca-950/60 rounded-lg flex items-center justify-center text-xs text-marca-600 dark:text-marca-400"></div>
                                                    )}
                                                    <span className="font-semibold truncate">{p.name}</span>
                                                </td>
                                                <td className="py-3 text-right font-mono font-bold text-stone-600 dark:text-stone-400">${p.cost_price.toFixed(2)}</td>
                                                <td className="py-3 text-right font-mono font-bold text-red-400">${(p.suplementos_gastados || 0).toFixed(2)}</td>
                                                <td className="py-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400">${p.recaudado.toFixed(2)}</td>
                                                <td className="py-3 text-right font-mono font-bold text-stone-600 dark:text-stone-400">${(p.ganancia_bruta || p.ganancia).toFixed(2)}</td>
                                                <td className="py-3 text-right font-mono font-extrabold text-marca-700 dark:text-marca-400">${p.ganancia.toFixed(2)}</td>
                                                <td className="py-3 text-right font-mono font-bold text-stone-700 dark:text-stone-300">${p.inversion_historica.toFixed(2)}</td>
                                                
                                                {/* Falta por recuperar */}
                                                <td className={`py-3 text-right font-mono font-bold ${
                                                    p.restante_por_recaudar > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                    {p.restante_por_recaudar > 0 ? `$${p.restante_por_recaudar.toFixed(2)}` : 'Recuperado'}
                                                </td>
                                                
                                                {/* Ganancia sobre inversión */}
                                                <td className={`py-3 text-right font-mono font-bold ${
                                                    p.utilidad_sobre_inversion >= 0 ? 'text-marca-700 dark:text-marca-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {p.utilidad_sobre_inversion >= 0 ? '+' : ''}${p.utilidad_sobre_inversion.toFixed(2)}
                                                </td>
                                                
                                                <td className="py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditFinancials(p)}
                                                        className="text-marca-700 dark:text-marca-400 hover:text-marca-800 dark:hover:text-marca-300 font-bold text-xs bg-marca-50 dark:bg-marca-950/40 hover:bg-marca-100 dark:hover:bg-marca-950/60 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                                                        title="Editar datos financieros del producto"
                                                    >
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {productos.length === 0 && (
                                            <tr>
                                                <td colSpan="10" className="text-center py-10 text-stone-400 dark:text-stone-500">No hay productos que coincidan con el filtro.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB VENTAS */}
                    {pageTab === 'ventas' && (
                        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 flex flex-col min-h-[500px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                                    Libro de Ventas (Confirmadas)
                                </h3>
                                <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold px-3 py-1 rounded-full font-mono">
                                    {sales.total} Ventas
                                </span>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse text-xs md:text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500 uppercase font-black tracking-wider">
                                            <th className="pb-3 pl-2">Factura</th>
                                            <th className="pb-3">Cliente</th>
                                            <th className="pb-3">Fecha</th>
                                            <th className="pb-3 text-right">Monto</th>
                                            <th className="pb-3 text-right">Costo</th>
                                            <th className="pb-3 text-right">Ganancia</th>
                                            <th className="pb-3 text-right">Margen</th>
                                            <th className="pb-3 text-center">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50 dark:divide-stone-900 text-sm">
                                        {ventas.map(sale => {
                                            const isExpanded = expandedInvoiceId === sale.id;
                                            return (
                                                <React.Fragment key={sale.id}>
                                                    <tr className="hover:bg-marca-50/10 dark:hover:bg-marca-950/10 transition-colors">
                                                        <td className="py-4 pl-2 font-black text-marca-700 dark:text-marca-400 font-mono">
                                                            #{sale.id}
                                                        </td>
                                                        <td className="py-4 font-semibold text-stone-800 dark:text-stone-200">
                                                            {sale.client_name || 'Cliente Genérico'}
                                                        </td>
                                                        <td className="py-4 text-stone-500 dark:text-stone-400 text-xs">
                                                            {sale.confirmed_at ? new Date(sale.confirmed_at).toLocaleDateString('es-VE', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            }) : 'N/A'}
                                                        </td>
                                                        <td className="py-4 text-right font-mono font-bold text-stone-800 dark:text-stone-200 font-mono">
                                                            ${sale.subtotal_usd.toFixed(2)}
                                                        </td>
                                                        <td className="py-4 text-right font-mono font-bold text-stone-500 dark:text-stone-400 font-mono">
                                                            ${sale.cost_usd.toFixed(2)}
                                                        </td>
                                                        <td className="py-4 text-right font-mono font-bold text-marca-700 dark:text-marca-400 font-mono">
                                                            ${sale.profit_usd.toFixed(2)}
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                                                                sale.margin >= 40 ? 'bg-marca-50 dark:bg-marca-950/40 text-marca-700 dark:text-marca-400 border border-emerald-100' :
                                                                sale.margin >= 20 ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900' :
                                                                'bg-orange-50 text-orange-600 border border-orange-100'
                                                            }`}>
                                                                {sale.margin}%
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpandInvoice(sale.id)}
                                                                className="text-marca-700 dark:text-marca-400 hover:text-marca-800 dark:hover:text-marca-300 font-bold text-xs bg-marca-50 dark:bg-marca-950/40 hover:bg-marca-100 dark:hover:bg-marca-950/60 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                {isExpanded ? 'Ocultar' : 'Ver Items'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan="8" className="bg-stone-50/50 dark:bg-stone-900/50 p-4 border-t border-b border-stone-200 dark:border-stone-800">
                                                                <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 shadow-inner max-w-3xl mx-auto space-y-3">
                                                                    <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-2 mb-1">
                                                                        <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                                                                            Detalle de Items en Factura #{sale.id}
                                                                        </h4>
                                                                        {sale.supplement_cost > 0 && (
                                                                            <span className="text-[10px] font-black text-marca-700 dark:text-marca-400 bg-marca-50 dark:bg-marca-950/40 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-800 font-mono">
                                                                                Costo Suplementos: ${sale.supplement_cost.toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <table className="w-full text-left text-xs border-collapse">
                                                                        <thead>
                                                                            <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-500 font-bold uppercase">
                                                                                <th className="pb-2">Producto/Combo</th>
                                                                                <th className="pb-2 text-center">Cant</th>
                                                                                <th className="pb-2 text-right">Precio Unit.</th>
                                                                                <th className="pb-2 text-right">Costo Unit.</th>
                                                                                <th className="pb-2 text-right">Total Item</th>
                                                                                <th className="pb-2 text-right">Costo Total</th>
                                                                                <th className="pb-2 text-right text-marca-700 dark:text-marca-400 font-bold">Ganancia</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-stone-50 dark:divide-stone-900 text-stone-700 dark:text-stone-300">
                                                                            {sale.items.map((item, idx) => (
                                                                                <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/50">
                                                                                    <td className="py-2.5 font-medium text-stone-800 dark:text-stone-200">{item.product_name}</td>
                                                                                    <td className="py-2.5 text-center font-bold font-mono">{item.qty}</td>
                                                                                    <td className="py-2.5 text-right font-mono">${item.unit_price_usd.toFixed(2)}</td>
                                                                                    <td className="py-2.5 text-right font-mono text-stone-400 dark:text-stone-500 font-mono">${item.cost_price.toFixed(2)}</td>
                                                                                    <td className="py-2.5 text-right font-mono">${(item.unit_price_usd * item.qty).toFixed(2)}</td>
                                                                                    <td className="py-2.5 text-right font-mono text-stone-400 dark:text-stone-500 font-mono">${(item.cost_price * item.qty).toFixed(2)}</td>
                                                                                    <td className="py-2.5 text-right font-mono font-bold text-marca-700 dark:text-marca-400 font-mono">${item.profit_usd.toFixed(2)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {ventas.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="text-center py-10 text-stone-400 dark:text-stone-500">No hay ventas registradas en el periodo seleccionado.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* La lista llega por páginas: los totales de arriba
                                son del período completo, no de esta página. */}
                            {sales.links?.length > 3 && (
                                <nav className="flex flex-wrap justify-center gap-1.5 pt-5">
                                    {sales.links.map((enlace, indice) => (
                                        <Link
                                            key={indice}
                                            href={enlace.url ?? '#'}
                                            disabled={!enlace.url}
                                            preserveScroll
                                            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                                                enlace.active
                                                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                                    : enlace.url
                                                      ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400'
                                                      : 'cursor-default text-stone-400'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: enlace.label }}
                                        />
                                    ))}
                                </nav>
                            )}
                        </div>
                    )}

                    {/* TAB AJUSTES */}
                    {pageTab === 'ajustes' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 flex flex-col justify-between min-h-[300px]">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                                        Control de Pérdidas / Daños
                                    </h3>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                                        Registra productos dañados, roturas, reembolsos por mal estado o cualquier tipo de pérdida financiera (o ganancias adicionales) para descontarlo automáticamente del inventario y ajustar la ganancia neta.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleOpenModal}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-marca-700 dark:bg-marca-500 text-white font-bold rounded-xl shadow-md hover:bg-marca-800 dark:hover:bg-marca-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm cursor-pointer shadow-pink-100 mt-6 animate-pulse shadow-pink-500/10"
                                >
                                    + Registrar Ajuste / Pérdida
                                </button>
                            </div>

                            {/* Log de Ajustes Recientes */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 lg:col-span-2 flex flex-col max-h-[600px]">
                                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                                    Historial de Ajustes
                                </h3>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                    {adjustments.map(adj => (
                                        <div key={adj.id} className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/30 space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className={`font-bold px-2 py-0.5 rounded-full ${adj.type === 'loss' ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900' : 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900'}`}>
                                                    {adj.type === 'loss' ? 'Pérdida' : 'Ingreso Extra'}
                                                </span>
                                                <span className="font-mono text-stone-400 dark:text-stone-500 font-medium">
                                                    {new Date(adj.created_at).toLocaleDateString('es-VE')}
                                                </span>
                                            </div>
                                            {adj.concept && (
                                                <p className="text-[10px] font-extrabold text-marca-800 dark:text-marca-300 bg-marca-50 dark:bg-marca-950/40 px-2 py-0.5 rounded inline-block mt-0.5 border border-marca-100/30 dark:border-marca-950/30">
                                                    {adj.concept}
                                                </p>
                                            )}
                                            <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate mt-1">
                                                {adj.product ? adj.product.name : 'Ajuste General'}
                                            </p>
                                            <p className="text-[11px] text-stone-600 dark:text-stone-400 italic leading-snug">"{adj.reason}"</p>
                                            <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-stone-100 dark:border-stone-800 mt-1">
                                                <span className="text-stone-400 dark:text-stone-500">Cant: {adj.qty}</span>
                                                <span className={adj.type === 'loss' ? 'text-red-600 dark:text-red-400 font-mono' : 'text-green-600 dark:text-green-400 font-mono'}>
                                                    {adj.type === 'loss' ? '-' : '+'}${adj.amount_usd.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {adjustments.length === 0 && (
                                        <p className="text-center text-xs text-stone-400 dark:text-stone-500 py-10 italic">No hay ajustes financieros registrados.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para Crear Ajuste */}
            {showAdjustmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-scale-up">
                        <div className="px-6 py-4 bg-marca-50 dark:bg-marca-950/40 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                            <h3 className="font-extrabold text-marca-800 dark:text-marca-300 text-base flex items-center gap-1.5">
                                Registrar Ajuste Financiero
                            </h3>
                            <button onClick={() => setShowAdjustmentModal(false)} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 font-bold">✕</button>
                        </div>
                        <form onSubmit={handleSubmitAdjustment} className="p-6 space-y-4">
                            {/* Tipo de Ajuste */}
                            <div>
                                <InputLabel value="Tipo de Ajuste" className="mb-1.5" />
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setData(prev => ({ 
                                            ...prev, 
                                            type: 'loss', 
                                            concept: '',
                                            adjust_stock: false,
                                            amount_usd: prev.product_id ? (parseFloat(productos.find(p => p.id.toString() === prev.product_id.toString())?.cost_price || 0) * prev.qty).toFixed(2) : prev.amount_usd 
                                        }))}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${data.type === 'loss' ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 ring-2 ring-red-200' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
                                    >
                                        Pérdida / Daño
                                    </button>
                                            <button
                                        type="button"
                                        onClick={() => setData(prev => ({ ...prev, type: 'gain', concept: '', adjust_stock: false }))}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${data.type === 'gain' ? 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 border-green-300 ring-2 ring-green-200' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
                                    >
                                        Ganancia Adicional
                                    </button>
                                </div>
                            </div>

                            {/* Concepto del Ajuste */}
                            <div>
                                <InputLabel htmlFor="adj_concept" value="Concepto del Ajuste" className="mb-1.5" />
                                <select
                                    id="adj_concept"
                                    value={data.concept}
                                    onChange={(e) => handleConceptChange(e.target.value)}
                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-xs focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                    required
                                >
                                    <option value="">-- Seleccionar Concepto --</option>
                                    {data.type === 'loss' ? (
                                        <>
                                            <option value="Producto Dañado / Vencido">Producto dañado o vencido</option>
                                            <option value="Envío / Delivery Adicional">Envío / Delivery Adicional</option>
                                            <option value="Reembolso / Devolución">Reembolso / Devolución</option>
                                            <option value="Cortesía / Descuento Especial">Cortesía / Descuento Especial</option>
                                            <option value="Pérdida de Inventario / Faltante">Pérdida de Inventario / Faltante</option>
                                            <option value="Gasto Operativo / General (Alquiler, Luz, Internet)">Gasto Operativo / General (Alquiler, Luz, etc.)</option>
                                            <option value="Gasto de Embalaje / Papelería">Gasto de Embalaje / Papelería</option>
                                            <option value="Gastos de Transporte / Gasolina">Gastos de Transporte / Gasolina</option>
                                            <option value="Servicios / Marketing / Publicidad">Servicios / Marketing / Publicidad</option>
                                            <option value="Otros Gastos / Gastos Adicionales">Otros Gastos / Gastos Adicionales</option>
                                            <option value="Otro">❓ Otro (especificar en la descripción)</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Cobro de Delivery Extra">Cobro de Delivery Extra</option>
                                            <option value="Diferencia de Cambio / Caja">Diferencia de Cambio / Caja</option>
                                            <option value="Propina / Donación">✨ Propina / Donación</option>
                                            <option value="Otro">❓ Otro (especificar en la descripción)</option>
                                        </>
                                    )}
                                </select>
                                <InputError message={errors.concept} className="mt-1" />
                            </div>

                            {/* Selección de Producto */}
                            <div>
                                <InputLabel htmlFor="adj_product_id" value="Producto Relacionado (Opcional)" className="mb-1" />
                                <select
                                    id="adj_product_id"
                                    value={data.product_id}
                                    onChange={(e) => handleProductChange(e.target.value)}
                                    disabled={
                                        data.type === 'loss' && [
                                            'Gasto Operativo / General (Alquiler, Luz, Internet)',
                                            'Gasto de Embalaje / Papelería',
                                            'Gastos de Transporte / Gasolina',
                                            'Servicios / Marketing / Publicidad',
                                            'Otros Gastos / Gastos Adicionales'
                                        ].includes(data.concept)
                                    }
                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <option value="">-- Ninguno (Ajuste General) --</option>
                                    {productos.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Costo: ${p.cost_price.toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                                {data.type === 'loss' && [
                                    'Gasto Operativo / General (Alquiler, Luz, Internet)',
                                    'Gasto de Embalaje / Papelería',
                                    'Gastos de Transporte / Gasolina',
                                    'Servicios / Marketing / Publicidad',
                                    'Otros Gastos / Gastos Adicionales'
                                ].includes(data.concept) && (
                                    <p className="text-[10px] text-marca-700 dark:text-marca-400 mt-1 font-semibold">
                                        Este concepto corresponde a un gasto general y no se relaciona a ningún producto.
                                    </p>
                                )}
                                <InputError message={errors.product_id} className="mt-1" />
                            </div>

                            {/* Descontar Stock Checkbox */}
                            {data.type === 'loss' && data.product_id && (
                                <div className="p-3 bg-marca-50/30 dark:bg-marca-950/30 rounded-xl border border-marca-100/50 dark:border-marca-950/50">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={data.adjust_stock}
                                            onChange={e => setData('adjust_stock', e.target.checked)}
                                            className="w-4 h-4 text-marca-700 dark:text-marca-400 border-stone-300 dark:border-stone-700 rounded focus:ring-marca-600 dark:focus:ring-marca-400 focus:ring-opacity-25"
                                        />
                                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">¿Descontar unidades del stock disponible del producto?</span>
                                    </label>
                                </div>
                            )}

                            {/* Fila Cantidad y Monto USD */}
                            <div className={data.product_id ? "grid grid-cols-2 gap-4" : "block"}>
                                {data.product_id && (
                                    <div>
                                        <InputLabel htmlFor="adj_qty" value="Cantidad de Unidades" className="mb-1" />
                                        <TextInput
                                            id="adj_qty"
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={data.qty}
                                            onChange={(e) => handleQtyChange(e.target.value)}
                                            className="w-full text-xs"
                                            required
                                        />
                                        <InputError message={errors.qty} className="mt-1" />
                                    </div>
                                )}

                                <div className={data.product_id ? "" : "w-full"}>
                                    <InputLabel htmlFor="adj_amount_usd" value="Monto del Ajuste (USD)" className="mb-1" />
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs font-mono font-bold">$</span>
                                        <TextInput
                                            id="adj_amount_usd"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={data.amount_usd}
                                            onChange={(e) => setData('amount_usd', e.target.value)}
                                            className="w-full pl-7 font-mono text-xs"
                                            required
                                        />
                                    </div>
                                    <InputError message={errors.amount_usd} className="mt-1" />
                                </div>
                            </div>

                            {/* Razón */}
                            <div>
                                <InputLabel htmlFor="adj_reason" value="Razón / Detalle del Ajuste" className="mb-1" />
                                <textarea
                                    id="adj_reason"
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none resize-none"
                                    rows={3}
                                    placeholder="Detalla qué sucedió: ej. Se quedó un producto y hubo que enviar otro delivery, etc..."
                                    required
                                />
                                <InputError message={errors.reason} className="mt-1" />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                                <SecondaryButton type="button" onClick={() => setShowAdjustmentModal(false)}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton disabled={processing} type="submit">
                                    Registrar Ajuste
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Editar Financieros del Producto */}
            {showFinancialsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-scale-up">
                        <div className="px-6 py-4 bg-marca-50 dark:bg-marca-950/40 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                            <h3 className="font-extrabold text-marca-800 dark:text-marca-300 text-base flex items-center gap-1.5">
                                Editar Datos Financieros
                            </h3>
                            <button onClick={() => setShowFinancialsModal(false)} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 font-bold">✕</button>
                        </div>
                        
                        <form onSubmit={handleSubmitFinancials} className="p-6 space-y-4">
                            {/* Producto Info Card */}
                            <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center gap-3">
                                {(() => {
                                    const prod = productos.find(p => p.id === financialsForm.data.product_id);
                                    return (
                                        <>
                                            {prod?.image_path ? (
                                                <img src={`/storage/${prod.image_path}`} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-stone-200 dark:border-stone-800" />
                                            ) : (
                                                <div className="w-10 h-10 bg-marca-100 dark:bg-marca-950/60 rounded-lg flex items-center justify-center text-lg text-marca-600 dark:text-marca-400"></div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{prod?.name || 'Cargando...'}</h4>
                                                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500">Stock Actual: {prod?.stock || 0} uds</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="bg-marca-50/40 dark:bg-marca-950/40 border border-marca-100/50 dark:border-marca-950/50 rounded-xl p-3 text-[11px] text-marca-800 dark:text-marca-300 leading-relaxed">
                                <strong>El costo es el de hoy.</strong> Cambiarlo no toca las ventas ya emitidas: cada factura
                                guardó el costo que tenía el producto ese día. Para subir tu inversión, registra abajo la
                                compra con el costo que pagaste.
                            </div>

                            {/* Costo Unitario */}
                            <div>
                                <InputLabel htmlFor="fin_cost_price" value="Costo Unitario (USD)" className="mb-1" />
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs font-mono font-bold">$</span>
                                    <TextInput
                                        id="fin_cost_price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={financialsForm.data.cost_price}
                                        onChange={(e) => financialsForm.setData('cost_price', e.target.value)}
                                        className="w-full pl-7 font-mono"
                                        required
                                    />
                                </div>
                                <InputError message={financialsForm.errors.cost_price} className="mt-1" />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                                <SecondaryButton type="button" onClick={() => setShowFinancialsModal(false)}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton disabled={financialsForm.processing} type="submit">
                                    Guardar costo
                                </PrimaryButton>
                            </div>
                        </form>

                        {/* Registrar una compra: esto es lo que suma la inversión */}
                        <form onSubmit={handleSubmitCompra} className="px-6 pb-6 pt-5 space-y-4 border-t border-stone-200 dark:border-stone-800">
                            <div>
                                <h4 className="font-extrabold text-stone-800 dark:text-stone-200 text-sm">Registrar una compra</h4>
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                                    Cada vez que compras mercancía, anótala aquí con lo que te costó ese día.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="compra_qty" value="Cantidad" className="mb-1" />
                                    <TextInput
                                        id="compra_qty"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={compraForm.data.qty}
                                        onChange={(e) => compraForm.setData('qty', e.target.value)}
                                        className="w-full font-mono"
                                        required
                                    />
                                    <InputError message={compraForm.errors.qty} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="compra_costo" value="Costo por unidad (USD)" className="mb-1" />
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs font-mono font-bold">$</span>
                                        <TextInput
                                            id="compra_costo"
                                            type="number"
                                            min="0.0001"
                                            step="0.01"
                                            value={compraForm.data.unit_cost}
                                            onChange={(e) => compraForm.setData('unit_cost', e.target.value)}
                                            className="w-full pl-7 font-mono"
                                            required
                                        />
                                    </div>
                                    <InputError message={compraForm.errors.unit_cost} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="compra_fecha" value="Fecha" className="mb-1" />
                                    <TextInput
                                        id="compra_fecha"
                                        type="date"
                                        value={compraForm.data.purchased_at}
                                        onChange={(e) => compraForm.setData('purchased_at', e.target.value)}
                                        className="w-full"
                                    />
                                    <InputError message={compraForm.errors.purchased_at} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="compra_nota" value="Nota (opcional)" className="mb-1" />
                                    <TextInput
                                        id="compra_nota"
                                        type="text"
                                        maxLength={160}
                                        placeholder="Proveedor, factura..."
                                        value={compraForm.data.note}
                                        onChange={(e) => compraForm.setData('note', e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
                                <input
                                    type="checkbox"
                                    checked={compraForm.data.sumar_stock}
                                    onChange={(e) => compraForm.setData('sumar_stock', e.target.checked)}
                                    className="rounded border-stone-300 text-marca-700 focus:ring-marca-600 dark:border-stone-600 dark:bg-stone-950"
                                />
                                Sumar estas unidades al inventario
                            </label>

                            <div className="flex items-center justify-between gap-3 pt-1">
                                <span className="font-mono text-sm font-black text-stone-700 dark:text-stone-300">
                                    Total: ${(Number(compraForm.data.qty || 0) * Number(compraForm.data.unit_cost || 0)).toFixed(2)}
                                </span>
                                <PrimaryButton disabled={compraForm.processing} type="submit">
                                    Registrar compra
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AuthenticatedLayout>
    );
}
