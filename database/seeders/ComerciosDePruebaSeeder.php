<?php

namespace Database\Seeders;

use App\Models\CatalogBanner;
use App\Models\CatalogModal;
use App\Models\CatalogTheme;
use App\Models\Category;
use App\Models\Combo;
use App\Models\Delivery;
use App\Models\ExchangeRate;
use App\Models\Factura;
use App\Models\FacturaItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\Suggestion;
use App\Models\User;
use App\Services\CatalogProvisioner;
use App\Support\Archivos;
use App\Support\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

/**
 * Tres comercios de prueba, uno por plan, con catálogo, inventario, ventas
 * y mensajes ya cargados. Sirve para recorrer la plataforma como la vería
 * un cliente real sin escribir nada a mano.
 *
 *   php artisan db:seed --class=ComerciosDePruebaSeeder
 *
 * Es idempotente: volver a correrlo actualiza lo que ya existe en vez de
 * duplicarlo. Todo lo que crea son datos inventados.
 */
class ComerciosDePruebaSeeder extends Seeder
{
    /** La misma para los tres, porque son cuentas de prueba. */
    public const CLAVE = 'Prueba.2026';

    /** Imágenes de ejemplo que ya están en el repositorio. */
    private array $fotos = [];

    public function run(): void
    {
        $this->fotos = collect(File::glob(base_path('routes/products/*.{webp,png,jpg,jpeg}'), GLOB_BRACE))
            ->sort()
            ->values()
            ->all();

        $this->dulcesMariana();
        $this->tecnoExpress();
        $this->boutiqueAlma();

        $this->command?->newLine();
        $this->command?->table(
            ['Plan', 'Catálogo', 'Correo', 'Clave'],
            [
                ['Inicial', '/dulces-mariana', 'inicial@prueba.local', self::CLAVE],
                ['Emprendedor', '/tecnoexpress', 'emprendedor@prueba.local', self::CLAVE],
                ['Negocio', '/boutique-alma', 'negocio@prueba.local', self::CLAVE],
            ]
        );
    }

    // ── Plan Inicial: el más chico, con el tope de un banner ───────────────────

    private function dulcesMariana(): void
    {
        $comercio = $this->comercio([
            'email' => 'inicial@prueba.local',
            'username' => 'dulces-mariana',
            'name' => 'Mariana Rivas',
            'business_name' => 'Dulces Mariana',
            'phone' => '+58 414 3320117',
            'whatsapp' => '+58 414 3320117',
            'plan' => 'gratis',
            'dias_de_plan' => 25,
        ]);

        app(Tenancy::class)->forTenant($comercio->id, function () use ($comercio) {
            $this->basicos(38.90);

            $this->tema($comercio, [
                'color_primary' => '#7c2d5a',
                'color_accent' => '#e0a3c0',
                'color_bg' => '#fffaf7',
                'color_surface' => '#fdeef3',
                'font_heading' => 'Playfair Display',
                'hero_title' => 'Dulces Mariana',
                'hero_subtitle' => 'Tortas, postres y mesas dulces por encargo en Barquisimeto.',
                'hero_cta_text' => 'Ver la carta',
                'marquee_enabled' => true,
                'marquee_text' => 'Pedidos con 3 días de anticipación · Entregas los viernes y sábados',
                'announcement' => 'Esta semana: 10% en tortas de tres leches.',
                'seo_description' => 'Repostería casera por encargo: tortas, quesillos, galletas decoradas y mesas dulces.',
            ]);

            $productos = $this->productos([
                ['Torta de tres leches', 'Tortas', 25.00, 22.00, 20.00, 11.50, 6, 'Bizcocho esponjoso bañado en tres leches, con merengue suizo. Ocho porciones.'],
                ['Torta de chocolate', 'Tortas', 28.00, 25.00, 23.00, 13.00, 4, 'Tres capas de chocolate con ganache y frutos rojos encima.'],
                ['Quesillo tradicional', 'Postres', 12.00, 10.50, 9.50, 5.20, 10, 'El de toda la vida, con caramelo oscuro y textura firme.'],
                ['Marquesa de chocolate', 'Postres', 14.00, 12.00, 11.00, 6.00, 8, 'Galletas María, crema de chocolate y una noche de nevera.'],
                ['Galletas decoradas (docena)', 'Galletas', 18.00, 16.00, 15.00, 7.80, 15, 'Mantequilla y glasé real. Se decoran con el nombre o el motivo que pidas.'],
                ['Brownies (caja de 9)', 'Galletas', 15.00, 13.00, 12.00, 6.40, 12, 'Húmedos por dentro, con nueces y chispas de chocolate.'],
                ['Mesa dulce para 30 personas', 'Eventos', 120.00, 110.00, 100.00, 62.00, 2, 'Incluye tres postres, dos tipos de galletas, shots dulces y montaje.'],
                ['Cupcakes personalizados (6)', 'Eventos', 16.00, 14.00, 13.00, 7.00, 0, 'Se encargan con una semana de anticipación. Cualquier color y tema.'],
            ]);

            $productos['Cupcakes personalizados (6)']->update(['por_llegar' => true]);

            $this->servicios([
                ['Montaje de mesa dulce en tu local', 'Eventos', 45.00, 18.00, '2 horas', 'domicilio', 'Llevamos, montamos y decoramos la mesa en el sitio del evento.'],
                ['Clase de repostería básica', 'Eventos', 30.00, 9.00, '3 horas', 'local', 'Para cuatro personas. Incluye materiales y lo que prepares te lo llevas.'],
            ]);

            $this->combo([
                'name' => 'Combo merienda: quesillo + docena de galletas',
                'description' => 'Para llevar a una reunión sin pensarlo mucho.',
                'price_usdt' => 27.00,
                'cost_price' => 12.50,
                'stock' => 5,
            ]);

            // El plan Inicial solo admite un banner
            $this->banner([
                'title' => 'Encarga tu torta de esta semana',
                'subtitle' => 'Pedidos hasta el miércoles para entregar el fin de semana',
                'cta_text' => 'Escribir por WhatsApp',
                'overlay' => 'gradient',
            ], 0);

            $this->facturas($productos, [
                ['Carla Peñaloza', '+58 424 5512098', 'confirmed', [['Torta de tres leches', 1], ['Quesillo tradicional', 1]], 6],
                ['José Alberto Mora', '+58 412 7789012', 'confirmed', [['Galletas decoradas (docena)', 2]], 3],
                ['Yulimar Sánchez', '+58 416 3345671', 'confirmed', [['Marquesa de chocolate', 1], ['Brownies (caja de 9)', 1]], 1],
                ['Pedido de cumpleaños', null, 'draft', [['Mesa dulce para 30 personas', 1]], 0],
            ]);

            $this->mensaje([
                'type' => Suggestion::SUGERENCIA,
                'subject' => 'Avisar cuando un producto se queda sin stock',
                'body' => "Muchas veces vendo la última torta y se me olvida esconderla del catálogo. Sería bueno que la plataforma me avise, o que la esconda sola cuando el stock llegue a cero.",
            ]);
        });
    }

    // ── Plan Emprendedor: catálogo mediano y un plan por vencer ────────────────

    private function tecnoExpress(): void
    {
        $comercio = $this->comercio([
            'email' => 'emprendedor@prueba.local',
            'username' => 'tecnoexpress',
            'name' => 'Luis Mendoza',
            'business_name' => 'TecnoExpress',
            'phone' => '+58 412 6640233',
            'whatsapp' => '+58 412 6640233',
            'plan' => 'emprendedor',
            // A cuatro días de vencer: así se ve el aviso ámbar del panel
            'dias_de_plan' => 4,
        ]);

        app(Tenancy::class)->forTenant($comercio->id, function () use ($comercio) {
            $this->basicos(39.40);

            $this->tema($comercio, [
                'color_primary' => '#0f3d63',
                'color_accent' => '#16a3c7',
                'color_bg' => '#f7fafc',
                'color_surface' => '#eef4f9',
                'font_heading' => 'Poppins',
                'layout' => 'grid',
                'card_style' => 'bordered',
                'hero_title' => 'TecnoExpress',
                'hero_subtitle' => 'Accesorios, audio y todo lo que le falta a tu teléfono. Envíos a toda Venezuela.',
                'hero_cta_text' => 'Ver productos',
                'marquee_enabled' => true,
                'marquee_text' => 'Garantía de 30 días · Envíos por MRW y Zoom · Pago móvil y divisas',
                'seo_description' => 'Accesorios de tecnología: audífonos, cargadores, memorias y soportes.',
            ]);

            $productos = $this->productos([
                ['Audífonos inalámbricos TWS', 'Audio', 18.00, 15.50, 14.00, 9.20, 24, 'Cinco horas por carga y estuche con tres cargas más. Bluetooth 5.3.'],
                ['Corneta portátil 10W', 'Audio', 26.00, 23.00, 21.00, 14.00, 12, 'Resistente a salpicaduras, con radio FM y ranura para memoria.'],
                ['Audífonos con cable y micrófono', 'Audio', 7.50, 6.00, 5.50, 3.10, 40, 'Para llamadas y clases en línea. Conector 3,5 mm.'],
                ['Cargador rápido 20W USB-C', 'Carga', 12.00, 10.00, 9.00, 5.40, 35, 'Carga el 50% en media hora en teléfonos compatibles.'],
                ['Power bank 10.000 mAh', 'Carga', 22.00, 19.50, 18.00, 11.80, 18, 'Dos salidas USB y pantalla con el porcentaje restante.'],
                ['Cable USB-C trenzado 1,5 m', 'Carga', 6.00, 4.80, 4.20, 2.30, 60, 'Malla de nylon, aguanta el tirón del día a día.'],
                ['Cable Lightning certificado', 'Carga', 9.00, 7.50, 7.00, 4.10, 22, 'Sin el mensaje de accesorio no compatible.'],
                ['Memoria microSD 64 GB', 'Almacenamiento', 14.00, 12.00, 11.00, 7.00, 30, 'Clase 10, buena para grabar video en 1080p.'],
                ['Pendrive 128 GB USB 3.0', 'Almacenamiento', 17.00, 15.00, 14.00, 8.90, 16, 'Lectura rápida, cuerpo metálico con llavero.'],
                ['Soporte de escritorio para teléfono', 'Accesorios', 8.00, 6.50, 6.00, 3.20, 28, 'Aluminio, altura y ángulo regulables.'],
                ['Aro de luz 26 cm con trípode', 'Accesorios', 32.00, 28.00, 26.00, 17.50, 7, 'Tres temperaturas de luz y diez niveles de intensidad.'],
                ['Mouse inalámbrico silencioso', 'Accesorios', 11.00, 9.50, 8.50, 5.00, 20, 'Clic silencioso y receptor USB que se guarda dentro.'],
                ['Teclado bluetooth compacto', 'Accesorios', 24.00, 21.00, 19.50, 13.20, 9, 'Se conecta a tres equipos y cambia entre ellos con una tecla.'],
                ['Smartwatch deportivo', 'Audio', 38.00, 34.00, 32.00, 22.00, 5, 'Mide pasos, pulso y sueño. Batería de siete días.'],
            ]);

            // Un producto con variantes de color, para probar esa pantalla
            $this->variantes($productos['Audífonos inalámbricos TWS'], ['Negro' => 14, 'Blanco' => 7, 'Azul' => 3], 'color');

            $productos['Aro de luz 26 cm con trípode']->update(['last_units' => true]);
            $productos['Teclado bluetooth compacto']->update(['is_hidden' => true]);

            $this->servicios([
                ['Instalación de protector de pantalla', 'Accesorios', 3.00, 1.20, '15 min', 'local', 'Lo colocamos sin burbujas. Si queda mal, lo repetimos.'],
                ['Cambio de pantalla', 'Accesorios', 45.00, 28.00, '2 días', 'local', 'Diagnóstico gratis. El precio varía según el modelo del equipo.'],
                ['Asesoría para elegir tu equipo', '', 0, 0, '30 min', 'remoto', 'Te ayudamos a decidir según lo que necesitas y lo que puedes gastar.'],
            ]);

            $this->combo([
                'name' => 'Kit de viaje: power bank + cable + audífonos',
                'description' => 'Lo que siempre falta cuando ya saliste de casa.',
                'price_usdt' => 42.00,
                'cost_price' => 23.30,
                'stock' => 8,
            ]);

            $this->combo([
                'name' => 'Combo home office: teclado + mouse + soporte',
                'description' => 'Para trabajar desde la mesa del comedor sin dolor de cuello.',
                'price_usdt' => 39.00,
                'cost_price' => 21.40,
                'stock' => 6,
            ]);

            foreach ([
                ['Envío gratis desde $50', 'A toda Venezuela por MRW o Zoom', 'Ver productos'],
                ['Garantía de 30 días', 'Si algo sale mal, lo cambiamos', 'Conocer más'],
                ['Pago móvil y divisas', 'Te pasamos los datos por WhatsApp', 'Escribir'],
            ] as $orden => [$titulo, $subtitulo, $boton]) {
                $this->banner([
                    'title' => $titulo,
                    'subtitle' => $subtitulo,
                    'cta_text' => $boton,
                    'overlay' => 'dark',
                ], $orden);
            }

            $this->modal([
                'title' => '5% de descuento en tu primera compra',
                'body' => 'Escríbenos por WhatsApp y menciona el código TECNO5 antes de pagar.',
                'cta_text' => 'Escribir por WhatsApp',
            ]);

            $facturas = $this->facturas($productos, [
                ['Andrea Colmenares', '+58 414 1120934', 'confirmed', [['Audífonos inalámbricos TWS', 1], ['Cable USB-C trenzado 1,5 m', 2]], 12],
                ['Ramón Escalona', '+58 426 8890114', 'confirmed', [['Power bank 10.000 mAh', 1]], 9],
                ['Génesis Ríos', '+58 412 5567823', 'confirmed', [['Aro de luz 26 cm con trípode', 1], ['Soporte de escritorio para teléfono', 1]], 7],
                ['Distribuidora El Trébol', '+58 251 2334455', 'confirmed', [['Cargador rápido 20W USB-C', 6], ['Memoria microSD 64 GB', 4]], 5],
                ['Marcos Yépez', '+58 424 7712398', 'confirmed', [['Audífonos con cable y micrófono', 3]], 3],
                ['Keyla Ramírez', '+58 416 4456712', 'confirmed', [['Mouse inalámbrico silencioso', 1], ['Pendrive 128 GB USB 3.0', 1]], 1],
                ['Pedido por confirmar', '+58 414 9987123', 'draft', [['Smartwatch deportivo', 1]], 0],
            ]);

            // Una entrega agendada para probar la pantalla de Entregas
            $this->entrega($facturas[0], now()->addDays(2));

            $this->mensaje([
                'type' => Suggestion::ERROR,
                'subject' => 'La foto del producto sale girada',
                'body' => "Subo una foto desde el teléfono y en el catálogo aparece acostada. En la galería del teléfono se ve bien. Me pasa con las fotos tomadas en vertical.",
                'page' => 'Productos',
                'user_agent' => 'Mozilla/5.0 (Linux; Android 14; SM-A536E) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36',
            ]);

            $this->mensaje([
                'type' => Suggestion::SUGERENCIA,
                'subject' => 'Poder duplicar un producto',
                'body' => "Vendo el mismo cable en tres largos. Tener que cargar todo de nuevo cada vez me lleva un rato; con un botón de duplicar sería un minuto.",
                'status' => Suggestion::EN_PROCESO,
                'reply' => "Buena idea, la anotamos para la próxima versión del inventario. Mientras tanto puedes usar variantes dentro del mismo producto.",
                'replied_at' => now()->subDay(),
                'read_at' => now()->subDays(2),
            ]);
        });
    }

    // ── Plan Negocio: sin tope de productos y con más movimiento ───────────────

    private function boutiqueAlma(): void
    {
        $comercio = $this->comercio([
            'email' => 'negocio@prueba.local',
            'username' => 'boutique-alma',
            'name' => 'Alma Gutiérrez',
            'business_name' => 'Boutique Alma',
            'phone' => '+58 424 9908877',
            'whatsapp' => '+58 424 9908877',
            'plan' => 'negocio',
            'dias_de_plan' => 30,
        ]);

        app(Tenancy::class)->forTenant($comercio->id, function () use ($comercio) {
            $this->basicos(39.15);

            $this->tema($comercio, [
                'color_primary' => '#2f2a26',
                'color_accent' => '#c08a4e',
                'color_bg' => '#faf7f2',
                'color_surface' => '#f2ece2',
                'font_heading' => 'Cormorant Garamond',
                'layout' => 'masonry',
                'card_style' => 'overlay',
                'hero_title' => 'Boutique Alma',
                'hero_subtitle' => 'Ropa y accesorios escogidos uno por uno. Tallas de la S a la XL.',
                'hero_cta_text' => 'Ver la colección',
                'announcement' => 'Nueva colección de temporada disponible en tienda y por encargo.',
                'seo_description' => 'Boutique de ropa femenina, calzado y accesorios en Valencia.',
            ]);

            $productos = $this->productos([
                ['Blusa de lino manga corta', 'Blusas', 24.00, 21.00, 19.00, 12.40, 14, 'Lino fresco con botones de nácar. Cae suelta, no marca.'],
                ['Blusa satinada cuello V', 'Blusas', 27.00, 24.00, 22.00, 14.10, 9, 'Para una salida de noche sin pasar calor.'],
                ['Camisa oversize a rayas', 'Blusas', 29.00, 26.00, 24.00, 15.60, 7, 'Se usa suelta o amarrada. Algodón grueso.'],
                ['Pantalón palazzo', 'Pantalones', 32.00, 28.00, 26.00, 17.20, 11, 'Tiro alto y caída amplia. Cintura con elástico escondido.'],
                ['Jean recto tiro alto', 'Pantalones', 38.00, 34.00, 31.00, 21.00, 16, 'Denim rígido que aguanta lavadas sin deformarse.'],
                ['Short de lino', 'Pantalones', 21.00, 18.00, 16.50, 10.60, 13, 'Con correa de tela del mismo material.'],
                ['Vestido midi floreado', 'Vestidos', 42.00, 38.00, 35.00, 23.50, 8, 'Estampado pequeño, forro interno y bolsillos.'],
                ['Vestido largo de gasa', 'Vestidos', 48.00, 43.00, 40.00, 27.00, 5, 'Para matrimonios y fiestas de tarde.'],
                ['Enterizo negro', 'Vestidos', 44.00, 39.00, 36.00, 24.80, 6, 'Un solo color, escote cuadrado y tiras regulables.'],
                ['Sandalias de cuero', 'Calzado', 35.00, 31.00, 29.00, 19.40, 10, 'Cuero natural y plantilla acolchada. Tallas 36 a 40.'],
                ['Zapatos de tacón bajo', 'Calzado', 39.00, 35.00, 32.00, 22.10, 8, 'Tacón de 5 cm, cómodos para todo el día.'],
                ['Alpargatas de yute', 'Calzado', 26.00, 23.00, 21.00, 13.90, 12, 'Livianas, con suela de yute trenzado.'],
                ['Bolso de mano tejido', 'Accesorios', 30.00, 27.00, 25.00, 16.70, 9, 'Tejido a mano por artesanas de Lara.'],
                ['Cartera cruzada de cuero', 'Accesorios', 34.00, 30.00, 28.00, 18.90, 7, 'Correa regulable y tres compartimientos.'],
                ['Pañuelo de seda estampado', 'Accesorios', 15.00, 13.00, 12.00, 7.60, 20, 'Se usa en el cuello, en la cabeza o amarrado al bolso.'],
                ['Collar de piedras naturales', 'Accesorios', 18.00, 16.00, 14.50, 9.10, 15, 'Piedras montadas en baño de oro. Cierre reforzado.'],
                ['Aretes de perlas', 'Accesorios', 12.00, 10.00, 9.00, 5.70, 25, 'Perlas de río, para uso diario.'],
                ['Sombrero de playa', 'Accesorios', 22.00, 19.00, 17.50, 11.30, 0, 'Ala ancha y cinta de tela. Llega la próxima semana.'],
            ]);

            $productos['Sombrero de playa']->update(['por_llegar' => true]);
            $this->variantes($productos['Vestido midi floreado'], ['Talla S' => 2, 'Talla M' => 3, 'Talla L' => 2, 'Talla XL' => 1]);
            $this->variantes($productos['Sandalias de cuero'], ['36' => 3, '37' => 3, '38' => 2, '39' => 1, '40' => 1]);

            $this->servicios([
                ['Asesoría de imagen', 'Accesorios', 25.00, 0, '1 hora', 'local', 'Vemos qué te queda bien y armamos tres combinaciones con lo que ya tienes.'],
                ['Ajuste de talla', 'Accesorios', 8.00, 3.00, '3 días', 'local', 'Ruedo, cintura o mangas de cualquier prenda comprada en la boutique.'],
                ['Compra acompañada por videollamada', '', 15.00, 0, '45 min', 'remoto', 'Te mostramos la tienda en vivo y eliges con calma desde tu casa.'],
            ]);

            $this->combo([
                'name' => 'Look completo: vestido midi + sandalias',
                'description' => 'El conjunto que más sale para matrimonios de día.',
                'price_usdt' => 70.00,
                'cost_price' => 42.90,
                'stock' => 4,
            ]);

            foreach ([
                ['Nueva colección', 'Piezas de temporada recién llegadas', 'Ver la colección'],
                ['Envíos a todo el país', 'Despachamos el mismo día hasta las 3 pm', 'Escribir'],
                ['Cambios en 7 días', 'Si la talla no te queda, la cambiamos', 'Conocer más'],
                ['Encargos especiales', 'Pide tu talla si no está disponible', 'Escribir'],
            ] as $orden => [$titulo, $subtitulo, $boton]) {
                $this->banner([
                    'title' => $titulo,
                    'subtitle' => $subtitulo,
                    'cta_text' => $boton,
                    'overlay' => 'gradient',
                ], $orden);
            }

            $this->modal([
                'title' => 'Encargos para tu talla',
                'body' => 'Si no ves tu talla disponible, escríbenos: la mayoría de las piezas se encargan en una semana.',
                'cta_text' => 'Hacer un encargo',
                'trigger' => 'scroll',
            ]);

            $facturas = $this->facturas($productos, [
                ['Verónica Duarte', '+58 414 3321987', 'confirmed', [['Vestido midi floreado', 1], ['Sandalias de cuero', 1]], 14],
                ['Isabel Montilla', '+58 412 4498123', 'confirmed', [['Jean recto tiro alto', 1], ['Blusa de lino manga corta', 2]], 11],
                ['Rosa Betancourt', '+58 424 5590012', 'confirmed', [['Cartera cruzada de cuero', 1]], 9],
                ['Tienda Mía (mayor)', '+58 241 8877665', 'confirmed', [['Pañuelo de seda estampado', 8], ['Aretes de perlas', 10]], 8],
                ['Daniela Ochoa', '+58 416 2234871', 'confirmed', [['Vestido largo de gasa', 1], ['Zapatos de tacón bajo', 1]], 6],
                ['Luisa Fernanda Pérez', '+58 414 9987001', 'confirmed', [['Enterizo negro', 1]], 4],
                ['María Eugenia Salas', '+58 412 1123456', 'confirmed', [['Pantalón palazzo', 1], ['Blusa satinada cuello V', 1]], 2],
                ['Andreína Lugo', '+58 426 7765432', 'confirmed', [['Bolso de mano tejido', 1]], 1],
                ['Encargo por confirmar', '+58 414 2211334', 'draft', [['Camisa oversize a rayas', 2]], 0],
            ]);

            $this->entrega($facturas[0], now()->addDay());
            $this->entrega($facturas[4], now()->addDays(3));

            $this->mensaje([
                'type' => Suggestion::SUGERENCIA,
                'subject' => 'Agregar una guía de tallas al catálogo',
                'body' => "La mitad de las preguntas por WhatsApp son por tallas. Si pudiera poner una tabla con medidas dentro del catálogo, me ahorraría muchísimo tiempo.",
                'status' => Suggestion::RESUELTA,
                'reply' => "Ya puedes hacerlo con un bloque de texto en Personalizar catálogo: agrega el bloque y pega ahí tu tabla de medidas.",
                'replied_at' => now()->subDays(3),
                'read_at' => now()->subDays(4),
                'reply_seen_at' => now()->subDays(2),
            ]);
        });
    }

    // ── Piezas comunes ─────────────────────────────────────────────────────────

    /** @param  array<string, mixed>  $datos */
    private function comercio(array $datos): User
    {
        $plan = Plan::where('slug', $datos['plan'])->first();

        $comercio = User::updateOrCreate(
            ['email' => $datos['email']],
            [
                'name' => $datos['name'],
                'username' => $datos['username'],
                'business_name' => $datos['business_name'],
                'phone' => $datos['phone'],
                'whatsapp' => $datos['whatsapp'],
                'role' => User::ROLE_TENANT,
                'status' => User::STATUS_APPROVED,
                'password' => Hash::make(self::CLAVE),
                'email_verified_at' => now(),
                'plan_id' => $plan?->id,
                'plan_started_at' => now()->subDays(30 - $datos['dias_de_plan']),
                'plan_expires_at' => now()->addDays($datos['dias_de_plan'])->endOfDay(),
                'reviewed_at' => now()->subDays(30 - $datos['dias_de_plan']),
            ]
        );

        app(CatalogProvisioner::class)->provision($comercio);

        return $comercio;
    }

    private function basicos(float $tasa): void
    {
        foreach ([
            'global_discount' => '0',
            'force_wholesale' => 'false',
            'force_distributor' => 'false',
        ] as $clave => $valor) {
            Setting::put($clave, $valor);
        }

        if (! ExchangeRate::exists()) {
            ExchangeRate::create(['bcv' => $tasa]);
        }
    }

    /** @param  array<string, mixed>  $ajustes */
    private function tema(User $comercio, array $ajustes): void
    {
        CatalogTheme::firstWhere('user_id', $comercio->id)?->update([
            'is_published' => true,
            'whatsapp_number' => $comercio->whatsapp,
            ...$ajustes,
        ]);
    }

    /**
     * @param  list<array{0: string, 1: string, 2: float, 3: float, 4: float, 5: float, 6: int, 7: string}>  $filas
     * @return array<string, Product>
     */
    private function productos(array $filas): array
    {
        $categorias = [];
        $creados = [];

        foreach ($filas as $orden => [$nombre, $categoria, $detal, $mayor, $dist, $costo, $stock, $descripcion]) {
            $categorias[$categoria] ??= Category::firstOrCreate(['name' => $categoria]);

            $producto = Product::firstOrCreate(
                ['name' => $nombre],
                [
                    'price_usdt' => $detal,
                    'price_mayor_usdt' => $mayor,
                    'price_distribuidor_usdt' => $dist,
                    'cost_price' => $costo,
                    'stock' => $stock,
                    'description' => $descripcion,
                    'is_hidden' => false,
                    'display_order' => $orden,
                ]
            );

            $producto->categories()->sync([$categorias[$categoria]->id]);

            if (! $producto->image_path && ($foto = $this->foto($producto->id))) {
                $producto->update(['image_path' => $foto]);
                ProductImage::firstOrCreate(['product_id' => $producto->id, 'image_path' => $foto]);
            }

            $creados[$nombre] = $producto;
        }

        return $creados;
    }

    /**
     * Lo que el comercio hace, no lo que entrega. Comparte tabla con los
     * productos, pero sin existencias.
     *
     * @param  list<array{0: string, 1: string, 2: float, 3: float, 4: string, 5: string, 6: string}>  $filas
     */
    private function servicios(array $filas): void
    {
        foreach ($filas as $orden => [$nombre, $categoria, $precio, $costo, $duracion, $modalidad, $descripcion]) {
            $servicio = Product::firstOrCreate(
                ['name' => $nombre],
                [
                    'item_type' => Product::SERVICIO,
                    'service_duration' => $duracion,
                    'service_mode' => $modalidad,
                    'price_usdt' => $precio ?: null,
                    'cost_price' => $costo ?: null,
                    'stock' => 0,
                    'description' => $descripcion,
                    'is_hidden' => false,
                    'display_order' => 100 + $orden,
                ]
            );

            if ($categoria !== '') {
                $servicio->categories()->sync([Category::firstOrCreate(['name' => $categoria])->id]);
            }

            if (! $servicio->image_path && ($foto = $this->foto($servicio->id))) {
                $servicio->update(['image_path' => $foto]);
            }
        }
    }

    /** @param  array<string, int>  $opciones */
    private function variantes(Product $producto, array $opciones, string $tipo = 'tipo'): void
    {
        $producto->update(['show_variants_in_store' => true]);

        foreach (array_values(array_keys($opciones)) as $orden => $etiqueta) {
            ProductVariant::firstOrCreate(
                ['product_id' => $producto->id, 'label' => $etiqueta],
                ['type' => $tipo, 'stock' => $opciones[$etiqueta], 'sort_order' => $orden]
            );
        }
    }

    /** @param  array<string, mixed>  $datos */
    private function combo(array $datos): void
    {
        Combo::firstOrCreate(['name' => $datos['name']], [
            'price_type' => 'detal',
            'is_hidden' => false,
            ...$datos,
        ]);
    }

    /** @param  array<string, mixed>  $datos */
    private function banner(array $datos, int $orden): void
    {
        CatalogBanner::firstOrCreate(['title' => $datos['title']], [
            'text_position' => 'center',
            'display_order' => $orden,
            'is_active' => true,
            ...$datos,
        ]);
    }

    /** @param  array<string, mixed>  $datos */
    private function modal(array $datos): void
    {
        CatalogModal::firstOrCreate(['title' => $datos['title']], [
            'trigger' => 'delay',
            'delay_seconds' => 5,
            'frequency' => 'once_session',
            'animation' => 'zoom',
            'is_active' => true,
            ...$datos,
        ]);
    }

    /**
     * Facturas con sus renglones, calculadas como las haría el panel.
     *
     * @param  array<string, Product>  $productos
     * @param  list<array{0: string, 1: ?string, 2: string, 3: list<array{0: string, 1: int}>, 4: int}>  $filas
     * @return list<Factura>
     */
    private function facturas(array $productos, array $filas): array
    {
        $tasa = (float) (ExchangeRate::latest('id')->value('bcv') ?? 39.0);
        $emitidas = [];

        foreach ($filas as [$cliente, $telefono, $estado, $renglones, $diasAtras]) {
            $cuando = now()->subDays($diasAtras)->setTime(random_int(9, 18), random_int(0, 59));

            $factura = Factura::firstOrNew(['client_name' => $cliente]);

            if ($factura->exists) {
                $emitidas[] = $factura;

                continue;
            }

            $subtotal = 0.0;
            $ganancia = 0.0;
            $items = [];

            foreach ($renglones as [$nombre, $cantidad]) {
                $producto = $productos[$nombre];
                $precio = (float) $producto->price_usdt;
                $costo = (float) $producto->cost_price;

                $subtotal += $precio * $cantidad;
                $ganancia += ($precio - $costo) * $cantidad;

                $items[] = [
                    'product_id' => $producto->id,
                    'product_name' => $producto->name,
                    'product_image_path' => $producto->image_path,
                    'price_type' => 'detal',
                    'unit_price_usd' => $precio,
                    'cost_price' => $costo,
                    'qty' => $cantidad,
                    'subtotal_usd' => round($precio * $cantidad, 2),
                    'profit_usd' => round(($precio - $costo) * $cantidad, 2),
                ];
            }

            $factura->fill([
                'created_at' => $cuando,
                'client_phone' => $telefono,
                'status' => $estado,
                'subtotal_usd' => round($subtotal, 2),
                'discount_usd' => 0,
                'shipping_usd' => 0,
                'total_usd' => round($subtotal, 2),
                'total_bs' => round($subtotal * $tasa, 2),
                'bcv_rate' => $tasa,
                'profit_usd' => round($ganancia, 2),
                'confirmed_at' => $estado === 'confirmed' ? $cuando : null,
                'updated_at' => $cuando,
            ])->save();

            foreach ($items as $item) {
                FacturaItem::create(['factura_id' => $factura->id, ...$item]);
            }

            $emitidas[] = $factura;
        }

        return $emitidas;
    }

    private function entrega(Factura $factura, \DateTimeInterface $cuando): void
    {
        $factura->update(['has_delivery' => true]);

        Delivery::firstOrCreate(
            ['factura_id' => $factura->id],
            ['delivery_date' => $cuando, 'status' => 'pending']
        );
    }

    /** @param  array<string, mixed>  $datos */
    private function mensaje(array $datos): void
    {
        Suggestion::firstOrCreate(['subject' => $datos['subject']], [
            'status' => Suggestion::NUEVA,
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129 Safari/537.36',
            ...$datos,
        ]);
    }

    /**
     * Copia una de las fotos de ejemplo del repositorio al disco público.
     * Cada comercio recibe su propia copia: borrar un producto no puede
     * dejar sin imagen al de otra cuenta.
     */
    private function foto(int $semilla): ?string
    {
        if ($this->fotos === []) {
            return null;
        }

        $origen = $this->fotos[$semilla % count($this->fotos)];
        $destino = 'products/prueba-' . $semilla . '.' . strtolower(pathinfo($origen, PATHINFO_EXTENSION));

        if (! Archivos::existe($destino)) {
            Archivos::disco()->put($destino, File::get($origen));
        }

        return $destino;
    }
}
