{{--
    Base de las pantallas de error.

    Es Blade puro, sin React ni Inertia, a propósito: si lo que falló fue la
    aplicación, la página que lo cuenta no puede depender de ella. Los estilos
    van en línea por la misma razón, y porque así se ve bien aunque el paquete
    de CSS no se haya compilado todavía.
--}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>@yield('titulo') · {{ config('app.name', 'Despashop') }}</title>

    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="icon" href="/marca/icono.svg" type="image/svg+xml">
    <meta name="theme-color" content="#022c22">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=outfit:500,600|inter-tight:400,500&display=swap" rel="stylesheet">

    <style>
        :root {
            --fondo: #fafaf9;
            --superficie: #ffffff;
            --borde: #e7e5e4;
            --texto: #1c1917;
            --tenue: #78716c;
            --acento: #047857;
            --acento-claro: #10b981;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --fondo: #0c0a09;
                --superficie: #1c1917;
                --borde: #292524;
                --texto: #fafaf9;
                --tenue: #a8a29e;
                --acento: #10b981;
            }
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100dvh;
            display: grid;
            place-items: center;
            padding: 24px;
            background: var(--fondo);
            color: var(--texto);
            font-family: 'Inter Tight', -apple-system, Segoe UI, Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        .caja {
            width: 100%;
            max-width: 32rem;
            text-align: center;
            animation: aparecer .5s cubic-bezier(.23, 1, .32, 1) both;
        }

        @keyframes aparecer {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: none; }
        }

        @media (prefers-reduced-motion: reduce) {
            .caja { animation: none; }
        }

        .marca { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
        .marca img { height: 26px; width: auto; }

        .codigo {
            margin: 40px 0 0;
            font-family: Outfit, sans-serif;
            font-size: clamp(64px, 18vw, 104px);
            font-weight: 600;
            line-height: 1;
            letter-spacing: -.04em;
            color: var(--acento);
        }

        h1 {
            margin: 12px 0 0;
            font-family: Outfit, sans-serif;
            font-size: clamp(22px, 5vw, 28px);
            font-weight: 600;
            letter-spacing: -.02em;
        }

        p { margin: 12px auto 0; max-width: 42ch; line-height: 1.65; color: var(--tenue); }

        .acciones { margin-top: 32px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }

        a.boton, a.boton-suave {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 22px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            text-decoration: none;
            transition: transform .15s cubic-bezier(.23, 1, .32, 1), background-color .15s, border-color .15s;
        }

        a.boton { background: var(--acento); color: #ffffff; }
        a.boton:hover { background: var(--acento-claro); transform: translateY(-1px); }
        a.boton-suave { border: 1px solid var(--borde); color: var(--texto); background: var(--superficie); }
        a.boton-suave:hover { border-color: var(--tenue); transform: translateY(-1px); }

        .pie { margin-top: 44px; font-size: 13px; color: var(--tenue); }
        .pie a { color: var(--acento); text-decoration: none; }
        .pie a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <main class="caja">
        <a href="{{ url('/') }}" class="marca" aria-label="{{ config('app.name', 'Despashop') }}">
            <picture>
                <source srcset="/marca/logo-blanco.svg" media="(prefers-color-scheme: dark)">
                <img src="/marca/logo-verde.svg" alt="{{ config('app.name', 'Despashop') }}">
            </picture>
        </a>

        <p class="codigo">@yield('codigo')</p>
        <h1>@yield('titulo')</h1>
        <p>@yield('mensaje')</p>

        <div class="acciones">
            @yield('acciones')
        </div>

        <p class="pie">
            ¿Crees que esto es un error?
            <a href="{{ url('/') }}">Escríbenos desde la página principal</a>.
        </p>
    </main>
</body>
</html>
