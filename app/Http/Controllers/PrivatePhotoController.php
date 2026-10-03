<?php

namespace App\Http\Controllers;

use App\Models\PrivatePhoto;
use App\Support\Archivos;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PrivatePhotoController extends Controller
{
    /**
     * Renombra una foto del fichero del producto.
     */
    public function update(Request $request, PrivatePhoto $foto)
    {
        $this->authorizeOwner($foto);

        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $foto->update(['name' => $request->name]);

        return redirect()->back()->with('success', 'Nombre actualizado.');
    }

    public function destroy(PrivatePhoto $foto)
    {
        $this->authorizeOwner($foto);

        // El modelo borra el archivo del disco al eliminarse
        $foto->delete();

        return redirect()->back()->with('success', 'Foto eliminada del fichero.');
    }

    private function authorizeOwner(PrivatePhoto $foto): void
    {
        if ((int) $foto->user_id !== (int) $this->tenantId()) {
            abort(403, 'No tienes permiso para acceder a esta foto.');
        }
    }
}
