{{-- Aviso al administrador. Es un correo de trabajo: todo lo necesario para
     decidir sin entrar al panel, y un botón para hacerlo. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nueva solicitud de cuenta</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $negocio }} pidió una cuenta
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Está esperando aprobación. Hasta que la revises, no puede usar la app.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0;width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;color:#78716c;width:38%;">Negocio</td>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;"><strong>{{ $negocio }}</strong></td>
            </tr>
            <tr>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;color:#78716c;">Persona</td>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;">{{ $persona }}</td>
            </tr>
            <tr>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;color:#78716c;">Dirección pedida</td>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;">/{{ $usuario }}</td>
            </tr>
            <tr>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;color:#78716c;">Correo</td>
                <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;word-break:break-all;">{{ $correo }}</td>
            </tr>
            @if ($telefono)
                <tr>
                    <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;color:#78716c;">Teléfono</td>
                    <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;">{{ $telefono }}</td>
                </tr>
            @endif
            @if ($plan)
                <tr>
                    <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;color:#78716c;">Plan solicitado</td>
                    <td style="padding:9px 0;border-bottom:1px solid #f5f5f4;">{{ $plan }}</td>
                </tr>
            @endif
            <tr>
                <td style="padding:9px 0;color:#78716c;">Fecha</td>
                <td style="padding:9px 0;">{{ $pedidoEl?->timezone(config('app.timezone'))->format('d/m/Y H:i') }}</td>
            </tr>
        </table>

        @if ($mensaje)
            <div style="margin:20px 0 0;padding:14px 16px;background:#fafaf9;border-left:3px solid #d6d3d1;border-radius:0 8px 8px 0;">
                <p style="margin:0;font-size:13px;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">
                    Lo que escribió
                </p>
                <p style="margin:6px 0 0;font-size:14px;line-height:1.65;white-space:pre-line;">{{ $mensaje }}</p>
            </div>
        @endif

        <p style="margin:24px 0 0;">
            <a href="{{ $revisar }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                Revisar la solicitud
            </a>
        </p>

        @if ($pendientes > 1)
            <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                Hay <strong>{{ $pendientes }} solicitudes</strong> esperando revisión.
            </p>
        @endif

        <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e7e5e4;font-size:13px;line-height:1.6;color:#a8a29e;">
            Recibes este aviso porque tu cuenta es de administrador.
        </p>
    </div>
</body>
</html>
