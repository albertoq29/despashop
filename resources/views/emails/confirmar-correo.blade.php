{{-- Primer correo de todos. Un botón, y por qué vale la pena pulsarlo. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirma tu correo</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $nombre }}, confirma tu correo
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Pulsa el botón para confirmar que esta dirección es tuya. Es el paso que falta para que sigamos con la
            revisión de tu cuenta.
        </p>

        <p style="margin:24px 0 0;">
            <a href="{{ $enlace }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;">
                Confirmar mi correo
            </a>
        </p>

        <p style="margin:22px 0 0;font-size:14px;line-height:1.65;color:#57534e;">
            Por aquí te avisaremos cuando aprobemos tu cuenta, cuando tu plan esté por vencer, y por aquí
            recuperas tu contraseña si algún día la olvidas. Por eso importa que llegue.
        </p>

        <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
            El enlace vence en {{ $minutos }} minutos. Si se te pasa, entra a la app y pide uno nuevo.
        </p>

        <p style="margin:18px 0 0;padding-top:18px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#a8a29e;">
            Si no te registraste, ignora este mensaje: sin confirmar, la cuenta no se activa.
            <br><br>
            ¿El botón no funciona? Copia esta dirección en tu navegador:
            <br>
            <span style="word-break:break-all;color:#78716c;">{{ $enlace }}</span>
        </p>
    </div>
</body>
</html>
