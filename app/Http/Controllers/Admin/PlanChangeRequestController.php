<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\CambioDePlan;
use App\Models\ActivityLog;
use App\Models\PlanChangeRequest;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

        $this->avisarAlComercio(
            $solicitud,
            $validado['status'] === PlanChangeRequest::ACEPTADA ? CambioDePlan::ACEPTADO : CambioDePlan::RECHAZADO,
        );

        return back()->with('success', $validado['status'] === PlanChangeRequest::ACEPTADA
            ? 'Aceptada. El cambio entra cuando renueves el plan de este comercio.'
            : 'Solicitud rechazada.');
    }

    /**
     * Le cuenta al comercio en qué quedó su solicitud.
     *
     * También cuando es que no: enterarse enseguida le deja pedir otra
     * cosa o escribirnos, en vez de esperar un mes a un cambio que no va
     * a llegar.
     */
    private function avisarAlComercio(PlanChangeRequest $solicitud, string $momento): void
    {
        $solicitud->load(['comercio', 'planActual', 'planPedido']);
        $correo = $solicitud->comercio?->email;

        if (! $correo) {
            return;
        }

        dispatch(function () use ($solicitud, $momento, $correo) {
            try {
                Mail::to($correo)->send(new CambioDePlan($solicitud, $momento));
            } catch (\Throwable $e) {
                Log::warning('No se pudo avisar del cambio de plan', [
                    'solicitud' => $solicitud->id,
                    'momento' => $momento,
                    'error' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }
}
