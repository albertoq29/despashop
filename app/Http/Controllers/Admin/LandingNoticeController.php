<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LandingNotice;
use App\Support\Archivos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Avisos flotantes de la portada.
 *
 * Solo uno sale por visita: el primero vigente según el orden. Varios a la
 * vez convierten la entrada en una carrera de ventanas que cerrar, que es
 * exactamente lo que hace que nadie lea ninguna.
 */
class LandingNoticeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Avisos/Index', [
            'avisos' => LandingNotice::orderBy('display_order')->orderBy('id')->get(),
            // Para que el admin sepa cuál se está viendo ahora mismo
            'vigenteId' => LandingNotice::vigentes()->value('id'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $datos = $this->validados($request);
        $datos['display_order'] = (LandingNotice::max('display_order') ?? 0) + 1;

        if ($request->hasFile('image')) {
            $datos['image_path'] = Archivos::guardar($request->file('image'), 'plataforma', 'aviso');
        }

        $aviso = LandingNotice::create($datos);

        ActivityLog::record('aviso.creado', 'Creó el aviso «' . ($aviso->title ?: 'sin título') . '»', [], $aviso);

        return back()->with('success', 'Aviso creado.');
    }

    public function update(Request $request, LandingNotice $aviso): RedirectResponse
    {
        $datos = $this->validados($request);

        if ($request->hasFile('image')) {
            Archivos::eliminar($aviso->image_path);
            $datos['image_path'] = Archivos::guardar($request->file('image'), 'plataforma', 'aviso');
        } elseif ($request->boolean('quitar_imagen')) {
            Archivos::eliminar($aviso->image_path);
            $datos['image_path'] = null;
        }

        $aviso->update($datos);

        return back()->with('success', 'Aviso actualizado.');
    }

    public function destroy(LandingNotice $aviso): RedirectResponse
    {
        $titulo = $aviso->title;
        // El trait GestionaArchivos borra la imagen del disco
        $aviso->delete();

        ActivityLog::record('aviso.eliminado', 'Eliminó el aviso «' . ($titulo ?: 'sin título') . '»');

        return back()->with('success', 'Aviso eliminado.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'orden' => ['required', 'array'],
            'orden.*' => ['integer', 'exists:landing_notices,id'],
        ]);

        foreach ($request->input('orden') as $posicion => $id) {
            LandingNotice::where('id', $id)->update(['display_order' => $posicion]);
        }

        return back();
    }

    private function validados(Request $request): array
    {
        $fin = ['nullable', 'date'];

        if ($request->filled('starts_at')) {
            $fin[] = 'after:starts_at';
        }

        $datos = $request->validate([
            'title' => ['required', 'string', 'max:80'],
            'body' => ['nullable', 'string', 'max:400'],
            'cta_text' => ['nullable', 'string', 'max:40'],
            // Admite tanto una dirección completa como un ancla de la portada
            'cta_link' => ['nullable', 'string', 'max:255'],
            'tone' => ['required', 'in:promo,info,aviso'],
            'position' => ['required', 'in:centro,esquina'],
            'delay_seconds' => ['required', 'integer', 'min:0', 'max:60'],
            'frequency' => ['required', 'in:siempre,una_vez_sesion,una_vez_dia'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => $fin,
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        unset($datos['image']);

        $datos['is_active'] = $request->boolean('is_active');
        $datos['starts_at'] = filled($datos['starts_at'] ?? null)
            ? Carbon::parse($datos['starts_at'])->startOfDay()
            : null;
        $datos['ends_at'] = filled($datos['ends_at'] ?? null)
            ? Carbon::parse($datos['ends_at'])->endOfDay()
            : null;

        return $datos;
    }
}
