<?php

namespace Tests\Unit;

use App\Support\Whatsapp;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Números de WhatsApp escritos como se escriben aquí.
 *
 * Nadie anota su número en formato internacional: se anota «0424 123
 * 4567», que es como se marca dentro del país. Ese cero de adelante no es
 * parte del número y WhatsApp no lo acepta, así que los enlaces del
 * catálogo abrían un chat con un número que no existe.
 */
class WhatsappTest extends TestCase
{
    public static function numeros(): array
    {
        return [
            'con cero y espacios' => ['0424 123 4567', '584241234567'],
            'con cero pegado' => ['04241234567', '584241234567'],
            'con cero y guiones' => ['0414-111-2233', '584141112233'],
            'con cero y paréntesis' => ['(0412) 555 8899', '584125558899'],
            'ya tiene el país con más' => ['+58 424 1234567', '584241234567'],
            'ya tiene el país sin más' => ['584241234567', '584241234567'],
            'prefijo internacional' => ['0058 424 1234567', '584241234567'],
            'un fijo de Caracas' => ['0212 5551122', '582125551122'],
            'vacío' => ['', ''],
            'solo letras' => ['no tengo', ''],
            'nulo' => [null, ''],
        ];
    }

    #[DataProvider('numeros')]
    public function test_el_numero_queda_como_lo_entiende_whatsapp(?string $escrito, string $esperado): void
    {
        $this->assertSame($esperado, Whatsapp::numero($escrito));
    }

    /** Un número de otro país no se toca: el cero local es cosa de aquí. */
    public function test_un_numero_extranjero_se_queda_igual(): void
    {
        $this->assertSame('14155550123', Whatsapp::numero('+1 415 555 0123'));
        $this->assertSame('34600111222', Whatsapp::numero('+34 600 111 222'));
    }

    public function test_el_enlace_lleva_el_numero_arreglado(): void
    {
        $this->assertSame('https://wa.me/584241234567', Whatsapp::enlace('0424 123 4567'));
    }

    public function test_el_enlace_con_mensaje_lo_escapa(): void
    {
        $this->assertSame(
            'https://wa.me/584241234567?text=Hola%2C%20%C2%BFcu%C3%A1nto%20cuesta%3F',
            Whatsapp::enlace('04241234567', 'Hola, ¿cuánto cuesta?'),
        );
    }
}
