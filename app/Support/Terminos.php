<?php

namespace App\Support;

/**
 * Términos de uso de la plataforma, en un solo lugar.
 *
 * El texto vive aquí y no en la página para que el registro, la página
 * pública y el correo digan exactamente lo mismo, y para poder llevar la
 * cuenta de qué versión aceptó cada comercio.
 *
 * Está escrito en palabras normales a propósito: quien se registra es un
 * comerciante, no un abogado, y un texto que nadie entiende no informa nada.
 */
class Terminos
{
    /** Cambiar esto marca a todos los comercios como pendientes de aceptar. */
    public const VERSION = '2026-10';

    /** Lo esencial, para mostrarlo junto a la casilla del registro. */
    public const RESUMEN = [
        'Esta plataforma se rige por las leyes de Venezuela.',
        'Algunas funciones usan inteligencia artificial y pueden equivocarse: revisa antes de publicar.',
        'Tus datos son confidenciales, pero guardamos un registro de la actividad de la cuenta.',
        'No se permite vender armas, municiones, drogas ni sustancias ilícitas.',
        'Podemos suspender o revocar el acceso de una cuenta que incumpla estas reglas.',
    ];

    /** Días de gracia tras vencer el plan, tal como los aplica el sistema. */
    private static function diasDeGracia(): int
    {
        return (int) config('planes.dias_de_gracia', 15);
    }

    /**
     * @return list<array{id: string, titulo: string, parrafos: list<string>, puntos?: list<string>}>
     */
    public static function secciones(): array
    {
        return [
            [
                'id' => 'que-es',
                'titulo' => 'Qué es esta plataforma',
                'parrafos' => [
                    'Despashop es una herramienta para que un comercio publique su catálogo, lleve su inventario y emita sus facturas. Le damos el programa y el espacio donde funciona; el negocio es del comercio.',
                    'No participamos en la compraventa entre el comercio y sus clientes. No cobramos por él, no entregamos sus productos ni prestamos sus servicios, y no somos parte de los acuerdos a los que llegue con quien le compra.',
                ],
            ],
            [
                'id' => 'marco-legal',
                'titulo' => 'Marco legal venezolano',
                'parrafos' => [
                    'La plataforma respeta y se rige por el ordenamiento jurídico de la República Bolivariana de Venezuela, entre otras la Ley sobre Mensajes de Datos y Firmas Electrónicas y la Ley Especial contra los Delitos Informáticos.',
                    'Cada comercio es responsable de cumplir con lo que le corresponde por su actividad: permisos, registro mercantil, obligaciones tributarias ante el SENIAT, normas sanitarias y cualquier otro requisito de su rubro. Las facturas que emite la plataforma son un comprobante de su operación; no sustituyen la facturación fiscal cuando la ley se la exige.',
                    'Cualquier controversia se resuelve conforme a las leyes venezolanas y ante los tribunales competentes de la República.',
                ],
            ],
            [
                'id' => 'cuenta',
                'titulo' => 'Tu cuenta',
                'parrafos' => [
                    'El registro crea una solicitud: un administrador la revisa a mano y decide si la aprueba. Hasta entonces la cuenta no tiene catálogo público.',
                    'Para abrir una cuenta hay que ser mayor de edad y dar datos verdaderos: nombre del negocio, contacto y dirección del catálogo. La clave es personal; quien la comparte responde por lo que se haga con ella. Una cuenta representa a un comercio.',
                ],
            ],
            [
                'id' => 'ia',
                'titulo' => 'Uso de inteligencia artificial',
                'parrafos' => [
                    'Algunas funciones de la plataforma usan inteligencia artificial, como el asistente que propone un catálogo a partir de una descripción. Esas funciones son opcionales y están señaladas en el panel.',
                    'Lo que se escribe en ellas se envía a un proveedor externo de inteligencia artificial para poder responder. Por eso no deben escribirse ahí datos personales de clientes, números de cuenta ni información sensible.',
                    'La inteligencia artificial se equivoca: los textos, precios sugeridos y descripciones que proponga son un borrador. Revisar y corregir antes de publicar es responsabilidad del comercio.',
                ],
            ],
            [
                'id' => 'datos',
                'titulo' => 'Tus datos y el registro de actividad',
                'parrafos' => [
                    'Lo que el comercio carga es suyo: sus productos, sus costos, sus clientes y sus facturas. Son confidenciales, no se venden ni se entregan a terceros, y ningún otro comercio de la plataforma puede verlos.',
                    'Para que la plataforma funcione y sea segura guardamos un registro de la actividad de la cuenta: inicios de sesión, dirección IP, cambios importantes y uso de las funciones. Ese registro sirve para dar soporte, detectar abusos y mejorar lo que se usa; no se usa para otra cosa.',
                    'Solo entregamos información a una autoridad cuando existe una orden dictada conforme a la ley venezolana.',
                ],
            ],
            [
                'id' => 'prohibido',
                'titulo' => 'Lo que no se puede publicar',
                'parrafos' => [
                    'La plataforma no admite catálogos ni publicaciones de:',
                ],
                'puntos' => [
                    'Armas, municiones, explosivos y sus partes.',
                    'Drogas, sustancias ilícitas y medicamentos que requieran récipe o autorización sanitaria.',
                    'Fauna y flora silvestre protegida, y productos derivados de ellas.',
                    'Documentos falsos, datos o tarjetas de terceros, cuentas robadas y cualquier forma de fraude.',
                    'Contenido sexual explícito o servicios sexuales.',
                    'Productos falsificados o contenido de terceros usado sin permiso.',
                    'Todo lo que la ley venezolana prohíba comerciar.',
                ],
            ],
            [
                'id' => 'acceso',
                'titulo' => 'Podemos revocar el acceso',
                'parrafos' => [
                    'La plataforma se reserva el derecho de suspender o revocar el acceso a una cuenta, retirar contenido puntual o cerrar un catálogo cuando haya incumplimiento de estas condiciones, riesgo para la seguridad de la plataforma o de las demás cuentas, uso que afecte el funcionamiento del servicio, o una orden de autoridad competente.',
                    'Cuando sea posible avisamos antes y explicamos el motivo. En casos graves o urgentes la suspensión puede ser inmediata.',
                ],
            ],
            [
                'id' => 'planes',
                'titulo' => 'Planes, vencimiento y borrado',
                'parrafos' => [
                    'Cada plan tiene sus límites y su vigencia, que se ven en el panel. El día que vence, el catálogo público deja de mostrarse: el comercio sigue entrando a su panel y ve todo lo suyo, pero sus clientes ya no pueden verlo.',
                    'A partir de ahí hay ' . self::diasDeGracia() . ' días para renovar. Si no se renueva en ese plazo, la cuenta y todo su contenido se eliminan de forma definitiva: productos, servicios, imágenes, facturas y el diseño del catálogo. Avisamos por correo el día del vencimiento y otra vez antes de que se cumpla el plazo.',
                    'Antes de que eso ocurra, el comercio puede llevarse todo lo suyo desde su panel: las planillas de sus datos en «Mi perfil → Descargar mis datos», y un respaldo de su catálogo, que además puede volver a subir, en «Respaldo del catálogo».',
                    'Los precios están expresados en dólares y pueden cambiar; cualquier cambio se avisa con antelación y no afecta un período ya pagado. Los descuentos y las pruebas gratis que se acuerden quedan anotados en la cuenta.',
                ],
            ],
            [
                'id' => 'responsabilidad',
                'titulo' => 'De qué responde cada quien',
                'parrafos' => [
                    'El comercio responde por lo que publica: precios, existencias, fotos, descripciones, entregas, garantías y atención a sus clientes.',
                    'La plataforma se presta tal como está y se trabaja para que esté disponible siempre, pero puede haber mantenimientos, fallas o interrupciones. Hacemos respaldos de la información; aun así, conviene que cada comercio conserve su propia copia de lo importante.',
                ],
            ],
            [
                'id' => 'contenido',
                'titulo' => 'Tus fotos y tus textos',
                'parrafos' => [
                    'Las fotos, los textos y la marca que el comercio sube siguen siendo suyos. Al cargarlos nos autoriza a mostrarlos en su catálogo público, en su factura y en los enlaces que comparta, que es justamente para lo que sirve la plataforma.',
                    'El programa, el diseño de la plataforma y su nombre son nuestros, y no se pueden copiar ni revender.',
                ],
            ],
            [
                'id' => 'cierre',
                'titulo' => 'Cerrar la cuenta',
                'parrafos' => [
                    'El comercio puede pedir el cierre de su cuenta cuando quiera. Al cerrarla se retira su catálogo público y se eliminan sus datos, salvo lo que la ley obligue a conservar. Lo mismo ocurre solo, sin pedirlo, cuando pasa el plazo de un plan vencido.',
                    'Conviene descargar antes lo que se quiera guardar —las planillas y el respaldo del catálogo—: después del cierre no podemos recuperarlo.',
                ],
            ],
            [
                'id' => 'cambios',
                'titulo' => 'Cambios en estas condiciones',
                'parrafos' => [
                    'Si estas condiciones cambian, se avisa en el panel y se pide aceptarlas de nuevo. Seguir usando la plataforma después del aviso significa aceptarlas.',
                ],
            ],
        ];
    }
}
