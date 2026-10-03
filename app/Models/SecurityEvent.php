<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un hecho del registro de seguridad.
 *
 * No lleva el trait BelongsToTenant a propósito: esto es de la plataforma,
 * lo consulta solo el admin y muchos hechos no tienen dueño (una IP anónima
 * probando contraseñas no es ningún comercio).
 */
class SecurityEvent extends Model
{
    use Prunable;

    public const BAJA = 'baja';
    public const MEDIA = 'media';
    public const ALTA = 'alta';

    /** De menos a más grave, para ordenar y comparar. */
    public const SEVERIDADES = [self::BAJA, self::MEDIA, self::ALTA];

    /**
     * Qué se vigila. Cada tipo trae su gravedad por defecto y el texto que
     * lee el admin, para que la interfaz y el correo digan lo mismo.
     *
     * @var array<string, array{etiqueta: string, severidad: string, pista: string}>
     */
    public const TIPOS = [
        'login.fallido' => [
            'etiqueta' => 'Contraseña incorrecta',
            'severidad' => self::BAJA,
            'pista' => 'Puede ser el dueño olvidando su clave. Importa cuando se repite.',
        ],
        'login.fuerza_bruta' => [
            'etiqueta' => 'Muchos intentos fallidos desde una IP',
            'severidad' => self::ALTA,
            'pista' => 'Alguien está probando contraseñas. Conviene bloquear esa IP en el servidor.',
        ],
        'login.bloqueado' => [
            'etiqueta' => 'Acceso frenado por demasiados intentos',
            'severidad' => self::ALTA,
            'pista' => 'El limitador de Laravel cortó los intentos de esa dirección durante un minuto.',
        ],
        'sesion.ip_nueva' => [
            'etiqueta' => 'Sesión desde una IP nueva',
            'severidad' => self::MEDIA,
            'pista' => 'Normal si el comercio cambió de red o de teléfono; sospechoso si además hubo intentos fallidos.',
        ],
        'sesion.admin_ip_nueva' => [
            'etiqueta' => 'Un administrador entró desde una IP nueva',
            'severidad' => self::ALTA,
            'pista' => 'Si no fuiste tú, cambia la contraseña del administrador ahora mismo.',
        ],
        'clave.restablecida' => [
            'etiqueta' => 'Contraseña restablecida',
            'severidad' => self::MEDIA,
            'pista' => 'Quien controle el correo de una cuenta puede tomarla por aquí.',
        ],
        'acceso.admin' => [
            'etiqueta' => 'Intento de entrar a la administración',
            'severidad' => self::ALTA,
            'pista' => 'Una cuenta de comercio pidió una página del panel de plataforma.',
        ],
        'acceso.ajeno' => [
            'etiqueta' => 'Intento de abrir datos de otro comercio',
            'severidad' => self::ALTA,
            'pista' => 'El aislamiento lo frenó, pero alguien está cambiando ids en la dirección a mano.',
        ],
        'acceso.inexistente' => [
            'etiqueta' => 'Pidió un registro que no es suyo',
            'severidad' => self::MEDIA,
            'pista' => 'El aislamiento por comercio responde "no existe" tanto si el registro es de otro como si se borró. Un caso aislado suele ser un enlace viejo; muchos seguidos son un escaneo.',
        ],
        'acceso.denegado' => [
            'etiqueta' => 'Acceso denegado',
            'severidad' => self::MEDIA,
            'pista' => 'Una petición fue rechazada por permisos.',
        ],
        'sondeo.rutas' => [
            'etiqueta' => 'Sondeo de rutas de ataque',
            'severidad' => self::MEDIA,
            'pista' => 'Un robot busca archivos como .env o paneles de WordPress. Es habitual en internet; solo alarma si insiste.',
        ],
        'inyeccion.intento' => [
            'etiqueta' => 'Intento de inyección en la dirección',
            'severidad' => self::ALTA,
            'pista' => 'La dirección traía código o rutas del sistema. Revisa si la petición llegó a responder.',
        ],
        'peticion.sin_token' => [
            'etiqueta' => 'Formulario sin token válido',
            'severidad' => self::BAJA,
            'pista' => 'Casi siempre es una sesión vencida en una pestaña vieja.',
        ],
        'peticion.rafaga' => [
            'etiqueta' => 'Ráfaga de peticiones frenada',
            'severidad' => self::MEDIA,
            'pista' => 'El limitador de la ruta cortó el exceso.',
        ],
        'ia.bloqueada' => [
            'etiqueta' => 'Pedido a la IA frenado por su contenido',
            'severidad' => self::MEDIA,
            'pista' => 'El filtro local o el clasificador rechazaron la descripción.',
        ],
        'ia.insistencia' => [
            'etiqueta' => 'Insistencia con pedidos frenados a la IA',
            'severidad' => self::ALTA,
            'pista' => 'El mismo comercio reintenta con contenido no permitido. Considera suspender la cuenta.',
        ],
        'registro.rafaga' => [
            'etiqueta' => 'Varias cuentas creadas desde una IP',
            'severidad' => self::ALTA,
            'pista' => 'Puede ser un mismo dueño con varias tiendas, o alguien llenando la cola de solicitudes.',
        ],
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'last_seen_at' => 'datetime',
            'notified_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    /** El registro no crece para siempre: `model:prune` retira lo viejo. */
    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays((int) config('seguridad.retencion_dias')));
    }

    // ── Relaciones ─────────────────────────────────────────────────────────────

    /** Quien provocó el hecho, si estaba autenticado. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** El comercio afectado. */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // ── Catálogo de tipos ──────────────────────────────────────────────────────

    public static function severidadDe(string $tipo): string
    {
        return self::TIPOS[$tipo]['severidad'] ?? self::MEDIA;
    }

    public static function etiquetaDe(string $tipo): string
    {
        return self::TIPOS[$tipo]['etiqueta'] ?? $tipo;
    }

    public function etiqueta(): string
    {
        return self::etiquetaDe($this->type);
    }

    public function pista(): ?string
    {
        return self::TIPOS[$this->type]['pista'] ?? null;
    }

    public function esGrave(): bool
    {
        return $this->severity === self::ALTA;
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeSinRevisar(Builder $query): Builder
    {
        return $query->whereNull('reviewed_at');
    }

    public function scopeGraves(Builder $query): Builder
    {
        return $query->where('severity', self::ALTA);
    }

    public function scopeDesde(Builder $query, int $dias): Builder
    {
        return $query->where('created_at', '>=', now()->subDays($dias));
    }
}
