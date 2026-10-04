<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Enlace para confirmar la dirección de correo.
 *
 * Reemplaza al que trae el framework, que venía en inglés y con otra cara.
 * Es el primer correo que recibe alguien que acaba de registrarse, así que
 * conviene que se parezca a la app de la que viene.
 */
class ConfirmarCorreo extends Mailable
{
    public function __construct(
        public User $usuario,
        public string $enlace,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(subject: "[{$marca}] Confirma tu correo");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.confirmar-correo',
            with: [
                'nombre' => $this->usuario->business_name ?: $this->usuario->name,
                'enlace' => $this->enlace,
                'minutos' => (int) config('auth.verification.expire', 60),
            ],
        );
    }
}
