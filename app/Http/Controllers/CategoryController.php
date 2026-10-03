<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::latest()->get();
        return Inertia::render('Categories/Index', [
            'categories' => $categories
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
        ]);

        Category::create([
            'name' => $request->name,
        ]);

        return redirect()->back()->with('success', 'Categoría creada correctamente');
    }

    public function update(Request $request, Category $categoria)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $categoria->id,
        ]);

        $categoria->update([
            'name' => $request->name,
        ]);

        return redirect()->back()->with('success', 'Categoría actualizada correctamente');
    }

    public function destroy(Category $categoria)
    {
        $categoria->delete();
        return redirect()->back()->with('success', 'Categoría eliminada correctamente');
    }
}
