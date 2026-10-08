<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Support\NivelesDePrecio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Promociones y preferencias de venta del comercio.
 *
 * Los ajustes son por comercio: `Setting` no lleva alcance global, así que
 * aquí hay que pedir explícitamente los del tenant activo. Leer todos
 * mezclaría los de otros comercios y los de la plataforma.
 */
class SettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Promociones/Index', [
            'settings' => Setting::forTenant($this->tenantId()),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'global_discount' => 'required|numeric|min:0|max:100',
            'force_wholesale' => 'required|boolean',
            'force_distributor' => 'required|boolean',
            // Dos nombres para el mismo precio; lo elige el comercio
            NivelesDePrecio::CLAVE => ['required', Rule::in(array_keys(NivelesDePrecio::NOMBRES))],
        ]);

        foreach ($validated as $key => $value) {
            Setting::put($key, $value, $this->tenantId());
        }

        return back()->with('success', 'Promociones actualizadas correctamente.');
    }

    /**
     * Solo el nombre del tercer precio, sin pasar por Promociones.
     *
     * Se decide escribiendo el precio, no buscándolo en otra pantalla: es
     * ahí donde el comercio ve que el campo se llama como no le sirve. Va
     * aparte de `update` porque esa guarda las promociones completas y
     * aquí no hay ninguna que mandar.
     */
    public function updateNombreDelPrecio(Request $request): RedirectResponse
    {
        $validado = $request->validate([
            NivelesDePrecio::CLAVE => ['required', Rule::in(array_keys(NivelesDePrecio::NOMBRES))],
        ]);

        Setting::put(NivelesDePrecio::CLAVE, $validado[NivelesDePrecio::CLAVE], $this->tenantId());

        return back();
    }

    public function updateBanner(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'banner_text' => 'nullable|string|max:2000',
        ]);

        Setting::put('banner_text', $validated['banner_text'] ?? '', $this->tenantId());

        return back()->with('success', 'Banner actualizado correctamente.');
    }
}
