<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Global y por fuera de todo, para ver cómo terminó cualquier petición:
        // también las que no llegan a ninguna ruta, que es donde se nota el
        // robot buscando /.env o /wp-login.php.
        $middleware->append(\App\Http\Middleware\VigilarPeticiones::class);

        $middleware->web(append: [
            // Ata la sesión a la contraseña con la que se abrió: al cambiarla,
            // las sesiones abiertas en otros navegadores dejan de valer. Va
            // primero para que una sesión caducada no llegue a fijar tenant.
            \Illuminate\Session\Middleware\AuthenticateSession::class,
            \App\Http\Middleware\SetTenantContext::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'approved' => \App\Http\Middleware\EnsureAccountIsApproved::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
