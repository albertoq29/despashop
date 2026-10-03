{{-- Tres cambios de estado. Lo primero que necesita saber el comercio es si
     su catálogo se ve o no, y qué tiene que hacer. --}}
@php
    $suspendida = $cambio === 'suspendida';
    $pendiente = $cambio === 'pendiente';
    $reactivada = $cambio === 'reactivada';

    $numero = preg_replace('/\D/', '', (string) ($contacto['whatsapp'] ?? ''));
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>El estado de tu cuenta cambió</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            @if ($suspendida)
                {{ $nombre }}, tu cuenta quedó suspendida
            @elseif ($pendiente)
                {{ $nombre }}, tu cuenta volvió a revisión
            @else
                {{ $nombre }}, tu cuenta está activa otra vez
            @endif
        </h1>

        @if ($reactivada)
            <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
                Ya está todo en orden. Tu catálogo volvió a estar disponible para tus clientes y puedes entrar a tu
                panel como siempre. Nada de lo tuyo se perdió: productos, facturas y diseño siguen tal cual los
                dejaste.
            </p>

            <div style="margin:22px 0 0;padding:16px 18px;background:#ecfdf5;border-radius:12px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#065f46;">
                    <strong>Tu catálogo se ve de nuevo.</strong> Si lo tenías publicado, tus clientes ya pueden
                    abrirlo.
                </p>
            </div>
        @else
            <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
                @if ($suspendida)
                    Suspendimos tu cuenta, así que <strong>tu catálogo público dejó de verse</strong> y no puedes
                    usar la app mientras tanto.
                @else
                    Tu cuenta pasó de nuevo a revisión, así que <strong>tu catálogo público dejó de verse</strong>
                    hasta que volvamos a activarla.
                @endif
            </p>

            <div style="margin:22px 0 0;padding:16px 18px;background:#fffbeb;border-radius:12px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#78350f;">
                    <strong>Tu información está intacta.</strong> Productos, facturas, imágenes y el diseño de tu
                    catálogo siguen guardados. Esto no borra nada.
                </p>
            </div>

            <p style="margin:22px 0 0;font-size:15px;line-height:1.65;">
                @if ($suspendida)
                    Si crees que es un error o quieres resolverlo, escríbenos y lo revisamos contigo.
                @else
                    Te avisaremos en cuanto la revisión termine. Si tienes dudas, escríbenos.
                @endif
            </p>
        @endif

        <p style="margin:24px 0 0;">
            @if ($reactivada)
                <a href="{{ $panel }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                    Entrar a mi panel
                </a>
            @elseif ($numero)
                <a href="https://wa.me/{{ $numero }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                    Escribirnos por WhatsApp
                </a>
            @elseif (! empty($contacto['email']))
                <a href="mailto:{{ $contacto['email'] }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                    Escribirnos
                </a>
            @endif

            @if (! $reactivada)
                <a href="{{ $panel }}" style="display:inline-block;margin-left:8px;color:#047857;text-decoration:none;padding:12px 8px;font-size:15px;font-weight:600;">
                    Ver mi cuenta
                </a>
            @endif
        </p>

        @if ($catalogo)
            <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e7e5e4;font-size:13px;color:#a8a29e;">
                Tu catálogo: {{ $catalogo }}
            </p>
        @endif
    </div>
</body>
</html>
