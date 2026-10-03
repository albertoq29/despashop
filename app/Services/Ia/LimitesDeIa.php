<?php

namespace App\Services\Ia;

use App\Models\AiGeneration;
use App\Models\User;

/**
 * Cuánto puede usar la IA cada comercio.
 *
 * - Límite diario por plan (plans.ai_daily_limit), o el de config/ia.php
 *   si el comercio no tiene plan. Cero desactiva la función.
 * - Una espera mínima entre creaciones, para que nadie la dispare en ráfaga.
 * - Un tope diario de toda la plataforma, que protege la clave gratuita.
 *
 * Solo gastan cupo las creaciones completadas y las rechazadas por la IA;
 * un fallo de Groq o un bloqueo del filtro local no le cuestan nada al comercio.
 */
class LimitesDeIa
{
    public function __construct(private ClienteGroq $cliente)
    {
    }

    public function limiteDiario(User $comercio): int
    {
        return $comercio->plan
            ? (int) $comercio->plan->ai_daily_limit
            : (int) config('ia.limite_diario');
    }

    /**
     * @return array{disponible: bool, limite: int, usados: int, restantes: int, espera: int}
     */
    public function estado(User $comercio): array
    {
        $limite = $this->limiteDiario($comercio);

        $usados = $this->delComercio($comercio)->queCuentan()->deHoy()->count();

        return [
            'disponible' => $this->cliente->configurado() && $limite > 0,
            'limite' => $limite,
            'usados' => $usados,
            'restantes' => max(0, $limite - $usados),
            'espera' => $this->segundosDeEspera($comercio),
        ];
    }

    /** Lanza un ErrorDeIa explicando por qué no puede usarla ahora. */
    public function verificar(User $comercio): void
    {
        if (! $this->cliente->configurado()) {
            throw ErrorDeIa::noDisponible();
        }

        $estado = $this->estado($comercio);

        if ($estado['limite'] === 0) {
            throw new ErrorDeIa('Tu plan no incluye el asistente de IA.', 403);
        }

        if ($estado['restantes'] === 0) {
            throw new ErrorDeIa(
                "Ya usaste tus {$estado['limite']} creaciones con IA de hoy. Se renuevan mañana.",
                429,
            );
        }

        if ($estado['espera'] > 0) {
            throw new ErrorDeIa("Espera {$estado['espera']} segundos antes de pedir otra propuesta.", 429);
        }

        $globales = AiGeneration::withoutGlobalScope('tenant')->queCuentan()->deHoy()->count();

        if ($globales >= (int) config('ia.limite_global_diario')) {
            throw new ErrorDeIa('El asistente alcanzó su uso máximo de hoy en la plataforma. Vuelve a intentarlo mañana.', 429);
        }
    }

    private function segundosDeEspera(User $comercio): int
    {
        $ultimo = $this->delComercio($comercio)
            ->where('status', '!=', AiGeneration::BLOQUEADA)
            ->latest('id')
            ->value('created_at');

        if (! $ultimo) {
            return 0;
        }

        $transcurridos = (int) now()->diffInSeconds($ultimo, true);

        return max(0, (int) config('ia.espera_segundos') - $transcurridos);
    }

    private function delComercio(User $comercio)
    {
        return AiGeneration::withoutGlobalScope('tenant')->where('user_id', $comercio->id);
    }
}
