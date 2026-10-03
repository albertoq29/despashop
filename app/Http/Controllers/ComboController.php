<?php

namespace App\Http\Controllers;

use App\Models\Combo;
use App\Models\ComboImage;
use App\Support\Archivos;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ComboController extends Controller
{
    public function index()
    {
        $combos = Combo::with(['products.images', 'images'])
                       ->where('user_id', $this->tenantId())
                       ->latest()
                       ->get();

        // All user products available to be added to combos
        $products = Product::with(['images'])
                           ->where('user_id', $this->tenantId())
                           ->latest()
                           ->get();

        return Inertia::render('Combos/Index', [
            'combos'   => $combos,
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name'                     => 'required|string|max:255',
                'price_usdt'               => 'nullable|numeric|min:0',
                'price_type'               => 'nullable|string|in:detal,mayor,distribuidor',
                'cost_price'               => 'nullable|numeric|min:0',
                'stock'                    => 'required|integer|min:0',
                'description'              => 'nullable|string',
                'notes'                    => 'nullable|string',
                'conditional_price'        => 'nullable|numeric|min:0.01',
                'conditional_min_quantity' => 'nullable|integer|min:1',
                'image'                    => 'nullable|image|max:10240',
                'photos'                   => 'nullable|array',
                'photos.*'                 => 'image|max:10240',
                'product_ids'              => 'nullable|array',
                'product_ids.*'            => 'exists:products,id',
                'products'                 => 'nullable|array',
                'products.*.product_id'    => 'required|exists:products,id',
                'products.*.price_type'    => 'required|string|in:detal,mayor,distribuidor',
            ]);

            $dbPath = $request->hasFile('image')
                ? Archivos::guardar($request->file('image'), 'combos')
                : null;

            $combo = Combo::create([
                'user_id'                  => $this->tenantId(),
                'name'                     => $request->name,
                'price_usdt'               => $request->price_usdt ?: null,
                'price_type'               => $request->price_type ?: 'detal',
                'price_mayor_usdt'         => null,
                'price_distribuidor_usdt'  => null,
                'cost_price'               => $request->cost_price,
                'stock'                    => $request->stock,
                'description'              => $request->description,
                'notes'                    => $request->notes,
                'conditional_price'        => $request->conditional_price,
                'conditional_min_quantity' => $request->conditional_min_quantity,
                'image_path'               => $dbPath,
                'is_hidden'                => filter_var($request->input('is_hidden', false), FILTER_VALIDATE_BOOLEAN),
            ]);

            $syncData = [];
            if ($request->has('products')) {
                foreach ($request->input('products', []) as $p) {
                    if (!empty($p['product_id'])) {
                        $syncData[$p['product_id']] = ['price_type' => $p['price_type'] ?? 'detal'];
                    }
                }
            } else {
                $ids = array_filter((array)($request->input('product_ids', [])), fn($v) => $v !== '');
                foreach ($ids as $id) {
                    $syncData[$id] = ['price_type' => 'detal'];
                }
            }
            $combo->products()->sync($syncData);

            if ($request->hasFile('photos')) {
                foreach ($request->file('photos') as $photoFile) {
                    ComboImage::create([
                        'combo_id' => $combo->id,
                        'image_path' => Archivos::guardar($photoFile, 'combos'),
                    ]);
                }
            }

            return redirect()->back()->with('success', 'Combo creado correctamente.');

        } catch (\Exception $e) {
            Log::error('Error al crear combo: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, Combo $combo)
    {
        if ($combo->user_id !== $this->tenantId()) abort(403);

        try {
            $request->validate([
                'name'                     => 'required|string|max:255',
                'price_usdt'               => 'nullable|numeric|min:0',
                'price_type'               => 'nullable|string|in:detal,mayor,distribuidor',
                'cost_price'               => 'nullable|numeric|min:0',
                'stock'                    => 'required|integer|min:0',
                'description'              => 'nullable|string',
                'notes'                    => 'nullable|string',
                'conditional_price'        => 'nullable|numeric|min:0.01',
                'conditional_min_quantity' => 'nullable|integer|min:1',
                'image'                    => 'nullable|image|max:10240',
                'photos'                   => 'nullable|array',
                'photos.*'                 => 'image|max:10240',
                'product_ids'              => 'nullable|array',
                'product_ids.*'            => 'exists:products,id',
                'products'                 => 'nullable|array',
                'products.*.product_id'    => 'required|exists:products,id',
                'products.*.price_type'    => 'required|string|in:detal,mayor,distribuidor',
            ]);

            $data = $request->only(
                'name', 'price_type', 'cost_price',
                'stock', 'description', 'notes', 'conditional_price', 'conditional_min_quantity'
            );
            $data['price_usdt'] = $request->price_usdt ?: null;
            if (empty($data['price_type'])) {
                $data['price_type'] = $combo->price_type ?: 'detal';
            }
            $data['price_mayor_usdt'] = null;
            $data['price_distribuidor_usdt'] = null;
            $data['is_hidden']  = filter_var($request->input('is_hidden', false), FILTER_VALIDATE_BOOLEAN);

            if ($request->hasFile('image')) {
                Archivos::eliminar($combo->image_path);
                $data['image_path'] = Archivos::guardar($request->file('image'), 'combos');
            }

            $combo->update($data);

            $syncData = [];
            if ($request->has('products')) {
                foreach ($request->input('products', []) as $p) {
                    if (!empty($p['product_id'])) {
                        $syncData[$p['product_id']] = ['price_type' => $p['price_type'] ?? 'detal'];
                    }
                }
            } else {
                $ids = array_filter((array)($request->input('product_ids', [])), fn($v) => $v !== '');
                foreach ($ids as $id) {
                    $syncData[$id] = ['price_type' => 'detal'];
                }
            }
            $combo->products()->sync($syncData);

            if ($request->hasFile('photos')) {
                foreach ($request->file('photos') as $photoFile) {
                    ComboImage::create([
                        'combo_id' => $combo->id,
                        'image_path' => Archivos::guardar($photoFile, 'combos'),
                    ]);
                }
            }

            return redirect()->back()->with('success', 'Combo actualizado correctamente.');

        } catch (\Exception $e) {
            Log::error('Error al actualizar combo: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function destroy(Combo $combo)
    {
        if ($combo->user_id !== $this->tenantId()) abort(403);

        try {
            // El modelo borra del disco su imagen y su galería al eliminarse
            $combo->products()->detach();
            $combo->delete();
            return redirect()->back()->with('success', 'Combo eliminado.');
        } catch (\Exception $e) {
            Log::error('Error al eliminar combo: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al eliminar']);
        }
    }

    public function toggleHidden(Combo $combo)
    {
        if ($combo->user_id !== $this->tenantId()) abort(403);
        $combo->update(['is_hidden' => !$combo->is_hidden]);
        return redirect()->back()->with('success', $combo->is_hidden ? 'Combo ocultado de la tienda.' : 'Combo visible en la tienda.');
    }

    public function destroyImage($id)
    {
        $image = ComboImage::findOrFail($id);
        $combo = Combo::findOrFail($image->combo_id);
        if ($combo->user_id !== $this->tenantId()) abort(403);

        $image->delete();

        return redirect()->back()->with('success', 'Imagen eliminada.');
    }
}
