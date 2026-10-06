<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Le avisa al comercio que su plan está por vencer.
 *
 * Es el aviso que llega a tiempo. El otro —`AvisoDeVencimiento`— se manda
 * cuando el catálogo ya se cayó, y para entonces el comercio se enteró por
 * un cliente que no pudo entrar. Este existe para que eso no pase.
 *
 * El asunto nombra el catálogo y no el plan: lo que al comercio le importa
 * perder no es una suscripción, es la dirección que les pasó a sus
 * clientes.
 */
class PlanPorVencer extends Mailable
{
    public function __construct(
        public User $comercio,
        public int $diasRestantes,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        $asunto = match (true) {
            $this->diasRestantes <= 0 => "[{$marca}] Hoy vence tu plan: no pierdas tu catálogo",
            $this->diasRestantes === 1 => "[{$marca}] Mañana vence tu plan: no pierdas tu catálogo",
            default => "[{$marca}] Tu plan vence en {$this->diasRestantes} días",
        };

        return new Envelope(subject: $asunto);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.plan-por-vencer',
            with: [
                'nombre' => $this->comercio->business_name ?: $this->comercio->name,
                'catalogo' => $this->comercio->catalogUrl(),
                'vence' => $this->comercio->plan_expires_at,
                'dias' => $this->diasRestantes,
                'plan' => $this->comercio->plan?->name,
                'gracia' => Setting::platformInt('grace_days', (int) config('planes.dias_de_gracia')),
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
                'panel' => route('plan.index'),
            ],
        );
    }
}
