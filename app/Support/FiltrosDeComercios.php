<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * A quiénes alcanza un correo del administrador.
 *
 * Cada condición es una pregunta concreta sobre el comercio —hace cuánto no
 * entra, si llegó a publicar, si cargó algo— y se combinan todas con «y»:
 * así «hace un mes que no entra» + «nunca publicó» no son dos envíos, es uno
 * solo a quien cumple las dos. Escribirlas aquí y no en el controlador
 * permite probarlas sin mandar un correo.
 */
class FiltrosDeComercios
{
    /**
     * Las condiciones, con lo que significan en pantalla.
     *
     * `dias` dice si la condición necesita un número de días al lado.
     *
     * @var array<string, array{nombre: string, ayuda: string, dias: bool}>
     */
    public const CONDICIONES = [
        'sin_entrar' => [
            'nombre' => 'Hace tiempo que no entra',
            'ayuda' => 'No inicia sesión desde hace los días que digas. Quien nunca ha entrado también cuenta.',
            'dias' => true,
        ],
        'sin_publicar' => [
            'nombre' => 'Nunca publicó su catálogo',
            'ayuda' => 'Tiene cuenta y catálogo, pero sigue sin publicarlo.',
            'dias' => false,
        ],
        'sin_productos' => [
            'nombre' => 'No ha cargado productos',
            'ayuda' => 'Su inventario está vacío.',
            'dias' => false,
        ],
        'sin_facturas' => [
            'nombre' => 'No ha emitido facturas',
            'ayuda' => 'Nunca usó el módulo de facturación.',
            'dias' => false,
        ],
        'sin_vender' => [
            'nombre' => 'Hace tiempo que no factura',
            'ayuda' => 'Su última factura es más vieja que los días que digas.',
            'dias' => true,
        ],
        'sin_plan' => [
            'nombre' => 'No tiene plan asignado',
            'ayuda' => 'Nunca se le puso un plan.',
            'dias' => false,
        ],
        'plan_vencido' => [
            'nombre' => 'Su plan está vencido',
            'ayuda' => 'La fecha de vencimiento ya pasó.',
            'dias' => false,
        ],
        'recien_llegados' => [
            'nombre' => 'Se registró hace poco',
            'ayuda' => 'La cuenta se creó dentro de los días que digas.',
            'dias' => true,
        ],
    ];

    /** Entre 1 y 3 años: fuera de ahí la condición no dice nada. */
    public const DIAS_MINIMO = 1;

    public const DIAS_MAXIMO = 1095;

    /**
     * La consulta de los comercios que cumplen todas las condiciones.
     *
     * Solo comercios aprobados: a una cuenta pendiente o suspendida no se le
     * manda una campaña, se le responde su solicitud.
     *
     * @param  list<string>  $condiciones
     * @param  array<string, int>  $dias
     */
    public static function consulta(array $condiciones, array $dias = []): Builder
    {
        $query = User::query()->tenants()->approved();

        foreach (array_unique($condiciones) as $condicion) {
            if (! array_key_exists($condicion, self::CONDICIONES)) {
                continue;
            }

            $cuantos = self::diasDe($condicion, $dias);

            match ($condicion) {
                // Nunca entrar es la inactividad más larga que hay
                'sin_entrar' => $query->where(fn ($q) => $q
                    ->whereNull('last_login_at')
                    ->orWhere('last_login_at', '<', now()->subDays($cuantos))),

                // `withoutGlobalScopes` en cada subconsulta: estas tablas
                // se filtran por comercio, y aqui se cruzan todos a la vez.
                'sin_publicar' => $query->whereDoesntHave(
                    'catalogTheme',
                    fn ($q) => $q->withoutGlobalScopes()->where('is_published', true),
                ),

                'sin_productos' => $query->whereDoesntHave(
                    'products',
                    fn ($q) => $q->withoutGlobalScopes(),
                ),

                'sin_facturas' => $query->whereDoesntHave(
                    'facturas',
                    fn ($q) => $q->withoutGlobalScopes(),
                ),

                'sin_vender' => $query->whereDoesntHave(
                    'facturas',
                    fn ($q) => $q->withoutGlobalScopes()->where('created_at', '>=', now()->subDays($cuantos)),
                ),

                'sin_plan' => $query->whereNull('plan_id'),

                'plan_vencido' => $query
                    ->whereNotNull('plan_expires_at')
                    ->where('plan_expires_at', '<', now()),

                'recien_llegados' => $query->where('created_at', '>=', now()->subDays($cuantos)),

                default => null,
            };
        }

        return $query;
    }

    /** Los días de una condición, acotados a algo que tenga sentido. */
    public static function diasDe(string $condicion, array $dias): int
    {
        $valor = (int) ($dias[$condicion] ?? 30);

        return max(self::DIAS_MINIMO, min(self::DIAS_MAXIMO, $valor));
    }

    /**
     * Las condiciones como las pide una pantalla.
     *
     * @return list<array{clave: string, nombre: string, ayuda: string, dias: bool}>
     */
    public static function paraLaPantalla(): array
    {
        return array_map(
            fn (string $clave) => ['clave' => $clave, ...self::CONDICIONES[$clave]],
            array_keys(self::CONDICIONES),
        );
    }
}
