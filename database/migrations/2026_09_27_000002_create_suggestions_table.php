<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buzón de sugerencias y reportes de error: lo que el comercio quiere
 * decirle al administrador de la plataforma, con su respuesta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();  // comercio que escribe
            $table->string('type', 20);          // sugerencia | error
            $table->string('subject');
            $table->text('body');
            $table->string('status', 20)->default('nueva'); // nueva | en_proceso | resuelta | descartada

            // Contexto útil para reproducir un error
            $table->string('page')->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('image_path')->nullable();       // captura de pantalla

            $table->text('reply')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->foreignId('replied_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('read_at')->nullable();        // el admin la abrió
            $table->timestamp('reply_seen_at')->nullable();  // el comercio leyó la respuesta

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suggestions');
    }
};
