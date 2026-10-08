<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Planes que se ofrecen en la página de bienvenida. El administrador
 * define nombre, precio, límites y qué aparece en cada slot.
 */
class PlanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Planes/Index', [
            'planes' => Plan::withCount(['subscribers as suscriptores' => fn ($q) => $q->where('status', User::STATUS_APPROVED)])
                ->orderBy('display_order')
                ->get(),
            // Lo que dura una prueba cuando el plan no pide otra cosa
            'diasDePrueba' => Setting::platformInt('trial_days', (int) config('planes.dias_de_prueba')),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $plan = Plan::create($this->validated($request));

        ActivityLog::record('plan.creado', 'Creó el plan ' . $plan->name, [], $plan);

        return back()->with('success', 'Plan creado.');
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $anterior = (float) $plan->price_usd;
        $descuentoAnterior = $plan->discount_percent;

        $plan->update($this->validated($request, $plan));

        if ($descuentoAnterior !== $plan->discount_percent) {
            ActivityLog::record(
                'plan.descuento',
                $this->comoQuedoElDescuento($plan),
                [
                    'porcentaje' => $plan->discount_percent,
                    'desde' => $plan->discount_starts_at?->toDateString(),
                    'hasta' => $plan->discount_ends_at?->toDateString(),
                    'cupos' => $plan->discount_limit,
                    'dias_de_prueba' => $plan->esPruebaGratis() ? $plan->diasDePrueba() : null,
                ],
                $plan
            );
        }

        if ($anterior !== (float) $plan->price_usd) {
            ActivityLog::record(
                'plan.precio',
                'Cambió el precio de ' . $plan->name . ' de $' . $anterior . ' a $' . $plan->price_usd,
                ['antes' => $anterior, 'ahora' => (float) $plan->price_usd],
                $plan
            );
        }

        return back()->with('success', 'Plan actualizado.');
    }

    public function destroy(Plan $plan): RedirectResponse
    {
        if ($plan->subscribers()->exists()) {
            return back()->with('error', 'No puedes eliminar un plan con comercios asignados. Desactívalo o muévelos a otro plan primero.');
        }

        $nombre = $plan->name;
        $plan->delete();

        ActivityLog::record('plan.eliminado', 'Eliminó el plan ' . $nombre);

        return back()->with('success', 'Plan eliminado.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'orden' => ['required', 'array'],
            'orden.*' => ['integer', 'exists:plans,id'],
        ]);

        foreach ($request->input('orden') as $position => $id) {
            Plan::where('id', $id)->update(['display_order' => $position]);
        }

        return back();
    }

    /** Lo que queda escrito en el registro: regalar no es rebajar. */
    private function comoQuedoElDescuento(Plan $plan): string
    {
        if (! $plan->discount_percent) {
            return 'Quitó el descuento de ' . $plan->name;
        }

        if ($plan->esPruebaGratis()) {
            $alcance = $plan->discount_limit
                ? $plan->discount_limit . ' cupos'
                : 'sin tope de cupos';

            return 'Abrió una prueba gratis de ' . $plan->diasDePrueba()
                . ' días en ' . $plan->name . ' (' . $alcance . ')';
        }

        return 'Programó un ' . $plan->discount_percent . '% de descuento en ' . $plan->name;
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        // `after` contra un campo vacío no compara nada útil, así que la regla
        // solo se agrega cuando hay fecha de inicio con la que comparar.
        $finDelDescuento = ['nullable', 'date'];

        if ($request->filled('discount_starts_at')) {
            $finDelDescuento[] = 'after:discount_starts_at';
        }

        $datos = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'slug' => ['nullable', 'string', 'max:80', Rule::unique('plans', 'slug')->ignore($plan?->id)],
            'tagline' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:600'],

            'price_usd' => ['required', 'numeric', 'min:0', 'max:100000'],
            'price_bs' => ['nullable', 'numeric', 'min:0'],
            'billing_period' => ['required', 'in:monthly,yearly,lifetime,free'],

            // El 100% es la prueba gratis, y el formulario la pide con su
            // propio botón: nadie llega ahí subiendo el porcentaje de a uno.
            'discount_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'discount_label' => ['nullable', 'string', 'max:40'],
            'discount_starts_at' => ['nullable', 'date'],
            'discount_ends_at' => $finDelDescuento,

            // Oferta por tiempo o por cupos; el tope cabe en un smallint
            'trial_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'discount_limit' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'reiniciar_cupos' => ['boolean'],

            'max_products' => ['nullable', 'integer', 'min:1'],
            'max_images_per_product' => ['nullable', 'integer', 'min:1'],
            'max_banners' => ['nullable', 'integer', 'min:1'],
            'max_invoices_per_month' => ['nullable', 'integer', 'min:1'],
            // La clave de IA es compartida: un tope razonable evita que un plan la agote
            'ai_daily_limit' => ['required', 'integer', 'min:0', 'max:50'],
            'allows_custom_domain' => ['boolean'],
            'allows_invoice_branding' => ['boolean'],
            'allows_catalog_branding' => ['boolean'],

            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:160'],
            'badge' => ['nullable', 'string', 'max:30'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_featured' => ['boolean'],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        // La promoción corre desde el primer minuto del día de inicio hasta el
        // último del de cierre: nadie piensa una oferta en horas.
        $datos['discount_percent'] = $datos['discount_percent'] ?: null;
        $datos['trial_days'] = ($datos['trial_days'] ?? null) ?: null;
        $datos['discount_limit'] = ($datos['discount_limit'] ?? null) ?: null;
        $datos['discount_starts_at'] = filled($datos['discount_starts_at'] ?? null)
            ? Carbon::parse($datos['discount_starts_at'])->startOfDay()
            : null;
        $datos['discount_ends_at'] = filled($datos['discount_ends_at'] ?? null)
            ? Carbon::parse($datos['discount_ends_at'])->endOfDay()
            : null;

        // Los cupos tomados son de la oferta que los repartió. Si se quita el
        // descuento, esa oferta ya no existe y el conteo no significa nada;
        // también se puede volver a cero a mano para repetir la promoción.
        if ($datos['discount_percent'] === null || $request->boolean('reiniciar_cupos')) {
            $datos['discount_claimed'] = 0;
        }

        unset($datos['reiniciar_cupos']);

        return $datos;
    }
}
