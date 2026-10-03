<?php

/**
 * Vigilancia de la plataforma.
 *
 * El registro de seguridad guarda lo que parece un abuso y avisa al admin
 * por correo cuando el hecho es grave. Los umbrales están pensados para que
 * el aviso signifique algo: un error de contraseña no es un ataque, cinco
 * seguidos desde la misma IP sí lo parecen.
 */
return [

    // Avisos por correo. Con false, todo se sigue registrando pero nadie recibe correo.
    'avisos' => (bool) env('SEGURIDAD_AVISOS', true),

    // Minutos antes de volver a avisar del mismo tipo de hecho, para que una
    // ráfaga no llene el buzón del admin.
    'espera_aviso' => (int) env('SEGURIDAD_ESPERA_AVISO', 60),

    // Minutos dentro de los cuales un hecho repetido suma en la misma fila
    'ventana_agrupacion' => 15,

    // Intentos de acceso fallidos desde una misma IP que se consideran ataque
    'umbral_fuerza_bruta' => (int) env('SEGURIDAD_UMBRAL_LOGIN', 5),
    'ventana_fuerza_bruta' => 15,

    // Cuentas creadas desde una misma IP en un día que se consideran ráfaga
    'umbral_registros' => (int) env('SEGURIDAD_UMBRAL_REGISTROS', 4),

    // Pedidos a la IA frenados por el mismo comercio en un día que ya son insistencia
    'umbral_ia' => 3,

    // Días que se conserva el registro antes de podarlo (model:prune)
    'retencion_dias' => (int) env('SEGURIDAD_RETENCION_DIAS', 120),

];
