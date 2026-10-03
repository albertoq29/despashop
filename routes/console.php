<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

use Illuminate\Support\Facades\Schedule;

Schedule::command('rates:update')->everyFifteenMinutes();

// El registro de seguridad no crece para siempre: se poda lo más viejo que
// config('seguridad.retencion_dias').
Schedule::command('model:prune', ['--model' => \App\Models\SecurityEvent::class])->dailyAt('03:30');

// Planes vencidos: avisa y, cumplido el plazo de gracia, elimina la cuenta.
// Corre temprano y una sola vez al día.
Schedule::command('planes:vencidos')->dailyAt('05:00')->withoutOverlapping();

// Respaldo de la base y de los archivos subidos
Schedule::command('respaldo:crear')->dailyAt('02:00')->withoutOverlapping();