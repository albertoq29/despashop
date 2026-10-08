import React, { useState, useMemo, useDeferredValue } from 'react';
import PuntosDeEntrega from '@/Components/Facturas/PuntosDeEntrega';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { buildHaystack, fuzzySearchList } from '@/utils/fuzzySearch';
import AgregadoRapido from '@/Components/AgregadoRapido';
import { useEtiquetasDePrecio } from '@/utils/nivelesDePrecio';

const PRICE_COLORS = {
    detal:        'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900',
    mayor:        'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    distribuidor: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800',
    custom:       'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800',
};

const round2 = n => Math.round(n * 100) / 100;

// Preferencia de orden de la lista de items (se recuerda entre facturas)
const ITEMS_SORT_KEY = 'facturas.itemsSortOrder';

const readItemsSortOrder = () => {
    try {
        return window.localStorage.getItem(ITEMS_SORT_KEY) === 'newest' ? 'newest' : 'oldest';
    } catch (e) {
        return 'oldest';
    }
};

const saveItemsSortOrder = (order) => {
    try {
        window.localStorage.setItem(ITEMS_SORT_KEY, order);
    } catch (e) {
        // localStorage no disponible (navegación privada, etc.)
    }
};

// Orden del selector de productos: por defecto los agregados más recientemente
// al sistema. Se usa el id porque crece con cada alta y el backend no manda
// created_at en este payload.
const PRODUCTOS_ORDEN_KEY = 'facturas.productosOrden';

const readProductosOrden = () => {
    try {
        return window.localStorage.getItem(PRODUCTOS_ORDEN_KEY) === 'antiguos' ? 'antiguos' : 'recientes';
    } catch (e) {
        return 'recientes';
    }
};

const saveProductosOrden = (orden) => {
    try {
        window.localStorage.setItem(PRODUCTOS_ORDEN_KEY, orden);
    } catch (e) {
        // localStorage no disponible
    }
};

function getSuggestedPrice(producto, priceType) {
    let price = 0;
    switch (priceType) {
        case 'mayor':        price = parseFloat(producto.price_mayor_usdt || producto.price_usdt); break;
        case 'distribuidor': price = parseFloat(producto.price_distribuidor_usdt || producto.price_usdt); break;
        default:             price = parseFloat(producto.price_usdt); break;
    }
    return isNaN(price) ? 0 : price;
}

let _uid = 0;
const uid = () => ++_uid;

export default function Edit({ auth, productos, combos = [], bcvRate, factura, supplements = [], appliedSupplements: appliedSupplementsProp = [], categorias = [] }) {
    const PRICE_LABELS = useEtiquetasDePrecio();
    const [search, setSearch] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [activeTab, setActiveTab] = useState('productos');
    const [appliedSupplements, setAppliedSupplements] = useState(() => {
        return (appliedSupplementsProp || []).map(as => {
            const supp = supplements.find(s => s.id === as.supplement_id);
            return {
                id: as.supplement_id,
                name: supp ? supp.name : `Suplemento #${as.supplement_id}`,
                type: supp ? supp.type : 'unit',
                stock: supp ? parseFloat(supp.stock) : 0,
                qty: as.qty,
            };
        });
    });

    const addSupplement = (id) => {
        if (!id) return;
        const supp = supplements.find(s => s.id === parseInt(id));
        if (!supp) return;
        if (appliedSupplements.some(s => s.id === supp.id)) return;
        setAppliedSupplements(prev => [...prev, {
            id: supp.id,
            name: supp.name,
            type: supp.type,
            stock: parseFloat(supp.stock),
            qty: 1,
        }]);
    };

    const removeSupplement = (id) => {
        setAppliedSupplements(prev => prev.filter(s => s.id !== id));
    };

    const updateSupplementQty = (id, newQty) => {
        setAppliedSupplements(prev => prev.map(s => {
            if (s.id !== id) return s;
            return { ...s, qty: newQty };
        }));
    };

    const [items, setItems] = useState(() => {
        let currentComboId = null;
        return (factura.items || []).map(i => {
            const prodObj = productos.find(p => p.id === i.product_id) || null;
            const comboObj = combos.find(c => c.id === i.combo_id) || null;
            
            if (i.product_id && i.combo_id) {
                return {
                    _uid:               uid(),
                    type:               'product',
                    product_id:         i.product_id,
                    combo_id:           i.combo_id,
                    product_name:       i.product_name,
                    product_image_path: i.product_image_path,
                    price_type:         i.price_type || 'detal',
                    unit_price:         parseFloat(i.unit_price_usd) || 0,
                    qty:                parseInt(i.qty) || 1,
                    subtotal:           parseFloat(i.subtotal_usd) || 0,
                    _producto:          prodObj,
                };
            } else if (i.combo_id) {
                currentComboId = i.combo_id;
                return {
                    _uid:               uid(),
                    type:               'combo',
                    product_id:         null,
                    combo_id:           i.combo_id,
                    product_name:       i.product_name,
                    product_image_path: i.product_image_path,
                    price_type:         i.price_type,
                    unit_price:         parseFloat(i.unit_price_usd) || 0,
                    qty:                parseInt(i.qty) || 1,
                    subtotal:           parseFloat(i.subtotal_usd) || 0,
                    _combo:             comboObj,
                };
            } else if (i.product_id && i.product_name.startsWith('└─')) {
                return {
                    _uid:               uid(),
                    type:               'combo_product',
                    parent_combo_id:    currentComboId,
                    product_id:         i.product_id,
                    combo_id:           null,
                    product_name:       i.product_name,
                    product_image_path: i.product_image_path,
                    price_type:         'custom',
                    unit_price:         0,
                    qty:                parseInt(i.qty) || 1,
                    subtotal:           0,
                    _producto:          prodObj,
                };
            } else {
                return {
                    _uid:               uid(),
                    type:               i.product_id ? 'product' : 'manual',
                    product_id:         i.product_id,
                    product_variant_id: i.product_variant_id || null,
                    combo_id:           null,
                    product_name:       i.product_name,
                    product_image_path: i.product_image_path,
                    price_type:         i.price_type,
                    unit_price:         parseFloat(i.unit_price_usd) || 0,
                    qty:                parseInt(i.qty) || 1,
                    subtotal:           parseFloat(i.subtotal_usd) || 0,
                    _producto:          prodObj,
                };
            }
        });
    });
    const [clientName, setClientName] = useState(factura.client_name || '');
    const [clientPhone, setClientPhone] = useState(factura.client_phone || '');
    const [notes, setNotes] = useState(factura.notes || '');
    const [saving, setSaving] = useState(false);
    const [customBcvRate, setCustomBcvRate] = useState(parseFloat(factura.bcv_rate) || bcvRate || 1.0);
    const [applyShipping, setApplyShipping] = useState(parseFloat(factura.shipping_usd) > 0);
    const [shippingUsd, setShippingUsd] = useState(parseFloat(factura.shipping_usd) > 0 ? factura.shipping_usd.toString() : '');
    const [shippingBs, setShippingBs] = useState(parseFloat(factura.shipping_usd) > 0 ? round2(parseFloat(factura.shipping_usd) * (parseFloat(factura.bcv_rate) || 1.0)).toString() : '');
    const [manualTotalBs, setManualTotalBs] = useState(() => {
        if (!factura.total_bs) return '';
        const calculated = round2((parseFloat(factura.total_usd) || 0) * (parseFloat(factura.bcv_rate) || 1.0));
        const saved = parseFloat(factura.total_bs);
        return Math.abs(saved - calculated) > 0.05 ? saved.toString() : '';
    });
    const [hasDelivery, setHasDelivery] = useState(factura.has_delivery || false);
    const [deliveryDate, setDeliveryDate] = useState(() => {
        if (!factura.delivery?.delivery_date) return '';
        try {
            const date = new Date(factura.delivery.delivery_date);
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    });
    const [tipoEntrega, setTipoEntrega] = useState(factura.delivery?.type ?? 'personal');
    // Si la factura ya traía puntos, el bloque llega abierto
    const [registrarPuntos, setRegistrarPuntos] = useState(
        Boolean(factura.delivery?.point_a || factura.delivery?.point_b)
    );
    const [puntoA, setPuntoA] = useState(factura.delivery?.point_a ?? '');
    const [puntoB, setPuntoB] = useState(factura.delivery?.point_b ?? '');
    const [hasDeliveryFee, setHasDeliveryFee] = useState(factura.has_delivery_fee || false);
    const [deliveryBs, setDeliveryBs] = useState(factura.delivery_bs ? factura.delivery_bs.toString() : '');
    const [status, setStatus] = useState(factura.status || 'draft');

    const handleBcvRateChange = (newRate) => {
        setCustomBcvRate(newRate);
        const usdNum = parseFloat(shippingUsd) || 0;
        if (applyShipping && shippingUsd !== '') {
            setShippingBs(round2(usdNum * newRate).toString());
        }
    };

    // La búsqueda se difiere para que escribir siga siendo fluido con catálogos grandes
    const deferredSearch = useDeferredValue(search);

    const [productosOrden, setProductosOrden] = useState(readProductosOrden);

    const cambiarProductosOrden = (orden) => {
        setProductosOrden(orden);
        saveProductosOrden(orden);
    };

    // Del más reciente dado de alta al más antiguo, o al revés
    const ordenarPorAlta = (lista) => [...lista].sort(
        (a, b) => (productosOrden === 'recientes' ? b.id - a.id : a.id - b.id)
    );

    // Índice de texto por producto/combo (nombre + categorías + variantes).
    // Se calcula una sola vez y lo reutiliza la búsqueda difusa en cada tecla.
    const productHaystacks = useMemo(() => {
        const map = new Map();
        productos.forEach(p => map.set(p.id, buildHaystack(
            p.name,
            ...(p.categories || []).map(cat => cat.name),
            ...(p.variants || []).map(v => v.label),
        )));
        return map;
    }, [productos]);

    const comboHaystacks = useMemo(() => {
        const map = new Map();
        combos.forEach(c => map.set(c.id, buildHaystack(
            c.name,
            ...(c.products || []).map(p => p.name),
        )));
        return map;
    }, [combos]);

    // Productos filtrados por categoría y por búsqueda tolerante a errores
    // (acentos, letras cambiadas, palabras en otro orden). Al buscar manda la
    // relevancia; sin búsqueda, el orden elegido por fecha de alta.
    const filteredProducts = useMemo(() => {
        let list = productos;
        if (selectedCategoryId) {
            list = list.filter(p =>
                p.categories && p.categories.some(cat => cat.id === parseInt(selectedCategoryId))
            );
        }
        if (deferredSearch.trim()) {
            return fuzzySearchList(deferredSearch, list, p => productHaystacks.get(p.id));
        }
        return ordenarPorAlta(list);
    }, [deferredSearch, productos, selectedCategoryId, productHaystacks, productosOrden]);

    // Combos con el mismo criterio
    const filteredCombos = useMemo(() => {
        if (deferredSearch.trim()) {
            return fuzzySearchList(deferredSearch, combos, c => comboHaystacks.get(c.id));
        }
        return ordenarPorAlta(combos);
    }, [deferredSearch, combos, comboHaystacks, productosOrden]);

    // Unidades ya agregadas a la factura, para mostrarlas sobre cada producto/combo
    const cartCounts = useMemo(() => {
        const byProduct = new Map();
        const byCombo = new Map();
        items.forEach(i => {
            const qty = parseInt(i.qty) || 0;
            if (i.product_id) byProduct.set(i.product_id, (byProduct.get(i.product_id) || 0) + qty);
            if (i.combo_id) byCombo.set(i.combo_id, Math.max(byCombo.get(i.combo_id) || 0, qty));
        });
        return { byProduct, byCombo };
    }, [items]);

    const getItemMaxStock = (item) => {
        if (item.type === 'manual') return Infinity;
        if (item.type === 'combo') {
            return item._combo ? (parseInt(item._combo.stock) || 0) : Infinity;
        }
        if (item.type === 'product' || item.type === 'combo_product') {
            const product = item._producto;
            if (!product) return Infinity;
            if (product.variants && product.variants.length > 0 && item.product_variant_id) {
                const variant = product.variants.find(v => v.id === item.product_variant_id);
                return variant ? (parseInt(variant.stock) || 0) : 0;
            }
            return parseInt(product.stock) || 0;
        }
        return Infinity;
    };

    const addProduct = (producto) => {
        const availableStock = parseInt(producto.stock) || 0;

        if (availableStock <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Producto agotado',
                text: `El producto "${producto.name}" no tiene stock disponible.`,
            });
            return;
        }

        const existing = items.find(i => i.product_id === producto.id && i.type === 'product' && i.product_variant_id === null);
        if (existing) {
            const nextQty = existing.qty + 1;
            if (nextQty > availableStock) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Stock insuficiente',
                    text: `No puedes agregar más de ${availableStock} unidades de "${producto.name}".`,
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
            setItems(prev => prev.map(i =>
                i._uid === existing._uid ? { ...i, qty: nextQty, subtotal: round2(i.unit_price * nextQty) } : i
            ));
            return;
        }
        const unitPrice = !isNaN(parseFloat(producto.price_usdt)) ? parseFloat(producto.price_usdt) : 0;
        setItems(prev => [...prev, {
            _uid:               uid(),
            type:               'product',
            product_id:         producto.id,
            product_variant_id: null,
            combo_id:           null,
            product_name:       producto.name,
            product_image_path: producto.image_path,
            price_type:         'detal',
            unit_price:         unitPrice,
            qty:                1,
            subtotal:           unitPrice,
            _producto:          producto,
        }]);
    };

    const addAnotherVariant = (item) => {
        const producto = item._producto;
        if (!producto) return;

        const availableStock = parseInt(producto.stock) || 0;
        if (availableStock <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin stock disponible',
                text: 'No queda stock disponible para este producto.',
            });
            return;
        }

        const unitPrice = !isNaN(parseFloat(producto.price_usdt)) ? parseFloat(producto.price_usdt) : 0;
        setItems(prev => [...prev, {
            _uid:               uid(),
            type:               'product',
            product_id:         producto.id,
            product_variant_id: null,
            combo_id:           null,
            product_name:       producto.name,
            product_image_path: producto.image_path,
            price_type:         item.price_type || 'detal',
            unit_price:         parseFloat(item.unit_price) || unitPrice,
            qty:                1,
            subtotal:           parseFloat(item.unit_price) || unitPrice,
            _producto:          producto,
        }]);
    };

    const addCombo = (combo) => {
        const comboProducts = combo.products || [];
        if (comboProducts.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Combo vacío', text: 'Este combo no tiene productos registrados.' });
            return;
        }

        setItems(prev => {
            let nextItems = [...prev];
            
            comboProducts.forEach(p => {
                const existingIdx = nextItems.findIndex(i => i.product_id === p.id && i.combo_id === combo.id);
                const productPriceType = p.price_type || 'detal';
                const unitPrice = getSuggestedPrice(p, productPriceType);

                if (existingIdx > -1) {
                    const existingItem = nextItems[existingIdx];
                    const newQty = existingItem.qty + 1;
                    nextItems[existingIdx] = {
                        ...existingItem,
                        qty: newQty,
                        subtotal: round2(existingItem.unit_price * newQty)
                    };
                } else {
                    nextItems.push({
                        _uid:               uid(),
                        type:               'product',
                        product_id:         p.id,
                        combo_id:           combo.id,
                        product_name:       `└─ ${p.name} (Combo: ${combo.name})`,
                        product_image_path: p.image_path,
                        price_type:         productPriceType,
                        unit_price:         unitPrice,
                        qty:                1,
                        subtotal:           unitPrice,
                        _producto:          p,
                    });
                }
            });
            
            return nextItems;
        });

        Swal.fire({
            icon: 'success',
            title: 'Productos del combo agregados',
            text: `Se agregaron los productos de "${combo.name}" al carrito.`,
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    };

    const addManualItem = () => {
        setItems(prev => [...prev, {
            _uid:               uid(),
            type:               'manual',
            product_id:         null,
            combo_id:           null,
            product_name:       '',
            product_image_path: null,
            price_type:         'detal',
            unit_price:         0,
            qty:                1,
            subtotal:           0,
            _producto:          null,
        }]);
    };

    // ── Agregado rápido: varios productos de golpe desde una lista pegada ─────
    const agregarRapido = (seleccion) => {
        const siguientes = [...items];
        let nuevos = 0;
        let sumados = 0;
        let ajustados = 0;

        seleccion.forEach(({ producto, qty }) => {
            const stock = parseInt(producto.stock) || 0;
            if (stock <= 0) return;

            const unitPrice = !isNaN(parseFloat(producto.price_usdt)) ? parseFloat(producto.price_usdt) : 0;
            const idx = siguientes.findIndex(i =>
                i.type === 'product' && i.product_id === producto.id && !i.product_variant_id && !i.combo_id
            );

            if (idx > -1) {
                // Ya estaba en la factura: se le suma la cantidad, como al hacer clic varias veces
                const actual = siguientes[idx];
                const deseada = actual.qty + qty;
                const final = Math.min(deseada, stock);
                if (final !== deseada) ajustados++;
                siguientes[idx] = {
                    ...actual,
                    qty: final,
                    subtotal: round2((parseFloat(actual.unit_price) || 0) * final),
                };
                sumados++;
            } else {
                const final = Math.min(qty, stock);
                if (final !== qty) ajustados++;
                siguientes.push({
                    _uid:               uid(),
                    type:               'product',
                    product_id:         producto.id,
                    product_variant_id: null,
                    combo_id:           null,
                    product_name:       producto.name,
                    product_image_path: producto.image_path,
                    price_type:         'detal',
                    unit_price:         unitPrice,
                    qty:                final,
                    subtotal:           round2(unitPrice * final),
                    _producto:          producto,
                });
                nuevos++;
            }
        });

        setItems(siguientes);

        const partes = [];
        if (nuevos)    partes.push(`${nuevos} nuevo${nuevos === 1 ? '' : 's'}`);
        if (sumados)   partes.push(`${sumados} ya estaba${sumados === 1 ? '' : 'n'} (se sumó la cantidad)`);
        if (ajustados) partes.push(`${ajustados} ajustado${ajustados === 1 ? '' : 's'} al stock`);

        Swal.fire({
            icon: ajustados ? 'warning' : 'success',
            title: 'Agregado rápido aplicado',
            text: partes.join(' · '),
            toast: true,
            position: 'top-end',
            timer: 3500,
            showConfirmButton: false,
        });
    };

    const updateItem = (_uid, field, value) => {
        setItems(prev => {
            const itemToUpdate = prev.find(i => i._uid === _uid);
            if (!itemToUpdate) return prev;
            const shouldUpdateAllVariants = itemToUpdate.type === 'product' && (field === 'price_type' || field === 'unit_price');

            let updatedItems = prev.map(item => {
                const isMatch = shouldUpdateAllVariants
                    ? (item.product_id === itemToUpdate.product_id && item.type === 'product')
                    : (item._uid === _uid);

                if (isMatch) {
                    const priceType = field === 'unit_price' ? 'custom' : (field === 'price_type' ? value : item.price_type);
                    const updated = { ...item, [field]: value, price_type: priceType };

                    if (field === 'price_type' && item._producto) {
                        if (value !== 'custom') {
                            updated.unit_price = getSuggestedPrice(item._producto, value);
                        }
                    } else if (field === 'price_type' && item._combo) {
                        if (value !== 'custom') {
                            updated.unit_price = getSuggestedPrice(item._combo, value);
                        }
                    }

                    if (field === 'unit_price' || field === 'qty' || field === 'price_type' || field === 'product_variant_id') {
                        const price = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(updated.unit_price) || 0;
                        let qty   = field === 'qty' ? (isNaN(parseInt(value)) ? 1 : parseInt(value)) : updated.qty;

                        // Check stock limits on quantity change
                        if (field === 'qty') {
                            const maxStock = getItemMaxStock(updated);
                            if (qty > maxStock) {
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Stock insuficiente',
                                    text: `Solo quedan ${maxStock} unidades disponibles en stock de este producto/variante.`,
                                    toast: true,
                                    position: 'top-end',
                                    timer: 3000,
                                    showConfirmButton: false
                                });
                                qty = maxStock;
                            }
                        }

                        // Check stock limits on variant change
                        if (field === 'product_variant_id' && value) {
                            const variant = updated._producto?.variants?.find(v => v.id === value);
                            if (variant) {
                                const varStock = parseInt(variant.stock) || 0;
                                if (qty > varStock) {
                                    Swal.fire({
                                        icon: 'warning',
                                        title: 'Stock insuficiente',
                                        text: `La variante seleccionada solo tiene ${varStock} unidades disponibles. Se ajustó la cantidad.`,
                                        toast: true,
                                        position: 'top-end',
                                        timer: 3000,
                                        showConfirmButton: false
                                    });
                                    qty = varStock;
                                }
                            }
                        }

                        updated.qty = qty;
                        updated.subtotal = round2(price * qty);
                        if (field === 'unit_price') updated.unit_price = value;
                    }
                    return updated;
                }
                return item;
            });
            if (field === 'qty' && itemToUpdate.type === 'combo') {
                const newQty = parseInt(value) || 1;
                updatedItems = updatedItems.map(item => {
                    if (item.type === 'combo_product' && item.parent_combo_id === itemToUpdate.combo_id) {
                        return { ...item, qty: newQty };
                    }
                    return item;
                });
            }

            return updatedItems;
        });
    };

    const removeItem = (_uid) => {
        setItems(prev => {
            const itemToRemove = prev.find(i => i._uid === _uid);
            if (!itemToRemove) return prev;

            if (itemToRemove.type === 'combo') {
                return prev.filter(i => i._uid !== _uid && !(i.type === 'combo_product' && i.parent_combo_id === itemToRemove.combo_id));
            }
            return prev.filter(i => i._uid !== _uid);
        });
    };

    const groupedItems = useMemo(() => {
        const groups = [];
        items.forEach(item => {
            if (item.type === 'product' && item.product_id && item._producto?.variants?.length > 0) {
                const existingGroup = groups.find(g => g.product_id === item.product_id && g.type === 'product_group');
                if (existingGroup) {
                    existingGroup.qty += item.qty;
                    existingGroup.subtotal += item.subtotal;
                    existingGroup.variants.push(item);
                } else {
                    groups.push({
                        type: 'product_group',
                        product_id: item.product_id,
                        product_name: item.product_name,
                        product_image_path: item.product_image_path,
                        price_type: item.price_type,
                        unit_price: item.unit_price,
                        qty: item.qty,
                        subtotal: item.subtotal,
                        _producto: item._producto,
                        variants: [item]
                    });
                }
            } else {
                groups.push(item);
            }
        });
        return groups;
    }, [items]);

    // ── Orden de la lista de items (más recientes arriba o abajo) ──────────────
    const [itemsSortOrder, setItemsSortOrder] = useState(readItemsSortOrder);

    const changeItemsSortOrder = (order) => {
        setItemsSortOrder(order);
        saveItemsSortOrder(order);
    };

    // El número de cada fila sigue el orden real en que se agregó, no el de la vista
    const displayedItems = useMemo(() => {
        const numbered = groupedItems.map((item, idx) => ({ item, position: idx + 1 }));
        return itemsSortOrder === 'newest' ? numbered.reverse() : numbered;
    }, [groupedItems, itemsSortOrder]);

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);
        const totalUsd = round2(subtotal + (applyShipping ? parseFloat(shippingUsd || 0) : 0));
        const calculatedTotalBs = round2(totalUsd * customBcvRate);
        const totalBs = manualTotalBs !== '' ? parseFloat(manualTotalBs) || 0 : calculatedTotalBs;
        const deliveryBsNum = hasDeliveryFee ? (parseFloat(deliveryBs) || 0) : 0;
        const totalPlusDeliveryBs = round2(totalBs + deliveryBsNum);
        const totalPlusDeliveryUsd = round2(totalUsd + (customBcvRate > 0 ? deliveryBsNum / customBcvRate : 0));
        return {
            subtotal,
            totalUsd,
            totalBs,
            calculatedTotalBs,
            deliveryBsNum,
            totalPlusDeliveryBs,
            totalPlusDeliveryUsd
        };
    }, [items, applyShipping, shippingUsd, customBcvRate, manualTotalBs, hasDeliveryFee, deliveryBs]);

    const handleSubmit = () => {
        if (hasDelivery && !clientName?.trim()) {
            Swal.fire({ icon: 'warning', title: 'Nombre de cliente requerido', text: 'El nombre del cliente es obligatorio cuando aplica entrega.' });
            return;
        }
        for (const item of items) {
            if (!item.product_name?.trim()) {
                Swal.fire({ icon: 'warning', title: 'Nombre vacío', text: 'Todos los items deben tener nombre.' });
                return;
            }
            if (item.qty < 1) {
                Swal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'La cantidad debe ser al menos 1.' });
                return;
            }
            if (item.unit_price < 0) {
                Swal.fire({ icon: 'warning', title: 'Precio inválido', text: 'El precio no puede ser negativo.' });
                return;
            }
        }
        if (items.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Sin items', text: 'Agrega al menos un producto o item a la factura.' });
            return;
        }

        // Validar suplementos
        for (const s of appliedSupplements) {
            const qtyNum = parseFloat(s.qty);
            if (isNaN(qtyNum) || qtyNum <= 0) {
                Swal.fire({ icon: 'warning', title: 'Cantidad de suplemento inválida', text: `La cantidad para "${s.name}" debe ser mayor a 0.` });
                return;
            }
        }

        setSaving(true);
        router.put(route('facturas.update', factura.id), {
            client_name:       clientName,
            client_phone:      clientPhone,
            notes:             notes,
            status:            status,
            bcv_rate:          parseFloat(customBcvRate),
            shipping_usd:      applyShipping ? parseFloat(shippingUsd) : 0,
            total_bs:          totals.totalBs,
            has_delivery:      hasDelivery,
            delivery_date:     hasDelivery ? deliveryDate : null,
            delivery_type:     hasDelivery ? tipoEntrega : null,
            // Los puntos son cosa del delivery, y solo si se pidieron
            delivery_point_a:  hasDelivery && tipoEntrega === 'delivery' && registrarPuntos ? puntoA : null,
            delivery_point_b:  hasDelivery && tipoEntrega === 'delivery' && registrarPuntos ? puntoB : null,
            has_delivery_fee:  hasDeliveryFee,
            delivery_bs:       hasDeliveryFee ? (parseFloat(deliveryBs) || 0) : 0,
            items: items.map(i => ({
                product_id:         i.product_id,
                product_variant_id: i.product_variant_id || null,
                combo_id:           i.combo_id,
                product_name:       i.product_name,
                price_type:         i.price_type,
                unit_price_usd:     parseFloat(i.unit_price) || 0,
                qty:                parseInt(i.qty) || 1,
            })),
            supplements: appliedSupplements.map(s => ({
                supplement_id: s.id,
                qty: parseFloat(s.qty),
            })),
        }, {
            onError: (errors) => {
                setSaving(false);
                Swal.fire({ icon: 'error', title: 'Error', text: Object.values(errors).join('\n') });
            },
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center gap-3">
                    <a onClick={() => router.visit(route('facturas.show', factura.id))} className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </a>
                    <h2 className="font-semibold text-xl text-stone-800 dark:text-stone-200 leading-tight">Editar Factura #{factura.id}</h2>
                </div>
            }
        >
            <Head title={`Editar Factura #${factura.id}`} />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* ── PANEL IZQUIERDO: Buscador de productos ───────── */}
                        <div className="lg:w-96 flex-shrink-0 space-y-4">

                            {/* Buscador */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4">
                                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-marca-600 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                                    </svg>
                                    {activeTab === 'productos' ? 'Agregar Producto' : 'Agregar Combo'}
                                </h3>

                                {/* Tab Selector */}
                                <div className="flex gap-2 mb-3 bg-stone-50 dark:bg-stone-900 p-1.5 rounded-xl border border-stone-200 dark:border-stone-800">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('productos');
                                            setSelectedCategoryId('');
                                        }}
                                        className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            activeTab === 'productos'
                                                ? 'bg-white dark:bg-stone-900 text-marca-700 dark:text-marca-400 shadow-sm border border-stone-200 dark:border-stone-800'
                                                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                                        }`}
                                    >
                                        Productos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('combos');
                                            setSelectedCategoryId('');
                                        }}
                                        className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            activeTab === 'combos'
                                                ? 'bg-white dark:bg-stone-900 text-marca-700 dark:text-marca-400 shadow-sm border border-stone-200 dark:border-stone-800'
                                                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                                        }`}
                                    >
                                        Combos
                                    </button>
                                </div>

                                <div className="relative mb-3">
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'productos' ? "Buscar producto..." : "Buscar combo..."}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                    />
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z"/>
                                    </svg>
                                </div>

                                {activeTab === 'productos' && categorias && categorias.length > 0 && (
                                    <div className="mb-3">
                                        <select
                                            value={selectedCategoryId}
                                            onChange={e => setSelectedCategoryId(e.target.value)}
                                            className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300"
                                        >
                                            <option value="">Todas las categorías</option>
                                            {categorias.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Cuántos hay y en qué orden se están mostrando */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                                        {activeTab === 'productos'
                                            ? `${filteredProducts.length} producto${filteredProducts.length === 1 ? '' : 's'}`
                                            : `${filteredCombos.length} combo${filteredCombos.length === 1 ? '' : 's'}`}
                                    </span>

                                    {search.trim() ? (
                                        <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 px-2 py-1">
                                            Por coincidencia
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => cambiarProductosOrden(productosOrden === 'recientes' ? 'antiguos' : 'recientes')}
                                            title={productosOrden === 'recientes'
                                                ? 'Mostrando primero lo agregado más recientemente. Clic para invertir.'
                                                : 'Mostrando primero lo más antiguo. Clic para invertir.'}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:text-marca-700 dark:hover:text-marca-400 hover:border-marca-200 dark:hover:border-marca-900 hover:bg-marca-50 dark:hover:bg-marca-950/40 transition-all"
                                        >
                                            {productosOrden === 'recientes' ? '↓ Más recientes' : '↑ Más antiguos'}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-[480px] overflow-y-auto overscroll-contain pr-1 scrollbar-slim">
                                    {activeTab === 'productos' ? (
                                        <>
                                            {filteredProducts.map(p => {
                                                const inCart = cartCounts.byProduct.get(p.id) || 0;
                                                return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => addProduct(p)}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left group ${
                                                        inCart > 0
                                                            ? 'border-marca-300 dark:border-marca-800 bg-marca-50/60 dark:bg-marca-950/60 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                                            : 'border-stone-200 dark:border-stone-800 hover:border-marca-400 dark:hover:border-marca-700 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                                    }`}
                                                >
                                                    {/* Imagen + contador de lo ya agregado */}
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
                                                            {p.image_path ? (
                                                                <img src={`/storage/${p.image_path}`} alt={p.name} className="w-full h-full object-cover" loading="lazy"/>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-600">
                                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {inCart > 0 && (
                                                            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-marca-700 dark:bg-marca-500 text-white text-[10px] font-black flex items-center justify-center shadow ring-2 ring-white">
                                                                {inCart}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate group-hover:text-marca-800 dark:group-hover:text-marca-300">{p.name}</p>
                                                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                            {p.price_usdt ? `$${parseFloat(p.price_usdt).toFixed(2)}` : 'A consultar'} · Stock: {p.stock}
                                                        </p>
                                                        {inCart > 0 && (
                                                            <p className="text-[10px] font-bold text-marca-700 dark:text-marca-400 mt-0.5">{inCart} en la factura</p>
                                                        )}
                                                    </div>
                                                    <svg className={`w-4 h-4 flex-shrink-0 ${inCart > 0 ? 'text-marca-600 dark:text-marca-400' : 'text-stone-300 dark:text-stone-600 group-hover:text-marca-600 dark:group-hover:text-marca-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                                    </svg>
                                                </button>
                                                );
                                            })}
                                            {filteredProducts.length === 0 && (
                                                <p className="text-center text-sm text-stone-400 dark:text-stone-500 py-6">No se encontraron productos</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {filteredCombos.map(c => {
                                                const inCart = cartCounts.byCombo.get(c.id) || 0;
                                                return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => addCombo(c)}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left group ${
                                                        inCart > 0
                                                            ? 'border-marca-300 dark:border-marca-800 bg-marca-50/60 dark:bg-marca-950/60 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                                            : 'border-stone-200 dark:border-stone-800 hover:border-marca-400 dark:hover:border-marca-700 hover:bg-marca-50 dark:hover:bg-marca-950/40'
                                                    }`}
                                                >
                                                    {/* Imagen + contador de lo ya agregado */}
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
                                                            {c.image_path ? (
                                                                <img src={`/storage/${c.image_path}`} alt={c.name} className="w-full h-full object-cover" loading="lazy"/>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-600">
                                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {inCart > 0 && (
                                                            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-marca-700 dark:bg-marca-500 text-white text-[10px] font-black flex items-center justify-center shadow ring-2 ring-white">
                                                                {inCart}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate group-hover:text-marca-800 dark:group-hover:text-marca-300">{c.name}</p>
                                                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                            {c.price_usdt ? `$${parseFloat(c.price_usdt).toFixed(2)}` : 'A consultar'} · Stock: {c.stock}
                                                        </p>
                                                        {inCart > 0 && (
                                                            <p className="text-[10px] font-bold text-marca-700 dark:text-marca-400 mt-0.5">{inCart} en la factura</p>
                                                        )}
                                                    </div>
                                                    <svg className={`w-4 h-4 flex-shrink-0 ${inCart > 0 ? 'text-marca-600 dark:text-marca-400' : 'text-stone-300 dark:text-stone-600 group-hover:text-marca-600 dark:group-hover:text-marca-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                                    </svg>
                                                </button>
                                                );
                                            })}
                                            {filteredCombos.length === 0 && (
                                                <p className="text-center text-sm text-stone-400 dark:text-stone-500 py-6">No se encontraron combos</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Agregado rápido desde una lista pegada */}
                            <AgregadoRapido
                                productos={productos}
                                haystacks={productHaystacks}
                                onAgregar={agregarRapido}
                            />

                            {/* Agregar item manual */}
                            <button
                                onClick={addManualItem}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl text-sm font-semibold text-stone-500 dark:text-stone-400 hover:border-marca-500 dark:hover:border-marca-600 hover:text-marca-700 dark:hover:text-marca-400 hover:bg-marca-50 dark:hover:bg-marca-950/40 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Agregar Item Manual
                            </button>

                            {/* Datos del cliente */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4">
                                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-marca-600 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    Datos del Cliente
                                </h3>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder={hasDelivery ? "Nombre del Cliente (obligatorio)" : "Nombre (opcional)"}
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        required={hasDelivery}
                                        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-1 outline-none transition-all ${
                                            hasDelivery && !clientName?.trim()
                                                ? 'border-marca-600 dark:border-marca-500 bg-marca-50/10 dark:bg-marca-950/10 focus:border-marca-600 dark:focus:border-marca-400 focus:ring-marca-600 dark:focus:ring-marca-400'
                                                : 'border-stone-200 dark:border-stone-800 focus:border-marca-600 dark:focus:border-marca-400 focus:ring-marca-600 dark:focus:ring-marca-400'
                                        }`}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Teléfono (opcional)"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                    />
                                    <textarea
                                        placeholder="Notas / Observaciones (opcional)"
                                        rows={2}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none resize-none"
                                    />

                                    {/* Entrega Agendada */}
                                    <div className="pt-3 border-t border-stone-200 dark:border-stone-800 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                                            <input
                                                type="checkbox"
                                                checked={hasDelivery}
                                                onChange={e => {
                                                    setHasDelivery(e.target.checked);
                                                    if (e.target.checked && !deliveryDate) {
                                                        const tomorrow = new Date();
                                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                                        tomorrow.setHours(9, 0, 0, 0);
                                                        const formatted = tomorrow.toISOString().slice(0, 16);
                                                        setDeliveryDate(formatted);
                                                    }
                                                }}
                                                className="w-4 h-4 text-marca-700 dark:text-marca-400 border-stone-300 dark:border-stone-700 rounded focus:ring-marca-600 dark:focus:ring-marca-400 focus:ring-opacity-25"
                                            />
                                            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Programar entrega o delivery</span>
                                        </label>
                                        
                                        {hasDelivery && (
                                            <div className="space-y-1 mt-2">
                                                <label className="block text-[11px] font-semibold text-marca-600 dark:text-marca-400">Fecha y Hora de Entrega (Futura)</label>
                                                <input
                                                    type="datetime-local"
                                                    value={deliveryDate}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                    onChange={e => setDeliveryDate(e.target.value)}
                                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                    required={hasDelivery}
                                                />
                                            </div>
                                        )}

                                        {hasDelivery && (
                                            <PuntosDeEntrega
                                                tipo={tipoEntrega}
                                                onTipo={setTipoEntrega}
                                                activo={registrarPuntos}
                                                onActivo={setRegistrarPuntos}
                                                puntoA={puntoA}
                                                onPuntoA={setPuntoA}
                                                puntoB={puntoB}
                                                onPuntoB={setPuntoB}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Estado de la Factura */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4">
                                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-marca-600 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 0 0118 0z" />
                                    </svg>
                                    Estado de la Factura
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="draft"
                                            checked={status === 'draft'}
                                            onChange={() => setStatus('draft')}
                                            className="mt-1 w-4 h-4 text-marca-700 dark:text-marca-400 border-stone-300 dark:border-stone-700 focus:ring-marca-600 dark:focus:ring-marca-400 focus:ring-opacity-25 cursor-pointer"
                                        />
                                        <div className="-mt-0.5">
                                            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Guardar como Borrador</span>
                                            <p className="text-xs text-stone-400 dark:text-stone-500">Guarda la factura para editarla luego, sin descontar stock de variantes ni general.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer select-none border-t border-stone-100 dark:border-stone-800 pt-2.5">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="pending_variants"
                                            checked={status === 'pending_variants'}
                                            onChange={() => setStatus('pending_variants')}
                                            className="mt-1 w-4 h-4 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700 focus:ring-stone-600 dark:focus:ring-stone-500 focus:ring-opacity-25 cursor-pointer"
                                        />
                                        <div className="-mt-0.5">
                                            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">⏳ Pagada (Pendiente Variantes)</span>
                                            <p className="text-xs text-stone-400 dark:text-stone-500">Marca como pagada y guardada, pero sin descontar stock de las variantes todavía.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Aplicar Suplementos / Materiales */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4">
                                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-marca-600 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                    </svg>
                                    Suplementos y Empaque
                                </h3>

                                <div className="space-y-3">
                                    {/* Select para elegir suplemento */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Seleccionar Suplemento</label>
                                        <select
                                            onChange={e => {
                                                addSupplement(e.target.value);
                                                e.target.value = '';
                                            }}
                                            value=""
                                            className="w-full border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                        >
                                            <option value="">-- Seleccionar para aplicar --</option>
                                            {supplements
                                                .filter(s => !appliedSupplements.some(as => as.id === s.id))
                                                .map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} ({s.type === 'meters' ? `${s.stock}m` : `${parseInt(s.stock)} uds`})
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    {/* Lista de suplementos aplicados */}
                                    {appliedSupplements.length > 0 ? (
                                        <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                                            {appliedSupplements.map(s => (
                                                <div key={s.id} className="flex items-center justify-between gap-2 bg-stone-50 dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate" title={s.name}>{s.name}</p>
                                                        <p className="text-[10px] text-stone-400 dark:text-stone-500">Stock: {s.type === 'meters' ? `${s.stock}m` : `${parseInt(s.stock)} uds`}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step={s.type === 'meters' ? "0.01" : "1"}
                                                            min="0.01"
                                                            value={s.qty}
                                                            onChange={e => updateSupplementQty(s.id, e.target.value)}
                                                            className="w-16 border border-stone-200 dark:border-stone-800 rounded-lg px-1.5 py-1 text-xs text-right font-mono focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                        />
                                                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold w-7">
                                                            {s.type === 'meters' ? 'mts' : 'uds'}
                                                        </span>
                                                        <button
                                                            onClick={() => removeSupplement(s.id)}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                            type="button"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-xs text-stone-400 dark:text-stone-500 py-2">Ninguno aplicado</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── PANEL DERECHO: Items de la factura ──────────── */}
                        <div className="flex-1 min-w-0 flex flex-col gap-4">

                            {/* Lista de items */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex-1 flex flex-col min-h-0 max-h-[70vh] lg:max-h-[calc(100vh-14rem)]">
                                <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 flex-shrink-0">
                                    <h3 className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-marca-600 dark:text-marca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        Items de la Factura
                                        <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-marca-100 dark:bg-marca-950/60 text-marca-800 dark:text-marca-300 text-xs font-bold">
                                            {items.length}
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {items.length > 1 && (
                                            <div className="flex items-center gap-1 bg-stone-50 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
                                                <button
                                                    type="button"
                                                    onClick={() => changeItemsSortOrder('oldest')}
                                                    title="El último agregado queda al final de la lista"
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                        itemsSortOrder === 'oldest'
                                                            ? 'bg-white dark:bg-stone-900 text-marca-700 dark:text-marca-400 shadow-sm border border-stone-200 dark:border-stone-800'
                                                            : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                                                    }`}
                                                >
                                                    ↓ Recientes abajo
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => changeItemsSortOrder('newest')}
                                                    title="El último agregado queda de primero"
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                        itemsSortOrder === 'newest'
                                                            ? 'bg-white dark:bg-stone-900 text-marca-700 dark:text-marca-400 shadow-sm border border-stone-200 dark:border-stone-800'
                                                            : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                                                    }`}
                                                >
                                                    ↑ Recientes arriba
                                                </button>
                                            </div>
                                        )}
                                        <div className="text-xs text-stone-400 dark:text-stone-500">Tasa BCV: {parseFloat(bcvRate).toFixed(2)}</div>
                                    </div>
                                </div>

                                {items.length === 0 ? (
                                    <div className="py-20 text-center text-stone-400 dark:text-stone-500">
                                        <svg className="mx-auto w-12 h-12 text-stone-200 dark:text-stone-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        <p className="text-sm font-medium">La factura está vacía</p>
                                        <p className="text-xs mt-1">Selecciona productos del panel izquierdo o agrega items manuales</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-stone-50 dark:divide-stone-900 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-slim">
                                        {displayedItems.map(({ item, position }) => {
                                            const isGroup = item.type === 'product_group';
                                            return (
                                                <div key={isGroup ? `group_${item.product_id}` : item._uid} className="px-6 py-4 bg-white dark:bg-stone-900 hover:bg-stone-50/40 dark:hover:bg-stone-900/40 transition-colors">
                                                    <div className="flex items-start gap-4">
                                                        {/* Número de item */}
                                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-500 dark:text-stone-400 mt-0.5">
                                                            {position}
                                                        </div>

                                                        <div className="flex-1 min-w-0 space-y-3">
                                                            {/* Nombre */}
                                                            {item.type === 'manual' ? (
                                                                <input
                                                                    type="text"
                                                                    placeholder="Nombre del producto o servicio..."
                                                                    value={item.product_name}
                                                                    onChange={e => updateItem(item._uid, 'product_name', e.target.value)}
                                                                    className="w-full border border-stone-200 dark:border-stone-800 rounded-lg px-3 py-2 text-sm font-medium focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                                />
                                                            ) : (
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        {item.product_image_path && (
                                                                            <img src={`/storage/${item.product_image_path}`} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>
                                                                        )}
                                                                        <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{item.product_name}</span>
                                                                    </div>
                                                                    
                                                                    {/* LISTA DE VARIANTES AGRUPADAS */}
                                                                    {isGroup && (
                                                                        <div className="mt-2.5 space-y-2 pl-2.5 border-l-2 border-stone-200 dark:border-stone-800">
                                                                            {item.variants.map((v, vIdx) => (
                                                                                <div key={v._uid} className="flex flex-wrap items-center gap-2.5 bg-marca-50/20 dark:bg-marca-950/20 p-2 rounded-xl border border-marca-100/30 dark:border-marca-950/30 w-fit">
                                                                                    <span className="text-[10px] font-bold text-marca-600 dark:text-marca-400">Var #{vIdx+1}:</span>
                                                                                    <select
                                                                                        value={v.product_variant_id || ''}
                                                                                        onChange={e => updateItem(v._uid, 'product_variant_id', e.target.value ? parseInt(e.target.value) : null)}
                                                                                        className="border border-stone-200 dark:border-stone-800 rounded-lg px-2 py-0.5 text-xs bg-marca-50 dark:bg-marca-950/40 text-marca-800 dark:text-marca-300 font-semibold focus:border-marca-600 dark:focus:border-marca-400 outline-none cursor-pointer"
                                                                                    >
                                                                                        <option value="">-- Sin variante asignada --</option>
                                                                                        {item._producto.variants.map(varOpt => (
                                                                                            <option key={varOpt.id} value={varOpt.id}>
                                                                                                {varOpt.label} (Stock: {varOpt.stock})
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                    
                                                                                    {/* Cantidad de la variante */}
                                                                                    <div className="flex items-center border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-lg overflow-hidden h-7">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const minVal = getItemMaxStock(v) === 0 ? 0 : 1;
                                                                                                updateItem(v._uid, 'qty', Math.max(minVal, v.qty - 1));
                                                                                            }}
                                                                                            className="px-2 text-xs font-bold text-marca-700 dark:text-marca-400 hover:bg-marca-50 dark:hover:bg-marca-950/40 transition-colors h-full"
                                                                                            type="button"
                                                                                        >−</button>
                                                                                        <input
                                                                                            type="number"
                                                                                            min={getItemMaxStock(v) === 0 ? "0" : "1"}
                                                                                            value={v.qty}
                                                                                            onChange={e => {
                                                                                                const val = parseInt(e.target.value);
                                                                                                const minVal = getItemMaxStock(v) === 0 ? 0 : 1;
                                                                                                updateItem(v._uid, 'qty', isNaN(val) ? minVal : val);
                                                                                            }}
                                                                                            className="w-16 text-center text-xs font-mono border-x border-stone-200 dark:border-stone-800 focus:outline-none h-full bg-white dark:bg-stone-900"
                                                                                        />
                                                                                        <button
                                                                                            onClick={() => updateItem(v._uid, 'qty', v.qty + 1)}
                                                                                            className="px-2 text-xs font-bold text-marca-700 dark:text-marca-400 hover:bg-marca-50 dark:hover:bg-marca-950/40 transition-colors h-full"
                                                                                            type="button"
                                                                                        >+</button>
                                                                                    </div>

                                                                                    {/* Botón eliminar variante */}
                                                                                    <button
                                                                                        onClick={() => removeItem(v._uid)}
                                                                                        className="text-red-400 hover:text-red-650 transition-colors p-0.5"
                                                                                        type="button"
                                                                                        title="Quitar variante"
                                                                                    >
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                        </svg>
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                            
                                                                            {/* Botón añadir otra variante */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => addAnotherVariant(item.variants[0])}
                                                                                className="mt-1 px-3 py-1 rounded-xl text-[10px] font-black bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer w-fit"
                                                                                title="Agregar otra variante de este producto"
                                                                            >
                                                                                <span>➕</span> Otra variante
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Controles: tipo precio, precio unit., cantidad */}
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                {item.type === 'combo_product' ? (
                                                                    <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 px-2.5 py-1 rounded-full shadow-sm">
                                                                        Incluido en el combo (Sin costo)
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        {/* Tipo de precio */}
                                                                        {item.combo_id ? (
                                                                            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 px-2.5 py-1 rounded-full shadow-sm">
                                                                                Combo
                                                                            </span>
                                                                        ) : (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                 {Object.entries(PRICE_LABELS).map(([key, label]) => {
                                                                                    if (item.type === 'manual' && key !== 'custom') return null;
                                                                                    if (item.type === 'product' || item.type === 'product_group') {
                                                                                        const prod = item._producto;
                                                                                        if (key === 'mayor' && !prod?.price_mayor_usdt) return null;
                                                                                        if (key === 'distribuidor' && !prod?.price_distribuidor_usdt) return null;
                                                                                    }
                                                                                    if (item.type === 'combo') {
                                                                                        if (key === 'mayor' && !item._combo?.price_mayor_usdt) return null;
                                                                                        if (key === 'distribuidor' && !item._combo?.price_distribuidor_usdt) return null;
                                                                                    }
                                                                                    return (
                                                                                        <button
                                                                                            key={key}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                if (isGroup) {
                                                                                                    item.variants.forEach(v => updateItem(v._uid, 'price_type', key));
                                                                                                } else {
                                                                                                    updateItem(item._uid, 'price_type', key);
                                                                                                }
                                                                                            }}
                                                                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                                                                                item.price_type === key
                                                                                                    ? PRICE_COLORS[key] + ' ring-1 ring-offset-1 ring-current'
                                                                                                    : 'bg-stone-50 dark:bg-stone-900 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                                                                                            }`}
                                                                                        >
                                                                                            {label}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        {/* Precio unitario */}
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">$</span>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                value={item.unit_price}
                                                                                onChange={e => {
                                                                                    if (isGroup) {
                                                                                        item.variants.forEach(v => updateItem(v._uid, 'unit_price', e.target.value));
                                                                                    } else {
                                                                                        updateItem(item._uid, 'unit_price', e.target.value);
                                                                                    }
                                                                                }}
                                                                                className="w-24 border border-stone-200 dark:border-stone-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-right focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                                            />
                                                                            <span className="text-xs text-stone-400 dark:text-stone-500">/u</span>
                                                                        </div>

                                                                        {/* Cantidad (SÓLO SI NO ES GRUPO) */}
                                                                        {!isGroup && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Cant.</span>
                                                                                <div className="flex items-center border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const minVal = getItemMaxStock(item) === 0 ? 0 : 1;
                                                                                            updateItem(item._uid, 'qty', Math.max(minVal, item.qty - 1));
                                                                                        }}
                                                                                        className="px-2.5 py-1.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                                                                        type="button"
                                                                                    >−</button>
                                                                                    <input
                                                                                        type="number"
                                                                                        min={getItemMaxStock(item) === 0 ? "0" : "1"}
                                                                                        value={item.qty}
                                                                                        onChange={e => {
                                                                                            const val = parseInt(e.target.value);
                                                                                            const minVal = getItemMaxStock(item) === 0 ? 0 : 1;
                                                                                            updateItem(item._uid, 'qty', isNaN(val) ? minVal : val);
                                                                                        }}
                                                                                        className="w-16 text-center text-sm font-mono border-x border-stone-200 dark:border-stone-800 py-1.5 focus:outline-none"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => updateItem(item._uid, 'qty', item.qty + 1)}
                                                                                        className="px-2.5 py-1.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                                                                        type="button"
                                                                                    >+</button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Subtotal + botón eliminar */}
                                                        <div className="flex-shrink-0 text-right ml-4">
                                                            <div className="text-base font-extrabold text-stone-900 dark:text-stone-100 font-mono">${(parseFloat(item.subtotal) || 0).toFixed(2)}</div>
                                                            {item.type !== 'combo_product' && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (isGroup) {
                                                                            setItems(prev => prev.filter(i => !(i.product_id === item.product_id && i.type === 'product')));
                                                                        } else {
                                                                            removeItem(item._uid);
                                                                        }
                                                                    }}
                                                                    className="mt-2 text-red-400 hover:text-red-650 transition-colors p-1"
                                                                    type="button"
                                                                    title="Eliminar item"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Totales y botón guardar */}
                            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                                {/* Envío y Delivery */}
                                <div className="border-b border-stone-200 dark:border-stone-800 pb-4 space-y-3">
                                    <div className="flex flex-wrap items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={applyShipping}
                                                onChange={e => {
                                                    setApplyShipping(e.target.checked);
                                                    if (!e.target.checked) {
                                                        setShippingUsd('');
                                                        setShippingBs('');
                                                    }
                                                }}
                                                className="w-4 h-4 text-marca-700 dark:text-marca-400 border-stone-300 dark:border-stone-700 rounded focus:ring-marca-600 dark:focus:ring-marca-400 focus:ring-opacity-25"
                                            />
                                            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Aplica Envío / Embalaje</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={hasDeliveryFee}
                                                onChange={e => {
                                                    setHasDeliveryFee(e.target.checked);
                                                    if (!e.target.checked) setDeliveryBs('');
                                                }}
                                                className="w-4 h-4 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700 rounded focus:ring-stone-600 dark:focus:ring-stone-500 focus:ring-opacity-25"
                                            />
                                            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Aplica Delivery (Monto Bs)</span>
                                        </label>
                                    </div>

                                    {applyShipping && (
                                        <div className="mt-2 grid grid-cols-2 gap-3 p-3 bg-marca-50/50 dark:bg-marca-950/50 rounded-xl border border-stone-200 dark:border-stone-800">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Costo Envío USD ($)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs font-mono">$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={shippingUsd}
                                                        onChange={e => {
                                                            const valStr = e.target.value;
                                                            setShippingUsd(valStr);
                                                            const num = parseFloat(valStr) || 0;
                                                            setShippingBs(valStr ? round2(num * customBcvRate).toString() : '');
                                                        }}
                                                        className="w-full pl-7 pr-3 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-mono focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Costo Envío Bs</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs font-mono">Bs</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={shippingBs}
                                                        onChange={e => {
                                                            const valStr = e.target.value;
                                                            setShippingBs(valStr);
                                                            const num = parseFloat(valStr) || 0;
                                                            setShippingUsd(valStr && customBcvRate > 0 ? round2(num / customBcvRate).toString() : '');
                                                        }}
                                                        className="w-full pl-8 pr-3 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-mono focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hasDeliveryFee && (
                                        <div className="mt-2 p-3 bg-stone-50/50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800">
                                            <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">Monto Delivery en Bolívares (Bs.)</label>
                                            <div className="relative max-w-xs">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 text-xs font-mono">Bs</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={deliveryBs}
                                                    onChange={e => setDeliveryBs(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-mono font-bold text-stone-900 dark:text-stone-200 focus:border-stone-500 dark:focus:border-stone-500 focus:ring-1 focus:ring-stone-300 dark:focus:ring-stone-800 outline-none bg-white dark:bg-stone-900"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                                    <div className="space-y-2 flex-1 max-w-md">
                                        <div className="flex justify-between gap-12 text-sm text-stone-500 dark:text-stone-400">
                                            <span>Subtotal</span>
                                            <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">${totals.subtotal.toFixed(2)}</span>
                                        </div>
                                        {applyShipping && (
                                            <div className="flex justify-between gap-12 text-sm text-stone-500 dark:text-stone-400">
                                                <span>Envío / Embalaje</span>
                                                <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">${parseFloat(shippingUsd || 0).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-12 text-lg font-extrabold text-stone-900 dark:text-stone-100 border-t pt-2">
                                            <span>Total USD</span>
                                            <span className="font-mono">${totals.totalUsd.toFixed(2)}</span>
                                        </div>

                                        <div className="pt-3 border-t border-dashed border-stone-200 dark:border-stone-700 space-y-2.5">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Tasa de Cambio BCV ($):</span>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={customBcvRate}
                                                    onChange={e => handleBcvRateChange(parseFloat(e.target.value) || 0)}
                                                    className="w-24 px-2.5 py-1 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-mono text-right focus:border-marca-600 dark:focus:border-marca-400 focus:ring-1 focus:ring-marca-600 dark:focus:ring-marca-400 outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1 text-marca-800 dark:text-marca-300 bg-marca-50 dark:bg-marca-950/40 rounded-xl px-4 py-2.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold">Total Normal (Bs.)</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm font-mono font-bold">Bs.</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={manualTotalBs !== '' ? manualTotalBs : totals.totalBs}
                                                            onChange={e => setManualTotalBs(e.target.value)}
                                                            className="w-32 bg-transparent text-right font-mono font-bold border-b border-marca-300 dark:border-marca-800 focus:border-marca-600 dark:focus:border-marca-400 focus:ring-0 outline-none text-sm p-0"
                                                        />
                                                    </div>
                                                </div>
                                                {manualTotalBs !== '' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setManualTotalBs('')}
                                                        className="text-[10px] text-marca-500 dark:text-marca-400 font-semibold hover:text-marca-700 dark:hover:text-marca-400 self-end mt-1 underline transition-colors"
                                                    >
                                                        Restaurar valor automático (Bs. {totals.calculatedTotalBs.toFixed(2)})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            onClick={() => router.visit(route('facturas.show', factura.id))}
                                            className="px-5 py-3 border-2 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={saving || items.length === 0}
                                            className="px-6 py-3 bg-marca-700 dark:bg-marca-500 text-white font-bold rounded-xl hover:bg-marca-800 dark:hover:bg-marca-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm flex items-center gap-2"
                                        >
                                            {saving ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 5.373 0 12h4z"/>
                                                    </svg>
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                                                    </svg>
                                                    Actualizar Factura
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
