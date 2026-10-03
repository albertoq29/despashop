{{-- Aviso de seguridad al administrador. Sin imágenes ni estilos raros:
     tiene que leerse igual en Gmail, en el teléfono y en texto plano. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $etiqueta }}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:24px;">

        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c;font-weight:600;">
            Actividad sospechosa
        </p>

        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">{{ $etiqueta }}</h1>

        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">{{ $evento->description }}</p>

        @if ($pista)
            <p style="margin:0 0 18px;padding:12px 14px;background:#fef2f2;border-radius:10px;font-size:14px;line-height:1.6;color:#7f1d1d;">
                {{ $pista }}
            </p>
        @endif

        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;">
            <tbody>
                @foreach ([
                    'Cuándo' => $evento->created_at->timezone(config('app.timezone'))->format('d/m/Y H:i'),
                    'Cuenta' => $quien,
                    'Dirección IP' => $evento->ip_address ?: 'desconocida',
                    'Petición' => trim(($evento->method ?: '') . ' ' . ($evento->path ?: '')) ?: '—',
                    'Repeticiones' => $evento->hits,
                ] as $titulo => $valor)
                    <tr>
                        <td style="padding:6px 0;color:#78716c;width:140px;vertical-align:top;">{{ $titulo }}</td>
                        <td style="padding:6px 0;vertical-align:top;">{{ $valor }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        @if (! empty($evento->properties))
            <p style="margin:18px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#78716c;">Detalle</p>
            <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#44403c;">
                @foreach ($evento->properties as $clave => $valor)
                    <li>{{ $clave }}: {{ is_scalar($valor) ? $valor : json_encode($valor, JSON_UNESCAPED_UNICODE) }}</li>
                @endforeach
            </ul>
        @endif

        <p style="margin:24px 0 0;">
            <a href="{{ $enlace }}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:600;">
                Ver el registro de seguridad
            </a>
        </p>

        @if ($sinRevisar > 1)
            <p style="margin:14px 0 0;font-size:13px;color:#78716c;">
                Tienes {{ $sinRevisar }} hechos sin revisar en el registro.
            </p>
        @endif

        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
            Este aviso se manda una vez por hora como máximo para cada tipo de hecho. Lo demás queda anotado en el registro sin avisar.
        </p>
    </div>
</body>
</html>
