<?php

namespace App\Mail;

use App\Models\Setting;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Último correo: se cumplió el plazo y los datos se eliminaron.
 *
 * Se manda **antes** de borrar, porque después ya no existe la cuenta de
 * donde sacar el correo. Se escribe sin reproches: la puerta queda abierta
 * para volver a registrarse.
 */
class DatosEliminados extends Mailable
{
    public function __construct(
        public string $nombreDelComercio,
        public string $usuario,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(subject: "[{$marca}] Se eliminaron los datos de tu cuenta");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.datos-eliminados',
            with: [
                'nombre' => $this->nombreDelComercio,
                'usuario' => $this->usuario,
                'dias' => \App\Models\Setting::platformInt('grace_days', (int) config('planes.dias_de_gracia')),
                'registro' => route('register'),
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
            ],
        );
    }
}
