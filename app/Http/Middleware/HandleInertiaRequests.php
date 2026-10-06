<?php

namespace App\Http\Middleware;

use App\Models\PlanChangeRequest;
use App\Models\Setting;
use App\Models\Suggestion;
use App\Models\User;
use App\Services\Seguridad\RegistroDeSeguridad;
use App\Support\Tenancy;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'plataforma' => [
                'marca' => fn () => Setting::platform('brand_name', config('app.name')),
            ],
            // Cuando el admin inspecciona una cuenta, la interfaz debe decirlo
            // en todo momento y ofrecer la salida.
            'inspeccion' => fn () => $this->inspeccion($request),
            // Aviso de vencimiento para todo el panel del comercio
            'avisoDePlan' => fn () => $this->avisoDePlan($request),
            // Insignia del registro de seguridad, solo para el admin
            'seguridad' => fn () => $this->seguridad($request),
            // Buzón de sugerencias: pendientes para el admin, respuestas para el comercio
            'sugerencias' => fn () => $this->sugerencias($request),
            // Cambios de plan sin responder, solo para el admin
            'cambiosDePlan' => fn () => $this->cambiosDePlan($request),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info'    => fn () => $request->session()->get('info'),
                // `status` lo usan los avisos de autenticación del framework
                // (por ejemplo, «te reenviamos el enlace de verificación»)
                'status'  => fn () => $request->session()->get('status'),
            ],
        ];
    }

    /**
     * Solo cuando hace falta avisar: plan por vencer o vencido. Usa los
     * campos del usuario, sin contar nada, porque corre en cada página.
     */
    private function avisoDePlan(Request $request): ?array
    {
        $user = $request->user();

        if (! $user || $request->routeIs('admin.*')) {
            return null;
        }

        $tenantId = app(Tenancy::class)->id();
        $comercio = $tenantId === $user->id ? $user : ($tenantId ? User::find($tenantId) : null);

        if (! $comercio?->isTenant() || ! $comercio->isApproved()) {
            return null;
        }

        $estado = $comercio->estadoDelPlan();

        if (! in_array($estado, ['por_vencer', 'vencido'], true)) {
            return null;
        }

        return [
            'estado' => $estado,
            'vence' => $comercio->plan_expires_at->toDateString(),
            'dias_restantes' => $comercio->diasParaVencer(),
            // Cuando ya venció, lo que importa es cuánto falta para perder los datos
            'borrado' => $comercio->fechaDeBorrado()?->toDateString(),
            'dias_para_borrado' => $comercio->diasParaBorrado(),
            'plan' => $comercio->plan?->name,
            'contacto' => [
                'whatsapp' => Setting::platform('support_whatsapp'),
                'email' => Setting::platform('support_email'),
            ],
        ];
    }

    /**
     * Cuántos hechos sospechosos esperan revisión. Solo se cuenta para el
     * admin y dentro de su panel: el comercio no ve nada de esto.
     */
    private function seguridad(Request $request): ?array
    {
        if (! $request->user()?->isAdmin() || ! $request->routeIs('admin.*')) {
            return null;
        }

        return app(RegistroDeSeguridad::class)->conteos();
    }

    /**
     * Dos insignias distintas con el mismo nombre: al admin le dice cuántos
     * mensajes tiene sin leer; al comercio, cuántas respuestas le esperan.
     */
    private function sugerencias(Request $request): ?array
    {
        $user = $request->user();

        if ($user?->isAdmin() && $request->routeIs('admin.*')) {
            return app(Tenancy::class)->withoutTenancy(fn () => [
                'sin_leer' => Suggestion::sinLeer()->count(),
                'abiertas' => Suggestion::abiertas()->count(),
            ]);
        }

        if (! $user?->isTenant() || ! $user->isApproved()) {
            return null;
        }

        return ['respuestas' => Suggestion::conRespuestaSinVer()->count()];
    }

    /**
     * Cuántas solicitudes de cambio de plan esperan respuesta.
     *
     * Sin esto se quedan olvidadas: nadie entra a esa pantalla por gusto, y
     * un cambio sin responder a tiempo se pierde la renovación.
     */
    private function cambiosDePlan(Request $request): ?array
    {
        if (! $request->user()?->isAdmin() || ! $request->routeIs('admin.*')) {
            return null;
        }

        return app(Tenancy::class)->withoutTenancy(fn () => [
            'pendientes' => PlanChangeRequest::pendientes()->count(),
        ]);
    }

    private function inspeccion(Request $request): ?array
    {
        $user = $request->user();

        if (! $user?->isAdmin()) {
            return null;
        }

        $tenantId = app(Tenancy::class)->id();

        if ($tenantId === null) {
            return null;
        }

        $comercio = User::find($tenantId);

        return $comercio === null ? null : [
            'id' => $comercio->id,
            'nombre' => $comercio->business_name ?: $comercio->name,
            'username' => $comercio->username,
        ];
    }
}
