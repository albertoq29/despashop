{{-- Un mensaje que escribe el administrador a un grupo de comercios. El
     cuerpo lo redacta él, así que aquí solo va el marco de siempre: la
     marca, el texto en párrafos y, si lo quiso, un botón. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $titulo }}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;">

        <img src="{{ url('/marca/logo-verde.svg') }}" alt="{{ config('app.name') }}" height="22" style="height:22px;width:auto;">

        <h1 style="margin:22px 0 0;font-size:21px;line-height:1.3;">
            {{ $titulo }}
        </h1>

        {{-- Cada línea en blanco del admin es un párrafo. Se escapa todo:
             lo que escriba es texto, nunca marcado. --}}
        @foreach ($parrafos as $parrafo)
            <p style="margin:14px 0 0;font-size:15px;line-height:1.65;">{{ $parrafo }}</p>
        @endforeach

        @if ($enlace && $textoDelEnlace)
            <p style="margin:26px 0 0;">
                <a href="{{ $enlace }}" style="display:inline-block;padding:13px 24px;background:#047857;color:#ffffff;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
                    {{ $textoDelEnlace }}
                </a>
            </p>
        @endif

        @if ($catalogo)
            <div style="margin:24px 0 0;padding:16px 18px;background:#ecfdf5;border-radius:12px;">
                <p style="margin:0;font-size:13px;color:#047857;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">
                    Tu catálogo
                </p>
                <p style="margin:6px 0 0;font-size:15px;line-height:1.5;color:#064e3b;word-break:break-all;">
                    <strong>{{ $catalogo }}</strong>
                </p>
            </div>
        @endif

        <hr style="margin:26px 0 0;border:none;border-top:1px solid #e7e5e4;">

        @php
            $numero = \App\Support\Whatsapp::numero($contacto['whatsapp'] ?? null);
        @endphp

        @if ($numero || ! empty($contacto['email']))
            <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                ¿Alguna duda? Escríbenos
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

        <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
            Recibes este correo porque tienes una cuenta en {{ config('app.name') }}.
        </p>
    </div>
</body>
</html>
