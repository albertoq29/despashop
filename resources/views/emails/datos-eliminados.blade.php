{{-- Se cumplió el plazo. Sin reproches: se explica y se deja la puerta abierta. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Se eliminaron los datos de tu cuenta</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $nombre }}, cerramos tu cuenta
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Pasaron {{ $dias }} días desde que venció tu plan sin que lo renovaras, así que, como decían nuestras
            condiciones de uso, eliminamos tu cuenta y todo su contenido: productos, servicios, facturas, imágenes
            y el diseño de tu catálogo. La dirección <strong>/{{ $usuario }}</strong> quedó libre.
        </p>

        <p style="margin:16px 0 0;font-size:15px;line-height:1.65;">
            No podemos recuperar esa información. Si en algún momento quieres volver, puedes abrir una cuenta nueva
            cuando gustes: se empieza de cero, pero se empieza.
        </p>

        <p style="margin:24px 0 0;">
            <a href="{{ $registro }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                Abrir una cuenta nueva
            </a>
        </p>

        @if (! empty($contacto['email']) || ! empty($contacto['whatsapp']))
            <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                Si crees que esto fue un error, escríbenos
                @if (! empty($contacto['email'])) a {{ $contacto['email'] }} @endif
                @if (! empty($contacto['whatsapp'])) o por WhatsApp al {{ $contacto['whatsapp'] }} @endif.
            </p>
        @endif

        <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#a8a29e;">
            Gracias por haber probado {{ config('app.name') }}.
        </p>
    </div>
</body>
</html>
