<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Avisa a los administradores de que alguien pidió una cuenta.
 *
 * Las cuentas se aprueban a mano, así que mientras nadie entre al panel la
 * solicitud se queda esperando y el comercio también. Este correo existe
 * para que la espera no dependa de que a alguien se le ocurra mirar.
 *
 * Lleva en el asunto el nombre del negocio: con varias solicitudes en la
 * bandeja, se distinguen sin abrirlas.
 */
class NuevaSolicitud extends Mailable
{
    public function __construct(
        public User $solicitante,
        public int $pendientes = 1,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));
        $negocio = $this->solicitante->business_name ?: $this->solicitante->name;

        return new Envelope(
            subject: "[{$marca}] Nueva solicitud: {$negocio}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.nueva-solicitud',
            with: [
                'negocio' => $this->solicitante->business_name ?: $this->solicitante->name,
                'persona' => $this->solicitante->name,
                'usuario' => $this->solicitante->username,
                'correo' => $this->solicitante->email,
                'telefono' => $this->solicitante->phone ?: $this->solicitante->whatsapp,
                'plan' => $this->solicitante->requestedPlan?->name,
                'mensaje' => $this->solicitante->request_message,
                'pedidoEl' => $this->solicitante->created_at,
                'pendientes' => $this->pendientes,
                'revisar' => route('admin.comercios.show', $this->solicitante),
            ],
        );
    }
}
