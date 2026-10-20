<?php

/**
 * Qué pasa cuando un plan se vence.
 *
 * El día que vence, el catálogo deja de verse: el comercio sigue entrando a
 * su panel y ve todo lo suyo, pero el público no. A partir de ahí corre un
 * plazo de gracia; si no renueva, la cuenta se elimina con todo su contenido.
 *
 * Es una acción irreversible, así que se avisa por correo al vencer, otra vez
 * antes de borrar, y una más cuando ya se borró.
 */
return [

    // Días que se conservan los datos después de vencer el plan
    'dias_de_gracia' => (int) env('PLANES_DIAS_DE_GRACIA', 15),

    // Con false, el comando solo avisa y nunca borra. Útil para el alfa.
    'borrado_automatico' => (bool) env('PLANES_BORRADO_AUTOMATICO', true),

    // Días después de vencer en que se manda un aviso. El 1 es la mañana
    // siguiente, con el catálogo ya caído: es el aviso de que ocurrió.
    // El 0 solo alcanza a quien venció de madrugada, antes de que corriera
    // el comando; se deja por eso. El último debe dar margen para reaccionar.
    'avisos' => [0, 1, 7, 12],

    // Días ANTES de vencer en que se avisa. Llegar a tiempo es la
    // diferencia entre renovar y enterarse por un cliente que no pudo
    // entrar al catálogo.
    //
    // Uno a los siete días, para que le dé tiempo de resolver el pago, y
    // después todos los días desde los tres: a esa altura ya no es un
    // recordatorio, es la última oportunidad. El 0 es el día mismo, cuando
    // todavía se puede renovar sin que nadie se entere.
    'avisos_previos' => [7, 3, 2, 1, 0],

    // Días de una prueba gratis dada desde el panel de administración
    'dias_de_prueba' => (int) env('PLANES_DIAS_DE_PRUEBA', 30),

];
