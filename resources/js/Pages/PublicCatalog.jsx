import { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';

// --- ICONOS AUXILIARES ---

const StrawberryIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M15.42 2.94c.3-.67-1.07-1.34-1.74-1.07-.38.16-.7.42-.94.75-.24-.33-.56-.6-.94-.75-.67-.27-2.04.4-1.74 1.07.15.34.42.63.75.82C6.96 5.25 4 9.17 4 13.5c0 4.69 3.58 8.5 8 8.5s8-3.81 8-8.5c0-4.33-2.96-8.25-6.81-9.74.33-.19.6-.48.75-.82h-.52zm-3.42 6.56c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm8 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
        <path d="M12 0c-1 0-1.5.5-2 1.5-.5-1-1-1.5-2-1.5S7 1 7 2.5s2 3 2c0 1.5-1 2-2 4 1-1 2.5-1.5 4-1.5 1.5 0 3 .5 4 1.5-1-2-2-2.5-2-4 1 3-.5 3-2S16 0 15 0c-1 0-1.5.5-2 1.5C12.5.5 12 0 12 0z" fill="#15803d" className="text-green-700 dark:text-green-400"/>
    </svg>
);

const WhatsAppIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" className={className}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
    </svg>
);

const normalizeText = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export default function PublicCatalog({ productos }) {
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    
    // Estado para el producto seleccionado (Modal Kawaii)
    const [selectedProduct, setSelectedProduct] = useState(null);

    const productosFiltrados = productos.filter(producto => 
        normalizeText(producto.name).includes(normalizeText(busqueda))
    );

    // --- LÓGICA DEL CARRITO ---
    const addToCart = (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });

        // Cerrar modal de producto al agregar si se desea, o dejarlo abierto.
        // setSelectedProduct(null); // Descomentar si quieres que se cierre al agregar

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            background: '#fff1f2',
            color: '#be123c',
            customClass: {
                popup: 'rounded-2xl shadow-xl border-2 border-stone-200 dark:border-stone-800',
                progressBar: 'bg-marca-600 dark:bg-marca-500'
            }
        });
        Toast.fire({
            icon: 'success',
            iconColor: '#db2777',
            title: `<span class="font-bold">¡Añadido! 🍓</span>`,
            text: product.name
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        setCart(prevCart => 
            prevCart.map(item => 
                item.id === productId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const totalBs = useMemo(() => {
        return cart.reduce((total, item) => total + (parseFloat(item.price_bs) * item.quantity), 0);
    }, [cart]);

    const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

    const enviarPedidoWhatsApp = () => {
        if (cart.length === 0) return;
        const phoneNumber = "584148866814";
        let message = `✨ Holis ✨ Me gustaría realizar el siguiente pedido:\n\n`;
        cart.forEach(item => {
            const subtotal = (parseFloat(item.price_bs) * item.quantity).toFixed(2);
            message += `🍓 *${item.name}* (x${item.quantity}) - Bs. ${subtotal}\n`;
        });
        message += `\n💗 *Total a Pagar: Bs. ${totalBs.toFixed(2)}*`;
        message += `\n\nQuedo atenta para los datos de pago.`;
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#fff0f3] font-sans text-stone-800 dark:text-stone-200 pb-20 sm:pb-0 relative selection:bg-pink-200">
            <Head title="Catálogo" />

            {/* --- FONDO PATRÓN DE FRESAS --- */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10c2 0 4 2 4 5s-2 6-4 6-4-3-4-6 2-5 4-5zm0-2c-1 0-1.5-.5-1.5-1s.5-1.5 1.5-1.5 1.5.5 1.5 1.5-.5 1-1.5 1z' fill='%23e11d48' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: '40px'
            }}></div>

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-40 border-b border-stone-200 dark:border-stone-800 bg-white/80 backdrop-blur-md shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex gap-4 items-center justify-between">
                    
                    {/* LOGO */}
                    <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer group">
                        <img 
                            src="/storage/every.png" 
                            alt="Every Beauty Logo" 
                            className="w-11 h-11 object-cover rounded-full shadow-md bg-marca-100 dark:bg-marca-950/60 border-2 border-white group-hover:scale-105 transition-transform"
                        />
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 hidden sm:block">
                            <span className="text-marca-600 dark:text-marca-400">Every</span>Beauty
                        </h1>
                        <span className="sm:hidden font-black text-marca-600 dark:text-marca-400 text-lg">Every</span>
                    </div>

                    {/* BUSCADOR */}
                    <div className="flex-1 max-w-md mx-auto">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-marca-400 dark:text-marca-500 group-focus-within:text-rose-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Buscar antojito..." 
                                className="block w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-stone-800 rounded-full leading-5 bg-marca-50/50 dark:bg-marca-950/50 placeholder-marca-400 dark:placeholder-marca-500 focus:outline-none focus:bg-white focus:border-marca-500 dark:focus:border-marca-500 focus:ring-2 focus:ring-marca-100 dark:focus:ring-marca-950 text-sm transition-all"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* BOTÓN CARRITO */}
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 text-stone-500 dark:text-stone-400 hover:text-marca-700 dark:hover:text-marca-400 hover:bg-marca-50 dark:hover:bg-marca-950 rounded-full transition-all active:scale-95 flex-shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-7 h-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 1-1.12-1.243l1.264-12c.07-.665.45-1.243 1.119-1.243h3.473c.672 0 1.237.568 1.155 1.237.083-.669.648-1.237 1.32-1.237h3.473c.668 0 1.247.578 1.155 1.243Z" />
                        </svg>

                        {totalItems > 0 && (
                            <span className="absolute top-0.5 right-0.5 bg-marca-600 dark:bg-marca-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full ring-2 ring-white animate-bounce">
                                {totalItems}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                
                {/* Banner de Texto */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-stone-800 dark:text-stone-200 mb-2 tracking-tight">
                        Every Beauty <span className="text-marca-600 dark:text-marca-400">🍓</span>
                    </h2>
                    <p className="text-marca-600 dark:text-marca-400 font-medium text-lg">Productos seleccionados con amor</p>
                </div>

                {/* Grid de Productos */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {productosFiltrados.map((prod) => (
                        <div 
                            key={prod.id} 
                            onClick={() => setSelectedProduct(prod)} // ABRIR MODAL
                            className="bg-marca-50 dark:bg-marca-950/40 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-100 hover:border-marca-400 dark:hover:border-marca-700 cursor-pointer"
                        >
                            {/* Imagen */}
                            <div className="aspect-square bg-gradient-to-b from-white to-marca-50 dark:to-marca-950/40 p-4 relative overflow-hidden flex items-center justify-center">
                                {prod.image_url ? (
                                    <img src={prod.image_url} alt={prod.name} className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <StrawberryIcon className="w-16 h-16 text-marca-400 dark:text-marca-500 opacity-50" />
                                )}
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); addToCart(prod); }}
                                    className="absolute bottom-3 right-3 bg-white dark:bg-stone-900 p-2.5 rounded-full shadow-lg text-marca-600 dark:text-marca-400 md:hidden active:bg-rose-50 border border-stone-200 dark:border-stone-800 z-10"
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            </div>

                            {/* Info */}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 line-clamp-2 mb-2 flex-grow">{prod.name}</h3>
                                
                                <div className="mt-auto">
                                    <p className="text-xs text-marca-500 dark:text-marca-400 font-medium mb-1">Ref: ${parseFloat(prod.price_ref).toFixed(2)}</p>
                                    <div className="flex items-baseline gap-1 mb-3">
                                        <span className="text-sm text-marca-700 dark:text-marca-400 font-bold">Bs.</span>
                                        <span className="text-2xl font-black text-marca-800 dark:text-marca-300">{parseFloat(prod.price_bs).toFixed(2)}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); addToCart(prod); }}
                                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-marca-600 dark:text-marca-400 py-2.5 rounded-xl font-bold text-sm hover:bg-marca-600 dark:hover:bg-marca-500 hover:text-white hover:border-marca-600 dark:hover:border-marca-500 transition-all duration-300 hidden md:block shadow-sm"
                                    >
                                        Agregar 🍓
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {productosFiltrados.length === 0 && (
                    <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm mx-auto max-w-md">
                        <div className="bg-marca-100 dark:bg-marca-950/60 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                            <img src="/storage/every.png" alt="Logo" className="w-20 h-20 object-cover rounded-full mix-blend-multiply opacity-80" />
                        </div>
                        <p className="text-stone-900 dark:text-stone-100 font-bold text-lg mb-1">¡Ups! No hay resultados</p>
                        <p className="text-marca-500 dark:text-marca-400">Intenta buscar otro antojito.</p>
                    </div>
                )}
            </main>

            {/* --- MODAL DE PRODUCTO (TIPO MERCADO LIBRE / FACEBOOK + KAWAII) --- */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                    {/* Backdrop borroso y rosado */}
                    <div className="fixed inset-0 bg-marca-900/40 dark:bg-marca-300/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)}></div>

                    <div className="flex min-h-full items-end justify-center sm:items-center p-0 sm:p-4 text-center">
                        {/* Contenedor Modal */}
                        <div className="relative transform overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-white dark:bg-stone-900 text-left shadow-2xl transition-all sm:my-8 w-full sm:max-w-2xl border-t-4 sm:border-4 border-marca-300 dark:border-marca-800">
                            
                            {/* Botón Cerrar Flotante */}
                            <button 
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-4 right-4 z-20 bg-white/80 p-2 rounded-full text-stone-400 dark:text-stone-500 hover:text-marca-600 dark:hover:text-marca-400 hover:bg-white dark:hover:bg-stone-900 shadow-sm backdrop-blur-md"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="bg-white dark:bg-stone-900">
                                <div className="sm:flex sm:items-start">
                                    
                                    {/* SECCIÓN IMAGEN GRANDE (CON ZOOM AL PASAR MOUSE O CLIC) */}
                                    <div className="w-full sm:w-3/5 bg-stone-50 dark:bg-stone-900 relative overflow-hidden group h-[50vh] sm:h-[600px] flex items-center justify-center cursor-zoom-in">
                                        {/* Patrón de fondo sutil */}
                                        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#db2777 1px, transparent 1px)', backgroundSize: '20px'}}></div>
                                        
                                        {selectedProduct.image_url ? (
                                            <img 
                                                src={selectedProduct.image_url} 
                                                alt={selectedProduct.name} 
                                                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 ease-in-out transform hover:scale-150 active:scale-150"
                                            />
                                        ) : (
                                            <StrawberryIcon className="w-32 h-32 text-marca-400 dark:text-marca-500" />
                                        )}
                                        
                                        {/* Etiqueta Kawaii */}
                                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-full px-3 py-1 text-xs font-bold text-marca-600 dark:text-marca-400 shadow-sm border border-stone-200 dark:border-stone-800">
                                            🔍 Haz zoom uwu
                                        </div>
                                    </div>

                                    {/* SECCIÓN DETALLES */}
                                    <div className="w-full sm:w-2/5 p-6 sm:p-8 flex flex-col h-auto sm:h-[600px] bg-white dark:bg-stone-900 relative">
                                        
                                        <div className="flex-1">
                                            {/* Titulo */}
                                            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-2">
                                                {selectedProduct.name}
                                            </h3>
                                            
                                            <div className="h-1 w-12 bg-marca-500 dark:bg-marca-500 rounded-full mb-6"></div>

                                            {/* Precios */}
                                            <div className="bg-marca-50 dark:bg-marca-950/40 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 mb-6">
                                                <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Precio Referencia: <span className="font-mono">${parseFloat(selectedProduct.price_ref).toFixed(2)}</span></p>
                                                <div className="flex items-end gap-1">
                                                    <span className="text-3xl font-black text-marca-700 dark:text-marca-400">Bs. {parseFloat(selectedProduct.price_bs).toFixed(2)}</span>
                                                </div>
                                                <p className="text-xs text-marca-500 dark:text-marca-400 font-medium mt-1">✨ Precio especial onichan</p>
                                            </div>

                                            {/* Decoración */}
                                            <div className="flex gap-2 mb-6">
                                                <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/50 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">Disponible</span>
                                                <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-1 text-xs font-medium text-stone-700 dark:text-stone-300 ring-1 ring-inset ring-stone-700/20 dark:ring-stone-500/20">Original</span>
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="mt-auto space-y-3">
                                            <button
                                                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                                                className="w-full rounded-2xl bg-marca-600 dark:bg-marca-500 px-3.5 py-4 text-base font-bold text-white shadow-lg shadow-rose-200 hover:bg-marca-700 dark:hover:bg-marca-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <span>Agregar al Carrito 🍓</span>
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProduct(null)}
                                                className="w-full rounded-2xl bg-white dark:bg-stone-900 px-3.5 py-3 text-sm font-semibold text-stone-900 dark:text-stone-100 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                                            >
                                                Seguir viendo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BARRA FLOTANTE (Móvil) --- */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 p-4 shadow-[0_-4px_20px_rgba(244,63,94,0.15)] z-40 safe-area-bottom">
                    <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-marca-500 dark:text-marca-400 uppercase tracking-wider">{totalItems} productos</span>
                            <span className="text-2xl font-black text-stone-900 dark:text-stone-100">Bs. {totalBs.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="bg-marca-600 dark:bg-marca-500 text-white px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-marca-700 dark:hover:bg-marca-500 transition-all shadow-lg shadow-rose-200 active:scale-95"
                        >
                            Ver Carrito
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL CARRITO --- */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-marca-900/20 dark:bg-marca-300/20 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
                    
                    <div className="fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md flex z-50">
                        <div className="w-full h-[90vh] sm:h-full bg-white dark:bg-stone-900 shadow-2xl flex flex-col rounded-t-[2.5rem] sm:rounded-l-[2.5rem] sm:rounded-tr-none overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
                            
                            {/* Header del Carrito */}
                            <div className="px-8 py-6 bg-gradient-to-b from-marca-50 dark:from-marca-950/40 to-white border-b border-stone-200 dark:border-stone-800 relative">
                                <div className="sm:hidden w-16 h-1.5 bg-marca-200 dark:bg-marca-900 rounded-full mx-auto mb-6"></div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-stone-800 dark:text-stone-200 flex items-center gap-2">
                                            Mi Bolsita <span className="text-2xl">🛍️</span>
                                        </h2>
                                        <p className="text-sm text-marca-500 dark:text-marca-400 mt-1">¡Ya casi son tuyos!</p>
                                    </div>
                                    <button onClick={() => setIsCartOpen(false)} className="text-stone-400 dark:text-stone-500 hover:text-marca-600 dark:hover:text-marca-400 hover:bg-marca-50 dark:hover:bg-marca-950/40 rounded-full p-2 transition-colors">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Lista de Items */}
                            <div className="flex-1 py-4 overflow-y-auto px-6 bg-white dark:bg-stone-900 custom-scrollbar">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                                        <div className="bg-marca-50 dark:bg-marca-950/40 p-6 rounded-full mb-4">
                                            <img src="/storage/every.png" className="w-16 h-16 object-cover rounded-full opacity-50" />
                                        </div>
                                        <p className="text-stone-800 dark:text-stone-200 font-bold text-lg">Tu bolsita está vacía</p>
                                        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">¡Corre a llenarla de maquillaje!</p>
                                    </div>
                                ) : (
                                    <ul className="space-y-5">
                                        {cart.map((item) => (
                                            <li key={item.id} className="flex gap-4">
                                                <div className="h-24 w-24 flex-shrink-0 rounded-2xl border border-stone-200 dark:border-stone-800 bg-marca-50/50 dark:bg-marca-950/50 p-2 overflow-hidden flex items-center justify-center">
                                                    <img src={item.image_url} alt={item.name} className="h-full w-full object-contain mix-blend-multiply" />
                                                </div>
                                                
                                                <div className="flex flex-1 flex-col justify-between py-1">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 line-clamp-2 leading-tight">{item.name}</h3>
                                                        <p className="text-sm font-black text-marca-700 dark:text-marca-400 whitespace-nowrap">Bs. {(parseFloat(item.price_bs) * item.quantity).toFixed(2)}</p>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between mt-2">
                                                        <div className="flex items-center bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-1">
                                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 shadow-sm hover:text-marca-700 dark:hover:text-marca-400 disabled:opacity-50" disabled={item.quantity <= 1}>-</button>
                                                            <span className="text-stone-900 dark:text-stone-100 font-bold w-8 text-center text-sm">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 shadow-sm hover:text-marca-700 dark:hover:text-marca-400">+</button>
                                                        </div>

                                                        <button type="button" onClick={() => removeFromCart(item.id)} className="text-marca-400 dark:text-marca-500 hover:text-marca-700 dark:hover:text-marca-400 hover:bg-marca-50 dark:hover:bg-marca-950 p-2 rounded-lg transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 1-2.244 2.077H8.084a2.25 2.25 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Footer Checkout - BOTÓN VERDE OFICIAL */}
                            <div className="border-t border-stone-200 dark:border-stone-800 px-8 py-8 bg-marca-50/50 dark:bg-marca-950/50 safe-area-bottom">
                                <div className="flex justify-between items-end mb-6">
                                    <p className="text-stone-500 dark:text-stone-400 font-medium">Total a pagar:</p>
                                    <p className="text-4xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight">Bs. {totalBs.toFixed(2)}</p>
                                </div>
                                
                                <button
                                    onClick={enviarPedidoWhatsApp}
                                    disabled={cart.length === 0}
                                    className={`w-full group relative flex items-center justify-center rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-lg transition-all transform active:scale-[0.98]
                                    ${cart.length > 0 
                                        ? 'bg-[#25D366] hover:bg-[#128C7E] shadow-green-200' 
                                        : 'bg-stone-300 dark:bg-stone-700 cursor-not-allowed'}`}
                                >
                                    <WhatsAppIcon className="w-6 h-6 mr-3 fill-white" />
                                    <span>Confirmar por WhatsApp</span>
                                </button>
                                <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-3">Serás redirigido a WhatsApp para finalizar.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}