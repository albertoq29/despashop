<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "LATEST FACTURAS AND ITEMS:\n";
$facturas = App\Models\Factura::with('items')->latest()->take(5)->get();
foreach ($facturas as $f) {
    echo "Factura ID: {$f->id}, Client: {$f->client_name}, Total USD: {$f->total_usd}, Subtotal USD: {$f->subtotal_usd}, Status: {$f->status}\n";
    foreach ($f->items as $item) {
        echo "  - Item ID: {$item->id}, Name: {$item->product_name}, Product ID: {$item->product_id}, Combo ID: {$item->combo_id}, Qty: {$item->qty}, Unit Price: {$item->unit_price_usd}, Subtotal: {$item->subtotal_usd}\n";
    }
}
