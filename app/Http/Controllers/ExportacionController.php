<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Combo;
use App\Models\Factura;
use App\Models\Product;
use App\Models\User;
use App\Support\Archivos;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

/**
 * Descarga de todo lo que el comercio tiene cargado.
 *
 * Las condiciones de uso dicen que puede llevarse sus datos, así que esto
 * tiene que existir de verdad: un ZIP con planillas que se abren en Excel
 * y las imágenes tal como las subió.
 *
 * Se arma en el momento y se borra apenas se envía: guardar copias de todos
 * los comercios en el servidor sería otro problema.
 */
class ExportacionController extends Controller
{
    /** Separador y BOM para que Excel en español abra bien los acentos. */
    private const BOM = "\xEF\xBB\xBF";

    public function descargar(Request $request): BinaryFileResponse
    {
        $comercio = User::findOrFail($this->tenantId());
        $nombre = 'despashop-' . ($comercio->username ?: $comercio->id) . '-' . now()->format('Y-m-d');

        $ruta = storage_path('app/exportaciones/' . $nombre . '-' . uniqid() . '.zip');
        File::ensureDirectoryExists(dirname($ruta));

        // El archivo se borra al enviarse, pero una descarga interrumpida deja
        // el suyo a medias: aquí se retira lo que haya quedado de antes.
        $this->limpiarViejos(dirname($ruta));

        $zip = new ZipArchive();
        $zip->open($ruta, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $zip->addFromString('LEEME.txt', $this->leeme($comercio));

        foreach ($this->planillas($comercio) as $archivo => $filas) {
            $zip->addFromString('datos/' . $archivo, $this->csv($filas));
        }

        $this->agregarImagenes($zip);

        $zip->close();

        ActivityLog::record('datos.exportados', 'Descargó una copia de sus datos');

        return response()->download($ruta, $nombre . '.zip')->deleteFileAfterSend();
    }

    /** Retira las copias de más de una hora: son descargas que no terminaron. */
    private function limpiarViejos(string $carpeta): void
    {
        foreach (File::files($carpeta) as $archivo) {
            if ($archivo->getMTime() < now()->subHour()->getTimestamp()) {
                File::delete($archivo->getPathname());
            }
        }
    }

    /**
     * Una planilla por tipo de dato. La primera fila son los encabezados.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    private function planillas(User $comercio): array
    {
        return [
            'productos-y-servicios.csv' => Product::with('categories:id,name')->get()->map(fn (Product $p) => [
                'tipo' => $p->esServicio() ? 'Servicio' : 'Producto',
                'nombre' => $p->name,
                'descripcion' => $p->description,
                'categorias' => $p->categories->pluck('name')->implode(', '),
                'precio_detal_usd' => $p->price_usdt,
                'precio_mayor_usd' => $p->price_mayor_usdt,
                'precio_distribuidor_usd' => $p->price_distribuidor_usdt,
                'costo_usd' => $p->cost_price,
                'existencias' => $p->esServicio() ? '' : $p->stock,
                'duracion' => $p->service_duration,
                'modalidad' => Product::MODALIDADES[$p->service_mode] ?? '',
                'oculto' => $p->is_hidden ? 'si' : 'no',
                'notas_internas' => $p->notes,
                'imagen' => $p->image_path,
                'creado' => $p->created_at?->toDateTimeString(),
            ])->all(),

            'variantes.csv' => Product::with('variants')->get()->flatMap(
                fn (Product $p) => $p->variants->map(fn ($v) => [
                    'producto' => $p->name,
                    'variante' => $v->label,
                    'tipo' => $v->type,
                    'existencias' => $v->stock,
                ])
            )->all(),

            'categorias.csv' => Category::withCount('products')->get()->map(fn ($c) => [
                'nombre' => $c->name,
                'productos' => $c->products_count,
            ])->all(),

            'combos.csv' => Combo::with('products:id,name')->get()->map(fn (Combo $c) => [
                'nombre' => $c->name,
                'descripcion' => $c->description,
                'precio_usd' => $c->price_usdt,
                'costo_usd' => $c->cost_price,
                'existencias' => $c->stock,
                'incluye' => $c->products->pluck('name')->implode(', '),
                'oculto' => $c->is_hidden ? 'si' : 'no',
            ])->all(),

            'facturas.csv' => Factura::with('items')->latest('id')->get()->map(fn (Factura $f) => [
                'numero' => $f->id,
                'fecha' => $f->created_at?->toDateTimeString(),
                'cliente' => $f->client_name,
                'telefono' => $f->client_phone,
                'estado' => $f->status,
                'confirmada' => $f->confirmed_at?->toDateTimeString(),
                'subtotal_usd' => $f->subtotal_usd,
                'descuento_usd' => $f->discount_usd,
                'envio_usd' => $f->shipping_usd,
                'total_usd' => $f->total_usd,
                'total_bs' => $f->total_bs,
                'tasa_bcv' => $f->bcv_rate,
                'ganancia_usd' => $f->profit_usd,
                'renglones' => $f->items->map(fn ($i) => "{$i->qty} x {$i->product_name}")->implode(' | '),
                'notas' => $f->notes,
            ])->all(),

            'clientes.csv' => Factura::query()
                ->selectRaw('client_name, client_phone, COUNT(*) as compras, SUM(total_usd) as total_usd, MAX(created_at) as ultima')
                ->whereNotNull('client_name')
                ->groupBy('client_name', 'client_phone')
                ->orderByDesc('total_usd')
                ->get()
                ->map(fn ($c) => [
                    'cliente' => $c->client_name,
                    'telefono' => $c->client_phone,
                    'compras' => $c->compras,
                    'total_usd' => round((float) $c->total_usd, 2),
                    'ultima_compra' => $c->ultima,
                ])->all(),

            'mi-cuenta.csv' => [[
                'negocio' => $comercio->business_name,
                'responsable' => $comercio->name,
                'direccion_del_catalogo' => $comercio->catalogUrl(),
                'correo' => $comercio->email,
                'telefono' => $comercio->phone,
                'whatsapp' => $comercio->whatsapp,
                'plan' => $comercio->plan?->name,
                'plan_vence' => $comercio->plan_expires_at?->toDateString(),
                'cuenta_creada' => $comercio->created_at?->toDateTimeString(),
            ]],
        ];
    }

    /** Las imágenes, con el mismo nombre que aparece en las planillas. */
    private function agregarImagenes(ZipArchive $zip): void
    {
        $rutas = collect()
            ->merge(Product::pluck('image_path'))
            ->merge(Product::with('images')->get()->flatMap->images->pluck('image_path'))
            ->merge(Combo::pluck('image_path'))
            ->merge(CatalogTheme::first()?->only(['logo_path', 'cover_path', 'favicon_path']) ?? [])
            ->filter()
            ->unique();

        foreach ($rutas as $ruta) {
            if (Archivos::existe($ruta)) {
                $zip->addFile(Archivos::disco()->path($ruta), 'imagenes/' . $ruta);
            }
        }
    }

    /** @param  list<array<string, mixed>>  $filas */
    private function csv(array $filas): string
    {
        if ($filas === []) {
            return self::BOM . "sin datos\n";
        }

        $salida = fopen('php://temp', 'r+');
        fputcsv($salida, array_keys($filas[0]), ';');

        foreach ($filas as $fila) {
            fputcsv($salida, array_map(fn ($valor) => is_scalar($valor) || $valor === null ? $valor : json_encode($valor), $fila), ';');
        }

        rewind($salida);
        $contenido = stream_get_contents($salida);
        fclose($salida);

        return self::BOM . $contenido;
    }

    private function leeme(User $comercio): string
    {
        $marca = config('app.name');
        $fecha = now()->format('d/m/Y H:i');

        return <<<TEXTO
        COPIA DE TUS DATOS EN {$marca}
        =====================================

        Negocio: {$comercio->business_name}
        Generada: {$fecha}

        CARPETA datos/
          Planillas separadas por punto y coma, listas para abrir en Excel o
          en Google Sheets. Si Excel las abre todas en una columna, usa
          Datos → Texto en columnas y elige punto y coma.

          productos-y-servicios.csv  Todo tu catálogo, con precios y costos.
          variantes.csv              Tallas, colores y modelos con su stock.
          categorias.csv             Tus categorías.
          combos.csv                 Tus combos y qué incluye cada uno.
          facturas.csv               Todas tus facturas con sus renglones.
          clientes.csv               Tus clientes, cuánto compraron y cuándo.
          mi-cuenta.csv              Los datos de tu cuenta y tu plan.

        CARPETA imagenes/
          Las fotos tal como las subiste. El nombre de cada archivo es el
          mismo que aparece en la columna "imagen" de las planillas.

        Esta copia es tuya. Guárdala donde puedas encontrarla.
        TEXTO;
    }
}
