<?php

namespace App\Services;

use App\Models\CatalogTheme;
use App\Models\InvoiceTemplate;
use App\Models\User;
use App\Support\Tenancy;

/**
 * Deja lista la cuenta de un comercio recién aprobado: tema del catálogo
 * y plantilla de factura con valores por defecto sensatos, para que pueda
 * publicar su URL sin configurar nada primero.
 */
class CatalogProvisioner
{
    public function __construct(private Tenancy $tenancy)
    {
    }

    public function provision(User $user): void
    {
        $this->tenancy->withoutTenancy(function () use ($user) {
            $this->theme($user);
            $this->invoiceTemplate($user);
        });
    }

    public function theme(User $user): CatalogTheme
    {
        return CatalogTheme::withoutGlobalScope('tenant')->firstOrCreate(
            ['user_id' => $user->id],
            [
                'hero_title' => $user->business_name ?: $user->name,
                'hero_subtitle' => 'Explora nuestro catálogo y escríbenos para comprar.',
                'hero_cta_text' => 'Ver productos',
                'seo_title' => $user->business_name ?: $user->name,
                'whatsapp_number' => $user->whatsapp ?: $user->phone,
                'whatsapp_message' => 'Hola, vi tu catálogo y me interesa un producto.',
            ]
        );
    }

    public function invoiceTemplate(User $user): InvoiceTemplate
    {
        return InvoiceTemplate::withoutGlobalScope('tenant')->firstOrCreate(
            ['user_id' => $user->id],
            [
                'business_name' => $user->business_name ?: $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
                'footer_note' => 'Gracias por su compra.',
                'visible_columns' => ['descripcion', 'cantidad', 'precio', 'subtotal'],
            ]
        );
    }
}
