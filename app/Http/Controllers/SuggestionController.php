<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Suggestion;
use App\Support\Archivos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Buzón del comercio hacia la plataforma: proponer una mejora o avisar de
 * un error, y leer lo que contestó el administrador.
 */
class SuggestionController extends Controller
{
    public function index(Request $request): Response
    {
        $mensajes = Suggestion::with('replier:id,name')
            ->latest('id')
            ->get();

        // Al abrir la pantalla, las respuestas dejan de estar pendientes
        Suggestion::conRespuestaSinVer()->update(['reply_seen_at' => now()]);

        return Inertia::render('Sugerencias/Index', [
            'mensajes' => $mensajes,
            'tipos' => Suggestion::TIPOS,
            'estados' => Suggestion::ESTADOS,
            'abiertas' => $mensajes->whereIn('status', Suggestion::ABIERTOS)->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:' . implode(',', array_keys(Suggestion::TIPOS))],
            'subject' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'min:15', 'max:2000'],
            'page' => ['nullable', 'string', 'max:160'],
            'image' => ['nullable', 'image', 'max:4096'],
        ], [
            'body.min' => 'Cuéntanos un poco más: al menos :min caracteres para poder entenderlo.',
            'image.max' => 'La captura puede pesar hasta 4 MB.',
        ]);

        Suggestion::create([
            'type' => $validated['type'],
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'page' => $validated['page'] ?? null,
            // El navegador ayuda a reproducir un error; se guarda sin pedirlo
            'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
            'image_path' => $request->hasFile('image')
                ? Archivos::guardar($request->file('image'), 'sugerencias')
                : null,
        ]);

        ActivityLog::record(
            'sugerencia.enviada',
            ($validated['type'] === Suggestion::ERROR ? 'Reportó un error: ' : 'Envió una sugerencia: ') . $validated['subject'],
        );

        return back()->with('success', $validated['type'] === Suggestion::ERROR
            ? 'Gracias por avisar. Revisaremos el error y te respondemos por aquí.'
            : 'Gracias por la idea. La leemos y te respondemos por aquí.');
    }

    /** Mientras nadie la haya leído, el comercio puede retirar su mensaje. */
    public function destroy(Suggestion $sugerencia): RedirectResponse
    {
        abort_unless($sugerencia->status === Suggestion::NUEVA && $sugerencia->read_at === null, 403);

        $sugerencia->delete();

        return back()->with('success', 'Mensaje retirado.');
    }
}
