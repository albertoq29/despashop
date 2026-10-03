<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * «Reposición» pasa a significar una entrada registrada con su costo.
 *
 * Hasta hoy la única forma de reponer era escribir un stock más grande al
 * editar el producto, y el libro anotaba eso como `reposicion` valorándolo
 * al costo que el producto tenía en ese momento. Ahora hay un formulario
 * que pregunta cuántas unidades entraron y a qué costo, así que conviene
 * distinguir las dos cosas: lo que se escribió a mano queda como `ajuste`.
 *
 * Todas las filas que existen hoy vienen del camino viejo, así que se
 * pueden renombrar sin perder nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('product_purchases')
            ->where('origin', 'reposicion')
            ->update(['origin' => 'ajuste']);
    }

    public function down(): void
    {
        DB::table('product_purchases')
            ->where('origin', 'ajuste')
            ->update(['origin' => 'reposicion']);
    }
};
