<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Services\Respaldos\RespaldoDelComercio;
use App\Services\Respaldos\RespaldoInvalido;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Respaldo del catálogo del comercio: descargarlo y volver a subirlo.
 *
 * La restauración va en dos pasos a propósito. Primero se mira qué trae el
 * archivo y se muestra en pantalla; recién entonces el comercio decide si
 * agrega lo que falta o reemplaza todo. Antes de reemplazar, la plataforma
 * guarda sola una copia de lo que había.
 */
class RespaldoController extends Controller
{
    public function __construct(private RespaldoDelComercio $respaldos)
    {
    }

    public function index(Request $request): Response
    {
        $comercio = $this->comercio();
        $pendiente = $request->session()->get('respaldo.pendiente');

        return Inertia::render('Respaldo/Index', [
            'copias' => $this->copiasGuardadas($comercio),
            // Lo que se leyó del archivo recién subido, a la espera de confirmación
            'pendiente' => $pendiente && File::exists($pendiente['ruta'] ?? '') ? $pendiente['resumen'] : null,
            'limiteMb' => 150,
        ]);
    }

    /** Arma el archivo y lo manda al navegador. */
    public function descargar(): BinaryFileResponse
    {
        $comercio = $this->comercio();
        $ruta = $this->respaldos->exportar($comercio, storage_path('app/respaldos-comercio/temporales'));

        ActivityLog::record('respaldo.descargado', 'Descargó un respaldo de su catálogo');

        return response()->download($ruta, basename($ruta))->deleteFileAfterSend();
    }

    /** Primer paso: se guarda el archivo y se lee qué trae. */
    public function subir(Request $request): RedirectResponse
    {
        $request->validate([
            'respaldo' => ['required', 'file', 'mimetypes:application/zip,application/x-zip-compressed,multipart/x-zip', 'max:153600'],
        ], [
            'respaldo.mimetypes' => 'El respaldo es un archivo ZIP. Sube el mismo que descargaste, sin descomprimirlo.',
            'respaldo.max' => 'El archivo pesa más de 150 MB. Escríbenos y lo restauramos nosotros.',
        ]);

        $comercio = $this->comercio();
        $carpeta = storage_path('app/respaldos-comercio/subidos/' . $comercio->id);
        File::ensureDirectoryExists($carpeta);

        // Solo puede haber uno a la espera: el anterior ya no sirve
        $this->olvidarPendiente($request);

        $ruta = $carpeta . DIRECTORY_SEPARATOR . 'subido-' . now()->format('YmdHis') . '.zip';
        $request->file('respaldo')->move(dirname($ruta), basename($ruta));

        $lectura = $this->respaldos->analizar($ruta);

        if (! $lectura['ok']) {
            File::delete($ruta);

            return back()->withErrors(['respaldo' => $lectura['error']]);
        }

        $request->session()->put('respaldo.pendiente', [
            'ruta' => $ruta,
            'resumen' => $lectura['resumen'],
        ]);

        return back();
    }

    /** Segundo paso: con el resumen a la vista, se aplica. */
    public function restaurar(Request $request): RedirectResponse
    {
        $validado = $request->validate([
            'modo' => ['required', 'in:agregar,reemplazar'],
            // Solo se exige cuando se reemplaza: con `required_if`, la regla
            // `accepted` seguía corriendo sobre un campo ausente y fallaba.
            'entiendo' => ['exclude_unless:modo,reemplazar', 'accepted'],
        ], [
            'entiendo.accepted' => 'Marca la casilla para confirmar que entiendes que se borrará tu catálogo actual.',
        ]);

        $pendiente = $request->session()->get('respaldo.pendiente');

        if (! $pendiente || ! File::exists($pendiente['ruta'])) {
            return back()->withErrors(['respaldo' => 'El archivo ya no está disponible. Vuelve a subirlo.']);
        }

        $comercio = $this->comercio();
        $copiaPrevia = null;

        try {
            // Red de seguridad: lo que había queda guardado antes de tocarlo
            if ($validado['modo'] === RespaldoDelComercio::MODO_REEMPLAZAR) {
                $copiaPrevia = $this->respaldos->exportar($comercio);
            }

            $hechos = $this->respaldos->restaurar($comercio, $pendiente['ruta'], $validado['modo']);
        } catch (RespaldoInvalido $e) {
            return back()->withErrors(['respaldo' => $e->getMessage()]);
        }

        $this->olvidarPendiente($request);

        ActivityLog::record('respaldo.restaurado', 'Restauró un respaldo de su catálogo', [
            'modo' => $validado['modo'],
            ...$hechos,
        ]);

        $mensaje = "Restauramos {$hechos['productos']} productos, {$hechos['categorias']} categorías y {$hechos['combos']} combos.";

        if ($hechos['omitidos'] > 0) {
            $mensaje .= " Se omitieron {$hechos['omitidos']} que ya existían o no cabían en tu plan.";
        }

        if ($copiaPrevia) {
            $mensaje .= ' Guardamos una copia de lo que tenías, por si acaso.';
        }

        return redirect()->route('respaldo.index')->with('success', $mensaje);
    }

    /** Descarta el archivo subido sin aplicarlo. */
    public function cancelar(Request $request): RedirectResponse
    {
        $this->olvidarPendiente($request);

        return back()->with('info', 'Descartamos el archivo.');
    }

    /** Las copias que la plataforma guardó antes de cada reemplazo. */
    public function descargarCopia(Request $request, string $archivo): BinaryFileResponse
    {
        $comercio = $this->comercio();

        // El nombre viene de la URL: se usa solo su base, nunca una ruta
        $ruta = storage_path('app/respaldos-comercio/' . $comercio->id . '/' . basename($archivo));

        abort_unless(File::exists($ruta) && str_ends_with($ruta, '.zip'), 404);

        return response()->download($ruta);
    }

    /** @return list<array{archivo: string, fecha: string, peso: string}> */
    private function copiasGuardadas(User $comercio): array
    {
        $carpeta = storage_path('app/respaldos-comercio/' . $comercio->id);

        if (! File::isDirectory($carpeta)) {
            return [];
        }

        return collect(File::files($carpeta))
            ->filter(fn ($archivo) => str_ends_with($archivo->getFilename(), '.zip'))
            ->sortByDesc(fn ($archivo) => $archivo->getMTime())
            ->take(5)
            ->map(fn ($archivo) => [
                'archivo' => $archivo->getFilename(),
                'fecha' => date('c', $archivo->getMTime()),
                'peso' => $this->peso($archivo->getSize()),
            ])
            ->values()
            ->all();
    }

    private function olvidarPendiente(Request $request): void
    {
        $pendiente = $request->session()->pull('respaldo.pendiente');

        if ($pendiente && File::exists($pendiente['ruta'] ?? '')) {
            File::delete($pendiente['ruta']);
        }
    }

    private function comercio(): User
    {
        return User::findOrFail($this->tenantId());
    }

    private function peso(int $bytes): string
    {
        return $bytes > 1048576
            ? round($bytes / 1048576, 1) . ' MB'
            : round($bytes / 1024) . ' KB';
    }
}
