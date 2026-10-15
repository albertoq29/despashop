<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\MensajeDelAdmin;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\FiltrosDeComercios;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Escribirle a los comercios que cumplen ciertas condiciones.
 *
 * Quien lleva un mes sin entrar, quien nunca llego a publicar su catalogo,
 * quien no ha cargado nada: son los que se pierden si nadie les escribe. El
 * admin arma la condicion, ve a quienes alcanza con nombre y apellido, y
 * entonces envia.
 *
 * Se manda en el momento y no en una cola porque el servidor no tiene un
 * proceso que la atienda: encolar seria no enviar nunca. Por eso hay un tope
 * por tanda, que es lo que aguanta una peticion sin agotarse.
 */
class CorreosController extends Controller
{
    /** Cuantos se envian de una vez. Mas que esto agota la peticion. */
    public const MAXIMO_POR_TANDA = 100;

    public function index(Request $request): Response
    {
        $condiciones = (array) $request->input('condiciones', []);
        $dias = (array) $request->input('dias', []);

        return Inertia::render('Admin/Correos/Index', [
            'condiciones' => FiltrosDeComercios::paraLaPantalla(),
            'maximoPorTanda' => self::MAXIMO_POR_TANDA,
            'elegidas' => array_values(array_intersect($condiciones, array_keys(FiltrosDeComercios::CONDICIONES))),
            'dias' => $dias,
            'alcance' => $this->alcance($condiciones, $dias),
        ]);
    }

    /**
     * A quienes alcanza la condicion, con nombre.
     *
     * Ver la lista antes de enviar no es un adorno: es la diferencia entre
     * mandar veinte correos y mandarle a todo el mundo por un filtro mal
     * puesto, que no se puede deshacer.
     *
     * @return array{total: int, muestra: list<array<string, mixed>>, sin_verificar: int}
     */
    private function alcance(array $condiciones, array $dias): array
    {
        $validas = array_intersect($condiciones, array_keys(FiltrosDeComercios::CONDICIONES));

        if ($validas === []) {
            return ['total' => 0, 'muestra' => [], 'sin_verificar' => 0];
        }

        $query = FiltrosDeComercios::consulta($validas, $dias);

        return [
            'total' => (clone $query)->count(),
            'sin_verificar' => (clone $query)->whereNull('email_verified_at')->count(),
            'muestra' => (clone $query)
                ->orderBy('business_name')
                ->limit(25)
                ->get(['id', 'name', 'business_name', 'username', 'email', 'last_login_at', 'created_at'])
                ->map(fn (User $comercio) => [
                    'id' => $comercio->id,
                    'nombre' => $comercio->business_name ?: $comercio->name,
                    'usuario' => $comercio->username,
                    'email' => $comercio->email,
                    'ultimoAcceso' => $comercio->last_login_at?->toDateString(),
                    'desde' => $comercio->created_at?->toDateString(),
                ])
                ->all(),
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'condiciones' => ['required', 'array', 'min:1'],
            'condiciones.*' => [Rule::in(array_keys(FiltrosDeComercios::CONDICIONES))],
            'dias' => ['nullable', 'array'],
            'dias.*' => ['nullable', 'integer', 'min:' . FiltrosDeComercios::DIAS_MINIMO, 'max:' . FiltrosDeComercios::DIAS_MAXIMO],
            'titulo' => ['required', 'string', 'max:120'],
            'cuerpo' => ['required', 'string', 'max:4000'],
            'enlace' => ['nullable', 'url', 'max:255'],
            'texto_del_enlace' => ['nullable', 'string', 'max:40'],
            'con_catalogo' => ['boolean'],
        ], [
            'condiciones.required' => 'Elige al menos una condicion: sin eso le escribirias a todo el mundo.',
            'cuerpo.required' => 'Escribe el mensaje.',
        ]);

        $comercios = FiltrosDeComercios::consulta($datos['condiciones'], $datos['dias'] ?? [])
            ->orderBy('id')
            ->limit(self::MAXIMO_POR_TANDA)
            ->get();

        if ($comercios->isEmpty()) {
            return back()->withErrors(['condiciones' => 'Ningun comercio cumple esas condiciones ahora mismo.']);
        }

        $enviados = 0;
        $fallaron = 0;

        foreach ($comercios as $comercio) {
            try {
                Mail::to($comercio->email)->send(new MensajeDelAdmin(
                    comercio: $comercio,
                    titulo: $datos['titulo'],
                    cuerpo: $datos['cuerpo'],
                    enlace: $datos['enlace'] ?? null,
                    textoDelEnlace: $datos['texto_del_enlace'] ?? null,
                    conCatalogo: $request->boolean('con_catalogo'),
                ));

                $enviados++;
            } catch (\Throwable $e) {
                // Que uno rebote no puede frenar la tanda entera
                $fallaron++;
                Log::warning('No se pudo enviar el correo del admin', [
                    'comercio' => $comercio->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        ActivityLog::record('admin.correo', "Envio un correo a {$enviados} comercios: {$datos['titulo']}", [
            'condiciones' => $datos['condiciones'],
            'enviados' => $enviados,
            'fallaron' => $fallaron,
        ]);

        $aviso = $enviados === 1 ? 'Se envio 1 correo.' : "Se enviaron {$enviados} correos.";

        if ($fallaron > 0) {
            $aviso .= " {$fallaron} no salieron; quedaron anotados en el registro.";
        }

        return back()->with('success', $aviso);
    }
}
