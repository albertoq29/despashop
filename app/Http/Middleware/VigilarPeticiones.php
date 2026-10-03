<?php

namespace App\Http\Middleware;

use App\Services\Seguridad\RegistroDeSeguridad;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mira cómo terminó cada petición y anota lo que huele mal.
 *
 * Trabaja sobre la respuesta ya hecha, así que no cambia nada de lo que ve
 * el visitante: solo consulta la base cuando el código de estado dice que
 * algo se rechazó (403, 404 sospechoso, 419, 429) o cuando la dirección
 * trae una carga rara.
 */
class VigilarPeticiones
{
    /** Rutas que solo busca quien anda probando agujeros conocidos. */
    private const SONDEOS = '#(^|/)(\.env[.a-z]*|\.git|\.svn|\.aws|\.ssh|\.htaccess|\.vscode|wp-[a-z-]+|wordpress|phpmyadmin|phpinfo|myadmin|pma|adminer|xmlrpc\.php|cgi-bin|actuator|solr|struts|jenkins|eval-stdin|shell|backup|dump|credentials|secrets|config\.(json|php|yml))(/|$)#i';

    /** Extensiones que esta app nunca sirve. */
    private const EXTENSIONES = '#\.(php|phtml|asp|aspx|jsp|cgi|sql|bak|old|swp|zip|rar|tar|gz|7z|ini|log|yml|yaml|pem|key)$#i';

    /** Cargas de inyección en la dirección o en la consulta. */
    private const INYECCIONES = '#(union\s+select|information_schema|sleep\s*\(|benchmark\s*\(|or\s+1\s*=\s*1|<script|javascript:|onerror\s*=|\.\./\.\./|etc/passwd|php://|data://text|base64_decode\s*\()#i';

    public function __construct(private RegistroDeSeguridad $registro)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $respuesta = $next($request);

        try {
            $this->revisar($request, $respuesta->getStatusCode());
        } catch (\Throwable $e) {
            // Vigilar no puede cambiar lo que recibe el visitante
            report($e);
        }

        return $respuesta;
    }

    private function revisar(Request $request, int $estado): void
    {
        // El propio panel de seguridad no se vigila a sí mismo
        if ($request->routeIs('admin.seguridad.*')) {
            return;
        }

        $direccion = rawurldecode($request->getRequestUri());

        if (preg_match(self::INYECCIONES, $direccion)) {
            $this->registro->reportar(
                'inyeccion.intento',
                'La dirección pedida traía una carga de inyección',
                ['direccion' => Str::limit($direccion, 400), 'respuesta' => $estado] + $this->quienEs($request),
            );

            return;
        }

        match ($estado) {
            403 => $this->accesoDenegado($request),
            404 => $this->quizaSondeo($request),
            419 => $this->registro->reportar(
                'peticion.sin_token',
                'Se envió un formulario sin token válido',
                $this->quienEs($request),
            ),
            429 => $this->registro->reportar(
                'peticion.rafaga',
                'Se frenó una ráfaga de peticiones a ' . $this->ruta($request),
                ['ruta' => $request->route()?->getName()] + $this->quienEs($request),
            ),
            default => null,
        };
    }

    /**
     * Un 403 en el panel de plataforma o sobre datos de otro comercio no es
     * un descuido: es alguien tanteando dónde termina su permiso.
     */
    private function accesoDenegado(Request $request): void
    {
        $usuario = $request->user();
        $nombre = $usuario ? ($usuario->business_name ?: $usuario->name) : 'Un visitante sin cuenta';
        $datos = ['ruta' => $this->ruta($request)] + $this->quienEs($request);

        if ($request->is('admin', 'admin/*')) {
            $this->registro->reportar(
                'acceso.admin',
                "{$nombre} pidió una página del panel de administración",
                $datos,
                comercioId: $usuario?->isTenant() ? $usuario->id : null,
            );

            return;
        }

        if ($usuario?->isTenant()) {
            $this->registro->reportar(
                'acceso.ajeno',
                "{$nombre} intentó abrir un registro que no es de su comercio",
                $datos,
                comercioId: $usuario->id,
            );

            return;
        }

        $this->registro->reportar('acceso.denegado', 'Se rechazó una petición por permisos', $datos);
    }

    /**
     * La mayoría de los 404 son direcciones mal copiadas. Se anotan dos casos:
     * el que busca archivos que esta app nunca tuvo, y el comercio que pide
     * por id un registro que no está en su cuenta.
     */
    private function quizaSondeo(Request $request): void
    {
        $ruta = '/' . ltrim($request->path(), '/');

        if (preg_match(self::SONDEOS, $ruta) || preg_match(self::EXTENSIONES, $ruta)) {
            $this->registro->reportar(
                'sondeo.rutas',
                "Se pidió {$ruta}, una ruta que esta plataforma no tiene",
                ['ruta' => $ruta] + $this->quienEs($request),
            );

            return;
        }

        $this->quizaRegistroAjeno($request);
    }

    /**
     * El aislamiento por comercio contesta "no existe" cuando el id es de otro,
     * así que un 404 sobre una ruta del panel con un id numérico es la huella
     * de alguien cambiando números en la dirección. Uno solo puede ser un
     * enlace viejo; varios seguidos ya son un escaneo y suben a grave.
     */
    private function quizaRegistroAjeno(Request $request): void
    {
        $usuario = $request->user();
        $rutaDeLaApp = $request->route();

        if (! $usuario?->isTenant() || $rutaDeLaApp === null) {
            return;
        }

        $ids = array_filter($rutaDeLaApp->parameters(), fn ($valor) => is_numeric($valor));

        if ($ids === []) {
            return;
        }

        $nombre = $usuario->business_name ?: $usuario->name;

        $this->registro->reportar(
            'acceso.inexistente',
            "{$nombre} pidió un registro que no existe en su cuenta",
            ['ruta' => $this->ruta($request), 'ids' => implode(', ', $ids)] + $this->quienEs($request),
            comercioId: $usuario->id,
        );

        $intentos = $this->registro->golpesRecientes(
            'acceso.inexistente',
            $request->ip(),
            (int) config('seguridad.ventana_fuerza_bruta'),
        );

        if ($intentos >= (int) config('seguridad.umbral_fuerza_bruta')) {
            $this->registro->reportar(
                'acceso.ajeno',
                "{$nombre} probó {$intentos} registros que no son de su comercio",
                ['intentos' => $intentos, 'ultima_ruta' => $this->ruta($request)],
                comercioId: $usuario->id,
            );
        }
    }

    private function ruta(Request $request): string
    {
        return $request->method() . ' /' . ltrim($request->path(), '/');
    }

    /** @return array<string, string> */
    private function quienEs(Request $request): array
    {
        $referente = (string) $request->headers->get('referer');

        return $referente === '' ? [] : ['venia_de' => Str::limit($referente, 200)];
    }
}
