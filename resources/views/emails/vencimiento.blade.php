{{-- Aviso de plan vencido. Lo importante arriba: qué pasó y hasta cuándo. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu plan venció</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $nombre }}, tu catálogo dejó de verse
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Tu plan {{ $plan ? $plan . ' ' : '' }}venció el
            <strong>{{ $vencio?->timezone(config('app.timezone'))->format('d/m/Y') }}</strong>, así que tu catálogo
            público ya no está disponible para tus clientes. Tus productos, tus facturas y tu diseño siguen ahí:
            entras a tu panel y los ves como siempre.
        </p>

        <div style="margin:22px 0 0;padding:16px 18px;background:{{ $dias <= 3 ? '#fef2f2' : '#fffbeb' }};border-radius:12px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:{{ $dias <= 3 ? '#7f1d1d' : '#78350f' }};">
                @if ($dias <= 0)
                    <strong>Hoy vence el plazo.</strong> Si no renuevas, tus datos se eliminan hoy mismo.
                @elseif ($dias === 1)
                    <strong>Queda 1 día.</strong> Si no renuevas, el {{ $borradoEl?->format('d/m/Y') }} se eliminan tus datos y no podremos recuperarlos.
                @else
                    <strong>Quedan {{ $dias }} días.</strong> Si no renuevas antes del
                    {{ $borradoEl?->format('d/m/Y') }}, se eliminan tus datos y no podremos recuperarlos.
                @endif
            </p>
        </div>

        <p style="margin:22px 0 0;font-size:15px;line-height:1.65;">
            Renovar toma un minuto: escríbenos y volvemos a activarte. Todo queda como lo dejaste.
        </p>

        <p style="margin:24px 0 0;">
            @php
                $numero = preg_replace('/\D/', '', (string) ($contacto['whatsapp'] ?? ''));
            @endphp

            @if ($numero)
                <a href="https://wa.me/{{ $numero }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                    Renovar por WhatsApp
                </a>
            @elseif (! empty($contacto['email']))
                <a href="mailto:{{ $contacto['email'] }}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;">
                    Escribirnos para renovar
                </a>
            @endif

            <a href="{{ $panel }}" style="display:inline-block;margin-left:8px;color:#047857;text-decoration:none;padding:12px 8px;font-size:15px;font-weight:600;">
                Entrar a mi panel
            </a>
        </p>

        <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
            Antes de que venza el plazo puedes descargar todo lo tuyo desde tu panel, en
            «Mi cuenta → Descargar mis datos».
        </p>

        @if ($catalogo)
            <p style="margin:10px 0 0;font-size:13px;color:#a8a29e;">Tu catálogo: {{ $catalogo }}</p>
        @endif
    </div>
</body>
</html>
