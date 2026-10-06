<?php

namespace App\Mail;

use App\Models\PlanChangeRequest;
use App\Models\Setting;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Le cuenta al comercio en qué quedó su cambio de plan.
 *
 * Son tres momentos del mismo trámite: le dijimos que sí, le dijimos que
 * no, o el cambio ya ocurrió. El del medio es el que más se agradece —
 * saber que no va a pasar evita esperar un mes a que pase.
 *
 * Van juntos porque comparten todo salvo el texto; separarlos sería
 * repetir tres veces la misma envoltura.
 */
class CambioDePlan extends Mailable
{
    public const ACEPTADO = 'aceptado';
    public const RECHAZADO = 'rechazado';
    public const APLICADO = 'aplicado';

    public function __construct(
        public PlanChangeRequest $solicitud,
        public string $momento,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));
        $plan = $this->solicitud->planPedido?->name;

        $asuntos = [
            self::ACEPTADO => "[{$marca}] Aprobamos tu cambio al plan {$plan}",
            self::RECHAZADO => "[{$marca}] Sobre tu cambio de plan",
            self::APLICADO => "[{$marca}] Ya estás en el plan {$plan}",
        ];

        return new Envelope(subject: $asuntos[$this->momento] ?? "[{$marca}] Tu cambio de plan");
    }

    public function content(): Content
    {
        $comercio = $this->solicitud->comercio;

        return new Content(
            view: 'emails.cambio-de-plan',
            with: [
                'momento' => $this->momento,
                'nombre' => $comercio->business_name ?: $comercio->name,
                'desde' => $this->solicitud->planActual?->name,
                'hacia' => $this->solicitud->planPedido?->name,
                'nota' => $this->solicitud->admin_note,
                // Cuándo entra: es la fecha de su próxima renovación
                'vence' => $comercio->plan_expires_at,
                'panel' => route('plan.index'),
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
            ],
        );
    }
}
