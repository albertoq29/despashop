<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Setting;
use App\Models\User;
use App\Mail\SolicitudDeCambioDePlan;
use App\Services\PlanDelComercio;
use App\Support\Administradores;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mi plan: lo que el comercio tiene y cómo pedir otra cosa.
 *
 * No hay cobro automático, así que esto no cambia nada por su cuenta: deja
 * por escrito qué plan quiere y para cuándo, y el administrador responde.
 * El cambio entra al renovar, nunca a mitad de un período ya pagado.
 */
class PlanChangeRequestController extends Controller
{
    public function index(Request $request, PlanDelComercio $planDelComercio): Response
    {
        $comercio = $request->user();

        $planes = $this->planesQuePuedePedir($comercio);

        return Inertia::render('Plan/Index', [
            // El mismo resumen que ve en su panel: plan, vigencia y uso de límites
            'resumen' => $planDelComercio->resumen($comercio),
            'planActualId' => $comercio->plan_id,
            'planPendiente' => $comercio->planPendiente?->only(['id', 'name']),
            'planes' => $planes,
            // Para poder decirle por qué aquí no ve la oferta que sí está en la web
            'pruebaOculta' => $this->hayPruebaEscondida($comercio),
            'solicitudes' => $comercio->solicitudesDePlan()
                ->with(['planActual:id,name', 'planPedido:id,name'])
                ->limit(10)
                ->get(),
            'contacto' => [
                'whatsapp' => Setting::platform('support_whatsapp'),
                'email' => Setting::platform('support_email'),
            ],
        ]);
    }

    /**
     * Los planes que puede pedir, con el precio que de verdad le toca.
     *
     * Si ya tiene plan, las pruebas gratis se le quitan antes de que salgan
     * de aquí. Mostrarle «$0.00» sería ofrecerle de regalo lo que va a
     * seguir pagando, y la oferta no es para él: es para quien llega. Se
     * recorta en el servidor y no en la pantalla para que no se escape por
     * descuido, y los descuentos normales se quedan, que esos sí aplican.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Plan>
     */
    private function planesQuePuedePedir(User $comercio)
    {
        $planes = Plan::where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('price_usd')
            ->get();

        if (! $comercio->yaTuvoPlan()) {
            return $planes;
        }

        return $planes->each(function (Plan $plan) {
            if (! $plan->esPruebaGratis()) {
                return;
            }

            // Sin guardar: es el precio que ve este comercio, no el del plan
            $plan->discount_percent = null;
            $plan->discount_label = null;
            $plan->discount_limit = null;
            $plan->trial_days = null;
        });
    }

    /** Si hay alguna prueba gratis corriendo que a este comercio no le toca. */
    private function hayPruebaEscondida(User $comercio): bool
    {
        if (! $comercio->yaTuvoPlan()) {
            return false;
        }

        return Plan::where('is_active', true)
            ->where('discount_percent', 100)
            ->get()
            ->contains(fn (Plan $plan) => $plan->descuentoVigente());
    }

    public function store(Request $request): RedirectResponse
    {
        $comercio = $request->user();

        if ($comercio->solicitudesDePlan()->whereIn('status', [PlanChangeRequest::PENDIENTE, PlanChangeRequest::ACEPTADA])->exists()) {
            return back()->with('error', 'Ya tienes una solicitud en curso. Retírala si quieres pedir otra cosa.');
        }

        $validado = $request->validate([
            'to_plan_id' => [
                'required',
                Rule::exists('plans', 'id')->where('is_active', true),
                // Pedir el plan que ya se tiene no es una solicitud, es un ruido
                Rule::notIn([$comercio->plan_id]),
            ],
            'message' => ['nullable', 'string', 'max:500'],
        ], [
            'to_plan_id.not_in' => 'Ese ya es tu plan actual.',
        ]);

        $solicitud = $comercio->solicitudesDePlan()->create([
            'from_plan_id' => $comercio->plan_id,
            'to_plan_id' => $validado['to_plan_id'],
            'message' => $validado['message'] ?? null,
            'status' => PlanChangeRequest::PENDIENTE,
        ]);

        ActivityLog::record(
            'plan.solicitud',
            'Pidió cambiar al plan ' . $solicitud->planPedido->name,
            ['desde' => $solicitud->planActual?->name],
            $solicitud
        );

        $this->avisarALosAdministradores($solicitud);

        return back()->with('success', 'Solicitud enviada. Te responderemos antes de tu próxima renovación.');
    }

    /**
     * Avisa a los administradores de que hay una solicitud esperando.
     *
     * Aquí el tiempo cuenta: el cambio entra en la próxima renovación, y
     * una solicitud contestada tarde deja al comercio otro período entero
     * en el plan que no quería. Va después de responder y dentro de un
     * try: un fallo de correo no puede tumbar la solicitud.
     */
    private function avisarALosAdministradores(PlanChangeRequest $solicitud): void
    {
        $destinos = Administradores::correos();

        if ($destinos === []) {
            return;
        }

        $pendientes = PlanChangeRequest::pendientes()->count();
        $solicitud->load(['comercio', 'planActual', 'planPedido']);

        dispatch(function () use ($solicitud, $destinos, $pendientes) {
            try {
                Mail::to($destinos)->send(new SolicitudDeCambioDePlan($solicitud, $pendientes));
            } catch (\Throwable $e) {
                Log::warning('No se pudo avisar del cambio de plan pedido', [
                    'solicitud' => $solicitud->id,
                    'error' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }

    /** Retirar una solicitud que todavía no respondieron. */
    public function destroy(Request $request, PlanChangeRequest $solicitud): RedirectResponse
    {
        abort_unless($solicitud->user_id === $request->user()->id, 403);

        if (! $solicitud->esRetirable()) {
            return back()->with('error', 'Esa solicitud ya fue respondida; escríbenos si necesitas cambiarla.');
        }

        $solicitud->update(['status' => PlanChangeRequest::CANCELADA]);

        return back()->with('success', 'Solicitud retirada.');
    }
}
