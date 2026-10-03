<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Datos mínimos para que la plataforma arranque.
     *
     * Para cargar un comercio de ejemplo con productos:
     *   php artisan db:seed --class=DemoTenantSeeder
     */
    public function run(): void
    {
        $this->call([
            PlanSeeder::class,
            PlatformSeeder::class,
        ]);
    }
}
