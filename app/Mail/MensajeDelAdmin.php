<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Un mensaje que el administrador le escribe a un grupo de comercios.
 *
 * El cuerpo lo redacta él, así que el único trabajo de aquí es ponerlo en el
 * marco de siempre y personalizar lo justo: su nombre y su dirección de
 * catálogo. Lo que escriba viaja como texto y se escapa en la plantilla:
 * nadie inyecta marcado en un correo que sale a cien personas.
 */
class MensajeDelAdmin extends Mailable
{
    public function __construct(
        public User $comercio,
        public string $titulo,
        public string $cuerpo,
        public ?string $enlace = null,
        public ?string $textoDelEnlace = null,
        public bool $conCatalogo = false,
    ) {
    }

    public function envelope(): Envelope
    {
        $marca = Setting::platform('brand_name', config('app.name'));

        return new Envelope(subject: "[{$marca}] {$this->titulo}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.mensaje-del-admin',
            with: [
                'titulo' => $this->conNombre($this->titulo),
                'parrafos' => $this->parrafos(),
                'enlace' => $this->enlace,
                'textoDelEnlace' => $this->textoDelEnlace,
                'catalogo' => $this->conCatalogo ? $this->comercio->catalogUrl() : null,
                'contacto' => [
                    'whatsapp' => Setting::platform('support_whatsapp'),
                    'email' => Setting::platform('support_email'),
                ],
            ],
        );
    }

    /**
     * El cuerpo partido en párrafos.
     *
     * Una línea en blanco separa párrafos, que es como escribe cualquiera en
     * una caja de texto. Sin esto, un mensaje de tres ideas llega como un
     * bloque corrido imposible de leer en el teléfono.
     *
     * @return list<string>
     */
    private function parrafos(): array
    {
        return collect(preg_split('/\n\s*\n/u', trim($this->cuerpo)))
            ->map(fn (string $parrafo) => trim(preg_replace('/\s*\n\s*/u', ' ', $parrafo)))
            ->map(fn (string $parrafo) => $this->conNombre($parrafo))
            ->filter()
            ->values()
            ->all();
    }

    /** `{nombre}` se cambia por el del comercio; es lo único que se sustituye. */
    private function conNombre(string $texto): string
    {
        return str_replace(
            '{nombre}',
            $this->comercio->business_name ?: $this->comercio->name,
            $texto,
        );
    }
}
