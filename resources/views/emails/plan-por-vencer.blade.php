{{-- Aviso antes de que venza. Lo que se pierde, arriba y en concreto. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu plan está por vencer</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            @if ($dias <= 0)
                {{ $nombre }}, hoy vence tu plan
            @elseif ($dias === 1)
                {{ $nombre }}, mañana vence tu plan
            @else
                {{ $nombre }}, tu plan vence en {{ $dias }} días
            @endif
        </h1>

        <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">
            Tu plan {{ $plan ? $plan . ' ' : '' }}vence el
            <strong>{{ $vence?->timezone(config('app.timezone'))->format('d/m/Y') }}</strong>. Te escribimos con
            tiempo para que no te agarre de sorpresa: todavía está todo funcionando y no hay nada que lamentar.
        </p>

        <div style="margin:22px 0 0;padding:16px 18px;background:{{ $dias <= 1 ? '#fffbeb' : '#f5f5f4' }};border-radius:12px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:{{ $dias <= 1 ? '#78350f' : '#44403c' }};">
                <strong>Qué pasa si no renuevas:</strong> ese día tu catálogo deja de verse para tus clientes. El
                enlace que les pasaste deja de abrir.
            </p>
            <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:{{ $dias <= 1 ? '#78350f' : '#44403c' }};">
                Tus productos, tus facturas y tu diseño no se tocan: siguen en tu panel y vuelven en cuanto renueves.
                Después de {{ $gracia }} días sin renovar sí se eliminan, y eso no tiene vuelta atrás.
            </p>
        </div>

        <p style="margin:22px 0 0;font-size:15px;line-height:1.65;">
            Renovar toma un minuto: escríbenos y seguimos. Si quieres cambiar de plan, también es el momento —el
            cambio entra justo en esta renovación.
        </p>

        @php
            $numero = \App\Support\Whatsapp::numero($contacto['whatsapp'] ?? null);
        @endphp

        @if ($numero)
            <p style="margin:24px 0 0;">
                <a href="https://wa.me/{{ $numero }}?text={{ rawurlencode('Hola, quiero renovar mi plan de ' . $nombre . '.') }}"
                   style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">
                    Quiero renovar
                </a>
            </p>
        @endif

        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#57534e;">
            Tu catálogo: <a href="{{ $catalogo }}" style="color:#047857;">{{ preg_replace('#^https?://#', '', $catalogo) }}</a><br>
            Tu plan en el panel: <a href="{{ $panel }}" style="color:#047857;">{{ preg_replace('#^https?://#', '', $panel) }}</a>
        </p>

        @if (! empty($contacto['email']))
            <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#57534e;">
                ¿Dudas? Escríbenos a
                <a href="mailto:{{ $contacto['email'] }}" style="color:#047857;">{{ $contacto['email'] }}</a>.
            </p>
        @endif

        <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
            Recibes este correo porque tienes una cuenta en {{ config('app.name') }}.
        </p>
    </div>
</body>
</html>
