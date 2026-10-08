{{-- Recuperar contraseña. Lleva el aviso de qué hacer si nadie lo pidió:
     un correo así sin haberlo pedido es la primera señal de un intento de
     entrar en una cuenta ajena. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Recupera tu contraseña</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $nombre }}, pon una contraseña nueva
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Pediste recuperar el acceso a tu cuenta. Pulsa el botón y elige una contraseña nueva.
        </p>

        <p style="margin:24px 0 0;">
            <a href="{{ $enlace }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;">
                Elegir contraseña nueva
            </a>
        </p>

        <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
            El enlace vence en {{ $minutos }} minutos y sirve una sola vez. Tu contraseña actual sigue funcionando
            hasta que elijas la nueva.
        </p>

        <div style="margin:24px 0 0;padding:16px 18px;background:#fffbeb;border-radius:12px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#78350f;">
                <strong>¿No pediste esto?</strong> Ignora el correo y no pulses nada: tu contraseña no cambia sola.
                @php
                    $numero = \App\Support\Whatsapp::numero($contacto['whatsapp'] ?? null);
                @endphp
                @if ($numero || ! empty($contacto['email']))
                    Si te llegan varios seguidos, avísanos
                    @if ($numero)
                        por <a href="https://wa.me/{{ $numero }}" style="color:#78350f;">WhatsApp</a>
                    @else
                        a <a href="mailto:{{ $contacto['email'] }}" style="color:#78350f;">{{ $contacto['email'] }}</a>
                    @endif
                    — puede ser que alguien esté intentando entrar en tu cuenta.
                @endif
            </p>
        </div>

        <p style="margin:18px 0 0;padding-top:18px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#a8a29e;">
            ¿El botón no funciona? Copia esta dirección en tu navegador:
            <br>
            <span style="word-break:break-all;color:#78716c;">{{ $enlace }}</span>
        </p>
    </div>
</body>
</html>
