import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BotonDeTutorial } from '@/Components/Tutorial';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';

const PRICE_LABELS = { detal: 'Detal', mayor: 'Mayor', distribuidor: 'Distribuidor', custom: 'Personalizado' };

const PRINT_STYLE = `
@media print {
    body * { visibility: hidden !important; }
    #recibo-print, #recibo-print * { visibility: visible !important; }
    #recibo-print { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; }
    .no-print { display: none !important; }
}
`;

export default function Show({ auth, factura, plantilla }) {
    const items = factura.items || [];
    const isConfirmed = factura.status === 'confirmed';

    const groupedItems = React.useMemo(() => {
        const groups = [];
        items.forEach(item => {
            const hasVariants = (item.product && item.product.variants && item.product.variants.length > 0) || !!item.product_variant_id || !!item.variant;
            if (item.product_id && hasVariants) {
                const existingGroup = groups.find(g => g.product_id === item.product_id && g.type === 'product_group');
                if (existingGroup) {
                    existingGroup.qty += parseFloat(item.qty);
                    existingGroup.subtotal_usd += parseFloat(item.subtotal_usd);
                    existingGroup.variants.push(item);
                } else {
                    groups.push({
                        type: 'product_group',
                        product_id: item.product_id,
                        product_name: item.product_name,
                        product_image_path: item.product_image_path,
                        price_type: item.price_type,
                        unit_price_usd: item.unit_price_usd,
                        qty: parseFloat(item.qty),
                        subtotal_usd: parseFloat(item.subtotal_usd),
                        variants: [item]
                    });
                }
            } else {
                groups.push(item);
            }
        });
        return groups;
    }, [items]);

    const confirmar = () => {
        Swal.fire({
            title: '¿Confirmar Factura?',
            html: `<p class="text-sm text-stone-600 dark:text-stone-400">Se <strong>descontará el stock</strong> de los productos registrados en el sistema.<br/>Esta acción no se puede deshacer.</p>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '✓ Confirmar y Descontar Stock',
            cancelButtonText: 'Cancelar',
        }).then(result => {
            if (result.isConfirmed) {
                router.post(route('facturas.confirmar', factura.id), {}, {
                    onSuccess: (page) => {
                        const flash = page.props.flash;
                        if (flash?.error) {
                            Swal.fire({
                                icon: 'error',
                                title: 'No se puede confirmar',
                                text: flash.error,
                                confirmButtonColor: '#db2777',
                                confirmButtonText: 'Entendido'
                            });
                        } else {
                            Swal.fire({
                                icon: 'success',
                                title: '¡Confirmada!',
                                text: flash?.success || 'Stock descontado correctamente.',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        }
                    },
                    onError: (errors) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error al procesar',
                            text: Object.values(errors).join('\n'),
                            confirmButtonColor: '#db2777'
                        });
                    }
                });
            }
        });
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('es-VE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const downloadImage = () => {
        const input = document.getElementById('recibo-print');
        if (!input) return;

        Swal.fire({
            title: 'Generando imagen...',
            html: 'Por favor espera un momento.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Guardar estilos originales
        const originalStyle = input.getAttribute('style') || '';
        
        // Forzar un ancho estándar para que la imagen tenga proporciones uniformes de factura
        input.style.width = '700px';
        input.style.maxWidth = '700px';

        // Configuración para captura en alta calidad con soporte CORS y simulación de pantalla de escritorio
        const options = {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            windowWidth: 800, // Fuerza la evaluación de media queries responsivas (ej. sm:) en modo desktop
        };

        // Esperar un instante para que el navegador aplique los estilos antes de realizar la captura
        setTimeout(() => {
            html2canvas(input, options).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `factura_${factura.id}.png`;
                link.href = imgData;
                link.click();
                
                // Restaurar estilos originales
                input.setAttribute('style', originalStyle);
                Swal.close();

                Swal.fire({
                    icon: 'success',
                    title: '¡Descargada!',
                    text: 'La factura ha sido descargada como imagen estándar.',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }).catch((err) => {
                // Asegurar restauración en caso de fallo
                input.setAttribute('style', originalStyle);
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo generar la imagen de la factura.'
                });
                console.error('html2canvas error', err);
            });
        }, 150);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.visit(route('facturas.index'))} className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <h2 className="font-bold text-xl text-stone-800 dark:text-stone-200">Factura #{factura.id}</h2>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                            factura.status === 'confirmed' ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' :
                            factura.status === 'pending_variants' ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800' :
                            'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                        }`}>
                            {factura.status === 'confirmed' ? '✓ Confirmada' :
                             factura.status === 'pending_variants' ? '⏳ Pendiente Variantes' :
                             '⏳ Borrador'}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 no-print w-full md:w-auto">
                        <button
                            onClick={() => router.patch(route('facturas.toggle-variants-receipt', factura.id), {}, { preserveScroll: true })}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-black rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer w-full sm:w-auto"
                        >
                            <span>{factura.show_variants_in_receipt !== false ? 'Ocultar Variantes en Recibo' : 'Mostrar Variantes en Recibo'}</span>
                        </button>
                        <button
                            onClick={downloadImage}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-marca-50 dark:bg-marca-950/40 text-marca-800 dark:text-marca-300 text-xs font-black rounded-xl hover:bg-marca-100 dark:hover:bg-marca-950/60 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer w-full sm:w-auto"
                        >
                            Descargar Imagen
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 text-xs font-black rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-800 cursor-pointer w-full sm:w-auto"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                            </svg>
                            Imprimir
                        </button>
                        {!isConfirmed && (
                            <>
                                <button
                                    onClick={() => router.visit(route('facturas.edit', factura.id))}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-marca-700 dark:bg-marca-500 text-white text-xs font-black rounded-xl hover:bg-marca-800 dark:hover:bg-marca-400 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Editar Factura
                                </button>
                                <button
                                    onClick={confirmar}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    Confirmar y Descontar Stock
                                </button>
                            </>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Factura #${factura.id}`} />
            <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />
 
            <div className="py-4 sm:py-8">
                <div className="max-w-3xl mx-auto px-2 sm:px-6 lg:px-8">
                    <div id="recibo-print" className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">

                        {/* Encabezado del recibo (Fondo Blanco) */}
                        <div className="px-3 sm:px-8 py-6 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {plantilla?.show_logo && plantilla?.logo_url && (
                                        <img
                                            src={plantilla.logo_url}
                                            alt=""
                                            className="h-9 sm:h-12 w-auto"
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                    )}
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                                            {plantilla?.business_name || 'Comprobante'}
                                        </h1>
                                        <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">
                                            {[plantilla?.tax_id, plantilla?.phone].filter(Boolean).join(' · ') || 'Comprobante de Venta'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${
                                            factura.status === 'confirmed' ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' :
                                            factura.status === 'pending_variants' ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800' :
                                            'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                                        }`}>
                                            {factura.status === 'confirmed' ? '✓ CONFIRMADA' :
                                             factura.status === 'pending_variants' ? '⏳ PENDIENTE VARIANTES' :
                                             '⏳ BORRADOR'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Fechas integradas */}
                            <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap gap-4 sm:gap-8 text-xs sm:text-sm">
                                <div>
                                    <span className="text-stone-400 dark:text-stone-500 font-bold uppercase text-[10px] sm:text-xs tracking-wider block">Fecha de Emisión</span>
                                    <span className="font-semibold text-stone-800 dark:text-stone-200">{formatDate(factura.created_at)}</span>
                                </div>
                                {isConfirmed && (
                                    <div>
                                        <span className="text-stone-400 dark:text-stone-500 font-bold uppercase text-[10px] sm:text-xs tracking-wider block">Fecha de Confirmación</span>
                                        <span className="font-semibold text-stone-800 dark:text-stone-200">{formatDate(factura.confirmed_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Datos del cliente */}
                        <div className="px-3 sm:px-8 py-4 sm:py-5 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    {(factura.client_name || factura.client_phone || factura.notes) && (
                                    <h3 className="text-[10px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">Datos del Cliente</h3>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                        {factura.client_name && (
                                            <div>
                                                <span className="text-stone-500 dark:text-stone-400">Nombre:</span>
                                                <span className="ml-1.5 font-semibold text-stone-800 dark:text-stone-200">{factura.client_name}</span>
                                            </div>
                                        )}
                                        {factura.client_phone && (
                                            <div>
                                                <span className="text-stone-500 dark:text-stone-400">Teléfono:</span>
                                                <span className="ml-1.5 font-semibold text-stone-800 dark:text-stone-200">{factura.client_phone}</span>
                                            </div>
                                        )}
                                        {factura.notes && (
                                            <div className="sm:col-span-2">
                                                <span className="text-stone-500 dark:text-stone-400">Notas:</span>
                                                <span className="ml-1.5 text-stone-700 dark:text-stone-300">{factura.notes}</span>
                                            </div>
                                        )}
                                        {/* Lo que necesita quien reparte, junto al resto de los datos */}
                                        {(factura.delivery?.point_a || factura.delivery?.point_b) && (
                                            <div className="sm:col-span-2">
                                                <span className="text-stone-500 dark:text-stone-400">Entrega:</span>
                                                <span className="ml-1.5 text-stone-700 dark:text-stone-300">
                                                    {factura.delivery.point_a || 'Sin punto de salida'}
                                                    <span className="mx-1.5 text-stone-400 dark:text-stone-500">→</span>
                                                    {factura.delivery.point_b || 'Sin punto de llegada'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-2.5">N° de Orden</span>
                                    <span className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-mono">Orden #{factura.id}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabla de items */}
                        <div className="px-3 sm:px-8 py-4 sm:py-6">
                            <h3 className="text-[10px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3.5">Detalle de Productos / Servicios</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-stone-200 dark:border-stone-800 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                            <th className="py-2 px-1 text-left font-bold w-5 sm:w-6">#</th>
                                            <th className="py-2 px-1 text-left font-bold">Descripción</th>
                                            <th className="py-2 px-1 text-right font-bold w-10 sm:w-12">Cant.</th>
                                            <th className="py-2 px-1 text-right font-bold w-14 sm:w-20">Precio</th>
                                            <th className="py-2 px-1 text-right font-bold w-16 sm:w-24">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50 dark:divide-stone-900">
                                        {groupedItems.map((item, idx) => {
                                            const isGroup = item.type === 'product_group';
                                            const qty = isGroup ? item.qty : item.qty;
                                            const unitPrice = isGroup ? item.unit_price_usd : item.unit_price_usd;
                                            const subtotal = isGroup ? item.subtotal_usd : item.subtotal_usd;

                                            const isOldComboSubproduct = !isGroup && !item.combo_id && item.product_id && item.product_name && item.product_name.startsWith('└─');
                                            const isComboItem = isGroup ? false : (!!item.combo_id || isOldComboSubproduct);
                                            const hidePriceDetails = isOldComboSubproduct;
                                            return (
                                                <tr key={isGroup ? `group_${item.product_id}` : item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                                                    <td className="py-2.5 sm:py-3 px-1 text-stone-400 dark:text-stone-500 font-mono text-[10px] sm:text-xs">{idx + 1}</td>
                                                    <td className="py-2.5 sm:py-3 px-1">
                                                        <div className="font-semibold text-stone-800 dark:text-stone-200 text-xs sm:text-sm leading-snug">
                                                            {item.product_name}
                                                            {!isGroup && factura.show_variants_in_receipt !== false && item.variant && (
                                                                <span className="ml-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-marca-100 dark:bg-marca-950/60 text-marca-800 dark:text-marca-300 border border-stone-200 dark:border-stone-800">
                                                                    {item.variant.label}
                                                                </span>
                                                            )}
                                                            {isGroup && factura.show_variants_in_receipt !== false && item.variants && item.variants.length > 0 && (
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {item.variants.map(v => (
                                                                        <span key={v.id} className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-marca-50 dark:bg-marca-950/40 text-marca-800 dark:text-marca-300 border border-marca-100/60 dark:border-marca-950/60">
                                                                            {v.variant ? v.variant.label : 'Pendiente'} ({parseInt(v.qty)})
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                            {!isGroup && !item.product_id && (
                                                                <span className="text-[9px] sm:text-[10px] text-stone-400 dark:text-stone-500 italic">Item manual</span>
                                                            )}
                                                            {!isComboItem && (
                                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${
                                                                    item.price_type === 'detal'        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900' :
                                                                    item.price_type === 'mayor'        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' :
                                                                    item.price_type === 'distribuidor' ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800' :
                                                                                                          'bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                                                                }`}>
                                                                    {PRICE_LABELS[item.price_type] || item.price_type}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm">{qty}</td>
                                                    <td className="py-2.5 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm">
                                                        {hidePriceDetails ? '—' : `$${parseFloat(unitPrice).toFixed(2)}`}
                                                    </td>
                                                    <td className="py-2.5 sm:py-3 px-1 text-right font-mono font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                                                        {hidePriceDetails ? '—' : `$${parseFloat(subtotal).toFixed(2)}`}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totales */}
                        <div className="px-3 sm:px-8 py-4 sm:py-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
                            <div className="flex justify-end">
                                <div className="w-full max-w-xs space-y-2">
                                    <div className="flex justify-between text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                                        <span>Subtotal</span>
                                        <span className="font-mono">${parseFloat(factura.subtotal_usd).toFixed(2)}</span>
                                    </div>
                                    {parseFloat(factura.discount_usd) > 0 && (
                                        <div className="flex justify-between text-xs sm:text-sm text-green-600 dark:text-green-400">
                                            <span>Descuento</span>
                                            <span className="font-mono">-${parseFloat(factura.discount_usd).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {parseFloat(factura.shipping_usd) > 0 && (
                                        <div className="flex justify-between text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                                            <span>Envío / Embalaje</span>
                                            <span className="font-mono">${parseFloat(factura.shipping_usd).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 border-t-2 border-stone-200 dark:border-stone-800 pt-2.5 mt-2">
                                        <span>TOTAL</span>
                                        <span className="font-mono">${parseFloat(factura.total_usd).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm sm:text-base font-bold text-marca-800 dark:text-marca-300 bg-marca-50 dark:bg-marca-950/40 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
                                        <span>Total en Bolívares</span>
                                        <span className="font-mono">Bs. {parseFloat(factura.total_bs).toFixed(2)}</span>
                                    </div>
                                    {factura.has_delivery_fee && parseFloat(factura.delivery_bs) > 0 && (
                                        <div className="space-y-1.5 mt-2 p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-800">
                                            <div className="flex justify-between text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300">
                                                <span>Costo Delivery</span>
                                                <span className="font-mono">Bs. {parseFloat(factura.delivery_bs).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm sm:text-base font-black text-stone-900 dark:text-stone-200 border-t border-stone-200/60 dark:border-stone-900/60 pt-1.5 mt-1">
                                                <span>TOTAL MÁS DELIVERY</span>
                                                <span className="font-mono">Bs. {(parseFloat(factura.total_bs) + parseFloat(factura.delivery_bs)).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer del recibo */}
                        <div className="px-3 sm:px-8 py-4 sm:py-5 text-center border-t border-stone-200 dark:border-stone-800">
                            <p className="text-xs text-stone-400 dark:text-stone-500">{plantilla?.footer_note || 'Gracias por su compra'}</p>
                            {!isConfirmed && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                    {factura.status === 'pending_variants'
                                        ? 'Esta factura está pagada pero pendiente por confirmar variantes. Por favor edita y confirma para descontar stock.'
                                        : 'Este es un borrador. Confirma para descontar el stock automáticamente.'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción (no se imprimen) */}
                    {!isConfirmed && (
                        <div className="mt-4 no-print flex flex-col items-center gap-3 px-4 sm:flex-row sm:justify-center">
                            <button
                                onClick={confirmar}
                                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-colors shadow-lg text-sm sm:text-base w-full sm:w-auto"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                                </svg>
                                Confirmar y Descontar Stock
                            </button>

                            <BotonDeTutorial nombre="facturas" className="w-full sm:w-auto">
                                ¿Qué pasa al confirmar?
                            </BotonDeTutorial>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
