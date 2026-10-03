<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\NuevaSolicitud;
use App\Models\ActivityLog;
use App\Models\Plan;
use App\Models\User;
use App\Services\Seguridad\RegistroDeSeguridad;
use App\Support\Administradores;
use App\Support\Terminos;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

/**
 * El registro no crea una cuenta activa: crea una solicitud.
 * El comercio queda en estado `pending` hasta que un administrador
 * la revise a mano desde su panel.
 */
class RegisteredUserController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/Register', [
            'plans' => Plan::public()->get(),
            'selectedPlan' => $request->integer('plan') ?: null,
            // Lo esencial de las condiciones, junto a la casilla de aceptación
            'resumenLegal' => Terminos::RESUMEN,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'business_name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:32',
                'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/',
                'unique:users,username',
                Rule::notIn(User::RESERVED_USERNAMES),
            ],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40'],
            'whatsapp' => ['nullable', 'string', 'max:40'],
            'requested_plan_id' => ['nullable', 'exists:plans,id'],
            'request_message' => ['nullable', 'string', 'max:1000'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'acepta_terminos' => ['accepted'],
        ], [
            'username.regex' => 'El usuario solo admite minúsculas, números y guiones, y no puede empezar ni terminar con guion.',
            'username.not_in' => 'Ese nombre de usuario está reservado por la plataforma. Elige otro.',
            'acepta_terminos.accepted' => 'Para abrir una cuenta hay que aceptar los términos y condiciones.',
        ]);

        unset($validated['acepta_terminos']);

        $user = User::create([
            ...$validated,
            'role' => User::ROLE_TENANT,
            'status' => User::STATUS_PENDING,
            // Queda constancia de qué versión aceptó y cuándo
            'terms_accepted_at' => now(),
            'terms_version' => Terminos::VERSION,
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'registro.solicitado',
            'description' => $user->business_name . ' solicitó una cuenta (/' . $user->username . ')',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'ip_address' => $request->ip(),
        ]);

        // Manda el correo de confirmación: la dirección tiene que existir
        event(new Registered($user));

        $this->avisarALosAdministradores($user);

        $this->vigilarRafaga($request, $user);

        // Entra a su cuenta, pero el middleware `approved` la mantiene
        // en la pantalla de estado hasta que el admin la apruebe.
        Auth::login($user);

        return redirect()->route('cuenta.estado');
    }

    /**
     * Varias solicitudes desde la misma dirección en un día pueden ser un
     * dueño con dos tiendas, o alguien llenando la cola de revisión. La
     * cuenta se crea igual: el admin decide, pero avisado.
     */
    /**
     * Avisa a los administradores de que hay una solicitud esperando.
     *
     * Las cuentas se aprueban a mano, así que sin este aviso la solicitud
     * depende de que a alguien se le ocurra mirar el panel. Va después de
     * responder y dentro de un try: un fallo de correo no puede impedir
     * que alguien se registre.
     */
    private function avisarALosAdministradores(User $solicitante): void
    {
        $destinos = Administradores::correos();

        if ($destinos === []) {
            return;
        }

        $pendientes = User::where('role', User::ROLE_TENANT)
            ->where('status', User::STATUS_PENDING)
            ->count();

        dispatch(function () use ($solicitante, $destinos, $pendientes) {
            try {
                Mail::to($destinos)->send(new NuevaSolicitud($solicitante, $pendientes));
            } catch (\Throwable $e) {
                Log::warning('No se pudo avisar de la nueva solicitud', [
                    'solicitante' => $solicitante->id,
                    'error' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }

    private function vigilarRafaga(Request $request, User $user): void
    {
        $desdeLaMismaIp = ActivityLog::where('action', 'registro.solicitado')
            ->where('ip_address', $request->ip())
            ->where('created_at', '>=', now()->subDay())
            ->count();

        if ($desdeLaMismaIp < (int) config('seguridad.umbral_registros')) {
            return;
        }

        app(RegistroDeSeguridad::class)->reportar(
            'registro.rafaga',
            "Se crearon {$desdeLaMismaIp} solicitudes de cuenta desde esta dirección en un día",
            ['solicitudes' => $desdeLaMismaIp, 'ultima' => $user->username],
            usuarioId: $user->id,
            comercioId: $user->id,
        );
    }
}
