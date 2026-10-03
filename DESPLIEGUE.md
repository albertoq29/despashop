# Poner Despashop en un servidor

Lista de lo que hay que hacer para que la plataforma funcione fuera de tu
máquina. Está en orden: cada paso supone hecho el anterior.

## 1. Antes de subir nada

- [ ] **Rotar la clave de Groq.** Entra a <https://console.groq.com/keys>, borra
      la clave actual y crea una nueva. La anterior se compartió por chat, así
      que hay que darla por comprometida. La nueva va en `GROQ_API_KEY` del
      `.env` del servidor y **no** en el repositorio.
- [ ] **Generar una `APP_KEY` propia del servidor** (`php artisan key:generate`).
      No reuses la de tu máquina.
- [ ] Revisar que `.env` no esté en el repositorio (`git check-ignore .env`).

## 2. Configuración del `.env` del servidor

```env
APP_NAME=Despashop
APP_ENV=production
APP_DEBUG=false
APP_URL=https://despashop.com
APP_TIMEZONE=America/Caracas

SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=.despashop.com
```

`APP_DEBUG=false` es lo más importante de esta lista: con `true`, cualquier
error le muestra a quien lo provoque el código, las rutas y las credenciales.

Con `APP_ENV=production` la aplicación genera todos sus enlaces con `https://`
(ver `AppServiceProvider`), así que el certificado tiene que estar puesto antes.

## 3. Instalación

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan db:seed --class=PlanSeeder
php artisan db:seed --class=PlatformSeeder
```

`storage:link` hay que correrlo **en el servidor**: el enlace de tu máquina
apunta a una ruta de Windows y no sirve allá. Sin él, ninguna imagen carga.

Después de `PlatformSeeder`, entra a Admin → Ajustes y cambia la contraseña del
administrador, y carga el **WhatsApp y el correo de soporte**: sin eso, los
botones de «Renovar» no le aparecen a nadie.

## 4. Correo

Hoy sale desde una cuenta de Gmail personal. Para el lanzamiento hace falta un
remitente del dominio propio, o los avisos de vencimiento y los enlaces para
recuperar la contraseña van a terminar en spam.

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.tu-proveedor.com
MAIL_PORT=587
MAIL_USERNAME=no-reply@despashop.com
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@despashop.com
MAIL_FROM_NAME=Despashop
```

En el DNS del dominio:

- **SPF**: `v=spf1 include:<lo que indique tu proveedor> ~all`
- **DKIM**: la clave que te dé el proveedor, como registro TXT.
- **DMARC** (recomendado): `v=DMARC1; p=none; rua=mailto:correo@despashop.com`

Prueba el resultado enviándote un correo a Gmail y mirando «Mostrar original»:
SPF y DKIM deben decir PASS.

Comprobación rápida desde el servidor:

```bash
php artisan tinker --execute="Mail::raw('Prueba de Despashop', fn(\$m) => \$m->to('tu@correo.com')->subject('Prueba'));"
```

## 5. Tareas programadas

Una sola línea en el cron del servidor hace funcionar todo lo demás:

```cron
* * * * * cd /ruta/a/despashop && php artisan schedule:run >> /dev/null 2>&1
```

Sin eso no se actualiza la tasa del BCV, no se avisa a los planes vencidos, no
se eliminan las cuentas que agotaron el plazo, no se poda el registro de
seguridad y no se hacen respaldos.

Lo que queda programado:

| Hora  | Tarea                  | Qué hace                                        |
|-------|------------------------|-------------------------------------------------|
| c/15m | `rates:update`         | Trae la tasa del BCV                            |
| 02:00 | `respaldo:crear`       | Copia la base y los archivos subidos            |
| 03:30 | `model:prune`          | Poda el registro de seguridad                   |
| 05:00 | `planes:vencidos`      | Avisa y elimina las cuentas que agotaron el plazo |

Antes de confiar en el borrado automático, míralo en seco:

```bash
php artisan planes:vencidos --simular
```

Si prefieres empezar el alfa sin borrar nada, pon `PLANES_BORRADO_AUTOMATICO=false`:
sigue avisando por correo, pero no elimina.

## 6. Respaldos

`php artisan respaldo:crear` deja un `.sql` y un `.zip` en
`storage/app/respaldos`, y conserva los últimos `RESPALDO_CONSERVAR` (7 por
defecto).

**Eso cubre el accidente, no el desastre**: los respaldos quedan en el mismo
servidor. Copia esa carpeta a otro lado todos los días —un bucket, otro disco,
tu máquina—. Por ejemplo:

```cron
30 2 * * * rclone copy /ruta/a/despashop/storage/app/respaldos remoto:despashop-respaldos
```

Y una vez al mes, restaura un respaldo en una base de prueba. Un respaldo que
nunca se probó no es un respaldo.

## 7. Comprobaciones antes de abrir

- [ ] `https://despashop.com` carga con candado y sin avisos de contenido mezclado.
- [ ] Una dirección inventada muestra la página 404 con el logo, no la de Laravel.
- [ ] Registrarse manda el correo de confirmación y el enlace funciona.
- [ ] Pegar el enlace de un catálogo en WhatsApp muestra la imagen y el nombre
      del comercio.
- [ ] Las imágenes de los productos cargan (si no, falta `storage:link`).
- [ ] `php artisan schedule:list` muestra las cuatro tareas.
- [ ] El primer respaldo existe y pesa lo esperable.
