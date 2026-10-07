<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Delivery;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DeliveryController extends Controller
{
    public function index()
    {
        // Purgar automáticamente entregas cuya fecha fue hace más de 3 días
        Delivery::where('delivery_date', '<', Carbon::now()->subDays(3))->delete();

        // Obtener entregas activas ligadas a facturas del usuario autenticado
        $deliveries = Delivery::whereHas('factura', function ($query) {
            $query->where('user_id', $this->tenantId());
        })
        ->with('factura')
        ->orderBy('delivery_date', 'asc')
        ->get()
        ->map(function ($del) {
            return [
                'id'            => $del->id,
                'factura_id'    => $del->factura_id,
                'client_name'   => $del->factura->client_name ?? 'Cliente Genérico',
                'client_phone'  => $del->factura->client_phone ?? '',
                'total_usd'     => (float)$del->factura->total_usd,
                'delivery_date' => $del->delivery_date->toIso8601String(),
                'type'          => $del->type,
                'status'        => $del->status,
                'point_a'       => $del->point_a,
                'point_b'       => $del->point_b,
                'is_expired'    => $del->delivery_date->isPast(),
            ];
        });

        return Inertia::render('Deliveries/Index', [
            'deliveries' => $deliveries,
        ]);
    }

    public function postpone(Request $request, Delivery $delivery)
    {
        // Validar que la factura pertenezca al usuario logueado
        if ($delivery->factura->user_id !== $this->tenantId()) {
            abort(403);
        }

        $request->validate([
            'delivery_date' => 'required|date|after:now',
        ]);

        $delivery->update([
            'delivery_date' => $request->delivery_date,
            'status'        => 'pending',
        ]);

        return redirect()->back()->with('success', 'Entrega pospuesta correctamente.');
    }
}
