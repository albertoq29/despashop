<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\CambioDePlan;
use App\Mail\CuentaAprobada;
use App\Mail\EstadoDeCuenta;
use App\Models\ActivityLog;
use App\Models\CatalogTheme;
use App\Models\CatalogVisit;
use App\Models\Factura;
use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Services\PlanDelComercio;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Gestión de comercios: revisión manual de solicitudes, estado de la cuenta,
 * plan asignado e inspección de lo que cada uno tiene cargado.
 */
class TenantController extends Controller
{
    public function __construct(
        private Tenancy $tenancy,
        private CatalogProvisioner $provisioner,
    ) {
    }

    public function index(Request $request): Response
    {
        $filtros = $request->only(['estado', 'buscar', 'plan_id']);

        $comercios = $this->tenancy->withoutTenancy(function () use ($filtros) {
            return User::tenants()
                ->with('plan:id,name,color', 'requestedPlan:id,name')
                ->withCount(['products', 'facturas'])
                ->when($filtros['estado'] ?? null, fn ($q, $estado) => $q->where('status', $estado))
                ->when($filtros['plan_id'] ?? null, fn ($q, $plan) => $q->where('plan_id', $plan))
                ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                    $q->where(function ($sub) use ($buscar) {
                        $sub->where('name', 'like', "%{$buscar}%")
                            ->orWhere('business_name', 'like', "%{$buscar}%")
                            ->orWhere('username', 'like', "%{$buscar}%")
                            ->orWhere('email', 'like', "%{$buscar}%");
                    });
                })
                ->latest()
                ->paginate(20)
                ->withQueryString();
        });

        // Vigencia calculada aquí, con la zona horaria de la app, y no en el navegador
        $planDelComercio = app(PlanDelComercio::class);
        $comercios->getCollection()->each(function (User $comercio) use ($planDelComercio) {
            $comercio->setAttribute('vigencia', $planDelComercio->vigencia($comercio));
        });

        return Inertia::render('Admin/Comercios/Index', [
            'comercios' => $comercios,
            'planes' => Plan::orderBy('display_order')->get(['id', 'name', 'color']),
            'filtros' => $filtros,
            'conteos' => $this->tenancy->withoutTenancy(fn () => [
                'pending' => User::tenants()->pending()->count(),
                'approved' => User::tenants()->approved()->count(),
                'rejected' => User::tenants()->where('status', User::STATUS_REJECTED)->count(),
                'suspended' => User::tenants()->where('status', User::STATUS_SUSPENDED)->count(),
            ]),
        ]);
    }

    /**
     * Ficha completa de un comercio: sus datos, su catálogo y su actividad.
     */
    public function show(User $comercio, PlanDelComercio $planDelComercio): Response
    {
        abort_unless($comercio->isTenant(), 404);

        $detalle = $this->tenancy->forTenant($comercio->id, function () use ($comercio) {
            $desde = now()->subDays(30);

            return [
                'productos' => Product::with('images')->latest()->limit(12)->get(),
                'productos_total' => Product::count(),
                'facturas_total' => Factura::count(),
                'ventas_usd' => round((float) Factura::where('status', 'confirmed')->sum('total_usd'), 2),
                'visitas_30d' => (int) CatalogVisit::where('user_id', $comercio->id)
                    ->where('visited_on', '>=', $desde->toDateString())
                    ->sum('visits'),
                'ultimas_facturas' => Factura::latest()->limit(8)->get(['id', 'client_name', 'total_usd', 'status', 'created_at']),
            ];
        });

        $theme = CatalogTheme::withoutGlobalScope('tenant')->where('user_id', $comercio->id)->first();

        return Inertia::render('Admin/Comercios/Show', [
            'comercio' => $comercio->load('plan', 'requestedPlan', 'planPendiente', 'reviewer:id,name'),
            'theme' => $theme,
            'catalogUrl' => $comercio->catalogUrl(),
            'metricas' => $detalle,
            'planes' => Plan::orderBy('display_order')->get(),
            'actividad' => ActivityLog::where('user_id', $comercio->id)->latest()->limit(30)->get(),
            // El admin ve lo mismo que el comercio en su panel: vigencia y uso de límites
            'resumenPlan' => $planDelComercio->resumen($comercio),
            'venceSugerido' => now()->addMonthNoOverflow()->toDateString(),
            // Lo que el comercio pidió y sigue abierto, para resolverlo aquí
            'solicitudDePlan' => $comercio->solicitudesDePlan()
                ->whereIn('status', [PlanChangeRequest::PENDIENTE, PlanChangeRequest::ACEPTADA])
                ->with(['planActual:id,name', 'planPedido:id,name'])
                ->first(),
        ]);
    }

    public function approve(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        $validated = $request->validate([
            'plan_id' => ['nullable', 'exists:plans,id'],
            'plan_expires_at' => ['nullable', 'date', 'after_or_equal:today'],
            'sin_vencimiento' => ['boolean'],
        ]);

        // Una cuenta recién aprobada tiene un mes de plan, salvo que el admin
        // elija otra fecha o la deje sin vencimiento al aceptarla.
        $comercio->iniciarPeriodoDePlan(
            isset($validated['plan_expires_at']) ? Carbon::parse($validated['plan_expires_at']) : null,
            $request->boolean('sin_vencimiento'),
        );

        $comercio->fill([
            'status' => User::STATUS_APPROVED,
            'plan_id' => $validated['plan_id'] ?? $comercio->requested_plan_id,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'rejection_reason' => null,
        ])->save();

        // Deja el catálogo y la plantilla de factura listos para usar
        $this->provisioner->provision($comercio);

        ActivityLog::record(
            'comercio.aprobado',
            'Aprobó la cuenta de ' . ($comercio->business_name ?: $comercio->name),
            ['username' => $comercio->username],
            $comercio
        );

        $this->avisarAprobacion($comercio);

        return back()->with('success', 'Cuenta aprobada. Su catálogo ya está disponible en /' . $comercio->username);
    }

    /**
     * Le manda al comercio su correo de bienvenida.
     *
     * Después de responder y dentro de un try: que el servidor de correo
     * esté caído no puede impedir que una cuenta quede aprobada, ni dejar
     * al administrador mirando un error cuando el trabajo ya se hizo.
     */
    private function avisarAprobacion(User $comercio): void
    {
        $this->enviar($comercio, new CuentaAprobada($comercio));
    }

    /**
     * Le manda un correo al comercio sin que un fallo le afecte.
     *
     * Después de responder y dentro de un try: que el servidor de correo
     * esté caído no puede impedir que una cuenta quede aprobada o
     * suspendida, ni dejar al administrador mirando un error cuando el
     * trabajo ya se hizo.
     */
    private function enviar(User $comercio, Mailable $correo): void
    {
        if (! filter_var($comercio->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        dispatch(function () use ($comercio, $correo) {
            try {
                Mail::to($comercio->email)->send($correo);
            } catch (\Throwable $e) {
                Log::warning('No se pudo avisar al comercio', [
                    'comercio' => $comercio->id,
                    'correo' => $correo::class,
                    'error' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }

    public function reject(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $comercio->update([
            'status' => User::STATUS_REJECTED,
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        ActivityLog::record(
            'comercio.rechazado',
            'Rechazó la solicitud de ' . ($comercio->business_name ?: $comercio->name),
            ['motivo' => $validated['rejection_reason']],
            $comercio
        );

        return back()->with('success', 'Solicitud rechazada.');
    }

    public function updateStatus(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected,suspended'],
        ]);

        $anterior = $comercio->status;

        // Activar una cuenta pendiente o rechazada también es aprobarla: abre
        // su mes de plan. Reactivar una suspendida conserva las fechas que tenía.
        $seAprueba = $validated['status'] === User::STATUS_APPROVED
            && in_array($comercio->status, [User::STATUS_PENDING, User::STATUS_REJECTED], true);

        $planId = $seAprueba ? ($comercio->plan_id ?? $comercio->requested_plan_id) : $comercio->plan_id;

        // La prueba gratis pone las fechas ella misma, y son otras
        $prueba = $seAprueba ? $this->aplicarOfertaDePrueba($comercio, $planId) : null;

        if ($seAprueba && ! $prueba && ! ($comercio->plan_expires_at?->isFuture())) {
            $comercio->iniciarPeriodoDePlan();
        }

        $comercio->fill([
            'status' => $validated['status'],
            'plan_id' => $planId,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ])->save();

        ActivityLog::record(
            'comercio.estado',
            'Cambió el estado de ' . ($comercio->business_name ?: $comercio->name) . ' a ' . $validated['status'],
            $prueba ? ['prueba_gratis' => $prueba->name, 'dias' => $prueba->diasDePrueba()] : [],
            $comercio
        );

        $this->avisarCambioDeEstado($comercio, $anterior);

        if ($prueba) {
            $quedan = $prueba->cupos_libres;

            return back()->with('success', 'Aprobado con la prueba gratis de ' . $prueba->diasDePrueba()
                . ' días del plan ' . $prueba->name . '.'
                . ($quedan === null ? '' : ' Quedan ' . $quedan . ' cupos.'));
        }

        return back()->with('success', 'Estado actualizado.');
    }

    /**
     * Si el plan que recibe tiene una prueba gratis abierta, se la aplica.
     *
     * El cupo se gasta aquí y no al registrarse: «los primeros diez» son los
     * primeros diez comercios aprobados, no los primeros diez que llenaron
     * el formulario. Si la oferta se agotó entre medias, la aprobación sigue
     * su curso con el período normal —nadie se queda sin cuenta por eso—.
     *
     * Tampoco va para quien ya pasó por un plan: una cuenta rechazada que
     * vuelve, o una que el admin ya había puesto en marcha, no es alguien
     * que llega. La oferta es para ganar clientes, no para los que están.
     *
     * Devuelve el plan cuando la prueba se aplicó, para poder contarlo.
     */
    private function aplicarOfertaDePrueba(User $comercio, ?int $planId): ?Plan
    {
        if ($planId === null || $comercio->yaTuvoPlan()) {
            return null;
        }

        $plan = Plan::find($planId);

        if (! $plan?->esPruebaGratis() || ! $plan->descuentoVigente() || ! $plan->tomarCupo()) {
            return null;
        }

        $comercio->plan_started_at = now();
        $comercio->plan_expires_at = now()->addDays($plan->diasDePrueba())->endOfDay();
        $comercio->plan_is_trial = true;
        $comercio->expiry_notified_at = null;

        return $plan;
    }

    /**
     * Manda el correo que corresponda al cambio de estado.
     *
     * Terminar en `approved` significa dos cosas distintas según de dónde
     * se venga: estrenar la cuenta o recuperarla. Y activar desde este
     * desplegable tiene que avisar igual que el botón de aprobar, que
     * antes era el único camino que mandaba la bienvenida.
     *
     * Volver a `rejected` no manda nada desde aquí: el rechazo tiene su
     * propio flujo, con su motivo.
     */
    private function avisarCambioDeEstado(User $comercio, string $anterior): void
    {
        if ($comercio->status === $anterior) {
            return;
        }

        $correo = match (true) {
            $comercio->status === User::STATUS_APPROVED && $anterior === User::STATUS_SUSPENDED
                => new EstadoDeCuenta($comercio, EstadoDeCuenta::REACTIVADA),

            $comercio->status === User::STATUS_APPROVED
                => new CuentaAprobada($comercio),

            $comercio->status === User::STATUS_SUSPENDED
                => new EstadoDeCuenta($comercio, EstadoDeCuenta::SUSPENDIDA),

            $comercio->status === User::STATUS_PENDING
                => new EstadoDeCuenta($comercio, EstadoDeCuenta::PENDIENTE),

            default => null,
        };

        if ($correo) {
            $this->enviar($comercio, $correo);
        }
    }

    public function updatePlan(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        $validated = $request->validate([
            'plan_id' => ['nullable', 'exists:plans,id'],
            'plan_expires_at' => ['nullable', 'date'],
            // Sin cobro automático, el descuento es informativo: se lo ve el
            // comercio en su panel y sirve para acordar el precio.
            'plan_discount_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'plan_is_trial' => ['boolean'],
            'plan_note' => ['nullable', 'string', 'max:160'],
        ]);

        // `validated()` solo devuelve lo que vino en la petición, así que un
        // campo que el formulario no mandó no existe como clave.
        $validated += ['plan_id' => null, 'plan_discount_percent' => null];

        // Guardar el plan que estaba pedido cuenta como cumplir la solicitud:
        // es el momento en que el cambio ocurre de verdad.
        $cumpleLoPedido = $comercio->pending_plan_id
            && (int) $validated['plan_id'] === (int) $comercio->pending_plan_id;

        $comercio->update([
            'plan_id' => $validated['plan_id'],
            'pending_plan_id' => $cumpleLoPedido ? null : $comercio->pending_plan_id,
            'plan_started_at' => $comercio->plan_started_at ?? now(),
            // Vence al final del día elegido; vacío es "sin vencimiento"
            'plan_expires_at' => isset($validated['plan_expires_at'])
                ? Carbon::parse($validated['plan_expires_at'])->endOfDay()
                : null,
            'plan_discount_percent' => $validated['plan_discount_percent'] ?: null,
            'plan_is_trial' => $request->boolean('plan_is_trial'),
            'plan_note' => $validated['plan_note'] ?? null,
            // Se le dio aire: los avisos de vencimiento empiezan de cero
            'expiry_notified_at' => null,
        ]);

        if ($cumpleLoPedido) {
            // Sin pasar por la relación: trae un `latest()` que convierte esto
            // en un UPDATE con ORDER BY, y SQLite no lo acepta.
            $solicitudes = PlanChangeRequest::where('user_id', $comercio->id)->enEspera()->get();

            PlanChangeRequest::whereKey($solicitudes->modelKeys())->update([
                'status' => PlanChangeRequest::APLICADA,
                'applied_at' => now(),
            ]);

            // El cambio que pidió hace semanas ya ocurrió: se lo contamos,
            // que es el momento en el que de verdad le cambian los límites.
            if ($cumplida = $solicitudes->first()) {
                // Recién actualizada en bloque: hay que releerla para que el
                // correo cuente el estado de ahora y no el de hace una línea.
                $cumplida->refresh()->load(['comercio', 'planActual', 'planPedido']);

                $this->enviar($comercio, new CambioDePlan($cumplida, CambioDePlan::APLICADO));
            }
        }

        ActivityLog::record('comercio.plan', 'Cambió el plan de ' . ($comercio->business_name ?: $comercio->name), [
            'vence' => $comercio->plan_expires_at?->toDateString(),
            'descuento' => $comercio->plan_discount_percent,
            'prueba' => $comercio->plan_is_trial,
        ], $comercio);

        return back()->with('success', 'Plan actualizado.');
    }

    /**
     * Da por bueno el correo de un comercio sin que abra el enlace.
     *
     * Existe porque el correo falla: cae en spam, la dirección tiene una
     * letra mal o el comercio simplemente no lo encuentra. Verificado a mano
     * queda constancia de quién lo hizo.
     */
    public function verifyEmail(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        if ($comercio->hasVerifiedEmail()) {
            return back()->with('info', 'Ese correo ya estaba verificado.');
        }

        $comercio->forceFill(['email_verified_at' => now()])->save();

        ActivityLog::record(
            'comercio.correo_verificado',
            'Dio por verificado el correo de ' . ($comercio->business_name ?: $comercio->name),
            ['correo' => $comercio->email],
            $comercio
        );

        return back()->with('success', 'Correo marcado como verificado.');
    }

    /**
     * Prueba gratis: abre un período sin cobrar, con el plan que se elija.
     *
     * Es la forma de dar acceso ahora que el plan gratuito no se ofrece al
     * registrarse: el comercio usa un plan de pago durante unos días.
     */
    public function trial(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        $validated = $request->validate([
            'plan_id' => ['nullable', 'exists:plans,id'],
            'dias' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $dias = $validated['dias'] ?? Setting::platformInt('trial_days', (int) config('planes.dias_de_prueba'));

        $comercio->update([
            'plan_id' => $validated['plan_id'] ?? $comercio->plan_id ?? $comercio->requested_plan_id,
            'plan_started_at' => now(),
            'plan_expires_at' => now()->addDays($dias)->endOfDay(),
            'plan_is_trial' => true,
            'expiry_notified_at' => null,
        ]);

        ActivityLog::record(
            'comercio.prueba',
            "Le dio {$dias} días de prueba gratis a " . ($comercio->business_name ?: $comercio->name),
            ['vence' => $comercio->plan_expires_at->toDateString()],
            $comercio
        );

        return back()->with('success', "Prueba gratis de {$dias} días activada.");
    }

    /**
     * Entra a la app con los datos de un comercio para dar soporte.
     * No cambia de sesión: solo fija el tenant que verá el admin.
     */
    public function inspect(Request $request, User $comercio): RedirectResponse
    {
        abort_unless($comercio->isTenant(), 404);

        $request->session()->put('impersonating_tenant', $comercio->id);

        ActivityLog::record('comercio.inspeccion', 'Entró a la cuenta de ' . ($comercio->business_name ?: $comercio->name), [], $comercio);

        return redirect()->route('dashboard');
    }

    public function stopInspecting(Request $request): RedirectResponse
    {
        $request->session()->forget('impersonating_tenant');

        return redirect()->route('admin.comercios.index');
    }
}
