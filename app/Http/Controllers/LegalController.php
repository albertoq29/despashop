<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Support\Terminos;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Página pública de las condiciones de uso.
 *
 * Es pública a propósito: quien todavía no tiene cuenta debe poder leerlas
 * antes de registrarse, y el enlace se comparte tal cual.
 */
class LegalController extends Controller
{
    public function terminos(): Response
    {
        return Inertia::render('Legales/Terminos', [
            'secciones' => Terminos::secciones(),
            'version' => Terminos::VERSION,
            'contacto' => [
                'email' => Setting::platform('support_email'),
                'whatsapp' => Setting::platform('support_whatsapp'),
            ],
        ]);
    }
}
