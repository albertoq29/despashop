import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import Modal from '@/Components/Modal';

// Inyectar keyframes globales una sola vez
const PRICE_ANIM_STYLE = `
@keyframes strike-shake {
    0%   { transform: translateX(0) rotate(0deg); }
    15%  { transform: translateX(-4px) rotate(-2deg); }
    30%  { transform: translateX(4px) rotate(2deg); }
    45%  { transform: translateX(-3px) rotate(-1deg); }
    60%  { transform: translateX(3px) rotate(1deg); }
    75%  { transform: translateX(-1px); }
    100% { transform: translateX(0) rotate(0deg); }
}
@keyframes strike-line {
    0%   { width: 0%; opacity: 0; }
    60%  { width: 110%; opacity: 1; }
    100% { width: 110%; opacity: 1; }
}
@keyframes price-in {
    0%   { opacity: 0; transform: translateY(6px) scale(0.85); }
    60%  { transform: translateY(-2px) scale(1.08); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes badge-pop {
    0%   { opacity: 0; transform: scale(0.5); }
    70%  { transform: scale(1.15); }
    100% { opacity: 1; transform: scale(1); }
}
.price-strike-wrap {
    position: relative;
    display: inline-block;
}
.price-strike-wrap.shaking {
    animation: strike-shake 0.45s ease forwards;
}
.price-strike-wrap::after {
    content: '';
    position: absolute;
    left: -5%;
    top: 50%;
    height: 2.5px;
    width: 0%;
    background: #ef4444;
    transform: rotate(-8deg) translateY(-50%);
    border-radius: 2px;
    opacity: 0;
}
.price-strike-wrap.struck::after {
    animation: strike-line 0.35s ease 0.35s forwards;
}
.price-strike-wrap.struck {
    color: #9ca3af !important;
    transition: color 0.25s ease 0.4s;
}
.new-price-appear {
    animation: price-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
}
.discount-badge-pop {
    animation: badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.5s both;
}
`;

// Hook para detectar cambio de precio con animación
function usePriceAnimation(price) {
    const [animKey, setAnimKey] = useState(0);
    const [isStruck, setIsStruck] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const prevPriceRef = useRef(price);
    const timerRef = useRef(null);

    useEffect(() => {
        if (prevPriceRef.current !== price && prevPriceRef.current !== null) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setIsShaking(true);
            setIsStruck(false);
            timerRef.current = setTimeout(() => {
                setIsShaking(false);
                setIsStruck(true);
                timerRef.current = setTimeout(() => {
                    setAnimKey(k => k + 1);
                    prevPriceRef.current = price;
                }, 500);
            }, 450);
        } else {
            prevPriceRef.current = price;
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [price]);

    return { animKey, isStruck, isShaking };
}
const normalizeText = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export default function Welcome({ canLogin, productos, combos = [], bcvRate, settings, categories, filters }) {
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [verCombos, setVerCombos] = useState(true);
    
    // Para modal de detalles
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const [search, setSearch] = useState(filters?.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters?.category_id || '');
    const [priceSort, setPriceSort] = useState('');

    const sortedProducts = useMemo(() => {
        let items = productos.map(p => ({ ...p, _isCombo: false }));
        if (priceSort === 'asc') {
            items.sort((a, b) => parseFloat(a.price_usdt || 0) - parseFloat(b.price_usdt || 0));
        } else if (priceSort === 'desc') {
            items.sort((a, b) => parseFloat(b.price_usdt || 0) - parseFloat(a.price_usdt || 0));
        } else {
            items.sort((a, b) => {
                if (a.stock > 0 && b.stock === 0) return -1;
                if (a.stock === 0 && b.stock > 0) return 1;
                return 0;
            });
        }
        return items;
    }, [productos, priceSort]);

    const sortedCombos = useMemo(() => {
        let items = (combos || []).map(c => ({ ...c, _isCombo: true, categories: [] })).filter(c => {
            if (!search) return true;
            const cleanTerm = normalizeText(search);
            return normalizeText(c.name).includes(cleanTerm) || 
                   (c.description && normalizeText(c.description).includes(cleanTerm));
        });
        if (priceSort === 'asc') {
            items.sort((a, b) => parseFloat(a.price_usdt || 0) - parseFloat(b.price_usdt || 0));
        } else if (priceSort === 'desc') {
            items.sort((a, b) => parseFloat(b.price_usdt || 0) - parseFloat(a.price_usdt || 0));
        }
        return items;
    }, [combos, search, priceSort]);

    const similarProducts = useMemo(() => {
        if (!selectedProduct || selectedProduct._isCombo || !selectedProduct.categories) return [];
        const catIds = selectedProduct.categories.map(c => c.id);
        if (catIds.length === 0) return [];
        return productos.filter(p => 
            p.id !== selectedProduct.id &&
            p.categories &&
            p.categories.some(cat => catIds.includes(cat.id))
        ).slice(0, 6);
    }, [selectedProduct, productos]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('catalogo.privado'), { search, category_id: selectedCategory }, { preserveState: true, preserveScroll: true });
    };

    const handleCategoryClick = (id) => {
        const newCat = id === '' ? '' : (selectedCategory === id.toString() ? '' : id.toString());
        setSelectedCategory(newCat);
        router.get(route('catalogo.privado'), { search, category_id: newCat }, { preserveState: true, preserveScroll: true });
    };

    // Valores de Configuración de Promociones
    const globalDiscount = parseFloat(settings?.global_discount || 0);
    const forceWholesale = settings?.force_wholesale === '1' || settings?.force_wholesale === 'true';
    const forceDistributor = settings?.force_distributor === '1' || settings?.force_distributor === 'true';

    // Funciones del Carrito
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && !!item._isCombo === !!product._isCombo);
            if (existing) {
                if (existing.qty >= product.stock) {
                    Swal.fire({ icon: 'error', title: 'Oops...', text: 'No hay más unidades en stock', timer: 1500 });
                    return prev;
                }
                return prev.map(item => (item.id === product.id && !!item._isCombo === !!product._isCombo) ? { ...item, qty: item.qty + 1 } : item);
            }
            if (product.stock > 0) {
                 Swal.fire({ position: 'top-end', icon: 'success', title: 'Añadido al carrito', showConfirmButton: false, timer: 1000, toast: true });
                 return [...prev, { ...product, qty: 1, priceMode: 'detal' }];
            }
            Swal.fire({ icon: 'error', title: 'Oops...', text: 'Producto agotado', timer: 1500 });
            return prev;
        });
    };

    const setPriceMode = (id, mode, _isCombo = false) => {
        setCart(prev => prev.map(item => (item.id === id && !!item._isCombo === !!_isCombo) ? { ...item, priceMode: mode } : item));
    };

    const updateQty = (id, newQty, stock, _isCombo = false) => {
        if (newQty < 1) {
            removeFromCart(id, _isCombo);
            return;
        }
        if (newQty > stock) {
            Swal.fire({ icon: 'warning', text: 'Stock máximo alcanzado', timer: 1000 });
            return;
        }
        setCart(prev => prev.map(item => (item.id === id && !!item._isCombo === !!_isCombo) ? { ...item, qty: newQty } : item));
    };

    const removeFromCart = (id, _isCombo = false) => setCart(prev => prev.filter(item => !(item.id === id && !!item._isCombo === !!_isCombo)));

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setCurrentImageIndex(0);
    };

    const closeProductModal = () => {
        setSelectedProduct(null);
        setCurrentImageIndex(0);
    };

    const nextImage = () => {
        if (!selectedProduct) return;
        const totalImages = 1 + (selectedProduct.images ? selectedProduct.images.length : 0);
        setCurrentImageIndex((prev) => (prev + 1) % totalImages);
    };

    const prevImage = () => {
        if (!selectedProduct) return;
        const totalImages = 1 + (selectedProduct.images ? selectedProduct.images.length : 0);
        setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
    };

    // Cálculos de Precios con Lógica de Negocio
    const cartAnalysis = useMemo(() => {
        let subtotalUsd = 0;
        let calculatedItems = [];

        cart.forEach(item => {
            let unitPrice = parseFloat(item.price_usdt);
            let appliedRule = 'Detal';
            let lineTotalUsd = 0;

            if (forceDistributor) {
                unitPrice = parseFloat(item.price_distribuidor_usdt || item.price_usdt);
                appliedRule = 'Mega Promoción Dist.';
                lineTotalUsd = unitPrice * item.qty;
                subtotalUsd += lineTotalUsd;
                calculatedItems.push({ ...item, appliedPriceUsd: unitPrice, appliedPriceBs: unitPrice * bcvRate, lineTotalUsd, lineTotalBs: lineTotalUsd * bcvRate, appliedRule, breakdown: [{ qty: item.qty, rule: appliedRule, priceUsd: unitPrice, totalUsd: lineTotalUsd }] });
                return;
            }
            if (forceWholesale) {
                unitPrice = parseFloat(item.price_mayor_usdt || item.price_usdt);
                appliedRule = 'Mega Promoción Mayor.';
                lineTotalUsd = unitPrice * item.qty;
                subtotalUsd += lineTotalUsd;
                calculatedItems.push({ ...item, appliedPriceUsd: unitPrice, appliedPriceBs: unitPrice * bcvRate, lineTotalUsd, lineTotalBs: lineTotalUsd * bcvRate, appliedRule, breakdown: [{ qty: item.qty, rule: appliedRule, priceUsd: unitPrice, totalUsd: lineTotalUsd }] });
                return;
            }

            // Precio según modo MANUAL elegido por el usuario
            const mode = item.priceMode || 'detal';
            if (mode === 'distribuidor' && item.price_distribuidor_usdt) {
                unitPrice = parseFloat(item.price_distribuidor_usdt);
                appliedRule = 'Distribuidor';
            } else if (mode === 'mayor' && item.price_mayor_usdt) {
                unitPrice = parseFloat(item.price_mayor_usdt);
                appliedRule = 'Mayor';
            } else {
                unitPrice = parseFloat(item.price_usdt);
                appliedRule = 'Detal';
            }

            let qtyToProcess = item.qty;
            let breakdown = [];

            // Promos condicionales solo en modo detal
            if (mode === 'detal') {
                let c_price = parseFloat(item.conditional_price);
                let c_qty = parseInt(item.conditional_min_quantity);
                if (!isNaN(c_price) && !isNaN(c_qty) && c_qty > 0 && qtyToProcess >= c_qty) {
                    let bundlesApplied = Math.floor(qtyToProcess / c_qty);
                    let promoQty = bundlesApplied * c_qty;
                    let promoTotal = bundlesApplied * c_price;
                    lineTotalUsd += promoTotal;
                    qtyToProcess -= promoQty;
                    breakdown.push({ qty: promoQty, rule: `Promo ${c_qty}x$${c_price.toFixed(2)}`, priceUsd: promoTotal / promoQty, totalUsd: promoTotal });
                    appliedRule = `Promo ${c_qty}x$${c_price.toFixed(2)} (${bundlesApplied}x)`;
                }
            }

            if (qtyToProcess > 0) {
                let remTotal = qtyToProcess * unitPrice;
                lineTotalUsd += remTotal;
                breakdown.push({ qty: qtyToProcess, rule: appliedRule, priceUsd: unitPrice, totalUsd: remTotal });
                if (breakdown.length > 1) appliedRule += ` + ${qtyToProcess} al Detal`;
            }

            const finalUnitPrice = lineTotalUsd / item.qty;
            subtotalUsd += lineTotalUsd;
            calculatedItems.push({
                ...item,
                appliedPriceUsd: finalUnitPrice,
                appliedPriceBs: finalUnitPrice * bcvRate,
                lineTotalUsd,
                lineTotalBs: lineTotalUsd * bcvRate,
                appliedRule,
                breakdown
            });
        });

        const discountAmountUsd = subtotalUsd * (globalDiscount / 100);
        const totalUsd = subtotalUsd - discountAmountUsd;
        const totalBs = totalUsd * bcvRate;

        return {
            items: calculatedItems,
            subtotalUsd,
            discountAmountUsd,
            totalUsd,
            totalBs,
            totalItems: cart.reduce((sum, item) => sum + item.qty, 0),
        };

    }, [cart, forceWholesale, forceDistributor, globalDiscount, bcvRate]);

    const checkout = async () => {
        if (cartAnalysis.items.length === 0) return;

        Swal.fire({
            title: 'Enviando pedido...',
            text: 'Estamos registrando tu pedido y preparando el WhatsApp',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            let finalItems = [];
            cartAnalysis.items.forEach(item => {
                if (item.breakdown && item.breakdown.length > 0) {
                    item.breakdown.forEach(b => {
                        finalItems.push({
                            id: item.id,
                            qty: b.qty,
                            appliedPriceUsd: b.priceUsd,
                            appliedPriceBs: b.priceUsd * bcvRate,
                            name: `${item.name} (${b.rule})`
                        });
                    });
                } else {
                    finalItems.push({
                        id: item.id,
                        qty: item.qty,
                        appliedPriceUsd: item.appliedPriceUsd,
                        appliedPriceBs: item.appliedPriceBs,
                        name: item.name
                    });
                }
            });

            const response = await axios.post(route('api.checkout'), {
                items: finalItems,
                totalUsd: cartAnalysis.totalUsd,
                totalBs: cartAnalysis.totalBs,
                customer_name: null,
                customer_phone: null
            });

            if (response.data.success) {
                Swal.close();

                let message = `*¡Hola! Quiero hacer un pedido [Ref: ${response.data.tracking_id}]:*\n\n`;
                
                finalItems.forEach(item => {
                    message += `*${item.name}* (x${item.qty})\n`;
                    message += ` - Precio/U: $${item.appliedPriceUsd.toFixed(2)} | Bs. ${item.appliedPriceBs.toFixed(2)}\n`;
                    message += ` - Subtotal: $${(item.appliedPriceUsd * item.qty).toFixed(2)}\n\n`;
                });

                message += `*RESUMEN DE COMPRA*\n`;
                message += `--------------------\n`;
                
                if (globalDiscount > 0) {
                    message += `*Descuento Global:* -${globalDiscount}%\n`;
                    message += `Subtotal sin dcto: $${cartAnalysis.subtotalUsd.toFixed(2)}\n`;
                }
                
                message += `*TOTAL A PAGAR: $${cartAnalysis.totalUsd.toFixed(2)} | Bs. ${cartAnalysis.totalBs.toFixed(2)}*\n`;
                message += `--------------------\n`;
                message += `\n_Nota: Esta cotización y tipos de cambio son válidos hasta hoy a las 6:00 PM._`;

                const encodedMessage = encodeURIComponent(message);
                const url = `https://wa.me/584148866814?text=${encodedMessage}`;
                window.open(url, '_blank');

                setCart([]);
                setIsCartOpen(false);
                router.reload({ only: ['productos'] });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error al procesar el pedido',
                text: error.response?.data?.message || 'Revisa si hay stock disponible.'
            });
        }
    };

    // Componente de precio con animación de golpe/tachado
    const AnimatedPrice = ({ retailPrice, appliedPrice, appliedRule }) => {
        const hasDiscount = appliedPrice < retailPrice - 0.001;
        const { animKey, isStruck, isShaking } = usePriceAnimation(appliedPrice);

        if (!hasDiscount) {
            return (
                <div className="mt-2 md:mt-3">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl md:text-2xl font-black text-stone-800 dark:text-stone-200">${retailPrice.toFixed(2)}</span>
                        <span className="text-xs text-stone-400 dark:text-stone-500">Detal</span>
                    </div>
                    <div className="text-[10px] md:text-xs font-semibold text-sky-600 dark:text-sky-400 mt-0.5">
                        Bs. {(retailPrice * bcvRate).toFixed(2)}
                    </div>
                </div>
            );
        }

        return (
            <div className="mt-2 md:mt-3">
                <div className="flex items-end gap-2 flex-wrap">
                    <span className={`price-strike-wrap text-sm font-bold text-stone-400 dark:text-stone-500 ${isShaking ? 'shaking' : ''} ${isStruck ? 'struck' : ''}`}>
                        ${retailPrice.toFixed(2)}
                    </span>
                    <span key={animKey} className="new-price-appear text-xl md:text-2xl font-black text-marca-700 dark:text-marca-400">
                        ${appliedPrice.toFixed(2)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span key={`badge-${animKey}`} className="discount-badge-pop inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-900">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        {appliedRule}
                    </span>
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                        Bs. {(appliedPrice * bcvRate).toFixed(2)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#FFF0F5] font-sans text-stone-800 dark:text-stone-200">
            <Head title="Catálogo Cute" />
            <style dangerouslySetInnerHTML={{ __html: PRICE_ANIM_STYLE }} />

            {/* HEADER SUPERIOR */}
            <header className="fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md shadow-sm border-b-2 border-stone-200 dark:border-stone-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex justify-between items-center">
                    
                    <div className="flex items-center gap-2 md:gap-3">
                        <img src="/storage/every.png" alt="Logo" loading="lazy" decoding="async" className="h-10 w-10 md:h-12 md:w-auto animate-bounce-slow" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-extrabold text-marca-700 dark:text-marca-400 tracking-tight">E V E R Y</h1>
                            <p className="text-[10px] md:text-xs font-semibold text-marca-500 dark:text-marca-400 hidden sm:block">Tus cosméticos favoritos</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Indicador BCV */}
                        <div className="hidden md:flex flex-col items-center bg-marca-50 dark:bg-marca-950/40 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-800">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">Tasa del Día (BCV)</span>
                            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Bs. {parseFloat(bcvRate).toFixed(2)}</span>
                        </div>

                        {/* Boton Carrito */}
                        <button 
                            onClick={() => setIsCartOpen(!isCartOpen)}
                            className="relative p-3 bg-marca-100 dark:bg-marca-950/60 text-marca-700 dark:text-marca-400 rounded-full hover:bg-marca-200 dark:hover:bg-marca-900 transition transform hover:scale-105"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 0 000-4zm-8 2a2 2 0 11-4 0 2 0 014 0z"/></svg>
                            {cartAnalysis.totalItems > 0 && (
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                                    {cartAnalysis.totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                
                {/* Marquesina de Promociones */}
                {(globalDiscount > 0 || forceWholesale || forceDistributor) && (
                    <div className="bg-gradient-to-r from-marca-600 dark:from-marca-500 via-stone-600 dark:via-stone-500 to-marca-600 dark:to-marca-500 text-white text-xs font-bold py-1 text-center overflow-hidden whitespace-nowrap">
                        <div className="animate-pulse">
                            ¡SÚPER OFERTAS ACTIVAS ESTE DÍA! 
                            {globalDiscount > 0 && ` Todo al -${globalDiscount}% Off.`}
                            {forceWholesale && ` Llevate lo que sea a precio Mayorista sin mínimo de compra.`}
                            {forceDistributor && ` Llevate lo que sea a precio Distribuidor sin mínimo de compra.`}
                        </div>
                    </div>
                )}
            </header>


            {/* ESPACIADOR */}
            <div className={`h-20 ${ (globalDiscount > 0 || forceWholesale || forceDistributor) ? 'mt-6' : ''}`}></div>

            {/* CONTENIDO PRINCIPAL */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* BANNER INFORMATIVO */}
                <div className="mb-8 p-4 bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex items-start gap-4">
                    <div className="p-3 bg-marca-50 dark:bg-marca-950/40 rounded-full text-marca-600 dark:text-marca-400 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-800 dark:text-stone-200">¿Cómo comprar al mayor o distribuidor?</h3>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                            Añade productos al carrito. <br/>
                            <b>Mayorista:</b> 3 unidades iguales + $10 de consumo global en toda tu compra. <br/>
                            <b>Distribuidor:</b> 6 unidades iguales + $30 de consumo global en toda tu compra. <br/>
                            <i>El carrito calculará tus descuentos automáticamente</i>
                        </p>
                    </div>
                </div>

                {/* FILTROS Y BUSCADOR */}
                <div className="mb-8">
                    {/* Buscador */}
                    <form onSubmit={handleSearch} className="flex gap-3 mb-5">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                placeholder="Buscar maquillaje, skincare..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-stone-200 dark:border-stone-800 focus:border-marca-600 dark:focus:border-marca-400 focus:ring focus:ring-marca-200 dark:focus:ring-marca-900 focus:ring-opacity-50 transition-colors shadow-sm text-stone-700 dark:text-stone-300 text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-marca-500 dark:text-marca-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/></svg>
                            </div>
                        </div>
                        <button type="submit" className="px-5 py-2.5 bg-marca-600 dark:bg-marca-500 text-white font-bold rounded-full shadow hover:bg-marca-800 dark:hover:bg-marca-400 transition-colors text-sm">
                            Buscar
                        </button>
                    </form>

                    {/* MENÚ DE CATEGORÍAS - PILLS HORIZONTAL */}
                    {categories && categories.length > 0 && (
                        <div className="relative">
                            {/* Fade izquierdo */}
                            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#FFF0F5] to-transparent z-10 rounded-l-full"></div>
                            {/* Fade derecho */}
                            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FFF0F5] to-transparent z-10 rounded-r-full"></div>

                            <div
                                className="flex gap-2 overflow-x-auto pb-2 px-2 scroll-smooth"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {/* Pill "Todas" */}
                                <button
                                    onClick={() => handleCategoryClick('')}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border-2 whitespace-nowrap ${
                                        selectedCategory === ''
                                            ? 'bg-marca-600 dark:bg-marca-500 border-marca-600 dark:border-marca-500 text-white shadow-md shadow-pink-200'
                                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-marca-700 dark:text-marca-400 hover:border-marca-500 dark:hover:border-marca-600 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                    </svg>
                                    Todas
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        selectedCategory === '' ? 'bg-white/30 text-white' : 'bg-marca-100 dark:bg-marca-950/60 text-marca-600 dark:text-marca-400'
                                    }`}>
                                        {productos.length}
                                    </span>
                                </button>

                                {/* Separador */}
                                <div className="flex-shrink-0 w-px bg-marca-200 dark:bg-marca-900 my-1.5 self-stretch"></div>

                                {/* Pills de categorías */}
                                {categories.map(cat => {
                                    const count = productos.filter(p => p.categories && p.categories.some(c => c.id === cat.id)).length;
                                    const isActive = selectedCategory === cat.id.toString();
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border-2 whitespace-nowrap ${
                                                isActive
                                                    ? 'bg-marca-600 dark:bg-marca-500 border-marca-600 dark:border-marca-500 text-white shadow-md shadow-pink-200'
                                                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-marca-700 dark:text-marca-400 hover:border-marca-500 dark:hover:border-marca-600 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                            }`}
                                        >
                                            {cat.name}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                isActive ? 'bg-white/30 text-white' : 'bg-marca-100 dark:bg-marca-950/60 text-marca-600 dark:text-marca-400'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Indicador de filtro activo */}
                            {selectedCategory && (
                                <div className="flex items-center gap-2 mt-2.5 ml-1">
                                    <svg className="w-3.5 h-3.5 text-marca-500 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                                    </svg>
                                    <span className="text-xs text-marca-600 dark:text-marca-400 font-semibold">
                                        Filtrando por: <span className="font-bold">{categories.find(c => c.id.toString() === selectedCategory)?.name}</span>
                                    </span>
                                    <button
                                        onClick={() => handleCategoryClick('')}
                                        className="text-xs font-bold text-marca-500 dark:text-marca-400 hover:text-marca-700 dark:hover:text-marca-400 underline underline-offset-2 transition-colors"
                                    >
                                        ✕ limpiar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Filtro para Ver Combos y Ordenar por Precio */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white/70 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Filtro de Catálogo:</span>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Elige si deseas ver u ocultar los combos promocionales de belleza</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={priceSort}
                            onChange={(e) => setPriceSort(e.target.value)}
                            className="text-xs font-bold text-marca-800 dark:text-marca-300 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-full py-1.5 pl-3 pr-8 focus:border-marca-600 dark:focus:border-marca-400 focus:ring-0 cursor-pointer shadow-sm"
                        >
                            <option value="">✨ Por defecto</option>
                            <option value="asc">💵 Precio: Menor a Mayor</option>
                            <option value="desc">💎 Precio: Mayor a Menor</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setVerCombos(!verCombos)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all border-2 cursor-pointer hover:scale-105 active:scale-95 duration-200 ${
                                verCombos
                                    ? 'bg-stone-800 dark:bg-stone-700 border-stone-700 dark:border-stone-500 text-white shadow-md shadow-purple-200 hover:bg-stone-800 dark:hover:bg-stone-400'
                                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                            }`}
                        >
                            <span>{verCombos ? '👁️ Ocultar Combos' : '🎁 Mostrar Combos'}</span>
                        </button>
                    </div>
                </div>

                {/* ── APARTADO DE COMBOS ─────────────────────────────────── */}
                {verCombos && selectedCategory === '' && sortedCombos.length > 0 && (
                    <div className="mb-10 bg-stone-50/30 dark:bg-stone-950/30 border border-stone-100/70 dark:border-stone-950/70 rounded-3xl p-5 md:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 border-b border-stone-200/50 dark:border-stone-900/50 pb-3">
                            <h3 className="text-lg md:text-xl font-extrabold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                                <span>🎁</span> Combos Especiales de Belleza
                            </h3>
                            <span className="text-xs text-stone-600 dark:text-stone-400 font-bold bg-stone-200 dark:bg-stone-800 px-3 py-1 rounded-full">
                                {sortedCombos.length} Combo{sortedCombos.length !== 1 ? 's' : ''} disponible{sortedCombos.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {sortedCombos.map(producto => (
                                <div key={`combo-${producto.id}`} className="bg-gradient-to-br from-stone-100 dark:from-stone-800 to-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-800 flex flex-col group relative">
                                    
                                    {/* Imagen */}
                                    <div className="aspect-w-1 aspect-h-1 w-full bg-stone-100 dark:bg-stone-800 flex-shrink-0 relative overflow-hidden cursor-pointer" onClick={() => openProductModal(producto)}>
                                        {producto.image_path ? (
                                            <img 
                                                src={`/storage/${producto.image_path}`} 
                                                alt={producto.name} 
                                                loading="lazy" 
                                                decoding="async"
                                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-marca-400 dark:text-marca-500">
                                                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                                            <span className="bg-stone-800 dark:bg-stone-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">🎁 COMBO</span>
                                            {producto.por_llegar && (
                                                <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">✈️ POR LLEGAR</span>
                                            )}
                                            {producto.last_units && (
                                                <span className="bg-marca-700 dark:bg-marca-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">🔥 ÚLTIMAS UNIDADES</span>
                                            )}
                                        </div>
                                        {producto.stock === 0 && !producto.por_llegar && (
                                             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                                 <span className="bg-stone-800 dark:bg-stone-800 text-white text-xs font-bold px-3 py-1 rounded-full">AGOTADO</span>
                                             </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 md:p-4 flex flex-col flex-1 cursor-pointer" onClick={() => openProductModal(producto)}>
                                        <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-2 h-10">{producto.name}</h2>
                                        
                                        {/* Sub-productos del combo (preview) */}
                                        {producto.products && producto.products.length > 0 && (
                                            <div className="mb-2 mt-1 py-1.5 px-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-100/50 dark:border-stone-950/50 text-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors">
                                                <span className="text-[10px] text-stone-600 dark:text-stone-400 font-bold tracking-wide flex items-center justify-center gap-1">
                                                    <span>✨</span> Toca para ver lo que incluye
                                                </span>
                                            </div>
                                        )}
                                        
                                        {(() => {
                                            const cartItem = cartAnalysis.items.find(i => i.id === producto.id && i._isCombo);
                                            const retailPrice = parseFloat(producto.price_usdt);
                                            const appliedPrice = cartItem ? cartItem.appliedPriceUsd : retailPrice;
                                            const appliedRule = cartItem ? cartItem.appliedRule : 'Detal';
                                            return (
                                                <AnimatedPrice
                                                    retailPrice={retailPrice}
                                                    appliedPrice={appliedPrice}
                                                    appliedRule={appliedRule}
                                                />
                                            );
                                        })()}

                                        <div className="mt-3 bg-marca-50 dark:bg-marca-950/40 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
                                            <p className="text-[10px] text-marca-800 dark:text-marca-300 font-bold mb-1 uppercase tracking-wider">Si llevas cantidad:</p>
                                            {producto.conditional_price && producto.conditional_min_quantity && (
                                                <div className="flex justify-between text-xs font-bold text-orange-600 mb-0.5 pb-0.5 border-b border-stone-200 dark:border-stone-800 bg-orange-50 px-1 rounded">
                                                    <span>¡Promo! Llevate {producto.conditional_min_quantity} x </span>
                                                    <span className="font-mono">${parseFloat(producto.conditional_price).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {producto.price_mayor_usdt && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-stone-600 dark:text-stone-400">Al Mayor (3+)</span>
                                                    <span className="font-bold font-mono">${parseFloat(producto.price_mayor_usdt).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {producto.price_distribuidor_usdt && (
                                                <div className="flex justify-between text-xs mt-0.5 border-t border-stone-200 dark:border-stone-800 pt-0.5">
                                                    <span className="text-stone-600 dark:text-stone-400">Dist. (6+)</span>
                                                    <span className="font-bold font-mono">${parseFloat(producto.price_distribuidor_usdt).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {!producto.price_mayor_usdt && !producto.price_distribuidor_usdt && !producto.conditional_price && (
                                                 <span className="text-xs text-stone-500 dark:text-stone-400 italic block text-center">Sin precio diferenciado</span>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-3 md:pt-4">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); addToCart(producto); }}
                                                disabled={producto.stock === 0}
                                                className="w-full flex items-center justify-center px-2 py-1.5 md:px-4 md:py-2 border border-transparent rounded-full shadow-sm text-xs md:text-sm font-bold text-white bg-marca-600 dark:bg-marca-500 hover:bg-marca-800 dark:hover:bg-marca-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marca-600 dark:focus:ring-marca-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                                                Añadir (Stock: {producto.stock})
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── APARTADO DE PRODUCTOS ────────────────────────────── */}
                <div className="mb-4 flex items-center justify-between border-b border-marca-200/50 dark:border-marca-900/50 pb-3">
                    <h3 className="text-lg md:text-xl font-extrabold text-marca-800 dark:text-marca-300 flex items-center gap-2">
                        <span>💄</span> Catálogo de Productos
                    </h3>
                    <span className="text-xs text-marca-600 dark:text-marca-400 font-bold bg-marca-100 dark:bg-marca-950/60 px-3 py-1 rounded-full">
                        {sortedProductos.length} Producto{sortedProductos.length !== 1 ? 's' : ''} disponible{sortedProductos.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* GRILLA DE PRODUCTOS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedProductos.map(producto => (
                        <div key={`product-${producto.id}`} className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-transparent hover:border-marca-200 dark:hover:border-marca-900 flex flex-col group relative">
                            
                            {/* Imagen */}
                            <div className="aspect-w-1 aspect-h-1 w-full bg-stone-100 dark:bg-stone-800 flex-shrink-0 relative overflow-hidden cursor-pointer" onClick={() => openProductModal(producto)}>
                                {producto.image_path ? (
                                    <img 
                                        src={`/storage/${producto.image_path}`} 
                                        alt={producto.name} 
                                        loading="lazy" 
                                        decoding="async"
                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-marca-400 dark:text-marca-500">
                                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                                    {producto.por_llegar && (
                                        <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">✈️ POR LLEGAR</span>
                                    )}
                                    {producto.last_units && (
                                        <span className="bg-marca-700 dark:bg-marca-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">🔥 ÚLTIMAS UNIDADES</span>
                                    )}
                                </div>
                                {producto.stock === 0 && !producto.por_llegar && (
                                     <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                         <span className="bg-stone-800 dark:bg-stone-800 text-white text-xs font-bold px-3 py-1 rounded-full">AGOTADO</span>
                                     </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-3 md:p-4 flex flex-col flex-1 cursor-pointer" onClick={() => openProductModal(producto)}>
                                <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-2 h-10">{producto.name}</h2>
                                
                                {/* Categorías */}
                                {producto.categories && producto.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {producto.categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={(e) => { e.stopPropagation(); handleCategoryClick(cat.id); }}
                                                className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-marca-50 dark:bg-marca-950/40 text-marca-600 dark:text-marca-400 border border-stone-200 dark:border-stone-800 hover:bg-marca-100 dark:hover:bg-marca-950/60 transition-colors uppercase tracking-wide"
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {(() => {
                                    const cartItem = cartAnalysis.items.find(i => i.id === producto.id && !i._isCombo);
                                    const retailPrice = parseFloat(producto.price_usdt);
                                    const appliedPrice = cartItem ? cartItem.appliedPriceUsd : retailPrice;
                                    const appliedRule = cartItem ? cartItem.appliedRule : 'Detal';
                                    return (
                                        <AnimatedPrice
                                            retailPrice={retailPrice}
                                            appliedPrice={appliedPrice}
                                            appliedRule={appliedRule}
                                        />
                                    );
                                })()}

                                <div className="mt-3 bg-marca-50 dark:bg-marca-950/40 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
                                    <p className="text-[10px] text-marca-800 dark:text-marca-300 font-bold mb-1 uppercase tracking-wider">Si llevas cantidad:</p>
                                    {producto.conditional_price && producto.conditional_min_quantity && (
                                        <div className="flex justify-between text-xs font-bold text-orange-600 mb-0.5 pb-0.5 border-b border-stone-200 dark:border-stone-800 bg-orange-50 px-1 rounded">
                                            <span>¡Promo! Llevate {producto.conditional_min_quantity} x </span>
                                            <span className="font-mono">${parseFloat(producto.conditional_price).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {producto.price_mayor_usdt && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-stone-600 dark:text-stone-400">Al Mayor (3+)</span>
                                            <span className="font-bold font-mono">${parseFloat(producto.price_mayor_usdt).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {producto.price_distribuidor_usdt && (
                                        <div className="flex justify-between text-xs mt-0.5 border-t border-stone-200 dark:border-stone-800 pt-0.5">
                                            <span className="text-stone-600 dark:text-stone-400">Dist. (6+)</span>
                                            <span className="font-bold font-mono">${parseFloat(producto.price_distribuidor_usdt).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {!producto.price_mayor_usdt && !producto.price_distribuidor_usdt && !producto.conditional_price && (
                                         <span className="text-xs text-stone-500 dark:text-stone-400 italic block text-center">Sin precio diferenciado</span>
                                    )}
                                </div>

                                <div className="mt-auto pt-3 md:pt-4">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); addToCart(producto); }}
                                        disabled={producto.stock === 0}
                                        className="w-full flex items-center justify-center px-2 py-1.5 md:px-4 md:py-2 border border-transparent rounded-full shadow-sm text-xs md:text-sm font-bold text-white bg-marca-600 dark:bg-marca-500 hover:bg-marca-800 dark:hover:bg-marca-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marca-600 dark:focus:ring-marca-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                                        Añadir (Stock: {producto.stock})
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Estado vacío */}
                {productos.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 shadow-sm mt-8">
                        <div className="text-marca-400 dark:text-marca-500 mb-4 flex justify-center">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/></svg>
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-200">No se encontraron productos</h3>
                        <p className="text-marca-600 dark:text-marca-400 mt-2">Prueba buscando otra cosa o quita los filtros.</p>
                        {(search || selectedCategory) && (
                            <button 
                                onClick={() => { setSearch(''); setSelectedCategory(''); router.get(route('catalogo.privado'), {}, { preserveState: true, preserveScroll: true }); }}
                                className="mt-4 px-6 py-2 bg-marca-100 dark:bg-marca-950/60 text-marca-700 dark:text-marca-400 rounded-full font-bold hover:bg-marca-200 dark:hover:bg-marca-900 transition"
                            >
                                Ver Todo
                            </button>
                        )}
                    </div>
                )}
            </main>

            {/* PANEL LATERAL DEL CARRITO */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
                    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white dark:bg-stone-900 shadow-2xl flex flex-col transform transition-transform border-l border-stone-200 dark:border-stone-800">
                        
                        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-marca-50 dark:bg-marca-950/40">
                            <h2 className="text-lg font-bold text-marca-800 dark:text-marca-300 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                                Mi Bolsita
                            </h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-marca-100 dark:hover:bg-marca-950/60 rounded-full focus:outline-none transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cartAnalysis.items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 dark:text-stone-500 py-16">
                                    <svg className="w-16 h-16 text-marca-400 dark:text-marca-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                                    <p className="font-semibold text-stone-500 dark:text-stone-400">Tu bolsita está vacía.</p>
                                    <p className="text-sm mt-1 text-marca-500 dark:text-marca-400">¡Añade cositas lindas!</p>
                                </div>
                            ) : (
                                cartAnalysis.items.map(item => {
                                    const mode = item.priceMode || 'detal';
                                    const hasMayor = !!item.price_mayor_usdt;
                                    const hasDist  = !!item.price_distribuidor_usdt;
                                    return (
                                    <div key={item._isCombo ? `combo-${item.id}` : `product-${item.id}`} className="flex flex-col p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm relative gap-2">
                                        <div className="flex gap-3">
                                            <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden flex-shrink-0">
                                                {item.image_path ? (
                                                    <img src={`/storage/${item.image_path}`} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-marca-100 dark:bg-marca-950/60"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{item.name}</h4>
                                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                                    <div className="flex items-center border border-stone-200 dark:border-stone-800 rounded-lg">
                                                        <button onClick={() => updateQty(item.id, item.qty - 1, item.stock, item._isCombo)} className="px-2.5 py-1.5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-l-lg text-base font-bold">-</button>
                                                        <span className="px-2.5 py-1.5 text-sm font-mono border-x border-stone-200 dark:border-stone-800">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.id, item.qty + 1, item.stock, item._isCombo)} className="px-2.5 py-1.5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-r-lg text-base font-bold" disabled={item.qty >= item.stock}>+</button>
                                                    </div>
                                                    <div className="text-right">
                                                        {item.appliedRule !== 'Detal' ? (
                                                            <AnimatedPrice
                                                                retailPrice={parseFloat(item.price_usdt) * item.qty}
                                                                appliedPrice={item.lineTotalUsd}
                                                                appliedRule={item.appliedRule}
                                                            />
                                                        ) : (
                                                            <div className="font-bold text-stone-900 dark:text-stone-100">${item.lineTotalUsd.toFixed(2)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selector de precio manual por ítem */}
                                        {(hasMayor || hasDist) && !forceWholesale && !forceDistributor && (
                                            <div className="flex gap-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                                                <button
                                                    onClick={() => setPriceMode(item.id, 'detal', item._isCombo)}
                                                    className={`flex-1 text-[10px] font-bold py-1 rounded-full border transition-all ${mode === 'detal' ? 'bg-marca-600 dark:bg-marca-500 text-white border-marca-600 dark:border-marca-500' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-marca-400 dark:hover:border-marca-700'}`}
                                                >Detal</button>
                                                {hasMayor && (
                                                    <button
                                                        onClick={() => setPriceMode(item.id, 'mayor', item._isCombo)}
                                                        className={`flex-1 text-[10px] font-bold py-1 rounded-full border transition-all ${mode === 'mayor' ? 'bg-marca-600 dark:bg-marca-500 text-white border-marca-600 dark:border-marca-500' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-marca-400 dark:hover:border-marca-700'}`}
                                                    >Mayor</button>
                                                )}
                                                {hasDist && (
                                                    <button
                                                        onClick={() => setPriceMode(item.id, 'distribuidor', item._isCombo)}
                                                        className={`flex-1 text-[10px] font-bold py-1 rounded-full border transition-all ${mode === 'distribuidor' ? 'bg-marca-600 dark:bg-marca-500 text-white border-marca-600 dark:border-marca-500' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-marca-400 dark:hover:border-marca-700'}`}
                                                    >Dist.</button>
                                                )}
                                            </div>
                                        )}

                                        <button onClick={() => removeFromCart(item.id, item._isCombo)} className="absolute top-2 right-2 text-stone-300 dark:text-stone-600 hover:text-red-400 transition-colors p-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                    );
                                })
                            )}
                        </div>

                        {cartAnalysis.items.length > 0 && (
                            <div className="border-t border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-900">
                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex justify-between text-stone-500 dark:text-stone-400">
                                        <span>Subtotal</span>
                                        <span>${cartAnalysis.subtotalUsd.toFixed(2)}</span>
                                    </div>
                                    {globalDiscount > 0 && (
                                        <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                                            <span>Descuento Global (-{globalDiscount}%)</span>
                                            <span>-${cartAnalysis.discountAmountUsd.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-extrabold text-lg text-stone-900 dark:text-stone-100 border-t pt-3 mt-2">
                                        <span>Total</span>
                                        <div className="text-right">
                                            <div>${cartAnalysis.totalUsd.toFixed(2)}</div>
                                            <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold border-t pt-1 mt-1">Bs. {cartAnalysis.totalBs.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={checkout}
                                    className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:-translate-y-1"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 5.373 0 12c0 2.124.556 4.119 1.528 5.855L0 24l6.335-1.508C8.07 23.444 10.01 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                                    ¡Pedir por WhatsApp!
                                </button>
                                <p className="text-center text-[10px] text-stone-400 dark:text-stone-500 mt-3">Válido hasta las 6 PM</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DETALLES DEL PRODUCTO */}
            <Modal show={!!selectedProduct} onClose={closeProductModal} maxWidth="2xl">
                {selectedProduct && (() => {
                    const mainImage = selectedProduct.image_path ? `/storage/${selectedProduct.image_path}` : null;
                    const galleryPics = selectedProduct.images ? selectedProduct.images.map(img => img.image_url) : [];
                    const allImages = mainImage ? [mainImage, ...galleryPics] : galleryPics;
                    
                    const hasImages = allImages.length > 0;
                    const currentImgSrc = hasImages ? allImages[currentImageIndex] : null;

                    return (
                        <div className="bg-white dark:bg-stone-900 rounded-lg overflow-y-auto max-h-[90vh] md:max-h-[85vh] flex flex-col md:flex-row flex-wrap">
                            
                            {/* Botón Cerrar (Mobile flotante) */}
                            <button onClick={closeProductModal} className="md:hidden absolute top-2 right-2 z-10 bg-white/80 backdrop-blur rounded-full p-2 text-stone-500 dark:text-stone-400 shadow hover:text-stone-800 dark:hover:text-stone-100">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            {/* Lado Izquierdo: Carrusel */}
                            <div className="w-full md:w-1/2 bg-stone-50 dark:bg-stone-900 flex flex-col">
                                <div className="relative h-64 sm:h-72 md:h-full w-full flex-1 flex items-center justify-center p-4">
                                    {currentImgSrc ? (
                                        <img 
                                            src={currentImgSrc} 
                                            alt={selectedProduct.name} 
                                            decoding="async" 
                                            className="max-h-full max-w-full object-contain drop-shadow-md" 
                                        />
                                    ) : (
                                        <div className="text-marca-400 dark:text-marca-500">
                                            <svg className="w-16 h-16 md:w-20 md:h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}

                                    {allImages.length > 1 && (
                                        <>
                                            <button onClick={prevImage} className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1.5 md:p-2 bg-white/50 hover:bg-white dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 rounded-full shadow-lg backdrop-blur transition flex items-center justify-center">
                                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                                            </button>
                                            <button onClick={nextImage} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 md:p-2 bg-white/50 hover:bg-white dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 rounded-full shadow-lg backdrop-blur transition flex items-center justify-center">
                                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                                
                                {/* Thumbnails */}
                                {allImages.length > 1 && (
                                    <div className="flex gap-2 p-2 md:p-4 md:pt-0 overflow-x-auto justify-center bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
                                        {allImages.map((src, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setCurrentImageIndex(idx)}
                                                className={`h-10 w-10 md:h-12 md:w-12 rounded overflow-hidden flex-shrink-0 border-2 transition ${currentImageIndex === idx ? 'border-marca-600 dark:border-marca-500 shadow' : 'border-transparent hover:border-marca-400 dark:hover:border-marca-700'}`}
                                            >
                                                <img 
                                                    src={src} 
                                                    loading="lazy" 
                                                    decoding="async" 
                                                    className="h-full w-full object-cover" 
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Lado Derecho: Detalles */}
                            <div className="w-full md:w-1/2 p-5 md:p-8 flex flex-col bg-white dark:bg-stone-900 relative">
                                <button onClick={closeProductModal} className="hidden md:block absolute top-4 right-4 text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-100">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                
                                <div className="mt-0 md:mt-2 mb-2 flex flex-wrap gap-1">
                                     {selectedProduct.categories && selectedProduct.categories.map(cat => (
                                        <span key={cat.id} className="text-[10px] md:text-xs font-bold text-marca-600 dark:text-marca-400 uppercase tracking-wide bg-marca-50 dark:bg-marca-950/40 px-2 py-1 rounded-full">{cat.name}</span>
                                     ))}
                                </div>
                                <h1 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight mb-2">{selectedProduct.name}</h1>
                                
                                <div className="flex items-baseline gap-3 my-2 md:my-4 border-b border-stone-200 dark:border-stone-800 pb-3 md:pb-4">
                                    <span className="text-3xl md:text-4xl font-extrabold text-stone-800 dark:text-stone-200">${parseFloat(selectedProduct.price_usdt).toFixed(2)}</span>
                                    <div className="flex flex-col">
                                        <span className="text-xs md:text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Precio Detal</span>
                                        <span className="text-xs md:text-sm font-bold text-sky-600 dark:text-sky-400">Bs. {(parseFloat(selectedProduct.price_usdt) * bcvRate).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="bg-marca-50 dark:bg-marca-950/40 p-3 md:p-4 rounded-xl border border-stone-200 dark:border-stone-800 mb-2">
                                    <h4 className="text-[10px] md:text-xs font-bold text-marca-800 dark:text-marca-300 mb-2 uppercase tracking-widest flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 0 0118 0z" /></svg>
                                        Lleva cantidad y ahorra
                                    </h4>
                                    
                                    <div className="space-y-1 md:space-y-2">
                                        {selectedProduct.conditional_price && selectedProduct.conditional_min_quantity && (
                                            <div className="flex justify-between items-center text-xs md:text-sm border-b border-marca-200/50 dark:border-marca-900/50 pb-1.5 md:pb-2 font-bold text-orange-600 bg-orange-50 p-1 rounded">
                                                <span>¡Promo! {selectedProduct.conditional_min_quantity} unidades por:</span>
                                                <span>${parseFloat(selectedProduct.conditional_price).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-xs md:text-sm border-b border-marca-200/50 dark:border-marca-900/50 pb-1.5 md:pb-2 pt-1">
                                            <span className="text-stone-700 dark:text-stone-300">Mayor (3+)</span>
                                            {selectedProduct.price_mayor_usdt ? (
                                                 <span className="font-bold text-stone-900 dark:text-stone-100">${parseFloat(selectedProduct.price_mayor_usdt).toFixed(2)}</span>
                                            ) : (
                                                 <span className="text-stone-400 dark:text-stone-500 italic">No aplica</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-xs md:text-sm pt-1">
                                            <span className="text-stone-700 dark:text-stone-300">Distribuidor (6+)</span>
                                            {selectedProduct.price_distribuidor_usdt ? (
                                                 <span className="font-bold text-stone-900 dark:text-stone-100">${parseFloat(selectedProduct.price_distribuidor_usdt).toFixed(2)}</span>
                                            ) : (
                                                 <span className="text-stone-400 dark:text-stone-500 italic">No aplica</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 md:pt-6 flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-xs md:text-sm mb-1 px-1">
                                         <span className="text-stone-600 dark:text-stone-400 font-medium">Disponibilidad:</span>
                                         <div className="flex flex-col items-end gap-1">
                                             {selectedProduct.por_llegar ? (
                                                  <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center animate-pulse">
                                                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 mr-1.5 md:mr-2"></span>
                                                      Por llegar ✈️
                                                  </span>
                                             ) : selectedProduct.stock > 0 ? (
                                                  <span className="font-bold text-green-600 dark:text-green-400 flex items-center">
                                                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 mr-1.5 md:mr-2"></span>
                                                      {selectedProduct.stock} uds. disponibles
                                                  </span>
                                             ) : (
                                                  <span className="font-bold text-red-600 dark:text-red-400 flex items-center">
                                                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 mr-1.5 md:mr-2"></span>
                                                      Agotado
                                                  </span>
                                             )}
                                             {selectedProduct.last_units && (
                                                 <span className="font-black text-[10px] text-marca-700 dark:text-marca-400 bg-marca-50 dark:bg-marca-950 px-2 py-0.5 rounded-full border border-marca-100 dark:border-marca-950 animate-pulse flex items-center gap-0.5">
                                                     🔥 Últimas unidades disponibles
                                                 </span>
                                             )}
                                         </div>
                                    </div>
                                    <button 
                                        onClick={() => { addToCart(selectedProduct); }}
                                        disabled={selectedProduct.stock === 0}
                                        className="w-full flex items-center justify-center px-6 md:px-8 py-3 md:py-4 border border-transparent rounded-xl shadow-lg text-base md:text-lg font-bold text-white bg-marca-600 dark:bg-marca-500 hover:bg-marca-800 dark:hover:bg-marca-400 focus:outline-none focus:ring-4 focus:ring-marca-600 dark:focus:ring-marca-400 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none transition transform hover:-translate-y-1"
                                    >
                                        <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                        Añadir al Carrito
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Footer */}
            <footer className="bg-marca-100 dark:bg-marca-950/60 py-6 text-center text-marca-600 dark:text-marca-400 text-sm mt-12 border-t border-stone-200 dark:border-stone-800">
                <p>Hecho con amor para nuestros clientes exclusivos.</p>
                <div className="mt-2 text-xs flex justify-center gap-4 flex-wrap">
                    {canLogin && (
                        <Link href={route('login')} className="hover:underline">Acceso Administrativo</Link>
                    )}
                    <form method="POST" action={route('catalogo.privado.logout')} className="inline">
                        <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />
                        <button type="submit" className="hover:underline text-marca-500 dark:text-marca-400 hover:text-marca-800 dark:hover:text-marca-300 transition-colors">
                            Salir del catálogo privado
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
}