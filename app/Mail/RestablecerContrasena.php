<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Enlace para poner una contraseña nueva.
 *
 * Lleva el aviso de qué hacer si nadie lo pidió: un correo de este tipo que
 * llega sin haberlo pedido es la primera señal de que alguien está
 * intentando entrar en una cuenta ajena.
 */
class RestablecerContrasena extends Mailable
{
    public function __construct(
        public User $usuario,
        public string $enlace,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(subject: "[{$marca}] Recupera tu contraseña");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.restablecer-contrasena',
            with: [
                'nombre' => $this->usuario->business_name ?: $this->usuario->name,
                'enlace' => $this->enlace,
                'minutos' => (int) config('auth.passwords.users.expire', 60),
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
            ],
        );
    }
}
