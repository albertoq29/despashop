<?php

namespace App\Mail;

use App\Models\SecurityEvent;
use App\Models\Setting;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Correo que recibe el admin cuando el registro de seguridad anota algo grave.
 *
 * Dice qué pasó, desde dónde y qué conviene hacer; el detalle completo vive
 * en el panel, no en el correo.
 */
class AvisoDeSeguridad extends Mailable
{
    public function __construct(
        public SecurityEvent $evento,
        public int $sinRevisar = 0,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(
            subject: "[{$marca}] Seguridad: " . $this->evento->etiqueta(),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.seguridad',
            with: [
                'evento' => $this->evento,
                'etiqueta' => $this->evento->etiqueta(),
                'pista' => $this->evento->pista(),
                'quien' => $this->evento->user?->business_name
                    ?: $this->evento->user?->name
                    ?: 'Sin cuenta (visitante)',
                'sinRevisar' => $this->sinRevisar,
                'enlace' => route('admin.seguridad.index'),
            ],
        );
    }
}
