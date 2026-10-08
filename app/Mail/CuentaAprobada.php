<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Le avisa al comercio que su cuenta quedó activa.
 *
 * Es el primer correo que recibe de la plataforma y suele ser el momento en
 * que decide si esto le sirve o no, así que no se limita a decir «aprobada»:
 * le da su dirección de catálogo y los tres primeros pasos para tener algo
 * que mostrar el mismo día.
 */
class CuentaAprobada extends Mailable
{
    public function __construct(public User $comercio)
    {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(
            subject: "[{$marca}] Tu cuenta ya está activa",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cuenta-aprobada',
            with: [
                'nombre' => $this->comercio->business_name ?: $this->comercio->name,
                'usuario' => $this->comercio->username,
                'catalogo' => $this->comercio->catalogUrl(),
                'plan' => $this->comercio->plan?->name,
                'vence' => $this->comercio->plan_expires_at,
                // Si entró con una prueba, conviene que lo sepa desde el
                // primer correo y no el día que le pidan pagar
                'prueba' => (bool) $this->comercio->plan_is_trial,
                'panel' => route('dashboard'),
                'personalizar' => route('catalogo.personalizar'),
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
            ],
        );
    }
}
