<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CatalogTheme;
use App\Models\CatalogVisit;
use App\Models\Factura;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Services\PlanDelComercio;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
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
            'comercio' => $comercio->load('plan', 'requestedPlan', 'reviewer:id,name'),
            'theme' => $theme,
            'catalogUrl' => $comercio->catalogUrl(),
            'metricas' => $detalle,
            'planes' => Plan::orderBy('display_order')->get(),
            'actividad' => ActivityLog::where('user_id', $comercio->id)->latest()->limit(30)->get(),
            // El admin ve lo mismo que el comercio en su panel: vigencia y uso de límites
            'resumenPlan' => $planDelComercio->resumen($comercio),
            'venceSugerido' => now()->addMonthNoOverflow()->toDateString(),
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

        return back()->with('success', 'Cuenta aprobada. Su catálogo ya está disponible en /' . $comercio->username);
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

        // Activar una cuenta pendiente o rechazada también es aprobarla: abre
        // su mes de plan. Reactivar una suspendida conserva las fechas que tenía.
        $seAprueba = $validated['status'] === User::STATUS_APPROVED
            && in_array($comercio->status, [User::STATUS_PENDING, User::STATUS_REJECTED], true);

        if ($seAprueba && ! ($comercio->plan_expires_at?->isFuture())) {
            $comercio->iniciarPeriodoDePlan();
        }

        $comercio->fill([
            'status' => $validated['status'],
            'plan_id' => $seAprueba ? ($comercio->plan_id ?? $comercio->requested_plan_id) : $comercio->plan_id,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ])->save();

        ActivityLog::record(
            'comercio.estado',
            'Cambió el estado de ' . ($comercio->business_name ?: $comercio->name) . ' a ' . $validated['status'],
            [],
            $comercio
        );

        return back()->with('success', 'Estado actualizado.');
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

        $comercio->update([
            'plan_id' => $validated['plan_id'],
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

        $dias = $validated['dias'] ?? (int) config('planes.dias_de_prueba');

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
