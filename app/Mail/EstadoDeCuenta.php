<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Le avisa al comercio que el estado de su cuenta cambió.
 *
 * Son tres situaciones distintas con una cosa en común: el comercio se
 * entera de que su catálogo dejó de verse (o volvió) por sus clientes, no
 * por nosotros. Un correo es la diferencia entre un cambio administrativo y
 * un susto.
 *
 * Van en una sola clase porque comparten todo salvo el texto: separarlas
 * sería repetir tres veces la misma envoltura.
 */
class EstadoDeCuenta extends Mailable
{
    public const SUSPENDIDA = 'suspendida';
    public const PENDIENTE = 'pendiente';
    public const REACTIVADA = 'reactivada';

    public function __construct(
        public User $comercio,
        public string $cambio,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        $asuntos = [
            self::SUSPENDIDA => "[{$marca}] Tu cuenta quedó suspendida",
            self::PENDIENTE => "[{$marca}] Tu cuenta volvió a revisión",
            self::REACTIVADA => "[{$marca}] Tu cuenta está activa otra vez",
        ];

        return new Envelope(subject: $asuntos[$this->cambio] ?? "[{$marca}] Cambió el estado de tu cuenta");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.estado-de-cuenta',
            with: [
                'cambio' => $this->cambio,
                'nombre' => $this->comercio->business_name ?: $this->comercio->name,
                'catalogo' => $this->comercio->catalogUrl(),
                'panel' => route('dashboard'),
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
            ],
        );
    }
}
