<?php

namespace App\Http\Controllers;

use App\Models\ExchangeRate;
use App\Services\ExchangeRateService; // <--- IMPORTANTE: Usamos el servicio nuevo
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class ExchangeRateController extends Controller
{
    /**
     * Muestra la vista con el formulario y la última tasa registrada.
     */
    public function create()
    {
        // Obtenemos la última tasa para mostrarla en la tarjeta de resumen
        $lastRate = ExchangeRate::latest('created_at')->first();

        return Inertia::render('Tasas/Create', [
            'lastRate' => $lastRate
        ]);
    }

    /**
     * Guarda las tasas manualmente (cuando le das al botón "Guardar" del formulario).
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'bcv' => 'required|numeric|min:0.0001',
            ]);

            $bcv = (float) $validated['bcv'];

            ExchangeRate::create([
                'bcv' => $bcv,
            ]);

            return redirect()->route('tasas.create')->with('success', '¡Tasa guardada correctamente!');

        } catch (\Exception $e) {
            Log::error('Error al guardar tasas manuales: ' . $e->getMessage());
            
            return redirect()->back()->withErrors([
                'bcv' => 'Ocurrió un error al guardar. Revisa los logs.'
            ]);
        }
    }
    /**
     * API INTERNA: Esta función es llamada por el botón "Obtener Automáticamente" de React.
     * Usa el servicio para no repetir código.
     */
    public function fetchExternalRates(ExchangeRateService $service)
    {
        try {
            // Llamamos al servicio (el archivo que creaste en app/Services)
            $rates = $service->getRates();

            // Devolvemos los datos en JSON para que React rellene los inputs
            return response()->json([
                'success' => true,
                'bcv' => round($rates['bcv'], 4),
            ]);

        } catch (\Exception $e) {
            Log::error('Error en fetchExternalRates: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error consultando tasas: ' . $e->getMessage()
            ], 500);
        }
    }
}