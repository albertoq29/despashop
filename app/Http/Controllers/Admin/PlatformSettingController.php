<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ajustes globales de la plataforma: textos de la bienvenida, contacto de
 * soporte y si se aceptan registros nuevos.
 */
class PlatformSettingController extends Controller
{
    /** Claves editables desde el panel, con su valor por defecto. */
    private const KEYS = [
        'brand_name' => 'Despashop',
        'landing_headline' => 'Tu catálogo, tu inventario y tus facturas en un solo lugar',
        'landing_subheadline' => 'Carga tus productos una vez y compártelos con una dirección propia. Personaliza el diseño, factura a tus clientes y controla tu stock desde el mismo panel.',
        'landing_cta_primary' => 'Crear mi catálogo',
        'landing_cta_secondary' => 'Ya tengo cuenta',
        'plans_title' => 'Planes',
        'plans_subtitle' => 'Elige el que se ajuste a tu negocio. Puedes cambiarlo cuando quieras.',
        // Encabezado de la vitrina; los catálogos se anclan desde cada ficha
        'showcase_title' => 'Hecho por negocios como el tuyo',
        'showcase_subtitle' => 'Catálogos reales, cada uno con su propio diseño. Entra y míralos por dentro.',
        'registrations_open' => '1',
        // Cinta fina sobre la portada: lo más barato para anunciar algo
        'landing_announcement' => '',
        'landing_announcement_link' => '',
        'landing_meta_description' => '',
        'social_instagram' => '',
        'social_facebook' => '',
        'social_tiktok' => '',
        // Vacío = lo que diga config/planes.php
        'trial_days' => '',
        'grace_days' => '',
        'support_email' => '',
        'support_whatsapp' => '',
        'security_email' => '',
        'terms_url' => '',
        'privacy_url' => '',
    ];

    public function edit(): Response
    {
        return Inertia::render('Admin/Ajustes', [
            'ajustes' => array_merge(self::KEYS, Setting::allPlatform()),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'brand_name' => ['required', 'string', 'max:60'],
            'landing_headline' => ['required', 'string', 'max:200'],
            'landing_subheadline' => ['nullable', 'string', 'max:500'],
            'landing_cta_primary' => ['required', 'string', 'max:40'],
            'landing_cta_secondary' => ['required', 'string', 'max:40'],
            'plans_title' => ['required', 'string', 'max:80'],
            'plans_subtitle' => ['nullable', 'string', 'max:300'],
            'showcase_title' => ['required', 'string', 'max:80'],
            'showcase_subtitle' => ['nullable', 'string', 'max:300'],
            'registrations_open' => ['required', 'in:0,1'],
            'landing_announcement' => ['nullable', 'string', 'max:160'],
            'landing_announcement_link' => ['nullable', 'string', 'max:255'],
            'landing_meta_description' => ['nullable', 'string', 'max:200'],
            'social_instagram' => ['nullable', 'string', 'max:255'],
            'social_facebook' => ['nullable', 'string', 'max:255'],
            'social_tiktok' => ['nullable', 'string', 'max:255'],
            'trial_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'grace_days' => ['nullable', 'integer', 'min:1', 'max:180'],
            'support_email' => ['nullable', 'email', 'max:160'],
            'support_whatsapp' => ['nullable', 'string', 'max:40'],
            'security_email' => ['nullable', 'email', 'max:160'],
            'terms_url' => ['nullable', 'string', 'max:255'],
            'privacy_url' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::putPlatform($key, $value);
        }

        ActivityLog::record('plataforma.ajustes', 'Actualizó los ajustes de la plataforma');

        return back()->with('success', 'Ajustes guardados.');
    }
}
