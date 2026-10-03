import { Check } from 'lucide-react';

/**
 * Temas rápidos del catálogo.
 *
 * Cada tema es un punto de partida completo: colores, tipografías, forma de
 * botones y tarjetas, estilo de cabecera y portada, y nivel de animación.
 * No toca el contenido (textos, logo, banners, orden de las secciones).
 *
 * Toda fuente usada aquí tiene que existir en CatalogDesignController::fonts():
 * el servidor rechaza una fuente que no esté en esa lista.
 */
export const TEMAS = [
    {
        id: 'sobrio',
        nombre: 'Sobrio',
        descripcion: 'Neutro y serio. Deja que manden las fotos.',
        valores: {
            color_primary: '#292524', color_secondary: '#57534e', color_accent: '#b45309',
            color_bg: '#ffffff', color_surface: '#fafaf9', color_text: '#1c1917', color_muted: '#78716c',
            font_heading: 'Inter', font_body: 'Inter',
            radius: 'md', shadow: 'sm', card_style: 'bordered', button_style: 'solid', card_hover: 'lift',
            background_style: 'solid', density: 'normal', price_style: 'normal',
            header_style: 'glass', hero_layout: 'minimal', category_style: 'underline', animation_level: 'subtle',
            animation_entrance: 'fade', animation_speed: 'normal', heading_style: 'normal', image_ratio: 'square',
        },
    },
    {
        id: 'bosque',
        nombre: 'Bosque',
        descripcion: 'Verde profundo sobre hueso. Natural y confiable.',
        valores: {
            color_primary: '#14532d', color_secondary: '#3f6212', color_accent: '#ca8a04',
            color_bg: '#fbfaf7', color_surface: '#f3f1ea', color_text: '#1a2e1a', color_muted: '#6b7263',
            font_heading: 'Poppins', font_body: 'Inter',
            radius: 'lg', shadow: 'md', card_style: 'elevated', button_style: 'solid', card_hover: 'zoom',
            background_style: 'solid', density: 'normal', price_style: 'destacado',
            header_style: 'solid', hero_layout: 'split', category_style: 'pills', animation_level: 'subtle',
            animation_entrance: 'up', animation_speed: 'normal', heading_style: 'underline', image_ratio: 'square',
        },
    },
    {
        id: 'cobalto',
        nombre: 'Cobalto',
        descripcion: 'Azul saturado y limpio. Ideal para tecnología.',
        valores: {
            color_primary: '#1d4ed8', color_secondary: '#3b82f6', color_accent: '#f97316',
            color_bg: '#ffffff', color_surface: '#f1f5f9', color_text: '#0f172a', color_muted: '#64748b',
            font_heading: 'Outfit', font_body: 'DM Sans',
            radius: 'lg', shadow: 'sm', card_style: 'flat', button_style: 'pill', card_hover: 'lift',
            background_style: 'pattern', background_pattern: 'grid', density: 'normal', price_style: 'normal',
            header_style: 'glass', hero_layout: 'centered', category_style: 'pills', animation_level: 'lively',
            animation_entrance: 'zoom', animation_speed: 'fast', heading_style: 'gradient', image_ratio: 'square',
        },
    },
    {
        id: 'terracota',
        nombre: 'Terracota',
        descripcion: 'Tierra cálida. Va bien con productos hechos a mano.',
        valores: {
            color_primary: '#9a3412', color_secondary: '#c2410c', color_accent: '#0f766e',
            color_bg: '#fdfaf7', color_surface: '#f6ede6', color_text: '#2b1b12', color_muted: '#8a7264',
            font_heading: 'Cormorant Garamond', font_body: 'Lato',
            radius: 'sm', shadow: 'none', card_style: 'bordered', button_style: 'outline', card_hover: 'zoom',
            background_style: 'solid', density: 'airy', price_style: 'discreto',
            header_style: 'minimal', hero_layout: 'split', category_style: 'underline', animation_level: 'subtle',
            animation_entrance: 'fade', animation_speed: 'slow', heading_style: 'normal', image_ratio: 'portrait',
        },
    },
    {
        id: 'medianoche',
        nombre: 'Medianoche',
        descripcion: 'Catálogo oscuro con detalles dorados. Luce la fotografía.',
        valores: {
            color_primary: '#e0b25c', color_secondary: '#b98a3e', color_accent: '#5eead4',
            color_bg: '#0c0a09', color_surface: '#1c1917', color_text: '#f5f5f4', color_muted: '#a8a29e',
            font_heading: 'Outfit', font_body: 'Inter',
            radius: 'xl', shadow: 'lg', card_style: 'overlay', button_style: 'solid', card_hover: 'zoom',
            background_style: 'gradient', background_intensity: 8, density: 'normal', price_style: 'destacado',
            header_style: 'glass', hero_layout: 'left', category_style: 'underline', animation_level: 'lively',
            animation_entrance: 'blur', animation_speed: 'slow', heading_style: 'gradient', image_ratio: 'portrait',
        },
    },
    {
        id: 'confite',
        nombre: 'Confite',
        descripcion: 'Suave y alegre. Para regalos y detalles.',
        valores: {
            color_primary: '#be185d', color_secondary: '#db2777', color_accent: '#7c3aed',
            color_bg: '#fffbfd', color_surface: '#fdf2f8', color_text: '#3b0d24', color_muted: '#9d7285',
            font_heading: 'Quicksand', font_body: 'Nunito',
            radius: 'full', shadow: 'md', card_style: 'elevated', button_style: 'pill', card_hover: 'lift',
            background_style: 'pattern', background_pattern: 'dots', density: 'airy', price_style: 'normal',
            header_style: 'glass', hero_layout: 'centered', category_style: 'pills', animation_level: 'lively',
            animation_entrance: 'up', animation_speed: 'fast', heading_style: 'gradient', image_ratio: 'square',
        },
    },
    {
        id: 'contraste',
        nombre: 'Alto contraste',
        descripcion: 'Blanco y negro con un acento. Directo y legible.',
        valores: {
            color_primary: '#000000', color_secondary: '#404040', color_accent: '#eab308',
            color_bg: '#ffffff', color_surface: '#ffffff', color_text: '#000000', color_muted: '#525252',
            font_heading: 'Bebas Neue', font_body: 'Work Sans',
            radius: 'none', shadow: 'none', card_style: 'bordered', button_style: 'solid', card_hover: 'border',
            background_style: 'solid', density: 'compact', price_style: 'destacado',
            header_style: 'brand', hero_layout: 'minimal', category_style: 'boxes', animation_level: 'subtle',
            animation_entrance: 'right', animation_speed: 'fast', heading_style: 'upper', image_ratio: 'square',
        },
    },
    {
        id: 'brisa',
        nombre: 'Brisa',
        descripcion: 'Turquesa claro y aireado. Fresco sin ser infantil.',
        valores: {
            color_primary: '#0f766e', color_secondary: '#0d9488', color_accent: '#f59e0b',
            color_bg: '#f7fdfc', color_surface: '#ecfdf9', color_text: '#0f2e2a', color_muted: '#5f807b',
            font_heading: 'Raleway', font_body: 'Inter',
            radius: 'lg', shadow: 'sm', card_style: 'flat', button_style: 'soft', card_hover: 'lift',
            background_style: 'gradient', background_intensity: 6, density: 'airy', price_style: 'normal',
            header_style: 'minimal', hero_layout: 'split', category_style: 'pills', animation_level: 'subtle',
            animation_entrance: 'up', animation_speed: 'normal', heading_style: 'underline', image_ratio: 'landscape',
        },
    },
    {
        id: 'editorial',
        nombre: 'Editorial',
        descripcion: 'Serif elegante sobre crema. Aire de revista.',
        valores: {
            color_primary: '#1c1917', color_secondary: '#44403c', color_accent: '#9f1239',
            color_bg: '#faf7f0', color_surface: '#f2ede1', color_text: '#1c1917', color_muted: '#78716c',
            font_heading: 'Playfair Display', font_body: 'Lato',
            radius: 'none', shadow: 'none', card_style: 'flat', button_style: 'outline', card_hover: 'zoom',
            background_style: 'solid', density: 'airy', price_style: 'discreto',
            header_style: 'minimal', hero_layout: 'minimal', category_style: 'underline', animation_level: 'subtle',
            animation_entrance: 'fade', animation_speed: 'slow', heading_style: 'upper', image_ratio: 'portrait',
        },
    },
    {
        id: 'mercado',
        nombre: 'Mercado',
        descripcion: 'Rojo intenso y letras firmes. Para ofertas y comida.',
        valores: {
            color_primary: '#dc2626', color_secondary: '#b91c1c', color_accent: '#facc15',
            color_bg: '#fffdf7', color_surface: '#ffffff', color_text: '#1c1917', color_muted: '#6b635b',
            font_heading: 'Oswald', font_body: 'Nunito',
            radius: 'md', shadow: 'md', card_style: 'elevated', button_style: 'solid', card_hover: 'lift',
            background_style: 'pattern', background_pattern: 'diagonal', background_intensity: 4, density: 'compact', price_style: 'destacado',
            header_style: 'brand', hero_layout: 'centered', category_style: 'boxes', animation_level: 'lively',
            animation_entrance: 'up', animation_speed: 'fast', heading_style: 'upper', image_ratio: 'square',
        },
    },
];

/** Lo que identifica a un tema a simple vista: sus colores y sus letras. */
const IDENTIDAD = [
    'color_primary', 'color_secondary', 'color_accent', 'color_bg',
    'color_surface', 'color_text', 'color_muted', 'font_heading', 'font_body',
];

export default function TemasRapidos({ datos, onAplicar }) {
    // Un tema sigue marcado aunque después se cambie una esquina o una
    // sombra: desmarcarlo por un detalle hacía creer que no se aplicó.
    const activo = TEMAS.find((tema) =>
        IDENTIDAD.every((campo) => String(datos[campo]).toLowerCase() === String(tema.valores[campo]).toLowerCase()),
    );

    return (
        <div className="grid grid-cols-2 gap-2.5">
            {TEMAS.map((tema) => {
                const esActivo = activo?.id === tema.id;
                const v = tema.valores;

                return (
                    <button
                        key={tema.id}
                        type="button"
                        onClick={() => onAplicar(tema)}
                        aria-pressed={esActivo}
                        className={`pulsable group relative overflow-hidden rounded-xl border text-left ${
                            esActivo
                                ? 'border-marca-600 ring-2 ring-marca-600/25 dark:border-marca-400 dark:ring-marca-400/25'
                                : 'border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600'
                        }`}
                    >
                        {/* Miniatura del catálogo con los colores y letras del tema */}
                        <span className="block p-2.5" style={{ background: v.color_bg }}>
                            <span className="flex items-center justify-between">
                                <span
                                    className="text-[15px] font-semibold leading-none"
                                    style={{ color: v.color_text, fontFamily: `"${v.font_heading}", system-ui, sans-serif` }}
                                >
                                    Aa
                                </span>
                                <span className="flex gap-1">
                                    {[v.color_primary, v.color_secondary, v.color_accent].map((color) => (
                                        <span key={color} className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: color }} />
                                    ))}
                                </span>
                            </span>

                            <span className="mt-2 grid grid-cols-2 gap-1.5">
                                {[0, 1].map((i) => (
                                    <span
                                        key={i}
                                        className="block overflow-hidden"
                                        style={{
                                            background: v.color_surface,
                                            borderRadius: { none: 0, sm: 2, md: 4, lg: 6, xl: 8, full: 10 }[v.radius],
                                            border: v.card_style === 'bordered' ? `1px solid ${v.color_text}22` : 'none',
                                        }}
                                    >
                                        <span className="block h-6" style={{ background: `${v.color_primary}33` }} />
                                        <span className="block p-1">
                                            <span
                                                className="block h-2"
                                                style={{
                                                    background: v.button_style === 'outline' ? 'transparent' : v.button_style === 'soft' ? `${v.color_primary}33` : v.color_primary,
                                                    border: v.button_style === 'outline' ? `1px solid ${v.color_primary}` : 'none',
                                                    borderRadius: v.button_style === 'pill' ? 99 : 2,
                                                }}
                                            />
                                        </span>
                                    </span>
                                ))}
                            </span>
                        </span>

                        <span className="block border-t border-stone-200 bg-white px-2.5 py-2 dark:border-stone-800 dark:bg-stone-900">
                            <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">{tema.nombre}</span>
                                {esActivo && (
                                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-marca-600 text-white dark:bg-marca-500 dark:text-stone-950">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </span>
                                )}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                                {tema.descripcion}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
