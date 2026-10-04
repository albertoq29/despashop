<?php

namespace App\Providers;

use App\Listeners\VigilarAutenticacion;
use App\Mail\ConfirmarCorreo;
use App\Mail\RestablecerContrasena;
use App\Support\Tenancy;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
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

        // Los correos de verificación y de recuperación los trae el framework
        // en inglés y con otra cara. Se reemplazan por los nuestros sin
        // tocar el flujo: Laravel sigue generando y comprobando el enlace
        // firmado, aquí solo se decide cómo se ve el mensaje.
        // El `->to()` no sobra: una notificación que devuelve un Mailable en
        // vez de un MailMessage no hereda el destinatario, y el envío
        // revienta con «An email must have a To header».
        VerifyEmail::toMailUsing(
            fn ($usuario, string $enlace) => (new ConfirmarCorreo($usuario, $enlace))
                ->to($usuario->getEmailForVerification()),
        );

        ResetPassword::toMailUsing(
            fn ($usuario, string $token) => (new RestablecerContrasena(
                $usuario,
                route('password.reset', [
                    'token' => $token,
                    'email' => $usuario->getEmailForPasswordReset(),
                ]),
            ))->to($usuario->getEmailForPasswordReset()),
        );

        // Registro de seguridad: lo que pasa alrededor del acceso a las cuentas
        Event::listen(Failed::class, [VigilarAutenticacion::class, 'fallido']);
        Event::listen(Lockout::class, [VigilarAutenticacion::class, 'bloqueado']);
        Event::listen(Login::class, [VigilarAutenticacion::class, 'entro']);
        Event::listen(PasswordReset::class, [VigilarAutenticacion::class, 'claveRestablecida']);
    }
}
