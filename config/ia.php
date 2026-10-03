<?php

/**
 * Límites del asistente de IA.
 *
 * La clave de Groq es gratuita y compartida por toda la plataforma: con
 * gpt-oss-120b permite unas 1000 peticiones al día y 8000 tokens por minuto
 * en total. Una creación de catálogo gasta entre 3000 y 4500 tokens, así que
 * estos límites reparten ese cupo entre los comercios y dejan margen.
 */
return [

    // Creaciones por comercio al día cuando no tiene plan asignado.
    // Con plan, manda la columna plans.ai_daily_limit.
    'limite_diario' => (int) env('IA_LIMITE_DIARIO', 3),

    // Tope de toda la plataforma por día, para no agotar la clave gratuita
    'limite_global_diario' => (int) env('IA_LIMITE_GLOBAL_DIARIO', 150),

    // Segundos mínimos entre dos creaciones del mismo comercio
    'espera_segundos' => (int) env('IA_ESPERA_SEGUNDOS', 30),

    // Largo permitido de la descripción que escribe el comercio
    'minimo_caracteres' => 20,
    'maximo_caracteres' => 600,

    // Cuánto inventario de ejemplo puede proponer en una sola creación
    'maximo_categorias' => 8,
    'maximo_productos' => 12,

];
