<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExchangeRateService
{
    public function getRates()
    {
        $bcvRate = $this->getBcv();

        return [
            'bcv' => $bcvRate,
        ];
    }

    private function getBcv()
    {
        $rate = 0;
        // Intento 1: API DolarApi
        try {
            $response = Http::timeout(5)->get('https://ve.dolarapi.com/v1/dolares/oficial');
            if ($response->ok()) {
                $rate = $response->json()['promedio'] ?? 0;
            }
        } catch (\Exception $e) {}

        // Intento 2: Web Scraping BCV (Respaldo)
        if ($rate <= 0) {
            try {
                $html = Http::withoutVerifying()->timeout(10)->get('http://bcv.org.ve')->body();
                preg_match('/USD.*?<strong>\s*([\d,]+)\s*<\/strong>/s', $html, $matches);
                if (isset($matches[1])) {
                    $rate = floatval(str_replace(',', '.', $matches[1]));
                }
            } catch (\Exception $e) {}
        }
        return $rate;
    }


}