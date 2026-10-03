import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        './resources/js/**/*.js',
    ],

    theme: {
        extend: {
            fontFamily: {
                // Cuerpo de texto de la plataforma
                sans: ['"Inter Tight"', ...defaultTheme.fontFamily.sans],
                // Titulares y cifras destacadas
                display: ['Outfit', '"Inter Tight"', ...defaultTheme.fontFamily.sans],
            },

            colors: {
                // Acento único de la plataforma. El catálogo de cada comercio
                // usa su propia paleta; aquí no competimos con ella.
                marca: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
            },

            transitionTimingFunction: {
                // Curvas fuertes: las integradas de CSS se sienten flojas
                salida: 'cubic-bezier(0.23, 1, 0.32, 1)',
                suave: 'cubic-bezier(0.77, 0, 0.175, 1)',
                cajon: 'cubic-bezier(0.32, 0.72, 0, 1)',
            },

            keyframes: {
                aparecer: {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                acercar: {
                    from: { opacity: '0', transform: 'scale(0.96)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                desplazar: {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-50%)' },
                },
            },

            animation: {
                aparecer: 'aparecer 0.5s cubic-bezier(0.23, 1, 0.32, 1) both',
                acercar: 'acercar 0.2s cubic-bezier(0.23, 1, 0.32, 1) both',
            },
        },
    },

    plugins: [forms],
};
