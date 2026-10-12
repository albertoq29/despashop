<?php

namespace App\Http\Controllers;

use App\Models\FacturaItem;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Renovaciones de los servicios que se cobran por suscripción.
 *
 * Un hosting o un mantenimiento mensual no se factura una vez: se renueva,
 * y el comercio necesita saber a quién le toca pagar y cuándo. Esto no
 * cobra nada ni emite facturas: es la lista de lo que viene, para poder
 * escribirle al cliente antes y no después.
 *
 * Los renglones salen de facturas confirmadas: un borrador no es un
 * compromiso de nadie.
 */
class RenovacionController extends Controller
{
    public function index(): Response
    {
        $renovaciones = FacturaItem::conRenovacion()
            ->whereHas('factura', fn ($q) => $q->where('user_id', $this->tenantId()))
            ->with(['factura:id,client_name,client_phone', 'product:id,name,periodo_suscripcion,es_suscripcion'])
            ->get()
            ->map(fn (FacturaItem $item) => [
                'id' => $item->id,
                'factura_id' => $item->factura_id,
                'cliente' => $item->factura->client_name ?: 'Cliente sin nombre',
                'telefono' => $item->factura->client_phone ?: '',
                'servicio' => $item->product_name,
                'periodo' => $item->product?->periodo_suscripcion,
                'monto_usd' => (float) $item->unit_price_usd,
                'renueva_el' => $item->renueva_el->toDateString(),
                'dias' => $item->diasParaRenovar(),
                'renovaciones' => (int) $item->renovaciones,
                // Sin período no se puede adelantar la fecha: el comercio le
                // quitó la suscripción al producto después de facturarlo
                'renovable' => (bool) $item->product?->esSuscripcion(),
            ]);

        return Inertia::render('Renovaciones/Index', [
            'renovaciones' => $renovaciones,
        ]);
    }

    /**
     * Marca una renovación como hecha y adelanta la fecha.
     *
     * No factura ni cobra: cuándo se emite la próxima factura es otra
     * decisión, y a veces se cobra por adelantado o con retraso. Lo único
     * que cambia es la fecha que toca mirar.
     */
    public function renovar(FacturaItem $renovacion): RedirectResponse
    {
        abort_unless($renovacion->factura?->user_id === $this->tenantId(), 403);

        $meses = $renovacion->product?->mesesDelPeriodo() ?? 0;

        if ($meses < 1) {
            return back()->with('error', 'Ese producto ya no está marcado como suscripción: vuelve a activarlo para poder renovarlo.');
        }

        $renovacion->renovar($meses);

        return back()->with(
            'success',
            'Renovado. La próxima toca el ' . $renovacion->fresh()->renueva_el->format('d/m/Y') . '.',
        );
    }

    /** Deja de seguir esta renovación, sin tocar la factura. */
    public function destroy(FacturaItem $renovacion): RedirectResponse
    {
        abort_unless($renovacion->factura?->user_id === $this->tenantId(), 403);

        $renovacion->forceFill(['renueva_el' => null])->save();

        return back()->with('success', 'Se quitó de las renovaciones. La factura queda igual.');
    }
}
