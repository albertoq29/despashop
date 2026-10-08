{{-- El primer correo que recibe un comercio. Lo importante: su dirección de
     catálogo y qué hacer ahora, no una felicitación. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu cuenta ya está activa</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $nombre }}, tu cuenta ya está activa
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Revisamos tu solicitud y quedó aprobada. Tu catálogo ya tiene dirección propia y puedes empezar a
            cargar productos cuando quieras.
        </p>

        @if ($catalogo)
            <div style="margin:22px 0 0;padding:16px 18px;background:#ecfdf5;border-radius:12px;">
                <p style="margin:0;font-size:13px;color:#047857;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">
                    Tu dirección
                </p>
                <p style="margin:6px 0 0;font-size:16px;line-height:1.5;color:#064e3b;word-break:break-all;">
                    <strong>{{ $catalogo }}</strong>
                </p>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#065f46;">
                    Es el enlace que vas a compartir con tus clientes. Todavía no está publicado: lo publicas tú
                    cuando lo tengas listo.
                </p>
            </div>
        @endif

        <p style="margin:24px 0 0;font-size:15px;line-height:1.65;">
            <strong>Por dónde empezar:</strong>
        </p>

        <ol style="margin:10px 0 0;padding-left:20px;font-size:15px;line-height:1.7;">
            <li>Carga tus primeros productos, con foto y precio.</li>
            <li>Dale tu cara al catálogo: logo, colores y tipografía.</li>
            <li>Publícalo y comparte tu enlace por WhatsApp.</li>
        </ol>

        <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#78716c;">
            Dentro de la app tienes tutoriales que hacen las acciones en pantalla, por si prefieres verlo antes
            de hacerlo.
        </p>

        <p style="margin:24px 0 0;">
            <a href="{{ $panel }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                Entrar a mi panel
            </a>

            <a href="{{ $personalizar }}" style="display:inline-block;margin-left:8px;color:#047857;text-decoration:none;padding:12px 8px;font-size:15px;font-weight:600;">
                Personalizar mi catálogo
            </a>
        </p>

        @if ($plan || $vence)
            <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e7e5e4;font-size:13px;line-height:1.6;color:#78716c;">
                @if ($plan)
                    {{ $prueba ? 'Prueba gratis del plan' : 'Plan' }} <strong>{{ $plan }}</strong>.
                @endif
                @if ($vence)
                    {{ $prueba ? 'Gratis hasta el' : 'Activo hasta el' }}
                    {{ $vence->timezone(config('app.timezone'))->format('d/m/Y') }}; te avisamos
                    antes de que venza.
                @else
                    Sin fecha de vencimiento.
                @endif
            </p>
        @endif

        @php
            $numero = \App\Support\Whatsapp::numero($contacto['whatsapp'] ?? null);
        @endphp

        @if ($numero || ! empty($contacto['email']))
            <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                ¿Dudas para arrancar? Escríbenos
                @if ($numero)
                    por <a href="https://wa.me/{{ $numero }}" style="color:#047857;">WhatsApp</a>
                @endif
                @if ($numero && ! empty($contacto['email'])) o @endif
                @if (! empty($contacto['email']))
                    a <a href="mailto:{{ $contacto['email'] }}" style="color:#047857;">{{ $contacto['email'] }}</a>
                @endif
                y te ayudamos.
            </p>
        @endif
    </div>
</body>
</html>
