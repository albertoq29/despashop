<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Asistente de IA. La clave vive solo en el servidor.
    'groq' => [
        'key' => env('GROQ_API_KEY'),
        'url' => env('GROQ_URL', 'https://api.groq.com/openai/v1/chat/completions'),
        'modelo' => env('GROQ_MODELO', 'openai/gpt-oss-120b'),
        // Si el principal está saturado se intenta con este, que tiene su propio cupo
        'modelo_respaldo' => env('GROQ_MODELO_RESPALDO', 'openai/gpt-oss-20b'),
        // Clasificador que revisa la descripción antes de generar. Vacío lo desactiva.
        'modelo_moderacion' => env('GROQ_MODELO_MODERACION', 'openai/gpt-oss-safeguard-20b'),
        'timeout' => (int) env('GROQ_TIMEOUT', 45),
    ],

];
