<?php

namespace App\Mail;

use App\Models\PlanChangeRequest;
use App\Models\Setting;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Avisa a los administradores de que un comercio pidió cambiar de plan.
 *
 * Igual que con las solicitudes de cuenta: nadie entra al panel a ver si
 * hay algo esperando. Y aquí el tiempo importa más, porque el cambio entra
 * en la próxima renovación: una solicitud contestada tarde se pierde el
 * turno y el comercio pasa un mes entero en el plan que no quería.
 */
class SolicitudDeCambioDePlan extends Mailable
{
    public function __construct(
        public PlanChangeRequest $solicitud,
        public int $pendientes = 1,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));
        $comercio = $this->solicitud->comercio;
        $negocio = $comercio->business_name ?: $comercio->name;

        return new Envelope(
            subject: "[{$marca}] {$negocio} quiere cambiar al plan {$this->solicitud->planPedido?->name}",
        );
    }

    public function content(): Content
    {
        $comercio = $this->solicitud->comercio;

        return new Content(
            view: 'emails.solicitud-de-plan',
            with: [
                'negocio' => $comercio->business_name ?: $comercio->name,
                'correo' => $comercio->email,
                'telefono' => $comercio->whatsapp ?: $comercio->phone,
                'desde' => $this->solicitud->planActual?->name,
                'hacia' => $this->solicitud->planPedido?->name,
                'precioDesde' => $this->solicitud->planActual?->price_usd,
                'precioHacia' => $this->solicitud->planPedido?->price_usd,
                'mensaje' => $this->solicitud->message,
                // Cuánto falta para su renovación: es la fecha en la que
                // el cambio entraría si se acepta a tiempo
                'vence' => $comercio->plan_expires_at,
                'diasParaVencer' => $comercio->diasParaVencer(),
                'pendientes' => $this->pendientes,
                'revisar' => route('admin.cambios-plan.index'),
            ],
        );
    }
}
