{{-- En qué quedó el cambio de plan que pidió el comercio. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu cambio de plan</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            @if ($momento === 'aplicado')
                {{ $nombre }}, ya estás en el plan {{ $hacia }}
            @elseif ($momento === 'aceptado')
                {{ $nombre }}, aprobamos tu cambio de plan
            @else
                {{ $nombre }}, sobre tu cambio de plan
            @endif
        </h1>

        <div style="margin:20px 0 0;padding:14px 18px;background:#f5f5f4;border-radius:12px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                <span style="color:#78716c;">{{ $desde ?? 'Sin plan' }}</span>
                &nbsp;→&nbsp;
                <strong>{{ $hacia }}</strong>
            </p>
        </div>

        @if ($momento === 'aplicado')
            <p style="margin:20px 0 0;font-size:15px;line-height:1.65;">
                El cambio ya está hecho. Desde este momento tu catálogo corre con los límites del plan
                <strong>{{ $hacia }}</strong>, y no hay nada más que hacer de tu parte.
            </p>
        @elseif ($momento === 'aceptado')
            {{-- La fecha se arma antes: un @if partido en varias líneas dentro
                 de la frase deja huecos delante de la coma y los dos puntos. --}}
            @php
                $cuando = $vence ? ', el ' . $vence->timezone(config('app.timezone'))->format('d/m/Y') : '';
            @endphp

            <p style="margin:20px 0 0;font-size:15px;line-height:1.65;">
                Todo listo de nuestro lado. El cambio entra en tu próxima renovación{{ $cuando }}: así no pierdes
                los días que ya pagaste. Hasta entonces sigues con lo que tienes ahora, sin que nada se mueva.
            </p>
        @else
            <p style="margin:20px 0 0;font-size:15px;line-height:1.65;">
                Esta vez no pudimos hacer el cambio. Tu plan actual sigue igual y tu catálogo no se toca.
            </p>
        @endif

        @if ($nota)
            <div style="margin:20px 0 0;padding:16px 18px;background:#fffbeb;border-radius:12px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#78350f;text-transform:uppercase;letter-spacing:0.04em;">
                    Nuestra respuesta
                </p>
                <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#78350f;">{{ $nota }}</p>
            </div>
        @endif

        <p style="margin:24px 0 0;">
            <a href="{{ $panel }}"
               style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">
                Ver mi plan
            </a>
        </p>

        @php
            $numero = preg_replace('/\D/', '', (string) ($contacto['whatsapp'] ?? ''));
        @endphp

        @if ($numero || ! empty($contacto['email']))
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#57534e;">
                ¿Quieres hablarlo?
                @if ($numero)
                    Escríbenos por <a href="https://wa.me/{{ $numero }}" style="color:#047857;">WhatsApp</a>@if (! empty($contacto['email'])) o @endif
                @endif
                @if (! empty($contacto['email']))
                    a <a href="mailto:{{ $contacto['email'] }}" style="color:#047857;">{{ $contacto['email'] }}</a>
                @endif
                .
            </p>
        @endif

        <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
            Recibes este correo porque pediste un cambio de plan en {{ config('app.name') }}.
        </p>
    </div>
</body>
</html>
