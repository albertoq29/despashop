<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Ajustes clave-valor con dos ámbitos:
 *  - user_id = NULL  → ajuste de la plataforma (lo maneja el admin)
 *  - user_id = <id>  → preferencia de un comercio
 */
class Setting extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'key', 'value'];

    /**
     * Valor del comercio indicado (o del tenant activo si no se pasa ninguno).
     */
    public static function get($key, $default = null, ?int $userId = null)
    {
        $userId ??= app(Tenancy::class)->id();

        $setting = self::where('key', $key)->where('user_id', $userId)->first();

        return $setting ? $setting->value : $default;
    }

    public static function put($key, $value, ?int $userId = null): self
    {
        $userId ??= app(Tenancy::class)->id();

        return self::updateOrCreate(
            ['key' => $key, 'user_id' => $userId],
            ['value' => $value]
        );
    }

    /** Todos los ajustes de un comercio como array clave => valor. */
    public static function forTenant(?int $userId = null): array
    {
        $userId ??= app(Tenancy::class)->id();

        return self::where('user_id', $userId)->pluck('value', 'key')->all();
    }

    // ── Ámbito plataforma ──────────────────────────────────────────────────────

    public static function platform($key, $default = null)
    {
        $setting = self::whereNull('user_id')->where('key', $key)->first();

        return $setting ? $setting->value : $default;
    }

    /**
     * Un ajuste numérico de la plataforma, con su valor de respaldo.
     *
     * Lo que el admin deja en blanco vale lo que diga la configuración del
     * archivo: así el panel manda, pero nunca deja el sistema sin número.
     */
    public static function platformInt(string $key, int $porDefecto): int
    {
        $valor = self::platform($key);

        return is_numeric($valor) && (int) $valor > 0 ? (int) $valor : $porDefecto;
    }

    public static function putPlatform($key, $value): self
    {
        return self::updateOrCreate(
            ['key' => $key, 'user_id' => null],
            ['value' => $value]
        );
    }

    public static function allPlatform(): array
    {
        return self::whereNull('user_id')->pluck('value', 'key')->all();
    }
}
