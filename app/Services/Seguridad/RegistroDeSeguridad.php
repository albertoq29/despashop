<?php

namespace App\Services\Seguridad;

use App\Mail\AvisoDeSeguridad;
use App\Models\SecurityEvent;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Único lugar por donde entra algo al registro de seguridad.
 *
 * Tres reglas guían este servicio:
 *
 *  1. **Nunca romper la petición.** Vigilar es secundario: si el registro
 *     falla, se anota en el log de la app y la petición sigue su curso.
 *  2. **Agrupar las repeticiones.** Mil intentos de contraseña son una fila
 *     con mil golpes, no mil filas que tapan todo lo demás.
 *  3. **Avisar poco y en serio.** Solo los hechos graves mandan correo, y
 *     uno por tipo cada `seguridad.espera_aviso` minutos.
 */
class RegistroDeSeguridad
{
    /**
     * Anota un hecho sospechoso y avisa al admin si es grave.
     *
     * @param  array<string, mixed>  $datos  Detalle para que el admin entienda qué pasó
     * @param  int|null  $usuarioId  Quién lo provocó; por defecto, el autenticado
     * @param  int|null  $comercioId  Comercio afectado, si el hecho es de uno
     * @param  string|null  $severidad  Para subir o bajar la gravedad del tipo
     */
    public function reportar(
        string $tipo,
        string $descripcion,
        array $datos = [],
        ?int $usuarioId = null,
        ?int $comercioId = null,
        ?string $severidad = null,
    ): ?SecurityEvent {
        try {
            $peticion = request();
            $ip = $peticion?->ip();
            $ruta = $peticion ? '/' . ltrim($peticion->path(), '/') : '';

            $evento = $this->agrupar($tipo, $ip, $usuarioId ??= auth()->id());

            if ($evento) {
                $evento->forceFill([
                    'hits' => $evento->hits + 1,
                    'last_seen_at' => now(),
                    'description' => Str::limit($descripcion, 250),
                    'properties' => $datos ?: null,
                ])->save();
            } else {
                $evento = SecurityEvent::create([
                    'type' => $tipo,
                    'severity' => $severidad ?? SecurityEvent::severidadDe($tipo),
                    'description' => Str::limit($descripcion, 250),
                    'user_id' => $usuarioId,
                    'tenant_id' => $comercioId,
                    'properties' => $datos ?: null,
                    'ip_address' => $ip,
                    'user_agent' => Str::limit((string) $peticion?->userAgent(), 250, ''),
                    'method' => $peticion?->method(),
                    'path' => Str::limit($ruta, 250, ''),
                    'last_seen_at' => now(),
                ]);
            }

            if ($evento->esGrave()) {
                $this->avisar($evento);
            }

            return $evento;
        } catch (Throwable $e) {
            // Vigilar no puede tumbar la app: queda constancia en el log y sigue
            Log::warning('No se pudo registrar un hecho de seguridad', [
                'tipo' => $tipo,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /** Cuántos hechos del tipo y la IP dados hay en los últimos minutos. */
    public function golpesRecientes(string $tipo, ?string $ip, int $minutos): int
    {
        return (int) SecurityEvent::where('type', $tipo)
            ->where('ip_address', $ip)
            ->where('created_at', '>=', now()->subMinutes($minutos))
            ->sum('hits');
    }

    /** Para la insignia del panel y el resumen del admin. */
    public function conteos(): array
    {
        $porSeveridad = SecurityEvent::sinRevisar()
            ->selectRaw('severity, count(*) as total')
            ->groupBy('severity')
            ->pluck('total', 'severity');

        return [
            'sin_revisar' => (int) $porSeveridad->sum(),
            'graves' => (int) ($porSeveridad[SecurityEvent::ALTA] ?? 0),
            'hoy' => SecurityEvent::where('created_at', '>=', now()->startOfDay())->count(),
        ];
    }

    /**
     * Hecho del mismo tipo, misma IP y mismo autor dentro de la ventana, que
     * el admin todavía no haya revisado: sumar ahí en vez de crear otra fila.
     */
    private function agrupar(string $tipo, ?string $ip, ?int $usuarioId): ?SecurityEvent
    {
        return SecurityEvent::sinRevisar()
            ->where('type', $tipo)
            ->where('ip_address', $ip)
            ->where('user_id', $usuarioId)
            ->where('created_at', '>=', now()->subMinutes((int) config('seguridad.ventana_agrupacion')))
            ->latest('id')
            ->first();
    }

    /**
     * Correo al admin. Se manda después de responder al navegador: el aviso
     * no puede hacer esperar a nadie ni fallar la petición si el SMTP está caído.
     */
    private function avisar(SecurityEvent $evento): void
    {
        if (! config('seguridad.avisos')) {
            return;
        }

        $destinos = $this->destinatarios();

        if ($destinos === []) {
            return;
        }

        // Una ráfaga del mismo tipo manda un correo, no cien
        $espera = (int) config('seguridad.espera_aviso');

        if (! Cache::add("seguridad:aviso:{$evento->type}", true, now()->addMinutes($espera))) {
            return;
        }

        $evento->forceFill(['notified_at' => now()])->save();

        $conteos = $this->conteos();

        dispatch(function () use ($destinos, $evento, $conteos) {
            try {
                Mail::to($destinos)->send(new AvisoDeSeguridad($evento, $conteos['sin_revisar']));
            } catch (Throwable $e) {
                Log::warning('No se pudo enviar el aviso de seguridad', ['error' => $e->getMessage()]);
            }
        })->afterResponse();
    }

    /**
     * A quién se avisa: el correo de seguridad de la plataforma si está
     * configurado y, si no, todos los administradores.
     *
     * @return list<string>
     */
    private function destinatarios(): array
    {
        $configurado = (string) Setting::platform('security_email', '');

        if (filter_var($configurado, FILTER_VALIDATE_EMAIL)) {
            return [$configurado];
        }

        return User::where('role', User::ROLE_ADMIN)
            ->whereNotNull('email')
            ->pluck('email')
            ->all();
    }
}
