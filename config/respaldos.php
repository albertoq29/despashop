<?php

/**
 * Respaldos automáticos.
 *
 * Las fotos de los catálogos no están en la base de datos: viven en
 * storage/app/public. Un respaldo que solo cubra la base deja a todos los
 * comercios sin imágenes, así que por defecto se guardan las dos cosas.
 */
return [

    // Dónde se dejan los archivos del respaldo (fuera de public/)
    'carpeta' => env('RESPALDO_CARPETA', storage_path('app/respaldos')),

    // Cuántos respaldos se conservan. Los más viejos se borran solos.
    'conservar' => (int) env('RESPALDO_CONSERVAR', 7),

    // Incluir los archivos subidos además de la base
    'incluir_archivos' => (bool) env('RESPALDO_ARCHIVOS', true),

    // Ruta a mysqldump si no está en el PATH del servidor.
    // En Laragon suele ser C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysqldump.exe
    'mysqldump' => env('RESPALDO_MYSQLDUMP', 'mysqldump'),

];
