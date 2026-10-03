<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Suggestion;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lo que los comercios le escriben a la plataforma: ideas y errores.
 *
 * El admin consulta por encima del aislamiento por comercio y contesta
 * desde la misma pantalla; la respuesta la ve el comercio en su panel.
 */
class SuggestionController extends Controller
{
    public function __construct(private Tenancy $tenancy)
    {
    }

    public function index(Request $request): Response
    {
        $filtros = [
            'estado' => $request->input('estado', 'abiertas'),
            'tipo' => $request->input('tipo'),
            'buscar' => $request->input('buscar'),
        ];

        [$mensajes, $conteos] = $this->tenancy->withoutTenancy(fn () => [
            Suggestion::with(['user:id,name,business_name,username', 'replier:id,name'])
                ->when($filtros['estado'] === 'abiertas', fn ($q) => $q->abiertas())
                ->when($filtros['estado'] === 'cerradas', fn ($q) => $q->whereNotIn('status', Suggestion::ABIERTOS))
                ->when(
                    $filtros['estado'] && ! in_array($filtros['estado'], ['abiertas', 'cerradas', 'todas'], true),
                    fn ($q) => $q->where('status', $filtros['estado']),
                )
                ->when($filtros['tipo'], fn ($q, $tipo) => $q->where('type', $tipo))
                ->when($filtros['buscar'], function ($q, $buscar) {
                    $q->where(function ($sub) use ($buscar) {
                        $sub->where('subject', 'like', "%{$buscar}%")
                            ->orWhere('body', 'like', "%{$buscar}%");
                    });
                })
                ->latest('id')
                ->paginate(20)
                ->withQueryString(),
            $this->conteos(),
        ]);

        // Lo listado se muestra completo, así que verlo es haberlo leído: la
        // insignia baja sola. La página ya se armó con los datos de antes, así
        // que el admin todavía ve resaltado lo que acaba de llegar.
        $this->tenancy->withoutTenancy(function () use ($mensajes) {
            Suggestion::sinLeer()
                ->whereIn('id', $mensajes->pluck('id'))
                ->update(['read_at' => now()]);
        });

        return Inertia::render('Admin/Sugerencias/Index', [
            'mensajes' => $mensajes,
            'filtros' => $filtros,
            'conteos' => $conteos,
            'tipos' => Suggestion::TIPOS,
            'estados' => Suggestion::ESTADOS,
        ]);
    }

    /** Contesta, cambia el estado o marca como leída. */
    public function update(Request $request, int $sugerencia): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:' . implode(',', array_keys(Suggestion::ESTADOS))],
            'reply' => ['nullable', 'string', 'max:2000'],
            'leida' => ['boolean'],
        ]);

        $mensaje = $this->encontrar($sugerencia);

        $cambios = ['read_at' => $mensaje->read_at ?? now()];

        if (filled($validated['reply'] ?? null)) {
            $cambios += [
                'reply' => $validated['reply'],
                'replied_at' => now(),
                'replied_by' => $request->user()->id,
                // Una respuesta nueva vuelve a marcarse como pendiente de leer
                'reply_seen_at' => null,
            ];
        }

        if (isset($validated['status'])) {
            $cambios['status'] = $validated['status'];
        } elseif (filled($validated['reply'] ?? null) && $mensaje->status === Suggestion::NUEVA) {
            // Contestar sin elegir estado deja el asunto en marcha
            $cambios['status'] = Suggestion::EN_PROCESO;
        }

        $mensaje->update($cambios);

        if (filled($validated['reply'] ?? null)) {
            ActivityLog::record(
                'sugerencia.respondida',
                'Respondió el mensaje "' . $mensaje->subject . '"',
                ['estado' => $mensaje->status],
                $mensaje->user,
            );
        }

        return back()->with('success', filled($validated['reply'] ?? null) ? 'Respuesta enviada.' : 'Mensaje actualizado.');
    }

    public function destroy(int $sugerencia): RedirectResponse
    {
        $mensaje = $this->encontrar($sugerencia);
        $mensaje->delete();

        return back()->with('success', 'Mensaje eliminado.');
    }

    /** @return array<string, int> */
    private function conteos(): array
    {
        return [
            'sin_leer' => Suggestion::sinLeer()->count(),
            'abiertas' => Suggestion::abiertas()->count(),
            'errores' => Suggestion::abiertas()->where('type', Suggestion::ERROR)->count(),
            'total' => Suggestion::count(),
        ];
    }

    /** El admin no tiene tenant fijado: hay que salir del aislamiento para buscar. */
    private function encontrar(int $id): Suggestion
    {
        return $this->tenancy->withoutTenancy(fn () => Suggestion::with('user')->findOrFail($id));
    }
}
