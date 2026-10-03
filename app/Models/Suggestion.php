<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\GestionaArchivos;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un mensaje del comercio al administrador de la plataforma: una idea que
 * quiere proponer o un error que le apareció usando el panel.
 *
 * Va con BelongsToTenant: cada comercio ve solo lo suyo y el admin consulta
 * por encima del aislamiento.
 */
class Suggestion extends Model
{
    use BelongsToTenant, GestionaArchivos;

    /** La captura se borra del disco con el registro. */
    protected $columnasDeArchivo = ['image_path'];

    public const SUGERENCIA = 'sugerencia';
    public const ERROR = 'error';

    public const NUEVA = 'nueva';
    public const EN_PROCESO = 'en_proceso';
    public const RESUELTA = 'resuelta';
    public const DESCARTADA = 'descartada';

    /** @var array<string, string> */
    public const TIPOS = [
        self::SUGERENCIA => 'Sugerencia',
        self::ERROR => 'Error',
    ];

    /** @var array<string, string> */
    public const ESTADOS = [
        self::NUEVA => 'Nueva',
        self::EN_PROCESO => 'En proceso',
        self::RESUELTA => 'Resuelta',
        self::DESCARTADA => 'Descartada',
    ];

    /** Estados en los que el asunto sigue abierto para el comercio. */
    public const ABIERTOS = [self::NUEVA, self::EN_PROCESO];

    protected $fillable = [
        'user_id', 'type', 'subject', 'body', 'status',
        'page', 'user_agent', 'image_path',
        'reply', 'replied_at', 'replied_by', 'read_at', 'reply_seen_at',
    ];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return [
            'replied_at' => 'datetime',
            'read_at' => 'datetime',
            'reply_seen_at' => 'datetime',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

    public function replier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }

    public function esError(): bool
    {
        return $this->type === self::ERROR;
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeAbiertas(Builder $query): Builder
    {
        return $query->whereIn('status', self::ABIERTOS);
    }

    /** Las que el admin todavía no abrió. */
    public function scopeSinLeer(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    /** Respuestas que el comercio todavía no vio. */
    public function scopeConRespuestaSinVer(Builder $query): Builder
    {
        return $query->whereNotNull('replied_at')->whereNull('reply_seen_at');
    }
}
