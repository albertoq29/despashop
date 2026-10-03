<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up()
{
    Schema::table('products', function (Blueprint $table) {
        // Agregamos la columna user_id
        $table->foreignId('user_id')
              ->after('id') // Para que quede al principio
              ->constrained()
              ->onDelete('cascade'); // Si borran al usuario, se borran sus productos
    });
}

public function down()
{
    Schema::table('products', function (Blueprint $table) {
        $table->dropForeign(['user_id']);
        $table->dropColumn('user_id');
    });
}
};
