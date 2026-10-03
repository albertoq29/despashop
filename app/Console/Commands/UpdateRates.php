<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ExchangeRate;
use App\Services\ExchangeRateService;
use Illuminate\Support\Facades\Log;

class UpdateRates extends Command
{
    protected $signature = 'rates:update';
    protected $description = 'Actualiza la tasa del BCV automáticamente';

    public function handle(ExchangeRateService $service)
    {
        $this->info('Consultando tasas...');
        
        try {
            $rates = $service->getRates();

            if ($rates['bcv'] > 0) {
                
                ExchangeRate::create([
                    'bcv' => $rates['bcv'],
                ]);

                $this->info('Tasa actualizada: BCV: ' . $rates['bcv']);
                Log::info('Tasa BCV actualizada automáticamente.');
            } else {
                $this->error('No se pudo obtener la tasa BCV correctamente.');
                Log::error('Fallo actualización automática de tasas: valor BCV en 0');
            }

        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            Log::error('Error comando rates:update: ' . $e->getMessage());
        }
    }
}