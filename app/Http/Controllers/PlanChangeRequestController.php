<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Setting;
use App\Services\PlanDelComercio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        return Inertia::render('Plan/Index', [
            // El mismo resumen que ve en su panel: plan, vigencia y uso de límites
            'resumen' => $planDelComercio->resumen($comercio),
            'planActualId' => $comercio->plan_id,
            'planPendiente' => $comercio->planPendiente?->only(['id', 'name']),
            'planes' => Plan::where('is_active', true)
                ->orderBy('display_order')
                ->orderBy('price_usd')
                ->get(),
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

        return back()->with('success', 'Solicitud enviada. Te responderemos antes de tu próxima renovación.');
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
