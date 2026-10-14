<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        @php
            $marca = config('app.name', 'Despashop');
            $og = array_merge([
                'titulo' => $marca,
                'descripcion' => 'Tu catálogo, tu inventario y tus facturas en un solo lugar.',
                'imagen' => url('/marca/enlace.png'),
                'canonica' => url()->current(),
            ], $og ?? []);
        @endphp

        <meta name="color-scheme" content="light dark">

        {{-- El título se escribe aquí y no solo en el navegador: el primer
             rastreo de Google lee esta respuesta, y con el nombre de la
             plataforma a secas no hay de qué agarrarse. Inertia lo reemplaza
             al navegar, con la misma plantilla de app.jsx. --}}
        <title inertia>{{ $og['titulo'] }}</title>

        {{-- Identidad: ícono en la pestaña, en la pantalla de inicio y en las tiendas --}}
        <link rel="icon" href="/favicon.ico" sizes="32x32">
        <link rel="icon" href="/marca/icono.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/marca/icono-180.png">
        <link rel="manifest" href="/site.webmanifest">
        <meta name="theme-color" content="#022c22">
        <meta name="apple-mobile-web-app-title" content="Despashop">

        {{-- Sin canónica, la misma página alcanzada con parámetros distintos
             (una campaña, un ?ref=) se le cuenta a Google como páginas
             distintas, y el peso del enlace se reparte entre todas. --}}
        <link rel="canonical" href="{{ $og['canonica'] }}">

        {{-- Vista previa al compartir el enlace.
             Se escribe en el servidor porque el robot de WhatsApp no ejecuta
             JavaScript: lo que no esté en esta respuesta, no lo ve. Cada
             página la reemplaza con `->withViewData(['og' => ...])`; el
             catálogo de un comercio muestra su propia portada. --}}

        <meta name="description" content="{{ $og['descripcion'] }}">
        <meta property="og:site_name" content="{{ config('app.name', 'Despashop') }}">
        <meta property="og:type" content="website">
        <meta property="og:locale" content="es_VE">
        <meta property="og:title" content="{{ $og['titulo'] }}">
        <meta property="og:description" content="{{ $og['descripcion'] }}">
        <meta property="og:image" content="{{ $og['imagen'] }}">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $og['titulo'] }}">
        <meta name="twitter:description" content="{{ $og['descripcion'] }}">
        <meta name="twitter:image" content="{{ $og['imagen'] }}">

        {{-- Datos estructurados: lo que convierte un resultado en una ficha
             con nombre, precio y valoración en vez de un enlace azul --}}
        @isset($jsonld)
            <script type="application/ld+json">{!! json_encode($jsonld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
        @endisset

        {{-- El tema se aplica antes de pintar para que no haya destello blanco --}}
        <script>
            (function () {
                try {
                    var guardado = localStorage.getItem('despashop-tema') || localStorage.getItem('catalogizador-tema');
                    var oscuro = guardado === 'oscuro'
                        || (guardado !== 'claro' && window.matchMedia('(prefers-color-scheme: dark)').matches);

                    document.documentElement.classList.toggle('dark', oscuro);
                    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
                } catch (e) {
                    // Sin almacenamiento disponible se queda con el tema claro
                }

                // Habilita el estado inicial oculto del revelado por scroll.
                // Se marca aquí, antes de pintar, para que no haya destello;
                // sin JavaScript la clase nunca se añade y todo queda visible.
                document.documentElement.classList.add('revelar-listo');
            })();
        </script>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link
            href="https://fonts.bunny.net/css?family=outfit:400,500,600,700|inter-tight:400,500,600&display=swap"
            rel="stylesheet"
        />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
