<?php

namespace App\Console\Commands;

use App\Mail\AvisoDeVencimiento;
use App\Mail\PlanPorVencer;
use App\Mail\DatosEliminados;
use App\Models\ActivityLog;
use App\Models\Setting;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Lleva el ciclo de un plan vencido: avisa, vuelve a avisar y, cumplido el
 * plazo, elimina la cuenta con todo su contenido.
 *
 *   php artisan planes:vencidos            corre de verdad
 *   php artisan planes:vencidos --simular  dice qué haría, sin tocar nada
 *
 * El catálogo ya se esconde solo el día que vence (lo hace
 * PublicCatalogController); este comando se ocupa de lo que viene después.
 * Se programa una vez al día: correr dos veces el mismo día no duplica
 * avisos ni adelanta ningún borrado.
 */
class RevisarPlanesVencidos extends Command
{
    protected $signature = 'planes:vencidos
        {--simular : Muestra qué pasaría sin enviar correos ni borrar nada}';

    protected $description = 'Avisa a los comercios con el plan vencido y elimina los que agotaron el plazo';

    public function handle(Tenancy $tenancy): int
    {
        $simular = (bool) $this->option('simular');
        $gracia = Setting::platformInt('grace_days', (int) config('planes.dias_de_gracia'));
        $avisos = (array) config('planes.avisos');

        $porVencer = $this->avisarALosQueVanAVencer($tenancy, $simular);

        // El admin no tiene plan, y una cuenta suspendida a mano la maneja el
        // administrador: aquí solo entran comercios activos con fecha vencida.
        $comercios = $tenancy->withoutTenancy(fn () => User::tenants()
            ->approved()
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '<', now())
            ->with('plan:id,name')
            ->get());

        if ($comercios->isEmpty()) {
            $this->info('No hay planes vencidos.');
            $this->info(($simular ? '[simulación] ' : '') . "Avisos por vencer: {$porVencer}");

            return self::SUCCESS;
        }

        $avisados = 0;
        $eliminados = 0;

        foreach ($comercios as $comercio) {
            $vencidoHace = $comercio->diasVencido();
            $paraBorrado = $gracia - $vencidoHace;

            if ($vencidoHace >= $gracia) {
                $eliminados += $this->eliminar($comercio, $simular, $tenancy) ? 1 : 0;

                continue;
            }

            if (in_array($vencidoHace, $avisos, true) && ! $this->yaAvisadoHoy($comercio)) {
                $avisados += $this->avisar($comercio, $paraBorrado, $simular) ? 1 : 0;
            }
        }

        $this->newLine();
        $this->info(($simular ? '[simulación] ' : '') . "Avisos por vencer: {$porVencer}");
        $this->info(($simular ? '[simulación] ' : '') . "Avisos enviados: {$avisados}");
        $this->info(($simular ? '[simulación] ' : '') . "Cuentas eliminadas: {$eliminados}");

        return self::SUCCESS;
    }

    /**
     * Avisa a los que están por vencer, antes de que se les caiga nada.
     *
     * El resto del comando se ocupa de lo que ya venció; esto es lo que
     * evita llegar a eso. Se marca con el mismo `expiry_notified_at` que
     * los avisos de después: es «la última vez que se le escribió por su
     * plan», y una renovación lo limpia.
     */
    private function avisarALosQueVanAVencer(Tenancy $tenancy, bool $simular): int
    {
        $dias = array_filter((array) config('planes.avisos_previos'), fn ($d) => (int) $d > 0);

        if ($dias === []) {
            return 0;
        }

        $comercios = $tenancy->withoutTenancy(fn () => User::tenants()
            ->approved()
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '>=', now())
            ->whereDate('plan_expires_at', '<=', now()->addDays(max($dias)))
            ->with('plan:id,name')
            ->get());

        $enviados = 0;

        foreach ($comercios as $comercio) {
            $faltan = $comercio->diasParaVencer();

            if (! in_array($faltan, array_map('intval', $dias), true) || $this->yaAvisadoHoy($comercio)) {
                continue;
            }

            $nombre = $comercio->business_name ?: $comercio->name;
            $this->line("· Por vencer: {$nombre} ({$comercio->email}) en {$faltan} días");

            if ($simular) {
                $enviados++;

                continue;
            }

            try {
                Mail::to($comercio->email)->send(new PlanPorVencer($comercio, $faltan));
                $comercio->forceFill(['expiry_notified_at' => now()])->save();
                $enviados++;
            } catch (Throwable $e) {
                Log::warning('No se pudo avisar de un plan por vencer', [
                    'comercio' => $comercio->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $enviados;
    }

    private function yaAvisadoHoy(User $comercio): bool
    {
        return $comercio->expiry_notified_at?->isToday() ?? false;
    }

    private function avisar(User $comercio, int $diasParaBorrado, bool $simular): bool
    {
        $nombre = $comercio->business_name ?: $comercio->name;
        $this->line("· Aviso a {$nombre} ({$comercio->email}): quedan {$diasParaBorrado} días");

        if ($simular) {
            return true;
        }

        try {
            Mail::to($comercio->email)->send(new AvisoDeVencimiento($comercio, $diasParaBorrado));
        } catch (Throwable $e) {
            // Un correo que no sale no puede frenar al resto de la cola
            Log::warning('No se pudo avisar del vencimiento', ['comercio' => $comercio->id, 'error' => $e->getMessage()]);

            return false;
        }

        $comercio->forceFill(['expiry_notified_at' => now()])->saveQuietly();

        ActivityLog::create([
            'user_id' => $comercio->id,
            'action' => 'plan.aviso_vencimiento',
            'description' => "Se avisó del vencimiento; quedan {$diasParaBorrado} días antes de eliminar los datos",
        ]);

        return true;
    }

    /**
     * Elimina la cuenta y todo lo suyo.
     *
     * El correo sale **antes** de borrar: después ya no existe la dirección
     * a la que escribir. Si el correo falla, el borrado sigue igual, porque
     * el plazo se cumplió y ya se avisó antes.
     */
    private function eliminar(User $comercio, bool $simular, Tenancy $tenancy): bool
    {
        $nombre = $comercio->business_name ?: $comercio->name;
        $usuario = (string) $comercio->username;

        if (! config('planes.borrado_automatico')) {
            $this->warn("· {$nombre} agotó el plazo, pero el borrado automático está apagado");

            return false;
        }

        $this->line("· Eliminando {$nombre} (/{$usuario}) · venció hace {$comercio->diasVencido()} días");

        if ($simular) {
            return true;
        }

        try {
            Mail::to($comercio->email)->send(new DatosEliminados($nombre, $usuario));
        } catch (Throwable $e) {
            Log::warning('No se pudo avisar de la eliminación', ['comercio' => $comercio->id, 'error' => $e->getMessage()]);
        }

        // Queda constancia fuera de la cuenta: el registro se borra con ella
        Log::info('Cuenta eliminada por plan vencido', [
            'id' => $comercio->id,
            'usuario' => $usuario,
            'correo' => $comercio->email,
            'vencio' => $comercio->plan_expires_at?->toDateTimeString(),
        ]);

        // El modelo borra en cascada sus productos, facturas e imágenes
        $tenancy->withoutTenancy(fn () => $comercio->delete());

        return true;
    }
}
