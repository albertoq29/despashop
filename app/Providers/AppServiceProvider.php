<?php

namespace App\Providers;

use App\Listeners\VigilarAutenticacion;
use App\Support\Tenancy;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(Tenancy::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // En producción todo se sirve por HTTPS. Sin esto, un servidor detrás
        // de un proxy genera enlaces http:// y el navegador bloquea recursos
        // mezclados; además la sesión viajaría sin cifrar.
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);
        \Illuminate\Support\Facades\Route::model('suplemento', \App\Models\Supplement::class);

        // Registro de seguridad: lo que pasa alrededor del acceso a las cuentas
        Event::listen(Failed::class, [VigilarAutenticacion::class, 'fallido']);
        Event::listen(Lockout::class, [VigilarAutenticacion::class, 'bloqueado']);
        Event::listen(Login::class, [VigilarAutenticacion::class, 'entro']);
        Event::listen(PasswordReset::class, [VigilarAutenticacion::class, 'claveRestablecida']);
    }
}
