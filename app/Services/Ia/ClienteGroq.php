<?php

namespace App\Services\Ia;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente mínimo de la API de Groq (compatible con la de OpenAI).
 *
 * Si el modelo principal responde que está saturado se intenta una vez con
 * el de respaldo, que tiene su propio cupo. Cualquier otro problema se
 * convierte en un ErrorDeIa con un mensaje para el comercio.
 */
class ClienteGroq
{
    public function configurado(): bool
    {
        return filled(config('services.groq.key'));
    }

    /**
     * @param  list<array{role: string, content: string}>  $mensajes
     * @param  array<string, mixed>  $opciones  Parámetros extra para la API (response_format, max_completion_tokens...)
     * @return array{contenido: string, modelo: string, tokens_entrada: int, tokens_salida: int}
     */
    public function completar(array $mensajes, array $opciones = [], ?string $modelo = null, bool $conRespaldo = true): array
    {
        if (! $this->configurado()) {
            throw ErrorDeIa::noDisponible();
        }

        $modelo ??= config('services.groq.modelo');
        $respuesta = $this->enviar($modelo, $mensajes, $opciones);

        $respaldo = config('services.groq.modelo_respaldo');

        if ($respuesta->status() === 429 && $conRespaldo && $respaldo && $respaldo !== $modelo) {
            $modelo = $respaldo;
            $respuesta = $this->enviar($modelo, $mensajes, $opciones);
        }

        if ($respuesta->status() === 429) {
            throw ErrorDeIa::saturada();
        }

        // Con esquema estricto, Groq rechaza la respuesta entera si un solo
        // valor se sale de la lista (una fuente que no existe, por ejemplo),
        // pero la devuelve en `failed_generation`. Quien llama ya corrige los
        // valores inválidos, así que se aprovecha en lugar de gastar otro pedido.
        if ($respuesta->status() === 400 && $respuesta->json('error.code') === 'json_validate_failed') {
            $generado = $respuesta->json('error.failed_generation');

            if (is_string($generado) && is_array(json_decode($generado, true))) {
                return [
                    'contenido' => $generado,
                    'modelo' => $modelo,
                    'tokens_entrada' => 0,
                    'tokens_salida' => 0,
                ];
            }
        }

        if ($respuesta->failed()) {
            Log::warning('Groq respondió con error', [
                'modelo' => $modelo,
                'estado' => $respuesta->status(),
                'error' => $respuesta->json('error.message') ?? mb_substr($respuesta->body(), 0, 300),
            ]);

            throw ErrorDeIa::fallo();
        }

        $eleccion = $respuesta->json('choices.0');

        // Cortada por largo: el JSON quedaría incompleto
        if (($eleccion['finish_reason'] ?? null) === 'length' || blank($eleccion['message']['content'] ?? null)) {
            throw ErrorDeIa::fallo();
        }

        return [
            'contenido' => $eleccion['message']['content'],
            'modelo' => $modelo,
            'tokens_entrada' => (int) $respuesta->json('usage.prompt_tokens', 0),
            'tokens_salida' => (int) $respuesta->json('usage.completion_tokens', 0),
        ];
    }

    private function enviar(string $modelo, array $mensajes, array $opciones): Response
    {
        try {
            return Http::withToken(config('services.groq.key'))
                ->acceptJson()
                ->timeout(config('services.groq.timeout', 45))
                ->post(config('services.groq.url'), [
                    'model' => $modelo,
                    'messages' => $mensajes,
                    ...$opciones,
                ]);
        } catch (ConnectionException $e) {
            Log::warning('Groq no respondió a tiempo', ['modelo' => $modelo, 'error' => $e->getMessage()]);

            throw ErrorDeIa::fallo($e);
        }
    }
}
