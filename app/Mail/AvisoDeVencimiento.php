<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Le avisa al comercio que su plan venció y qué va a pasar con sus datos.
 *
 * Se manda el día que vence y otra vez antes de que se cumpla el plazo, con
 * el mismo mensaje pero contando los días que quedan. No es un correo de
 * ventas: es el único aviso que recibirá antes de perder su información.
 */
class AvisoDeVencimiento extends Mailable
{
    public function __construct(
        public User $comercio,
        public int $diasParaBorrado,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(
            subject: $this->diasParaBorrado <= 3
                ? "[{$marca}] Últimos días para recuperar tu catálogo"
                : "[{$marca}] Tu plan venció y tu catálogo dejó de verse",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.vencimiento',
            with: [
                'nombre' => $this->comercio->business_name ?: $this->comercio->name,
                'catalogo' => $this->comercio->catalogUrl(),
                'vencio' => $this->comercio->plan_expires_at,
                'borradoEl' => $this->comercio->fechaDeBorrado(),
                'dias' => $this->diasParaBorrado,
                'plan' => $this->comercio->plan?->name,
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
                'panel' => route('dashboard'),
            ],
        );
    }
}
