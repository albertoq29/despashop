<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;
use App\Models\Setting;
use App\Services\Seguridad\RegistroDeSeguridad;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Registro de seguridad de la plataforma.
 *
 * El admin lo usa como una bandeja: lo que está sin revisar pide atención,
 * lo revisado queda como historia. Nada se borra a mano; lo viejo lo retira
 * `model:prune` según `seguridad.retencion_dias`.
 */
class SecurityEventController extends Controller
{
    public function __construct(private RegistroDeSeguridad $registro)
    {
    }

    public function index(Request $request): Response
    {
        $filtros = [
            'estado' => $request->input('estado', 'sin_revisar'),
            'severidad' => $request->input('severidad'),
            'tipo' => $request->input('tipo'),
            'buscar' => $request->input('buscar'),
            'dias' => (int) $request->input('dias', 30),
        ];

        $eventos = SecurityEvent::with(['user:id,name,business_name,username,role', 'reviewer:id,name'])
            ->when($filtros['dias'] > 0, fn ($q) => $q->desde($filtros['dias']))
            ->when($filtros['estado'] === 'sin_revisar', fn ($q) => $q->sinRevisar())
            ->when($filtros['estado'] === 'revisados', fn ($q) => $q->whereNotNull('reviewed_at'))
            ->when($filtros['severidad'], fn ($q, $severidad) => $q->where('severity', $severidad))
            ->when($filtros['tipo'], fn ($q, $tipo) => $q->where('type', $tipo))
            ->when($filtros['buscar'], function ($q, $buscar) {
                $q->where(function ($sub) use ($buscar) {
                    $sub->where('ip_address', 'like', "%{$buscar}%")
                        ->orWhere('description', 'like', "%{$buscar}%")
                        ->orWhere('path', 'like', "%{$buscar}%");
                });
            })
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/Seguridad/Index', [
            'eventos' => $eventos,
            'filtros' => $filtros,
            'conteos' => $this->registro->conteos(),
            // El catálogo de tipos viaja una vez y la página resuelve cada fila
            'tipos' => SecurityEvent::TIPOS,
            'porTipo' => SecurityEvent::sinRevisar()
                ->selectRaw('type, count(*) as total, sum(hits) as golpes')
                ->groupBy('type')
                ->orderByDesc('golpes')
                ->get()
                ->map(fn ($fila) => [
                    'tipo' => $fila->type,
                    'total' => (int) $fila->total,
                    'golpes' => (int) $fila->golpes,
                ]),
            'avisos' => [
                'activos' => (bool) config('seguridad.avisos'),
                'correo' => Setting::platform('security_email', ''),
            ],
        ]);
    }

    /** Marca un hecho como revisado, o lo vuelve a abrir. */
    public function review(Request $request, SecurityEvent $evento): RedirectResponse
    {
        $validated = $request->validate([
            'nota' => ['nullable', 'string', 'max:500'],
        ]);

        if ($evento->reviewed_at) {
            $evento->update(['reviewed_at' => null, 'reviewed_by' => null, 'review_note' => null]);

            return back()->with('info', 'El hecho volvió a la bandeja sin revisar.');
        }

        $evento->update([
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'review_note' => $validated['nota'] ?? null,
        ]);

        return back()->with('success', 'Hecho revisado.');
    }

    /** Marca como revisado todo lo que quede pendiente, opcionalmente de un tipo. */
    public function reviewAll(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tipo' => ['nullable', 'string', 'max:60'],
            'severidad' => ['nullable', 'in:baja,media,alta'],
        ]);

        $cuantos = SecurityEvent::sinRevisar()
            ->when($validated['tipo'] ?? null, fn ($q, $tipo) => $q->where('type', $tipo))
            ->when($validated['severidad'] ?? null, fn ($q, $severidad) => $q->where('severity', $severidad))
            ->update([
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
            ]);

        ActivityLog::record('seguridad.revisado', "Marcó {$cuantos} hechos de seguridad como revisados", [
            'tipo' => $validated['tipo'] ?? 'todos',
        ]);

        return back()->with('success', $cuantos === 0
            ? 'No quedaba nada por revisar.'
            : "Se marcaron {$cuantos} hechos como revisados.");
    }
}
