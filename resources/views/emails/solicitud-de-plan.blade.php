{{-- Para el administrador: un comercio quiere cambiar de plan. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Solicitud de cambio de plan</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $negocio }} quiere cambiar de plan
        </h1>

        <div style="margin:20px 0 0;padding:14px 18px;background:#f5f5f4;border-radius:12px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                <span style="color:#78716c;">{{ $desde ?? 'Sin plan' }}</span>
                @if ($precioDesde !== null)
                    <span style="color:#a8a29e;">(${{ number_format((float) $precioDesde, 2) }})</span>
                @endif
                &nbsp;→&nbsp;
                <strong>{{ $hacia }}</strong>
                @if ($precioHacia !== null)
                    <strong>(${{ number_format((float) $precioHacia, 2) }})</strong>
                @endif
            </p>
        </div>

        @if ($mensaje)
            <div style="margin:18px 0 0;padding:16px 18px;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.04em;">
                    Lo que escribió
                </p>
                <p style="margin:8px 0 0;font-size:15px;line-height:1.6;">{{ $mensaje }}</p>
            </div>
        @endif

        @if ($vence)
            <p style="margin:20px 0 0;padding:14px 18px;background:{{ $diasParaVencer !== null && $diasParaVencer <= 7 ? '#fffbeb' : '#f5f5f4' }};border-radius:12px;font-size:15px;line-height:1.6;color:{{ $diasParaVencer !== null && $diasParaVencer <= 7 ? '#78350f' : '#44403c' }};">
                Su plan vence el <strong>{{ $vence->timezone(config('app.timezone'))->format('d/m/Y') }}</strong>@if ($diasParaVencer !== null), {{ $diasParaVencer <= 0 ? 'ya vencido' : ($diasParaVencer === 1 ? 'mañana' : "en {$diasParaVencer} días") }}@endif.
                El cambio entra en esa renovación, así que conviene responder antes.
            </p>
        @endif

        <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#57534e;">
            Correo: <a href="mailto:{{ $correo }}" style="color:#047857;">{{ $correo }}</a>
            @if ($telefono)
                <br>Teléfono: {{ $telefono }}
            @endif
        </p>

        <p style="margin:24px 0 0;">
            <a href="{{ $revisar }}"
               style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">
                Responder la solicitud
            </a>
        </p>

        @if ($pendientes > 1)
            <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#57534e;">
                Hay {{ $pendientes }} solicitudes de cambio esperando respuesta.
            </p>
        @endif

        <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
            Recibes este correo porque administras {{ config('app.name') }}.
        </p>
    </div>
</body>
</html>
