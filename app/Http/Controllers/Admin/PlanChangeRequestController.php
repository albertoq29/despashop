<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\PlanChangeRequest;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Las solicitudes de cambio de plan, del lado del administrador.
 *
 * Aceptar no cambia el plan: lo deja apuntado en el comercio para que entre
 * cuando se renueve. El cambio ocurre de verdad al renovar, desde la ficha
 * del comercio, que es donde se fija la fecha de vencimiento.
 */
class PlanChangeRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $estado = $request->string('estado')->toString() ?: PlanChangeRequest::PENDIENTE;

        // Las solicitudes son de todos los comercios: el aislamiento por
        // tenant escondería justo lo que el administrador viene a ver.
        $solicitudes = app(Tenancy::class)->withoutTenancy(
            fn () => PlanChangeRequest::with([
                'comercio:id,name,business_name,username,plan_expires_at',
                'planActual:id,name,price_usd',
                'planPedido:id,name,price_usd',
                'decidioEl:id,name',
            ])
                ->when($estado !== 'todas', fn ($q) => $q->where('status', $estado))
                ->latest()
                ->paginate(20)
                ->withQueryString()
        );

        return Inertia::render('Admin/CambiosDePlan/Index', [
            'solicitudes' => $solicitudes,
            'estado' => $estado,
            'conteos' => app(Tenancy::class)->withoutTenancy(fn () => [
                'pendientes' => PlanChangeRequest::pendientes()->count(),
                'en_espera' => PlanChangeRequest::enEspera()->count(),
            ]),
        ]);
    }

    public function update(Request $request, PlanChangeRequest $solicitud): RedirectResponse
    {
        $validado = $request->validate([
            'status' => ['required', 'in:aceptada,rechazada'],
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $solicitud->estaAbierta()) {
            return back()->with('error', 'Esa solicitud ya está cerrada.');
        }

        $solicitud->update([
            'status' => $validado['status'],
            'admin_note' => $validado['admin_note'] ?? null,
            'decided_at' => now(),
            'decided_by' => $request->user()->id,
        ]);

        $comercio = $solicitud->comercio;

        // Aceptar solo lo deja anotado. El plan cambia al renovar, para no
        // cortar a mitad un período que el comercio ya pagó.
        $comercio->update([
            'pending_plan_id' => $validado['status'] === PlanChangeRequest::ACEPTADA
                ? $solicitud->to_plan_id
                : null,
        ]);

        ActivityLog::record(
            'plan.solicitud_' . $validado['status'],
            ($validado['status'] === PlanChangeRequest::ACEPTADA ? 'Aceptó' : 'Rechazó')
                . ' el cambio al plan ' . $solicitud->planPedido->name
                . ' de ' . ($comercio->business_name ?: $comercio->name),
            ['solicitud' => $solicitud->id],
            $comercio
        );

        return back()->with('success', $validado['status'] === PlanChangeRequest::ACEPTADA
            ? 'Aceptada. El cambio entra cuando renueves el plan de este comercio.'
            : 'Solicitud rechazada.');
    }
}
