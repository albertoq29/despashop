<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'global_discount', 'value' => '0'], // Porcentaje, ej: 10
            ['key' => 'force_wholesale', 'value' => 'false'], 
            ['key' => 'force_distributor', 'value' => 'false'],
        ];

        foreach ($settings as $setting) {
            \App\Models\Setting::firstOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }
}
