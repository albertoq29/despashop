<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Factura;
use App\Models\InvoiceTemplate;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Estilo guardado de la factura del comercio: logo, colores, tipografía,
 * datos fiscales y notas. Se aplica a todas sus facturas.
 */
class InvoiceTemplateController extends Controller
{
    public function __construct(private CatalogProvisioner $provisioner)
    {
    }

    public function edit(Request $request): Response
    {
        $template = $this->template($request);

        return Inertia::render('Facturas/Plantilla', [
            'plantilla' => $template,
            'ejemplo' => $this->sampleInvoice($request),
            'permiteMarca' => $request->user()->plan?->allows_invoice_branding ?? true,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $template = $this->template($request);

        $validated = $request->validate([
            'show_logo' => ['boolean'],
            'use_catalog_logo' => ['boolean'],
            'logo_size' => ['required', 'in:sm,md,lg'],

            'layout' => ['required', 'in:classic,modern,minimal,compact'],
            'color_primary' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_accent' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_text' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_bg' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'font' => ['required', 'string', 'max:60'],
            'paper_size' => ['required', 'in:a4,letter,ticket80'],
            'zebra_rows' => ['boolean'],
            'radius' => ['required', 'in:none,sm,md,lg'],

            'business_name' => ['nullable', 'string', 'max:160'],
            'tax_id' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:300'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:160'],
            'header_note' => ['nullable', 'string', 'max:200'],
            'footer_note' => ['nullable', 'string', 'max:500'],
            'terms' => ['nullable', 'string', 'max:1500'],
            'invoice_prefix' => ['nullable', 'string', 'max:12'],

            'watermark_enabled' => ['boolean'],
            'watermark_text' => ['nullable', 'string', 'max:40'],
            'watermark_opacity' => ['required', 'integer', 'min:1', 'max:40'],
            'visible_columns' => ['nullable', 'array'],
            'visible_columns.*' => ['string', 'in:descripcion,cantidad,precio,subtotal,variante,notas'],
        ]);

        $template->update($validated);

        ActivityLog::record('factura.plantilla', 'Actualizó el estilo de sus facturas');

        return back()->with('success', 'Estilo de factura guardado.');
    }

    public function uploadImage(Request $request, string $tipo): RedirectResponse
    {
        abort_unless(in_array($tipo, ['logo', 'signature'], true), 404);

        $request->validate([
            'imagen' => ['required', 'image', 'mimes:' . Archivos::FORMATOS, 'max:4096'],
        ]);

        $template = $this->template($request);
        $column = $tipo . '_path';

        $this->deleteFile($template->{$column});

        $attributes = [
            $column => $this->storeImage($request->file('imagen'), $this->tenantId(), $tipo),
        ];

        // Si sube un logo propio para la factura, deja de heredar el del catálogo
        if ($tipo === 'logo') {
            $attributes['use_catalog_logo'] = false;
            $attributes['show_logo'] = true;
        }

        $template->update($attributes);

        return back()->with('success', 'Imagen actualizada.');
    }

    public function destroyImage(Request $request, string $tipo): RedirectResponse
    {
        abort_unless(in_array($tipo, ['logo', 'signature'], true), 404);

        $template = $this->template($request);
        $column = $tipo . '_path';

        $this->deleteFile($template->{$column});
        $template->update([$column => null]);

        return back()->with('success', 'Imagen eliminada.');
    }

    private function template(Request $request): InvoiceTemplate
    {
        return InvoiceTemplate::firstOr(function () use ($request) {
            return $this->provisioner->invoiceTemplate($this->comercio($request));
        });
    }

    /** Una factura real del comercio para la vista previa; si no hay, datos de muestra. */
    private function sampleInvoice(Request $request): array
    {
        $factura = Factura::with('items')->latest()->first();

        if ($factura) {
            return [
                'numero' => $factura->id,
                'cliente' => $factura->client_name,
                'fecha' => $factura->created_at,
                'items' => $factura->items->map(fn ($item) => [
                    'descripcion' => $item->product_name,
                    'cantidad' => $item->qty,
                    'precio' => $item->unit_price_usd,
                    'subtotal' => $item->subtotal_usd,
                ])->values(),
                'subtotal_usd' => $factura->subtotal_usd,
                'descuento_usd' => $factura->discount_usd,
                'total_usd' => $factura->total_usd,
                'total_bs' => $factura->total_bs,
            ];
        }

        return [
            'numero' => 1,
            'cliente' => 'Cliente de ejemplo',
            'fecha' => now(),
            'items' => [
                ['descripcion' => 'Producto de ejemplo', 'cantidad' => 2, 'precio' => 12.5, 'subtotal' => 25.0],
                ['descripcion' => 'Otro producto', 'cantidad' => 1, 'precio' => 8.0, 'subtotal' => 8.0],
            ],
            'subtotal_usd' => 33.0,
            'descuento_usd' => 3.0,
            'total_usd' => 30.0,
            'total_bs' => 1095.0,
        ];
    }

    /** Cada comercio tiene su carpeta: facturas/{userId}/ */
    private function storeImage(UploadedFile $file, int $userId, string $prefix): string
    {
        return Archivos::guardar($file, 'facturas/' . $userId, $prefix);
    }

    private function deleteFile(?string $relativePath): void
    {
        Archivos::eliminar($relativePath);
    }
    /** Comercio dueño de estos datos: el autenticado, o el que inspecciona el admin. */
    private function comercio(Request $request): \App\Models\User
    {
        $tenantId = $this->tenantId();

        return $tenantId === $request->user()->id || $tenantId === null
            ? $request->user()
            : \App\Models\User::findOrFail($tenantId);
    }
}
