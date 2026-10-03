import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Swal from 'sweetalert2';

// ── CSS de animaciones globales ───────────────────────────────────────────────
const GLOBAL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ── Keyframes ───────────────────────────────────────────────────────── */
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
@keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
}
@keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
@keyframes pulse-soft {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.8; transform: scale(0.97); }
}
@keyframes imgCrossFade {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes bounceIn {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.15); opacity: 1; }
    80%  { transform: scale(0.95); }
    100% { transform: scale(1); }
}
@keyframes inquirySlideUp {
    from { opacity: 0; transform: translateY(20px) translateX(-50%); }
    to   { opacity: 1; transform: translateY(0)    translateX(-50%); }
}
@keyframes inquirySlideUpLeft {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ── Tarjetas de productos ────────────────────────────────────────────── */
.product-card-enter {
    animation: fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    will-change: transform, opacity;
}
.product-card-enter:hover {
    will-change: transform, box-shadow;
}

/* ── Imágenes con lazy blur ───────────────────────────────────────────── */
.img-loading {
    filter: blur(14px);
    transition: filter 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.img-loaded {
    filter: blur(0);
    transition: filter 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    animation: imgCrossFade 0.35s ease both;
}

/* ── Skeleton shimmer ────────────────────────────────────────────────── */
.skeleton-shimmer {
    background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
}

/* ── Botones sociales ────────────────────────────────────────────────── */
.social-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                filter 0.15s ease,
                box-shadow 0.2s ease;
    text-decoration: none;
    white-space: nowrap;
}
.social-btn:hover {
    transform: translateY(-3px) scale(1.04);
    filter: brightness(1.08);
    box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}
.social-btn:active {
    transform: translateY(0) scale(0.97);
    transition-duration: 0.08s;
}

/* ── Dropdown animado ────────────────────────────────────────────────── */
.animate-slide-down {
    animation: slideDown 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
    transform-origin: top center;
}

/* ── Modal de detalle ────────────────────────────────────────────────── */
.modal-content-enter {
    animation: fadeInScale 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
    will-change: transform, opacity;
}

/* ── Imagen del modal: crossfade al cambiar ──────────────────────────── */
.modal-img-transition {
    animation: imgCrossFade 0.25s ease both;
    will-change: opacity;
}

/* ── Barra flotante de consulta ──────────────────────────────────────── */
.inquiry-bar-desktop {
    animation: inquirySlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.inquiry-bar-mobile {
    animation: inquirySlideUpLeft 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Chips de categoría / variante ──────────────────────────────────── */
.category-chip {
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
                background-color 0.15s ease,
                box-shadow 0.18s ease,
                border-color 0.15s ease;
}
.category-chip:active {
    transform: scale(0.93) !important;
    transition-duration: 0.08s;
}

/* ── Botón de selección (+) en tarjeta ───────────────────────────────── */
.add-btn-enter {
    animation: bounceIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Hover elevación de tarjeta ──────────────────────────────────────── */
.card-lift {
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
                box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1),
                border-color 0.2s ease;
}
.card-lift:hover {
    transform: translateY(-4px) scale(1.015);
    box-shadow: 0 16px 40px rgba(236, 72, 153, 0.12), 0 4px 12px rgba(0,0,0,0.06);
}
.card-lift:active {
    transform: translateY(-1px) scale(0.99);
    transition-duration: 0.1s;
}

/* ── WhatsApp FAB ────────────────────────────────────────────────────── */
.whatsapp-fab {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                background-color 0.2s ease,
                box-shadow 0.3s ease;
}
.whatsapp-fab:hover {
    transform: scale(1.12) rotate(-4deg);
    box-shadow: 0 12px 32px rgba(37, 211, 102, 0.45);
}
.whatsapp-fab:active {
    transform: scale(0.95);
    transition-duration: 0.1s;
}

/* ── Respeto a preferencia de movimiento reducido ───────────────────── */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
`;


// ── Componente imagen con blur al cargar ──────────────────────────────────────
function LazyImage({ src, alt, className, fallback }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className={`${className} flex items-center justify-center bg-marca-50 dark:bg-marca-950/40`}>
                {fallback || (
                    <svg className="w-12 h-12 text-marca-400 dark:text-marca-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )}
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 skeleton-shimmer rounded" />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`w-full h-full object-cover object-center ${loaded ? 'img-loaded' : 'img-loading'}`}
            />
        </div>
    );
}

// ── Icono Instagram ───────────────────────────────────────────────────────────
function InstagramIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 0 000-2.881z"/>
        </svg>
    );
}

// ── Icono TikTok ─────────────────────────────────────────────────────────────
function TikTokIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 0 01-2.89-2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 0 00-6.34 6.34 0 006.34 6.34 0 006.33-6.34V8.69a8.29 8.29 0 004.84 1.54V6.78a4.85 4.85 0 01-1.07-.09z"/>
        </svg>
    );
}

// ── Icono WhatsApp ────────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );
}

// ── Banner del Catálogo (Solo lectura en la vista pública/inicial) ────────────
function CatalogBanner({ text }) {
    const displayText = text || '¡Bienvenidos! Escríbenos para más información sobre nuestros productos.';

    return (
        <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <div className="flex items-start gap-4 p-4">
                <div className="p-2.5 bg-marca-50 dark:bg-marca-950/40 rounded-full text-marca-600 dark:text-marca-400 flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z"/>
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">{displayText}</p>
                </div>
            </div>
        </div>
    );
}

// ── Utilidad para codificar URL de imagen correctamente sin espacios o barras invertidas rotas ────
function getImageUrl(imagePath) {
    if (!imagePath) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanPath = imagePath.replace(/\\/g, '/');
    const encodedSegments = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${origin}/storage/${encodedSegments}`;
}

const normalizeText = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function Tienda({ canLogin, productos, combos, bcvRate, settings, categories, filters, auth }) {
    const isAdmin = !!auth?.user;

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // Imagen extra seleccionada por variante (sobreescribe el carrusel)
    const [variantOverrideImage, setVariantOverrideImage] = useState(null);
    const [selectedVariantId, setSelectedVariantId] = useState(null);

    // Zoom tipo Mercado Libre (solo en escritorio con puntero fino)
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);
    const imgRef = useRef(null);
    const similarScrollRef = useRef(null);

    const scrollSimilar = (direction) => {
        if (similarScrollRef.current) {
            const scrollAmount = direction === 'left' ? -260 : 260;
            similarScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };


    // Detectar si el dispositivo tiene puntero de mouse (no táctil)
    const isDesktop = typeof window !== 'undefined'
        ? window.matchMedia('(pointer: fine)').matches
        : false;

    const handleMouseMove = (e) => {
        if (!isDesktop) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setZoomPos({ x, y });
    };

    const [search, setSearch] = useState(filters?.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters?.category_id || '');
    const [priceSort, setPriceSort] = useState('');

    // --- Dropdown de Categorías en PC ---
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Arrastre de Categorías en Móvil (Drag-to-Scroll) ---
    const categoriesRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - categoriesRef.current.offsetLeft);
        setScrollLeft(categoriesRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMoveDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - categoriesRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Multiplicador de velocidad de arrastre
        categoriesRef.current.scrollLeft = scrollLeft - walk;
    };

    // --- Lista de Consulta Agrupada ---
    const [inquiryList, setInquiryList] = useState([]);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

    const toggleInquiryProduct = (product, e) => {
        if (e) e.stopPropagation();
        setInquiryList(prev => {
            const exists = prev.some(p => p.id === product.id && !!p._isCombo === !!product._isCombo);
            if (exists) {
                return prev.filter(p => !(p.id === product.id && !!p._isCombo === !!product._isCombo));
            } else {
                return [...prev, product];
            }
        });
    };

    const sendGroupInquiry = () => {
        let text = "Buenas. Me interesa consultar la disponibilidad de los siguientes productos:\n\n";
        inquiryList.forEach((prod, index) => {
            const imageUrl = getImageUrl(prod.image_path) || 'Sin imagen';
            text += `${index + 1}. ${prod.name}\nImagen: ${imageUrl}\n\n`;
        });
        text += "Muchas gracias.";
        window.open(`https://wa.me/584148866814?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Búsqueda en vivo con debounce de 300ms
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search !== (filters?.search || '')) {
                router.get(
                    route('home'),
                    { search, category_id: selectedCategory },
                    { preserveState: true, preserveScroll: true, replace: true }
                );
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('home'), { search, category_id: selectedCategory }, { preserveState: true, preserveScroll: true });
    };

    const handleCategoryClick = (id) => {
        const newCat = id === '' ? '' : (selectedCategory === id.toString() ? '' : id.toString());
        setSelectedCategory(newCat);
        router.get(route('home'), { search, category_id: newCat }, { preserveState: true, preserveScroll: true });
    };

    const globalDiscount  = parseFloat(settings?.global_discount || 0);
    const forceWholesale  = settings?.force_wholesale  === '1' || settings?.force_wholesale  === 'true';
    const forceDistributor = settings?.force_distributor === '1' || settings?.force_distributor === 'true';
    const bannerText = settings?.banner_text || '';

    const catalogItems = useMemo(() => {
        let sortedProducts = productos.map(p => ({ ...p, _isCombo: false }));

        let filteredCombos = (combos || []).map(c => ({ ...c, _isCombo: true, categories: [] })).filter(c => {
            if (!search) return true;
            const q = normalizeText(search);
            return normalizeText(c.name).includes(q) || 
                   (c.description && normalizeText(c.description).includes(q));
        });

        let items = selectedCategory !== '' ? sortedProducts : [...sortedProducts, ...filteredCombos];

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
    }, [productos, combos, search, selectedCategory, priceSort]);

    // Productos similares basados en las categorías del producto seleccionado
    const similarProducts = useMemo(() => {
        if (!selectedProduct || selectedProduct._isCombo || !selectedProduct.categories) return [];
        const catIds = selectedProduct.categories.map(c => c.id);
        if (catIds.length === 0) return [];
        return productos.filter(p =>
            p.id !== selectedProduct.id &&
            p.stock > 0 &&
            p.categories &&
            p.categories.some(cat => catIds.includes(cat.id))
        ).slice(0, 6);
    }, [selectedProduct, productos]);



    const openProductModal = (product) => {
        setSelectedProduct(product);
        setCurrentImageIndex(0);
        setVariantOverrideImage(null);
        setSelectedVariantId(null);
    };

    const closeProductModal = () => {
        setSelectedProduct(null);
        setCurrentImageIndex(0);
        setVariantOverrideImage(null);
        setSelectedVariantId(null);
    };

    const selectVariant = (variant) => {
        if (selectedVariantId === variant.id) {
            // Deseleccionar
            setSelectedVariantId(null);
            setVariantOverrideImage(null);
        } else {
            setSelectedVariantId(variant.id);
            setVariantOverrideImage(variant.image_url || null);
        }
    };

    const nextImage = () => {
        if (!selectedProduct) return;
        const totalImages = 1 + (selectedProduct.images ? selectedProduct.images.length : 0);
        setCurrentImageIndex(prev => (prev + 1) % totalImages);
    };

    const prevImage = () => {
        if (!selectedProduct) return;
        const totalImages = 1 + (selectedProduct.images ? selectedProduct.images.length : 0);
        setCurrentImageIndex(prev => (prev - 1 + totalImages) % totalImages);
    };

    return (
        <div className="min-h-screen bg-[#FFF0F5] font-sans text-stone-800 dark:text-stone-200" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Head title="Every Beauty – Catálogo" />
            <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLE }} />

            {/* ── HEADER ────────────────────────────────────────────────── */}
            <header className="fixed top-0 w-full z-40 bg-white/95 backdrop-blur-md shadow-sm border-b-2 border-stone-200 dark:border-stone-800">
                {/* Barra de redes sociales */}
                <div className="bg-marca-200 dark:bg-marca-900 border-b border-marca-300/40 dark:border-marca-800/40 py-1.5 px-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                        <a
                            href="https://www.instagram.com/everybeauty.ve?igsh=OGF4bjNjZzJ4ZXB0"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-btn bg-white/75 text-marca-700 dark:text-marca-400 border border-stone-200 dark:border-stone-800 hover:bg-marca-50 dark:hover:bg-marca-950/40 hover:text-marca-800 dark:hover:text-marca-300 shadow-sm"
                        >
                            <InstagramIcon size={14} />
                            <span className="hidden sm:inline">@everybeauty.ve</span>
                            <span className="sm:hidden">Instagram</span>
                        </a>

                        <a
                            href="https://www.tiktok.com/@everybeauty.ve?_t=ZM-901SnI1QRp6&_r=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-btn bg-white/75 text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 shadow-sm"
                        >
                            <TikTokIcon size={14} />
                            <span className="hidden sm:inline">@everybeauty.ve</span>
                            <span className="sm:hidden">TikTok</span>
                        </a>

                        <a
                            href="https://whatsapp.com/channel/0029VbAxM4BDjiOWZcMhxD0y"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-btn bg-white/75 text-marca-700 dark:text-marca-400 border border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm"
                        >
                            <WhatsAppIcon size={14} />
                            <span className="hidden sm:inline">Canal VIP de Ofertas</span>
                            <span className="sm:hidden">Canal VIP</span>
                        </a>

                    </div>
                </div>

                {/* Banner de Envíos Nacionales */}
                <div className="bg-marca-50 dark:bg-marca-950/40 border-b border-stone-200 dark:border-stone-800 py-1.5 px-4 text-center">
                    <p className="text-xs md:text-sm text-marca-800 dark:text-marca-300 font-extrabold flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-marca-600 dark:text-marca-400 animate-bounce flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
                        </svg>
                        Hacemos envíos a nivel nacional en la agencia de tu preferencia 🚚✨
                    </p>
                </div>

                {/* Barra de logo y tasa */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <img src="/storage/every.png" alt="Logo Every Beauty" loading="lazy" decoding="async" className="h-9 w-9 md:h-11 md:w-auto" />
                        <div>
                            <h1 className="text-lg md:text-xl font-extrabold text-marca-700 dark:text-marca-400 tracking-tight leading-none">E V E R Y</h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-marca-500 dark:text-marca-400 hidden sm:block">@everybeauty.ve</p>
                        </div>
                    </div>

                    {/* Buscador Desktop (en medio) */}
                    <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-4 lg:mx-8">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Buscar maquillaje, skincare..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-stone-200 dark:border-stone-800 focus:border-marca-600 dark:focus:border-marca-400 focus:ring focus:ring-marca-200 dark:focus:ring-marca-900 focus:ring-opacity-50 transition-colors shadow-sm text-stone-700 dark:text-stone-300 text-sm bg-white dark:bg-stone-900"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-marca-500 dark:text-marca-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/>
                                </svg>
                            </div>
                        </div>

                        {/* Dropdown de categorías en PC (Desktop) */}
                        {categories && categories.length > 0 && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="px-4 py-2 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 hover:border-marca-400 dark:hover:border-marca-700 rounded-full text-marca-700 dark:text-marca-400 font-bold transition-all text-xs md:text-sm shadow-sm flex items-center gap-1.5 cursor-pointer min-w-[170px] md:min-w-[200px] justify-between"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-marca-500 dark:text-marca-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                        </svg>
                                        <span className="max-w-[90px] md:max-w-[120px] truncate">
                                            {selectedCategory === '' 
                                                ? 'Todas' 
                                                : (categories.find(c => c.id.toString() === selectedCategory)?.name || 'Categorías')}
                                        </span>
                                    </span>
                                    <svg className={`w-3.5 h-3.5 text-marca-500 dark:text-marca-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                                
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-30 py-2 animate-slide-down">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleCategoryClick('');
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex justify-between items-center ${
                                                selectedCategory === ''
                                                    ? 'bg-marca-50 dark:bg-marca-950/40 text-marca-700 dark:text-marca-400 font-bold'
                                                    : 'text-stone-700 dark:text-stone-300 hover:bg-marca-50/50 dark:hover:bg-marca-950/50 hover:text-marca-700 dark:hover:text-marca-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>📂</span> Todas las categorías
                                            </span>
                                        </button>
                                        
                                        <div className="h-px bg-marca-100 dark:bg-marca-950/60 my-1" />
                                        
                                        {categories.map(cat => {
                                            const isActive = selectedCategory === cat.id.toString();
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        handleCategoryClick(cat.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex justify-between items-center ${
                                                        isActive
                                                            ? 'bg-marca-50 dark:bg-marca-950/40 text-marca-700 dark:text-marca-400 font-bold'
                                                            : 'text-stone-700 dark:text-stone-300 hover:bg-marca-50/50 dark:hover:bg-marca-950/50 hover:text-marca-700 dark:hover:text-marca-400'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">💄 {cat.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="submit" className="px-4 py-2 bg-marca-600 dark:bg-marca-500 text-white font-bold rounded-full shadow hover:bg-marca-800 dark:hover:bg-marca-400 transition-colors text-xs md:text-sm flex-shrink-0 cursor-pointer">
                            Buscar
                        </button>
                    </form>

                    <a
                        href="https://wa.me/584148866814"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-[#25D366] text-white text-xs md:text-sm font-bold rounded-full hover:bg-[#20ba5a] transition-all shadow-sm hover:-translate-y-0.5 hover:scale-105 flex-shrink-0"
                    >
                        <WhatsAppIcon size={14} />
                        <span>Escríbenos al WhatsApp</span>
                    </a>
                </div>

                {/* Buscador Móvil */}
                <div className="block md:hidden px-4 py-2 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Buscar maquillaje, skincare..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 rounded-full border-2 border-stone-200 dark:border-stone-800 focus:border-marca-600 dark:focus:border-marca-400 focus:ring focus:ring-marca-200 dark:focus:ring-marca-900 focus:ring-opacity-50 transition-colors shadow-sm text-stone-700 dark:text-stone-300 text-xs bg-white dark:bg-stone-900"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-marca-500 dark:text-marca-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/>
                                </svg>
                            </div>
                        </div>
                        <button type="submit" className="px-4 py-1.5 bg-marca-600 dark:bg-marca-500 text-white font-bold rounded-full shadow hover:bg-marca-800 dark:hover:bg-marca-400 transition-colors text-xs flex-shrink-0 cursor-pointer">
                            Buscar
                        </button>
                    </form>
                </div>

                {/* Categorías Móviles */}
                {categories && categories.length > 0 && (
                    <div className="block md:hidden bg-white dark:bg-stone-900 pb-2 pt-1 border-t border-stone-200 dark:border-stone-800">
                        <div className="relative">
                            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10" />
                            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10" />
                            <div 
                                ref={categoriesRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMoveDrag}
                                className="flex gap-1.5 overflow-x-auto pb-1.5 px-3 scroll-smooth cursor-grab active:cursor-grabbing select-none" 
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <button
                                    onClick={() => handleCategoryClick('')}
                                    className={`category-chip flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${
                                        selectedCategory === ''
                                            ? 'bg-marca-600 dark:bg-marca-500 border-marca-600 dark:border-marca-500 text-white shadow-md shadow-pink-200'
                                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-marca-700 dark:text-marca-400 hover:border-marca-400 dark:hover:border-marca-700 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                    }`}
                                >
                                    Todas
                                </button>

                                <div className="flex-shrink-0 w-px bg-marca-100 dark:bg-marca-950/60 my-1 self-stretch" />

                                {categories.map(cat => {
                                    const isActive = selectedCategory === cat.id.toString();
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className={`category-chip flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${
                                                isActive
                                                    ? 'bg-marca-600 dark:bg-marca-500 border-marca-600 dark:border-marca-500 text-white shadow-md shadow-pink-200'
                                                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-marca-700 dark:text-marca-400 hover:border-marca-400 dark:hover:border-marca-700 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedCategory && (
                            <div className="flex items-center gap-2 mt-1 ml-4 pb-1">
                                <svg className="w-3.5 h-3.5 text-marca-500 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                                </svg>
                                <span className="text-xs text-marca-600 dark:text-marca-400 font-semibold">
                                    Filtrando: <span className="font-bold">{categories.find(c => c.id.toString() === selectedCategory)?.name}</span>
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

                {/* Marquesina de Promociones */}
                {(globalDiscount > 0 || forceWholesale || forceDistributor) && (
                    <div className="bg-gradient-to-r from-marca-600 dark:from-marca-500 via-stone-600 dark:via-stone-500 to-marca-600 dark:to-marca-500 text-white text-xs font-bold py-1 text-center overflow-hidden whitespace-nowrap">
                        <div className="animate-pulse">
                            ¡SÚPER OFERTAS ACTIVAS!
                            {globalDiscount > 0 && ` 🎉 Todo al -${globalDiscount}% Off.`}
                            {forceWholesale && ` 🌟 Precio Mayorista sin mínimo de compra.`}
                            {forceDistributor && ` 💎 Precio Distribuidor sin mínimo de compra.`}
                        </div>
                    </div>
                )}
            </header>

            {/* Espaciador dinámico */}
            <div className={`h-[230px] md:h-36 ${(globalDiscount > 0 || forceWholesale || forceDistributor) ? 'mt-6' : ''}`} />

            {/* ── CONTENIDO PRINCIPAL ───────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

                {/* Banner del Catálogo */}
                <CatalogBanner text={bannerText} />

                {/* Nota aclaratoria para Consulta Agrupada */}
                <div className="mb-5 p-3.5 bg-marca-50/50 dark:bg-marca-950/50 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center gap-2.5 text-xs text-marca-800 dark:text-marca-300 font-semibold shadow-sm max-w-2xl">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-marca-600 dark:bg-marca-500 text-white font-bold text-[10px] flex-shrink-0">💡</span>
                    <span>Puedes tocar el botón <span className="bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded font-black text-marca-700 dark:text-marca-400 border border-stone-200 dark:border-stone-800">+</span> en la esquina de las imágenes para agrupar varios productos y consultar su disponibilidad juntos en un solo mensaje de WhatsApp.</span>
                </div>

                {/* ── APARTADO DE CATALOGO DE PRODUCTOS Y COMBOS ────────────── */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-marca-200/50 dark:border-marca-900/50 pb-3">
                    <h3 className="text-lg md:text-xl font-extrabold text-marca-800 dark:text-marca-300 flex items-center gap-2">
                        <span>💄</span> Catálogo de Productos y Combos
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Selector de ordenamiento por precio */}
                        <select
                            value={priceSort}
                            onChange={(e) => setPriceSort(e.target.value)}
                            className="text-xs font-bold text-marca-800 dark:text-marca-300 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-full py-1.5 pl-3 pr-8 focus:border-marca-600 dark:focus:border-marca-400 focus:ring-0 cursor-pointer shadow-sm"
                        >
                            <option value="">✨ Por defecto</option>
                            <option value="asc">💵 Precio: Menor a Mayor</option>
                            <option value="desc">💎 Precio: Mayor a Menor</option>
                        </select>
                        <span className="text-xs text-marca-600 dark:text-marca-400 font-bold bg-marca-100 dark:bg-marca-950/60 px-3 py-1.5 rounded-full shrink-0">
                            {catalogItems.length} Ítem{catalogItems.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* ── GRILLA DE PRODUCTOS ───────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {catalogItems.map((producto, idx) => (
                        <div
                            key={producto._isCombo ? `combo-${producto.id}` : `product-${producto.id}`}
                            onClick={() => openProductModal(producto)}
                            className={`product-card-enter card-lift rounded-2xl overflow-hidden shadow-sm border group relative flex flex-col cursor-pointer ${
                                producto._isCombo
                                    ? 'bg-gradient-to-br from-stone-100 dark:from-stone-800 to-white border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-800'
                                    : 'bg-white dark:bg-stone-900 border-transparent hover:border-marca-200 dark:hover:border-marca-900'
                            }`}
                            style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                        >
                            {/* Badges */}
                            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                                {producto._isCombo && (
                                    <span className="bg-stone-800 dark:bg-stone-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">🎁 COMBO</span>
                                )}
                                {producto.por_llegar && (
                                    <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">✈️ POR LLEGAR</span>
                                )}
                                {producto.last_units && (
                                    <span className="bg-marca-700 dark:bg-marca-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">🔥 ÚLTIMAS UNIDADES</span>
                                )}
                                {!producto.price_usdt && (
                                    <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">Consultar</span>
                                )}
                            </div>

                            {/* Imagen */}
                            <div className="aspect-square w-full bg-stone-50 dark:bg-stone-900 flex-shrink-0 relative overflow-hidden">
                                {/* Botón de selección para Consulta Agrupada */}
                                <button
                                    type="button"
                                    onClick={(e) => toggleInquiryProduct(producto, e)}
                                    className={`absolute top-2.5 left-2.5 z-10 flex items-center justify-center w-7 h-7 rounded-full shadow-md backdrop-blur ${
                                        inquiryList.some(p => p.id === producto.id && !!p._isCombo === !!producto._isCombo)
                                            ? 'bg-marca-600 dark:bg-marca-500 text-white hover:bg-marca-800 dark:hover:bg-marca-400 scale-110 add-btn-enter'
                                            : 'bg-white/90 text-marca-500 dark:text-marca-400 hover:bg-white dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:text-marca-700 dark:hover:text-marca-400 transition-all duration-200'
                                    }`}
                                    title={inquiryList.some(p => p.id === producto.id && !!p._isCombo === !!producto._isCombo) ? "Quitar de la consulta agrupada" : "Añadir a la consulta agrupada"}
                                >
                                    {inquiryList.some(p => p.id === producto.id && !!p._isCombo === !!producto._isCombo) ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                        </svg>
                                    )}
                                </button>

                                <LazyImage
                                    src={producto.image_path ? `/storage/${producto.image_path}` : null}
                                    alt={producto.name}
                                    className="w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
                                />
                                {producto.stock === 0 && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                        <span className="bg-stone-800 dark:bg-stone-800 text-white text-xs font-bold px-3 py-1 rounded-full">AGOTADO</span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-3 md:p-4 flex flex-col flex-1">
                                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug mb-1">{producto.name}</h2>

                                {/* Sub-productos del combo (preview) */}
                                {producto._isCombo && producto.products && producto.products.length > 0 && (
                                    <div className="mb-2 mt-1 py-1.5 px-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-100/50 dark:border-stone-950/50 text-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors">
                                        <span className="text-[10px] text-stone-600 dark:text-stone-400 font-bold tracking-wide flex items-center justify-center gap-1">
                                            <span>✨</span> Toca para ver lo que incluye
                                        </span>
                                    </div>
                                )}

                                {/* Categorías */}
                                {!producto._isCombo && producto.categories && producto.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {producto.categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={e => { e.stopPropagation(); handleCategoryClick(cat.id); }}
                                                className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-marca-50 dark:bg-marca-950/40 text-marca-600 dark:text-marca-400 border border-stone-200 dark:border-stone-800 hover:bg-marca-100 dark:hover:bg-marca-950/60 transition-colors uppercase tracking-wide"
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Precios */}
                                <div className="mt-auto pt-2 space-y-1 border-t border-marca-50/50 dark:border-marca-950/50">
                                    {producto.price_usdt ? (
                                        <>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-stone-500 dark:text-stone-400">Detal:</span>
                                                <span className="font-bold text-stone-900 dark:text-stone-100">${parseFloat(producto.price_usdt).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-stone-500 dark:text-stone-400">Mayor:</span>
                                                <span className="font-bold text-marca-700 dark:text-marca-400">
                                                    {producto.price_mayor_usdt ? `$${parseFloat(producto.price_mayor_usdt).toFixed(2)}` : '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-stone-500 dark:text-stone-400">Distribuidor:</span>
                                                <span className="font-bold text-stone-600 dark:text-stone-400">
                                                    {producto.price_distribuidor_usdt ? `$${parseFloat(producto.price_distribuidor_usdt).toFixed(2)}` : '—'}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-1 text-center">
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-100">
                                                💬 Consultar precio
                                            </span>
                                        </div>
                                    )}
                                    <div className="text-[10px] text-marca-600 dark:text-marca-400 font-semibold text-center mt-1.5 pt-1.5 border-t border-dashed border-marca-100/60 dark:border-marca-950/60">
                                        Toque para ver más detalles
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Estado vacío */}
                {catalogItems.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 shadow-sm mt-8">
                        <div className="text-marca-400 dark:text-marca-500 mb-4 flex justify-center">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-200">No se encontraron productos</h3>
                        <p className="text-marca-600 dark:text-marca-400 mt-2">Prueba buscando otra cosa o quita los filtros.</p>
                        {(search || selectedCategory) && (
                            <button
                                                onClick={() => { setSearch(''); setSelectedCategory(''); router.get(route('home'), {}, { preserveState: true, preserveScroll: true }); }}
                                className="mt-4 px-6 py-2 bg-marca-100 dark:bg-marca-950/60 text-marca-700 dark:text-marca-400 rounded-full font-bold hover:bg-marca-200 dark:hover:bg-marca-900 transition"
                            >
                                Ver Todo
                            </button>
                        )}
                    </div>
                )}
            </main>

            {/* ── MODAL DETALLE DEL PRODUCTO ───────────────────────────── */}
            <Modal show={!!selectedProduct} onClose={closeProductModal} maxWidth="2xl" panelClass="bg-transparent shadow-none overflow-visible">
                {selectedProduct && (() => {
                    const mainImage = selectedProduct.image_path ? `/storage/${selectedProduct.image_path}` : null;
                    const galleryPics = selectedProduct.images ? selectedProduct.images.map(img => img.image_url) : [];
                    const allImages = mainImage ? [mainImage, ...galleryPics] : galleryPics;
                    const hasImages = allImages.length > 0;
                    const currentImgSrc = hasImages ? allImages[currentImageIndex] : null;

                    return (
                        <div className="flex flex-col gap-6 my-2">
                            {/* Tarjeta Principal del Producto */}
                            <div className="modal-content-enter bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative w-full">

                            {/* Botón cerrar (mobile) */}
                            <button onClick={closeProductModal} className="md:hidden absolute top-2 right-2 z-10 bg-white/80 backdrop-blur rounded-full p-2 text-stone-500 dark:text-stone-400 shadow hover:text-stone-800 dark:hover:text-stone-100">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>

                            {/* Carrusel de imágenes + zoom tipo ML */}
                            <div className="w-full md:w-1/2 bg-stone-50 dark:bg-stone-900 flex flex-col justify-center items-center">
                                <div
                                    className={`relative min-h-[200px] sm:min-h-[260px] md:min-h-[350px] w-full flex-1 flex items-center justify-center p-3 sm:p-4 ${isDesktop ? 'cursor-zoom-in' : 'cursor-default'}`}
                                    onMouseMove={handleMouseMove}
                                    onMouseEnter={() => isDesktop && setIsZoomed(true)}
                                    onMouseLeave={() => setIsZoomed(false)}
                                >
                                    {/* Imagen principal (o imagen de variante seleccionada) */}
                                    {(() => {
                                        const mainImage = selectedProduct.image_path ? `/storage/${selectedProduct.image_path}` : null;
                                        const galleryPics = selectedProduct.images ? selectedProduct.images.map(img => img.image_url) : [];
                                        const allImages = mainImage ? [mainImage, ...galleryPics] : galleryPics;
                                        const currentImgSrc = variantOverrideImage || (allImages.length > 0 ? allImages[currentImageIndex] : null);

                                        return currentImgSrc ? (
                                            <>
                                                <img
                                                    ref={imgRef}
                                                    key={currentImgSrc}
                                                    src={currentImgSrc}
                                                    alt={selectedProduct.name}
                                                    decoding="async"
                                                    className="max-h-[45vh] md:max-h-[450px] w-auto max-w-full object-contain drop-shadow-md img-loaded select-none"
                                                    style={{
                                                        transformOrigin: isZoomed ? `${zoomPos.x}% ${zoomPos.y}%` : 'center',
                                                        transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                                                        transition: isZoomed ? 'none' : 'transform 0.2s ease',
                                                    }}
                                                    draggable={false}
                                                />
                                                {/* Indicador de variante activa */}
                                                {variantOverrideImage && (
                                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                                                        <span className="bg-black/50 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur">
                                                            {selectedProduct.variants?.find(v => v.id === selectedVariantId)?.label}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-marca-400 dark:text-marca-500">
                                                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                            </div>
                                        );
                                    })()}

                                    {/* Flechas del carrusel (solo si no hay override de variante) */}
                                    {!variantOverrideImage && (() => {
                                        const mainImage = selectedProduct.image_path ? `/storage/${selectedProduct.image_path}` : null;
                                        const galleryPics = selectedProduct.images ? selectedProduct.images.map(img => img.image_url) : [];
                                        const allImages = mainImage ? [mainImage, ...galleryPics] : galleryPics;
                                        return allImages.length > 1 ? (
                                            <>
                                                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-white/60 hover:bg-white dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 rounded-full shadow-lg backdrop-blur transition">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                                                </button>
                                                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-white/60 hover:bg-white dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 rounded-full shadow-lg backdrop-blur transition">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                                                </button>
                                            </>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Thumbnails del carrusel */}
                                {(() => {
                                    const mainImage = selectedProduct.image_path ? `/storage/${selectedProduct.image_path}` : null;
                                    const galleryPics = selectedProduct.images ? selectedProduct.images.map(img => img.image_url) : [];
                                    const allImages = mainImage ? [mainImage, ...galleryPics] : galleryPics;
                                    return allImages.length > 1 && !variantOverrideImage ? (
                                        <div className="flex gap-2 p-3 md:p-4 md:pt-0 overflow-x-auto justify-center bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
                                            {allImages.map((src, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentImageIndex(idx)}
                                                    className={`h-10 w-10 md:h-12 md:w-12 rounded overflow-hidden flex-shrink-0 border-2 transition ${currentImageIndex === idx ? 'border-marca-600 dark:border-marca-500 shadow' : 'border-transparent hover:border-marca-400 dark:hover:border-marca-700'}`}
                                                >
                                                    <img src={src} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Detalles del producto */}
                            <div className="w-full md:w-1/2 p-5 md:p-8 flex flex-col bg-white dark:bg-stone-900 relative">
                                <button onClick={closeProductModal} className="hidden md:block absolute top-4 right-4 text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>

                                {/* Categorías */}
                                {selectedProduct.categories && selectedProduct.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {selectedProduct.categories.map(cat => (
                                            <span key={cat.id} className="text-[10px] md:text-xs font-bold text-marca-600 dark:text-marca-400 uppercase tracking-wide bg-marca-50 dark:bg-marca-950/40 px-2 py-1 rounded-full">{cat.name}</span>
                                        ))}
                                    </div>
                                )}

                                <h2 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight mb-3">{selectedProduct.name}</h2>

                                {/* Precio principal */}
                                {selectedProduct.price_usdt ? (
                                    <div className="flex items-baseline gap-3 mb-4 pb-4 border-b border-stone-200 dark:border-stone-800">
                                        <span className="text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-100">
                                            ${parseFloat(selectedProduct.price_usdt).toFixed(2)}
                                        </span>
                                        <span className="text-sm font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">ref</span>
                                    </div>
                                ) : (
                                    <div className="mb-4 pb-4 border-b border-stone-200 dark:border-stone-800">
                                        <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg bg-amber-50 dark:bg-amber-950/50 px-4 py-2 rounded-xl border border-amber-100">
                                            💬 Precio a consultar
                                        </span>
                                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Escríbenos para más información sobre el precio.</p>
                                    </div>
                                )}

                                {/* Precios al mayor / distribuidor (ubicado arriba de la descripción) */}
                                {selectedProduct.price_usdt && (selectedProduct.price_mayor_usdt || selectedProduct.price_distribuidor_usdt || selectedProduct.conditional_price) && (
                                    <div className="mb-4 p-3 bg-marca-50 dark:bg-marca-950/40 rounded-xl border border-stone-200 dark:border-stone-800">
                                        <h4 className="text-[10px] md:text-xs font-bold text-marca-800 dark:text-marca-300 mb-2 uppercase tracking-widest">Precios especiales</h4>
                                        <div className="space-y-1.5">
                                            {selectedProduct.conditional_price && selectedProduct.conditional_min_quantity && (
                                                <div className="flex justify-between items-center text-xs font-bold text-orange-600 bg-orange-50 p-1.5 rounded-lg border border-orange-100">
                                                    <span>🎁 Promo: {selectedProduct.conditional_min_quantity} uds. por</span>
                                                    <span>${parseFloat(selectedProduct.conditional_price).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {selectedProduct.price_mayor_usdt && (
                                                <div className="flex justify-between items-center text-xs border-b border-stone-200 dark:border-stone-800 pb-1.5">
                                                    <span className="text-stone-600 dark:text-stone-400">Mayor</span>
                                                    <span className="font-bold text-stone-900 dark:text-stone-100">${parseFloat(selectedProduct.price_mayor_usdt).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {selectedProduct.price_distribuidor_usdt && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-stone-600 dark:text-stone-400">Distribuidor</span>
                                                    <span className="font-bold text-stone-900 dark:text-stone-100">${parseFloat(selectedProduct.price_distribuidor_usdt).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Badge COMBO */}
                                {selectedProduct._isCombo && (
                                    <div className="mb-4 p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-800">
                                        <h4 className="text-[10px] md:text-xs font-bold text-stone-800 dark:text-stone-200 mb-2 uppercase tracking-widest flex items-center gap-1.5">🎁 Productos incluidos en el combo</h4>
                                        {selectedProduct.products && selectedProduct.products.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedProduct.products.map(cp => (
                                                    <div key={cp.id} className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-lg p-2 border border-stone-200 dark:border-stone-800">
                                                        {cp.images && cp.images.length > 0 ? (
                                                            <img src={cp.images[0].image_url} className="w-8 h-8 object-contain rounded" />
                                                        ) : cp.image_url ? (
                                                            <img src={cp.image_url} className="w-8 h-8 object-contain rounded" />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded flex items-center justify-center text-stone-400 dark:text-stone-500 text-lg">📦</div>
                                                        )}
                                                        <span className="text-xs text-stone-700 dark:text-stone-300 font-semibold line-clamp-2">{cp.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-stone-500 dark:text-stone-400">Combo especial</p>
                                        )}
                                    </div>
                                )}

                                {/* Descripción del producto */}
                                {selectedProduct.description && (
                                    <div className="mb-4 p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
                                        <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">{selectedProduct.description}</p>
                                    </div>
                                )}

                                {/* ── VARIANTES DEL PRODUCTO ── */}
                                {selectedProduct.show_variants_in_store !== false && selectedProduct.variants && selectedProduct.variants.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">
                                            {selectedProduct.variants[0]?.type === 'color' ? '🎨 Colores disponibles'
                                                : selectedProduct.variants[0]?.type === 'fragancia' ? '🌸 Fragancias disponibles'
                                                : '📦 Opciones disponibles'}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProduct.variants.map(v => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => selectVariant(v)}
                                                    title={v.label}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                                                        selectedVariantId === v.id
                                                            ? 'border-marca-600 dark:border-marca-500 bg-marca-50 dark:bg-marca-950/40 text-marca-800 dark:text-marca-300 shadow-md scale-105'
                                                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-marca-400 dark:hover:border-marca-700 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                                    }`}
                                                >
                                                    {v.image_url ? (
                                                        <img
                                                            src={v.image_url}
                                                            alt={v.label}
                                                            className="w-7 h-7 object-contain rounded-lg border bg-stone-50 dark:bg-stone-900"
                                                        />
                                                    ) : (
                                                        <span className="w-5 h-5 rounded-full border-2 border-current opacity-50" />
                                                    )}
                                                    <span>
                                                        {v.label}
                                                        {v.stock === 0 && (
                                                            <span className="text-[10px] ml-1.5 text-red-500 dark:text-red-400 font-extrabold">
                                                                (Agotado)
                                                            </span>
                                                        )}
                                                    </span>
                                                    {selectedVariantId === v.id && (
                                                        <svg className="w-3.5 h-3.5 text-marca-600 dark:text-marca-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {selectedVariantId && (
                                            <button
                                                onClick={() => { setSelectedVariantId(null); setVariantOverrideImage(null); }}
                                                className="mt-2 text-[10px] text-marca-500 dark:text-marca-400 hover:text-marca-700 dark:hover:text-marca-400 underline underline-offset-2 transition-colors"
                                            >
                                                ✕ Quitar selección
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Disponibilidad */}
                                <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                                    <span className="text-stone-500 dark:text-stone-400 font-medium">Disponibilidad:</span>
                                    <div className="flex flex-col items-end gap-1">
                                        {selectedProduct.por_llegar ? (
                                            <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 animate-pulse">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                                Por llegar ✈️
                                            </span>
                                        ) : selectedProduct.stock > 0 ? (
                                            <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                                Disponible
                                            </span>
                                        ) : (
                                            <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
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

                                {/* Botón Consultar */}
                                <a
                                    href={`https://wa.me/584148866814?text=${encodeURIComponent(
                                        `Buenas. Me interesa consultar la disponibilidad de este producto:\n\n${selectedProduct.name}\n\nImagen: ${getImageUrl(selectedProduct.image_path)}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold rounded-xl shadow-md hover:bg-[#20ba5a] transition-all text-sm hover:-translate-y-0.5 text-center cursor-pointer"
                                >
                                    <WhatsAppIcon size={18} />
                                    <span>{selectedProduct.price_usdt ? 'Consultar disponibilidad' : 'Consultar precio y disponibilidad'}</span>
                                </a>

                                {/* Botón Agregar/Quitar de consulta agrupada */}
                                <button
                                    type="button"
                                    onClick={(e) => toggleInquiryProduct(selectedProduct, e)}
                                    className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 font-bold rounded-xl border-2 transition-all text-xs cursor-pointer ${
                                        inquiryList.some(p => p.id === selectedProduct.id)
                                            ? 'bg-marca-50 dark:bg-marca-950/40 border-marca-300 dark:border-marca-800 text-marca-700 dark:text-marca-400 hover:bg-marca-100 dark:hover:bg-marca-950/60'
                                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-marca-400 dark:hover:border-marca-700 hover:text-marca-700 dark:hover:text-marca-400'
                                    }`}
                                >
                                    {inquiryList.some(p => p.id === selectedProduct.id) ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>En lista de consulta (Quitar)</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Añadir a consulta agrupada</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            </div>

                            {/* BURBUJA EXTERNA DE PRODUCTOS SIMILARES (SE MUESTRA AL DESLIZAR/BAJAR) */}
                            {similarProducts.length > 0 && (
                                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-marca-200/80 dark:border-marca-900/80 shadow-2xl animate-fadeInUp">
                                    <div className="flex items-center justify-between mb-2.5 px-1">
                                        <span className="text-[11px] sm:text-xs font-black text-marca-800 dark:text-marca-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>✨</span> Productos similares de esta categoría
                                        </span>
                                        
                                        {/* Botones de navegación en PC / Móvil */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => scrollSimilar('left')}
                                                className="flex items-center justify-center w-7 h-7 bg-white dark:bg-stone-900 hover:bg-marca-50 dark:hover:bg-marca-950/40 text-marca-700 dark:text-marca-400 border border-stone-200 dark:border-stone-800 rounded-full shadow-xs transition-colors cursor-pointer"
                                                title="Anteriores"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => scrollSimilar('right')}
                                                className="flex items-center justify-center w-7 h-7 bg-white dark:bg-stone-900 hover:bg-marca-50 dark:hover:bg-marca-950/40 text-marca-700 dark:text-marca-400 border border-stone-200 dark:border-stone-800 rounded-full shadow-xs transition-colors cursor-pointer"
                                                title="Siguientes"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        ref={similarScrollRef}
                                        className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scroll-smooth"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {similarProducts.map(sp => (
                                            <button
                                                key={sp.id}
                                                type="button"
                                                onClick={() => openProductModal(sp)}
                                                className="flex-shrink-0 w-24 sm:w-28 bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:shadow-md hover:border-marca-400 dark:hover:border-marca-700 transition-all text-left group cursor-pointer"
                                            >
                                                <div className="h-16 w-full mb-1.5 bg-stone-50 dark:bg-stone-900 rounded-lg overflow-hidden flex items-center justify-center p-1">
                                                    <img src={sp.image_url} alt={sp.name} className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
                                                </div>
                                                <p className="text-[10px] sm:text-[11px] font-bold text-stone-800 dark:text-stone-200 line-clamp-1 group-hover:text-marca-700 dark:group-hover:text-marca-400 transition-colors">{sp.name}</p>
                                                <p className="text-[10px] sm:text-[11px] font-black text-marca-700 dark:text-marca-400 mt-0.5">
                                                    {sp.price_usdt ? `$${parseFloat(sp.price_usdt).toFixed(2)}` : 'Consultar'}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>

            {/* ── FOOTER ───────────────────────────────────────────────── */}
            <footer className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 py-8 text-center mt-8">
                <div className="max-w-7xl mx-auto px-4">
                    <img src="/storage/every.png" alt="Every Beauty" className="h-8 mx-auto mb-3 opacity-60" />
                    <p className="text-marca-500 dark:text-marca-400 text-sm font-semibold">Every Beauty &copy; {new Date().getFullYear()}</p>
                    <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">Cosméticos y productos de belleza de calidad</p>

                    {/* Redes sociales en footer */}
                    <div className="flex justify-center gap-4 mt-4 flex-wrap">
                        <a href="https://www.instagram.com/everybeauty.ve?igsh=OGF4bjNjZzJ4ZXB0" target="_blank" rel="noopener noreferrer"
                           className="text-marca-500 dark:text-marca-400 hover:text-marca-700 dark:hover:text-marca-400 transition-colors" title="Instagram">
                            <InstagramIcon size={20} />
                        </a>
                        <a href="https://www.tiktok.com/@everybeauty.ve?_t=ZM-901SnI1QRp6&_r=1" target="_blank" rel="noopener noreferrer"
                           className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" title="TikTok">
                            <TikTokIcon size={20} />
                        </a>
                        <a href="https://whatsapp.com/channel/0029VbAxM4BDjiOWZcMhxD0y" target="_blank" rel="noopener noreferrer"
                           className="text-emerald-500 hover:text-emerald-700 transition-colors" title="WhatsApp Canal VIP">
                            <WhatsAppIcon size={20} />
                        </a>
                    </div>


                </div>
            </footer>

            {/* Botón flotante de WhatsApp superpuesto grande a la derecha */}
            <a
                href="https://wa.me/584148866814"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 bg-[#25D366] text-white rounded-full shadow-2xl whatsapp-fab group"
                title="Escríbenos por WhatsApp"
            >
                <WhatsAppIcon size={32} />
                <span className="absolute right-20 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg border border-stone-200 dark:border-stone-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    ¡Escríbenos por WhatsApp!
                </span>
            </a>

            {/* Barra flotante de Consulta Agrupada */}
            {inquiryList.length > 0 && (
                <div className="fixed bottom-6 left-6 md:left-1/2 md:-translate-x-1/2 z-40 flex items-center gap-3 bg-marca-700 dark:bg-marca-500 text-white px-4 py-3 rounded-full shadow-2xl border border-marca-600 dark:border-marca-500 max-w-[80vw] md:max-w-sm hover:scale-105 transition-transform duration-200 inquiry-bar-mobile md:inquiry-bar-desktop">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-stone-900 text-xs font-black text-marca-700 dark:text-marca-400 animate-pulse">
                            {inquiryList.length}
                        </span>
                        <span className="text-xs font-bold whitespace-nowrap">
                            {inquiryList.length === 1 ? 'Producto seleccionado' : 'Productos seleccionados'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsInquiryModalOpen(true)}
                        className="bg-white dark:bg-stone-900 text-marca-700 dark:text-marca-400 text-[10px] font-black px-3.5 py-1.5 rounded-full hover:bg-marca-50 dark:hover:bg-marca-950/40 transition-colors uppercase tracking-wider cursor-pointer shadow-sm"
                    >
                        Consultar
                    </button>
                </div>
            )}

            {/* Modal de Consulta Agrupada */}
            <Modal show={isInquiryModalOpen} onClose={() => setIsInquiryModalOpen(false)} maxWidth="lg">
                <div className="p-5 md:p-6 bg-white dark:bg-stone-900 rounded-2xl flex flex-col max-h-[80vh]">
                    <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-800">
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                            <span>📋</span> Productos a Consultar ({inquiryList.length})
                        </h3>
                        <button onClick={() => setIsInquiryModalOpen(false)} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {/* Lista scrollable */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-2">
                        {inquiryList.map(prod => (
                            <div key={prod.id} className="flex items-center gap-3 p-2.5 bg-marca-50/20 dark:bg-marca-950/20 border border-marca-100/50 dark:border-marca-950/50 rounded-xl">
                                <div className="w-12 h-12 bg-stone-50 dark:bg-stone-900 rounded-lg overflow-hidden flex-shrink-0 border border-marca-100/30 dark:border-marca-950/30">
                                    <img 
                                        src={prod.image_path ? `/storage/${prod.image_path}` : '/storage/no-image.png'} 
                                        alt={prod.name} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{prod.name}</h4>
                                    <span className="text-xs text-marca-700 dark:text-marca-400 font-bold">${parseFloat(prod.price_usdt).toFixed(2)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleInquiryProduct(prod)}
                                    className="text-stone-400 dark:text-stone-500 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full transition-colors cursor-pointer"
                                    title="Quitar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Botón enviar */}
                    <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                        <button
                            type="button"
                            onClick={sendGroupInquiry}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold rounded-xl shadow-md hover:bg-[#20ba5a] transition-all text-sm cursor-pointer shadow-green-200"
                        >
                            <WhatsAppIcon size={18} />
                            <span>Consultar disponibilidad en WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setInquiryList([]);
                                setIsInquiryModalOpen(false);
                            }}
                            className="w-full py-1 text-center text-xs text-marca-600 dark:text-marca-400 font-bold hover:text-marca-800 dark:hover:text-marca-300 transition-colors cursor-pointer"
                        >
                            Limpiar toda la lista
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}