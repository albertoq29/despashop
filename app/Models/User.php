<?php

namespace App\Models;

use App\Support\Archivos;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_TENANT = 'tenant';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_SUSPENDED = 'suspended';

    /**
     * Nombres que no pueden usarse como username porque chocarían con
     * rutas propias de la plataforma en /{username}.
     */
    public const RESERVED_USERNAMES = [
        'admin', 'administrador', 'api', 'app', 'login', 'logout', 'register', 'registro',
        'password', 'dashboard', 'panel', 'profile', 'perfil', 'settings', 'ajustes',
        'productos', 'products', 'facturas', 'invoices', 'pedidos', 'orders', 'categorias',
        'categories', 'combos', 'catalogo', 'catalog', 'planes', 'plans', 'precios',
        'pricing', 'tasas', 'ganancias', 'entregas', 'suplementos', 'promociones',
        'storage', 'assets', 'build', 'up', 'home', 'soporte', 'support', 'ayuda',
        'help', 'terminos', 'privacidad', 'contacto', 'email', 'verify-email',
        'confirm-password', 'forgot-password', 'reset-password', 'fichero-fotos',
        'product-images', 'product-variants', 'combo-images', 'pendiente',
    ];

    protected $fillable = [
        'name',
        'username',
        'email',
        'email_verified_at',
        'password',
        'role',
        'status',
        'business_name',
        'phone',
        'whatsapp',
        'requested_plan_id',
        'request_message',
        'reviewed_at',
        'reviewed_by',
        'rejection_reason',
        'plan_id',
        'plan_started_at',
        'plan_expires_at',
        'plan_discount_percent',
        'plan_is_trial',
        'plan_note',
        'expiry_notified_at',
        'last_login_at',
        'last_login_ip',
        'terms_accepted_at',
        'terms_version',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'reviewed_at' => 'datetime',
            'plan_started_at' => 'datetime',
            'plan_expires_at' => 'datetime',
            'plan_is_trial' => 'boolean',
            'expiry_notified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Las claves foráneas borran en cascada dentro de la base, sin pasar
        // por Eloquent, así que los archivos del comercio quedarían huérfanos.
        // Aquí se eliminan sus registros con archivos uno por uno y se
        // retiran las carpetas que son suyas por completo.
        static::deleting(function (User $user) {
            $user->products()->get()->each->delete();
            $user->combos()->get()->each->delete();
            $user->catalogTheme()->get()->each->delete();
            $user->invoiceTemplate()->get()->each->delete();
            $user->banners()->get()->each->delete();
            $user->modals()->get()->each->delete();

            Archivos::eliminarCarpeta('catalogo/' . $user->id);
            Archivos::eliminarCarpeta('facturas/' . $user->id);
        });
    }

    public function combos(): HasMany
    {
        return $this->hasMany(Combo::class)->withoutGlobalScope('tenant');
    }

    // ── Rol y estado ───────────────────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isTenant(): bool
    {
        return $this->role === self::ROLE_TENANT;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    /** El plan vencido no bloquea el acceso, pero sí se marca para el admin. */
    public function planExpired(): bool
    {
        return $this->plan_expires_at !== null && $this->plan_expires_at->isPast();
    }

    /** Días antes del vencimiento en que el comercio empieza a ver el aviso. */
    public const DIAS_AVISO_VENCIMIENTO = 7;

    /**
     * Abre un período de plan que empieza hoy.
     *
     * Sin fecha, dura un mes. El vencimiento se fija al final de ese día:
     * si el admin elige "vence el 16", el comercio lo usa todo el 16.
     * `addMonthNoOverflow` evita que un 31 de enero salte al 3 de marzo.
     */
    public function iniciarPeriodoDePlan(?\DateTimeInterface $vence = null, bool $sinVencimiento = false): void
    {
        $this->plan_started_at = now();
        $this->plan_expires_at = $sinVencimiento
            ? null
            : \Illuminate\Support\Carbon::instance($vence ?? now()->addMonthNoOverflow())->endOfDay();
    }

    /** Días que faltan para vencer; negativo si ya venció, null si no vence. */
    public function diasParaVencer(): ?int
    {
        if ($this->plan_expires_at === null) {
            return null;
        }

        return (int) floor(now()->startOfDay()->diffInDays($this->plan_expires_at->copy()->startOfDay(), false));
    }

    /** sin_plan | sin_vencimiento | activo | por_vencer | vencido */
    public function estadoDelPlan(): string
    {
        if ($this->plan_id === null) {
            return 'sin_plan';
        }

        if ($this->plan_expires_at === null) {
            return 'sin_vencimiento';
        }

        if ($this->planExpired()) {
            return 'vencido';
        }

        return $this->diasParaVencer() <= self::DIAS_AVISO_VENCIMIENTO ? 'por_vencer' : 'activo';
    }

    /** Días que lleva vencido el plan; 0 si está al día o no vence. */
    public function diasVencido(): int
    {
        $dias = $this->diasParaVencer();

        return $dias !== null && $dias < 0 ? abs($dias) : 0;
    }

    /** Fecha en que se eliminarán los datos si no renueva. Null si no aplica. */
    public function fechaDeBorrado(): ?\Illuminate\Support\Carbon
    {
        if (! $this->planExpired()) {
            return null;
        }

        return $this->plan_expires_at->copy()->addDays((int) config('planes.dias_de_gracia'))->endOfDay();
    }

    /** Días que faltan para que se borren los datos; negativo si ya tocaba. */
    public function diasParaBorrado(): ?int
    {
        $fecha = $this->fechaDeBorrado();

        return $fecha === null
            ? null
            : (int) floor(now()->startOfDay()->diffInDays($fecha->copy()->startOfDay(), false));
    }

    /** Precio que realmente paga, con el descuento que le dio el admin. */
    public function precioConDescuento(): ?float
    {
        $precio = $this->plan?->price_usd;

        if ($precio === null) {
            return null;
        }

        $descuento = (int) ($this->plan_discount_percent ?? 0);

        return round((float) $precio * (100 - min(100, max(0, $descuento))) / 100, 2);
    }

    /**
     * A dónde mandar a este usuario después de entrar o de verificar.
     *
     * Existe porque tres controladores tomaban la misma decisión por su
     * cuenta y uno de ellos la tomaba mal: mandar a un comercio pendiente
     * al panel solo sirve para que otro middleware lo rebote.
     */
    public function rutaDeInicio(): string
    {
        if ($this->isAdmin()) {
            return 'admin.dashboard';
        }

        return $this->isApproved() ? 'dashboard' : 'cuenta.estado';
    }

    public function catalogUrl(): ?string
    {
        return $this->username ? url('/'.$this->username) : null;
    }

    // ── Relaciones ─────────────────────────────────────────────────────────────

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function requestedPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'requested_plan_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function catalogTheme(): HasOne
    {
        return $this->hasOne(CatalogTheme::class)->withoutGlobalScope('tenant');
    }

    public function invoiceTemplate(): HasOne
    {
        return $this->hasOne(InvoiceTemplate::class)->withoutGlobalScope('tenant');
    }

    public function banners(): HasMany
    {
        return $this->hasMany(CatalogBanner::class)->withoutGlobalScope('tenant');
    }

    public function modals(): HasMany
    {
        return $this->hasMany(CatalogModal::class)->withoutGlobalScope('tenant');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class)->withoutGlobalScope('tenant');
    }

    public function facturas(): HasMany
    {
        return $this->hasMany(Factura::class)->withoutGlobalScope('tenant');
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class)->withoutGlobalScope('tenant');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(CatalogVisit::class);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeTenants($query)
    {
        return $query->where('role', self::ROLE_TENANT);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }
}
