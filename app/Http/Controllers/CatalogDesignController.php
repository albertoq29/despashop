<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CatalogBanner;
use App\Models\CatalogModal;
use App\Models\CatalogTheme;
use App\Models\Category;
use App\Services\CatalogProvisioner;
use App\Services\Ia\LimitesDeIa;
use App\Services\PaletteExtractor;
use App\Support\Archivos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Módulo "Personalizar catálogo": aspecto visual, imágenes, banners en
 * movimiento y modales del catálogo público del comercio.
 */
class CatalogDesignController extends Controller
{
    public function __construct(
        private CatalogProvisioner $provisioner,
        private PaletteExtractor $palette,
    ) {
    }

    public function edit(Request $request, LimitesDeIa $limitesDeIa): Response
    {
        // Todo sale del comercio dueño del catálogo y no del usuario en
        // sesión: el admin puede estar editando la cuenta de otro.
        $comercio = $this->comercio($request);
        $theme = $this->theme($request);
        $plan = $comercio->plan;

        return Inertia::render('Catalogo/Personalizar', [
            'theme' => $theme,
            'banners' => CatalogBanner::orderBy('display_order')->get(),
            'modals' => CatalogModal::orderBy('display_order')->get(),
            'catalogUrl' => $comercio->catalogUrl(),
            'limites' => [
                'max_banners' => $plan?->max_banners,
                'permite_marca' => $plan?->allows_catalog_branding ?? true,
            ],
            'fuentes' => $this->fonts(),
            'nombreComercio' => $comercio->business_name ?: $comercio->name,
            'categorias' => Category::orderBy('name')->get(['id', 'name']),
            'vistaPreviaUrl' => route('catalogo.vista-previa'),
            'ia' => [
                ...$limitesDeIa->estado($comercio),
                'minimo' => config('ia.minimo_caracteres'),
                'maximo' => config('ia.maximo_caracteres'),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $theme = $this->theme($request);

        $validated = $request->validate([
            'palette_from_logo' => ['boolean'],
            'color_primary' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_secondary' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_accent' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_bg' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_surface' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_text' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_muted' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],

            'font_heading' => ['required', 'string', 'max:60'],
            'font_body' => ['required', 'string', 'max:60'],
            'heading_style' => ['required', 'in:normal,upper,gradient,underline'],
            'radius' => ['required', 'in:none,sm,md,lg,xl,full'],
            'shadow' => ['required', 'in:none,sm,md,lg'],
            'dark_mode' => ['boolean'],

            'background_style' => ['required', 'in:solid,gradient,pattern'],
            'background_pattern' => ['required', 'in:dots,grid,diagonal,waves'],
            'background_intensity' => ['required', 'integer', 'min:1', 'max:30'],

            'header_align' => ['required', 'in:left,center'],
            'header_sticky' => ['boolean'],
            'logo_size' => ['required', 'in:sm,md,lg'],

            'button_style' => ['required', 'in:solid,outline,soft,pill'],
            'card_hover' => ['required', 'in:none,lift,zoom,border,glow,tilt'],
            'image_fit' => ['required', 'in:cover,contain'],
            'image_ratio' => ['required', 'in:square,portrait,landscape'],
            'density' => ['required', 'in:compact,normal,airy'],
            'show_product_badges' => ['boolean'],
            'price_style' => ['required', 'in:normal,destacado,discreto'],
            'header_style' => ['required', 'in:glass,solid,brand,minimal'],
            'header_nav' => ['boolean'],
            'animation_level' => ['required', 'in:none,subtle,lively'],
            'animation_entrance' => ['required', 'in:fade,up,down,left,right,zoom,blur,flip'],
            'animation_speed' => ['required', 'in:slow,normal,fast'],
            'animation_stagger' => ['boolean'],
            'scroll_progress' => ['boolean'],

            'layout' => ['required', 'in:grid,list,masonry'],
            'columns_desktop' => ['required', 'integer', 'min:2', 'max:6'],
            'columns_mobile' => ['required', 'integer', 'min:1', 'max:3'],
            'card_style' => ['required', 'in:elevated,flat,bordered,overlay'],
            'category_style' => ['required', 'in:pills,underline,boxes'],
            'product_sort' => ['required', 'in:manual,newest,price_asc,price_desc,name'],
            'show_sort' => ['boolean'],
            'quick_view' => ['boolean'],
            // Ventana flotante al tocar un producto, o nada
            'product_view' => ['required', 'in:modal,ninguna'],
            'multi_select' => ['boolean'],
            'show_prices' => ['boolean'],
            'show_stock' => ['boolean'],
            'show_categories' => ['boolean'],
            'show_search' => ['boolean'],
            'show_bs_prices' => ['boolean'],
            'wholesale_prices' => ['required', 'in:off,modal,card'],

            // La forma fina de cada bloque la asegura SeccionesDelCatalogo;
            // aquí solo se avisa de lo que el comercio puede corregir.
            // Cada clave necesita su regla: `validate()` devuelve solo lo que
            // tiene regla, y sin estas el id, el estilo o la categoría de cada
            // bloque se descartaban en silencio al guardar.
            'sections' => ['required', 'array', 'max:40'],
            'sections.*' => ['array'],
            'sections.*.id' => ['nullable', 'string', 'max:40'],
            'sections.*.type' => ['required', 'string', 'max:20'],
            'sections.*.visible' => ['boolean'],
            'sections.*.style' => ['nullable', 'string', 'max:20'],
            'sections.*.align' => ['nullable', 'string', 'max:10'],
            'sections.*.limit' => ['nullable', 'integer', 'min:2', 'max:24'],
            'sections.*.category_id' => ['nullable', 'integer'],
            'sections.*.items.*.icon' => ['nullable', 'string', 'max:30'],
            'sections.*.title' => ['nullable', 'string', 'max:120'],
            'sections.*.subtitle' => ['nullable', 'string', 'max:200'],
            'sections.*.text' => ['nullable', 'string', 'max:1500'],
            'sections.*.button_text' => ['nullable', 'string', 'max:40'],
            'sections.*.button_link' => ['nullable', 'string', 'max:255'],
            'sections.*.shape' => ['nullable', 'string', 'max:12'],
            'sections.*.items' => ['nullable', 'array', 'max:12'],
            'sections.*.items.*.title' => ['nullable', 'string', 'max:60'],
            'sections.*.items.*.text' => ['nullable', 'string', 'max:400'],
            'sections.*.items.*.question' => ['nullable', 'string', 'max:160'],
            'sections.*.items.*.answer' => ['nullable', 'string', 'max:800'],
            'sections.*.items.*.value' => ['nullable', 'string', 'max:12'],
            'sections.*.items.*.rating' => ['nullable', 'integer', 'min:0', 'max:5'],

            'hero_enabled' => ['boolean'],
            'hero_style' => ['required', 'in:image,gradient,solid,video'],
            'hero_layout' => ['required', 'in:centered,split,left,minimal'],
            'hero_height' => ['required', 'in:sm,md,lg'],
            'hero_title' => ['nullable', 'string', 'max:120'],
            'hero_subtitle' => ['nullable', 'string', 'max:200'],
            'hero_cta_text' => ['nullable', 'string', 'max:40'],
            'hero_cta_link' => ['nullable', 'string', 'max:255'],

            'banners_enabled' => ['boolean'],
            'banners_autoplay' => ['boolean'],
            'banners_interval' => ['required', 'integer', 'min:1000', 'max:30000'],
            'banners_effect' => ['required', 'in:slide,fade,zoom'],
            'banners_arrows' => ['boolean'],
            'banners_dots' => ['boolean'],

            'marquee_enabled' => ['boolean'],
            'marquee_text' => ['nullable', 'string', 'max:500'],
            'marquee_speed' => ['required', 'integer', 'min:5', 'max:120'],
            'marquee_bg' => ['nullable', 'string', 'max:20'],
            'marquee_color' => ['nullable', 'string', 'max:20'],

            'whatsapp_number' => ['nullable', 'string', 'max:40'],
            'whatsapp_message' => ['nullable', 'string', 'max:500'],
            'social_links' => ['nullable', 'array'],
            'social_links.*' => ['nullable', 'string', 'max:255'],

            'seo_title' => ['nullable', 'string', 'max:120'],
            'seo_description' => ['nullable', 'string', 'max:300'],
            'announcement' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
        ]);

        // La visibilidad de portada, banners y cinta la deciden sus bloques;
        // el modelo sincroniza estas banderas al guardar las secciones.
        unset($validated['hero_enabled'], $validated['banners_enabled'], $validated['marquee_enabled']);

        $theme->update($validated);

        ActivityLog::record('catalogo.personalizado', 'Actualizó el diseño de su catálogo');

        return back()->with('success', 'Diseño del catálogo guardado.');
    }

    /**
     * Sube el logo del comercio y saca de él la paleta del catálogo.
     */
    public function uploadLogo(Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:4096'],
            'apply_palette' => ['boolean'],
        ]);

        $theme = $this->theme($request);

        $this->deleteFile($theme->logo_path);
        $path = $this->storeImage($request->file('logo'), $this->tenantId(), 'logo');

        $extracted = $this->palette->fromImage(storage_path('app/public/' . $path));

        $attributes = [
            'logo_path' => $path,
            'logo_palette' => $extracted['dominant'],
        ];

        // Por defecto el catálogo adopta los colores del logo; el comercio
        // puede desactivarlo y seguir con su paleta manual.
        if ($request->boolean('apply_palette', true)) {
            $attributes += [
                'palette_from_logo' => true,
                'color_primary' => $extracted['color_primary'],
                'color_secondary' => $extracted['color_secondary'],
                'color_accent' => $extracted['color_accent'],
                'color_bg' => $extracted['color_bg'],
                'color_surface' => $extracted['color_surface'],
                'color_text' => $extracted['color_text'],
                'color_muted' => $extracted['color_muted'],
            ];
        }

        $theme->update($attributes);

        ActivityLog::record('catalogo.logo', 'Subió el logo del comercio');

        return back()->with('success', 'Logo actualizado y paleta generada a partir de sus colores.');
    }

    /**
     * Vuelve a aplicar la paleta del logo sobre los colores actuales.
     */
    public function applyLogoPalette(Request $request): RedirectResponse
    {
        $theme = $this->theme($request);

        if (! $theme->logo_path) {
            return back()->with('error', 'Primero sube el logo del comercio.');
        }

        $extracted = $this->palette->fromImage(storage_path('app/public/' . $theme->logo_path));

        $theme->update([
            'palette_from_logo' => true,
            'logo_palette' => $extracted['dominant'],
            'color_primary' => $extracted['color_primary'],
            'color_secondary' => $extracted['color_secondary'],
            'color_accent' => $extracted['color_accent'],
            'color_bg' => $extracted['color_bg'],
            'color_surface' => $extracted['color_surface'],
            'color_text' => $extracted['color_text'],
            'color_muted' => $extracted['color_muted'],
        ]);

        return back()->with('success', 'Paleta regenerada desde el logo.');
    }

    public function uploadImage(Request $request, string $tipo): RedirectResponse
    {
        abort_unless(in_array($tipo, ['cover', 'favicon'], true), 404);

        $request->validate([
            'imagen' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif,svg', 'max:6144'],
        ]);

        $theme = $this->theme($request);
        $column = $tipo . '_path';

        $this->deleteFile($theme->{$column});
        $theme->update([
            $column => $this->storeImage($request->file('imagen'), $this->tenantId(), $tipo),
        ]);

        return back()->with('success', 'Imagen actualizada.');
    }

    public function destroyImage(Request $request, string $tipo): RedirectResponse
    {
        abort_unless(in_array($tipo, ['logo', 'cover', 'favicon'], true), 404);

        $theme = $this->theme($request);
        $column = $tipo . '_path';

        $this->deleteFile($theme->{$column});
        $theme->update([$column => null]);

        return back()->with('success', 'Imagen eliminada.');
    }

    public function togglePublish(Request $request): RedirectResponse
    {
        $theme = $this->theme($request);
        $theme->update(['is_published' => ! $theme->is_published]);

        ActivityLog::record(
            $theme->is_published ? 'catalogo.publicado' : 'catalogo.despublicado',
            $theme->is_published ? 'Publicó su catálogo' : 'Ocultó su catálogo'
        );

        return back()->with('success', $theme->is_published
            ? 'Tu catálogo ya está público.'
            : 'Tu catálogo quedó oculto.');
    }

    // Banners

    public function storeBanner(Request $request): RedirectResponse
    {
        $data = $this->validateBanner($request, true);

        $plan = $this->comercio($request)->plan;
        $max = $plan?->max_banners;

        if ($max !== null && CatalogBanner::count() >= $max) {
            return back()->with('error', "Tu plan permite hasta {$max} banners.");
        }

        $data['image_path'] = $this->storeImage($request->file('image'), $this->tenantId(), 'banner');

        if ($request->hasFile('image_mobile')) {
            $data['image_mobile_path'] = $this->storeImage($request->file('image_mobile'), $this->tenantId(), 'banner');
        }

        $data['display_order'] = (CatalogBanner::max('display_order') ?? 0) + 1;

        CatalogBanner::create($data);

        return back()->with('success', 'Banner agregado.');
    }

    public function updateBanner(Request $request, CatalogBanner $banner): RedirectResponse
    {
        $data = $this->validateBanner($request, false);

        if ($request->hasFile('image')) {
            $this->deleteFile($banner->image_path);
            $data['image_path'] = $this->storeImage($request->file('image'), $this->tenantId(), 'banner');
        }

        if ($request->hasFile('image_mobile')) {
            $this->deleteFile($banner->image_mobile_path);
            $data['image_mobile_path'] = $this->storeImage($request->file('image_mobile'), $this->tenantId(), 'banner');
        }

        $banner->update($data);

        return back()->with('success', 'Banner actualizado.');
    }

    public function destroyBanner(CatalogBanner $banner): RedirectResponse
    {
        // El modelo borra sus imágenes del disco al eliminarse
        $banner->delete();

        return back()->with('success', 'Banner eliminado.');
    }

    public function reorderBanners(Request $request): RedirectResponse
    {
        $request->validate([
            'orden' => ['required', 'array'],
            'orden.*' => ['integer'],
        ]);

        foreach ($request->input('orden') as $position => $id) {
            CatalogBanner::where('id', $id)->update(['display_order' => $position]);
        }

        return back();
    }

    // Modales

    public function storeModal(Request $request): RedirectResponse
    {
        $data = $this->validateModal($request);

        if ($request->hasFile('image')) {
            $data['image_path'] = $this->storeImage($request->file('image'), $this->tenantId(), 'modal');
        }

        $data['display_order'] = (CatalogModal::max('display_order') ?? 0) + 1;

        CatalogModal::create($data);

        return back()->with('success', 'Modal agregado.');
    }

    public function updateModal(Request $request, CatalogModal $modal): RedirectResponse
    {
        $data = $this->validateModal($request);

        if ($request->hasFile('image')) {
            $this->deleteFile($modal->image_path);
            $data['image_path'] = $this->storeImage($request->file('image'), $this->tenantId(), 'modal');
        }

        $modal->update($data);

        return back()->with('success', 'Modal actualizado.');
    }

    public function destroyModal(CatalogModal $modal): RedirectResponse
    {
        // El modelo borra su imagen del disco al eliminarse
        $modal->delete();

        return back()->with('success', 'Modal eliminado.');
    }

    // Apoyo

    private function theme(Request $request): CatalogTheme
    {
        return CatalogTheme::firstOr(function () use ($request) {
            return $this->provisioner->theme($this->comercio($request));
        });
    }

    private function validateBanner(Request $request, bool $imageRequired): array
    {
        return $request->validate([
            'image' => [$imageRequired ? 'required' : 'nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:6144'],
            'image_mobile' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:6144'],
            'title' => ['nullable', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:200'],
            'cta_text' => ['nullable', 'string', 'max:40'],
            'link' => ['nullable', 'string', 'max:255'],
            'text_position' => ['required', 'in:left,center,right'],
            'text_color' => ['nullable', 'string', 'max:20'],
            'overlay' => ['required', 'in:none,light,dark,gradient'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }

    private function validateModal(Request $request): array
    {
        return $request->validate([
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:6144'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['nullable', 'string', 'max:1500'],
            'cta_text' => ['nullable', 'string', 'max:40'],
            'cta_link' => ['nullable', 'string', 'max:255'],
            'size' => ['required', 'in:sm,md,lg'],
            'animation' => ['required', 'in:fade,zoom,slide-up,bounce'],
            'trigger' => ['required', 'in:load,delay,scroll,exit'],
            'delay_seconds' => ['required', 'integer', 'min:0', 'max:60'],
            'scroll_percent' => ['required', 'integer', 'min:1', 'max:100'],
            'frequency' => ['required', 'in:always,once_session,once_day'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }

    /** Cada comercio tiene su carpeta: catalogo/{userId}/ */
    private function storeImage(UploadedFile $file, int $userId, string $prefix): string
    {
        return Archivos::guardar($file, 'catalogo/' . $userId, $prefix);
    }

    private function deleteFile(?string $relativePath): void
    {
        Archivos::eliminar($relativePath);
    }

    /** @return list<string> */
    private function fonts(): array
    {
        // Cualquier fuente que use un tema rápido tiene que estar en la lista
        return CatalogTheme::FUENTES;
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
