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

    // Días después de vencer en que se manda un aviso (0 = el mismo día).
    // El último debe dar margen suficiente para reaccionar.
    'avisos' => [0, 7, 12],

    // Días de una prueba gratis dada desde el panel de administración
    'dias_de_prueba' => (int) env('PLANES_DIAS_DE_PRUEBA', 30),

];
