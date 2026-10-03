import {
    AlignLeft,
    BarChart3,
    BadgeCheck,
    Clock,
    CreditCard,
    Gift,
    Heart,
    Image as ImagenIcono,
    Layers,
    LayoutGrid,
    Leaf,
    MapPin,
    Megaphone,
    MessageCircle,
    Minus,
    Package,
    Quote,
    PanelTop,
    Phone,
    ShieldCheck,
    PanelBottomOpen,
    Smile,
    Sparkles,
    Star,
    Tag,
    TextQuote,
    Truck,
    Wrench,
} from 'lucide-react';

/**
 * Tipos de bloque del catálogo.
 *
 * La lista y el orden por defecto viven en el servidor
 * (App\Support\SeccionesDelCatalogo); aquí solo está lo que necesita la
 * interfaz: el nombre que ve el comercio, su icono y el contenido con el
 * que nace un bloque nuevo. Si se agrega un tipo, hay que sumarlo en ambos.
 */
export const TIPOS_DE_SECCION = {
    marquee: {
        nombre: 'Cinta en movimiento',
        descripcion: 'Una franja de texto que se desplaza.',
        Icono: Megaphone,
    },
    header: {
        nombre: 'Cabecera',
        descripcion: 'Logo, nombre y accesos rápidos.',
        Icono: PanelTop,
    },
    announcement: {
        nombre: 'Aviso fijo',
        descripcion: 'Una línea de texto destacada.',
        Icono: TextQuote,
    },
    banners: {
        nombre: 'Banners',
        descripcion: 'Carrusel de imágenes promocionales.',
        Icono: Layers,
    },
    hero: {
        nombre: 'Portada',
        descripcion: 'La presentación grande del catálogo.',
        Icono: ImagenIcono,
    },
    featured: {
        nombre: 'Novedades',
        descripcion: 'Los productos agregados más recientemente.',
        Icono: Sparkles,
    },
    combos: {
        nombre: 'Combos',
        descripcion: 'Tus combos en una fila aparte.',
        Icono: Gift,
    },
    services: {
        nombre: 'Servicios',
        descripcion: 'Lo que tu negocio hace: cortes, reparaciones, asesorías, envíos.',
        Icono: Wrench,
    },
    products: {
        nombre: 'Productos',
        descripcion: 'Buscador, categorías y todo tu inventario visible.',
        Icono: LayoutGrid,
    },
    contact: {
        nombre: 'Contacto',
        descripcion: 'Invitación a escribirte por WhatsApp o redes.',
        Icono: MessageCircle,
    },
    text: {
        nombre: 'Texto',
        descripcion: 'Un título y un párrafo: quiénes son, horarios, formas de pago.',
        Icono: AlignLeft,
        repetible: true,
        crear: () => ({
            title: 'Sobre nosotros',
            text: 'Cuenta aquí quiénes son, qué los hace distintos o cómo trabajan.',
            button_text: '',
            button_link: '',
            align: 'center',
            style: 'plain',
        }),
    },
    benefits: {
        nombre: 'Beneficios',
        descripcion: 'Tres o cuatro razones para comprarte, con iconos.',
        Icono: BadgeCheck,
        repetible: true,
        crear: () => ({
            title: '',
            style: 'plain',
            items: [
                { icon: 'truck', title: 'Envíos', text: 'Llevamos tu pedido a donde estés.' },
                { icon: 'credit-card', title: 'Pagos flexibles', text: 'Divisas, bolívares y pago móvil.' },
                { icon: 'shield-check', title: 'Compra segura', text: 'Te atendemos antes y después de comprar.' },
            ],
        }),
    },
    faq: {
        nombre: 'Preguntas frecuentes',
        descripcion: 'Ventanas desplegables: la pregunta se abre al tocarla.',
        Icono: PanelBottomOpen,
        repetible: true,
        crear: () => ({
            title: 'Preguntas frecuentes',
            subtitle: '',
            style: 'card',
            items: [
                { question: '\u00bfHacen env\u00edos?', answer: 'S\u00ed. Escr\u00edbenos y te decimos el costo hasta tu zona.' },
                { question: '\u00bfC\u00f3mo puedo pagar?', answer: 'Aceptamos divisas, pago m\u00f3vil y transferencia.' },
                { question: '\u00bfPuedo cambiar un producto?', answer: 'Cu\u00e9ntanos qu\u00e9 pas\u00f3 y buscamos la soluci\u00f3n.' },
            ],
        }),
    },
    testimonials: {
        nombre: 'Testimonios',
        descripcion: 'Lo que dicen tus clientes, con estrellas.',
        Icono: Quote,
        repetible: true,
        crear: () => ({
            title: 'Lo que dicen nuestros clientes',
            subtitle: '',
            style: 'card',
            items: [
                { title: 'Mar\u00eda G.', text: 'Todo lleg\u00f3 tal cual y rapid\u00edsimo. Repito segura.', rating: 5 },
                { title: 'Jos\u00e9 R.', text: 'Me asesoraron por WhatsApp hasta dar con lo que buscaba.', rating: 5 },
            ],
        }),
    },
    stats: {
        nombre: 'Cifras',
        descripcion: 'N\u00fameros grandes: clientes, a\u00f1os, env\u00edos.',
        Icono: BarChart3,
        repetible: true,
        crear: () => ({
            title: '',
            subtitle: '',
            style: 'brand',
            items: [
                { value: '+500', title: 'Clientes atendidos' },
                { value: '3', title: 'A\u00f1os en el mercado' },
                { value: '24h', title: 'Tiempo de respuesta' },
            ],
        }),
    },
    divider: {
        nombre: 'Separador',
        descripcion: 'Una figura entre dos bloques: onda, curva, diagonal.',
        Icono: Minus,
        repetible: true,
        crear: () => ({ shape: 'wave' }),
    },
    category: {
        nombre: 'Categoría destacada',
        descripcion: 'Una fila con los productos de una categoría.',
        Icono: Tag,
        repetible: true,
        crear: (categorias = []) => ({
            title: '',
            category_id: categorias[0]?.id ?? null,
            style: 'carousel',
            limit: 8,
        }),
    },
};

export function nuevaSeccion(tipo, categorias = []) {
    const aleatorio = Math.random().toString(36).slice(2, 8).padEnd(6, '0');

    return {
        id: `${tipo}-${aleatorio}`,
        type: tipo,
        visible: true,
        ...TIPOS_DE_SECCION[tipo].crear(categorias),
    };
}

/** Nombre que se muestra en la lista: el título propio si lo tiene. */
export function nombreDeSeccion(seccion, categorias = []) {
    const tipo = TIPOS_DE_SECCION[seccion.type];

    if (seccion.type === 'category') {
        const categoria = categorias.find((c) => String(c.id) === String(seccion.category_id));

        return seccion.title || categoria?.name || tipo.nombre;
    }

    if (tipo?.repetible && seccion.title) {
        return seccion.title;
    }

    return tipo?.nombre ?? seccion.type;
}

export const ICONOS_DE_BENEFICIO = {
    truck: { Icono: Truck, nombre: 'Envío' },
    'credit-card': { Icono: CreditCard, nombre: 'Pago' },
    'shield-check': { Icono: ShieldCheck, nombre: 'Seguridad' },
    clock: { Icono: Clock, nombre: 'Horario' },
    'map-pin': { Icono: MapPin, nombre: 'Ubicación' },
    gift: { Icono: Gift, nombre: 'Regalo' },
    star: { Icono: Star, nombre: 'Estrella' },
    heart: { Icono: Heart, nombre: 'Corazón' },
    package: { Icono: Package, nombre: 'Paquete' },
    phone: { Icono: Phone, nombre: 'Teléfono' },
    'badge-check': { Icono: BadgeCheck, nombre: 'Garantía' },
    sparkles: { Icono: Sparkles, nombre: 'Novedad' },
    leaf: { Icono: Leaf, nombre: 'Natural' },
    smile: { Icono: Smile, nombre: 'Atención' },
};

/** Fondos que puede llevar un bloque de contenido. */
export const SUPERFICIES = [
    { valor: 'plain', texto: 'Sencillo' },
    { valor: 'card', texto: 'Tarjeta' },
    { valor: 'glass', texto: 'Cristal' },
    { valor: 'outline', texto: 'Contorno' },
    { valor: 'brand', texto: 'Franja de color' },
];

/** Figuras del bloque separador. */
export const FIGURAS = [
    { valor: 'wave', texto: 'Onda' },
    { valor: 'curve', texto: 'Curva' },
    { valor: 'slant', texto: 'Diagonal' },
    { valor: 'zigzag', texto: 'Zigzag' },
    { valor: 'line', texto: 'Línea' },
    { valor: 'dots', texto: 'Puntos' },
];
