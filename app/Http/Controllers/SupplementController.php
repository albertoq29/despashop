<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Supplement;
use Illuminate\Support\Facades\Auth;

class SupplementController extends Controller
{
    public function index()
    {
        $supplements = Supplement::where('user_id', $this->tenantId())
            ->orderBy('name')
            ->get();

        $totalInvested = $supplements->sum('total_investment');

        return Inertia::render('Supplements/Index', [
            'supplements' => $supplements,
            'totalInvested' => round($totalInvested, 2),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:200',
            'type' => 'required|in:unit,meters',
            'stock' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
        ]);

        Supplement::create([
            'user_id' => $this->tenantId(),
            'name' => $request->name,
            'type' => $request->type,
            'stock' => $request->stock,
            'cost_price' => $request->cost_price,
            'total_purchased' => $request->stock, // inicializado con el stock inicial
        ]);

        return redirect()->back()->with('success', 'Suplemento / Material creado con éxito.');
    }

    public function update(Request $request, Supplement $suplemento)
    {
        if ((int) $suplemento->user_id !== (int) $this->tenantId()) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:200',
            'type' => 'required|in:unit,meters',
            'stock' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
        ]);

        $stockDiff = (float)$request->stock - (float)$suplemento->stock;
        $totalPurchased = (float)$suplemento->total_purchased;
        if ($stockDiff > 0) {
            $totalPurchased += $stockDiff;
        }

        $suplemento->update([
            'name' => $request->name,
            'type' => $request->type,
            'stock' => $request->stock,
            'cost_price' => $request->cost_price,
            'total_purchased' => $totalPurchased,
        ]);

        return redirect()->back()->with('success', 'Suplemento / Material actualizado con éxito.');
    }

    public function destroy(Supplement $suplemento)
    {
        if ((int) $suplemento->user_id !== (int) $this->tenantId()) {
            abort(403);
        }

        $suplemento->delete();

        return redirect()->back()->with('success', 'Suplemento / Material eliminado con éxito.');
    }
}
