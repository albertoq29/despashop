<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        ]);

        foreach ($validated as $key => $value) {
            Setting::put($key, $value, $this->tenantId());
        }

        return back()->with('success', 'Promociones actualizadas correctamente.');
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
